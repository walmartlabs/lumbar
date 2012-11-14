/**
 * Template Plugin : Includes handlebars templates associated with a given file
 *      when said file is imported.
 *
 * Config:
 *    root:
 *      templates:
 *          template: Defines the template that is used to output the template in the module. See consts below.
 *          precompile:
 *            Flag/hash that enable precompilation. Truthy will enable precompilation. A hash with
 *            the key name "template" will override the rendering template. (See the template value above.)
 *          cache: Name of the javascript object that templates will be assigned to.
 *            Defaults to `$AppModule.templates` if an app module exists, otherwise `templates`
 *
 * Mixins:
 *  The template plugin will mixin any special values directly, giving priority to the local version.
 *
 */
var _ = require('underscore'),
    build = require('../build'),
    handlebars = require('handlebars'),
    path = require('path'),
    templateUtil = require('../templateUtil');

handlebars.registerHelper('without-extension', function(str) {
  return str.replace(/\.[a-zA-Z0-9]+$/, '');
});


const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const PRECOMPILED_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.template({{{data}}});\n";

function ensureTemplateTemplates(context, complete) {
  function setTemplateTemplate() {
    if (!context.configCache.templateTemplate) {
      var templateTemplate = (context.config.attributes.templates && context.config.attributes.templates.template) || DEFAULT_TEMPLATE_TEMPLATE;
      context.fileUtil.loadTemplate(templateTemplate, false, function(err, compiled) {
        if (err) {
          complete(err);
        } else {
          context.configCache.templateTemplate = compiled;
          setPrecompiledTemplate();
        }
      });
    } else {
      setPrecompiledTemplate();
    }
  }

  function setPrecompiledTemplate() {
    if (!context.configCache.precompiledTemplate) {
      var precompiledTemplate = (context.config.attributes.templates &&
        context.config.attributes.templates.precompile &&
        context.config.attributes.templates.precompile.template) ||
        PRECOMPILED_TEMPLATE;

      context.fileUtil.loadTemplate(precompiledTemplate, false, function(err, compiled) {
        if (err) {
          complete(err);
        } else {
          context.configCache.precompiledTemplate = compiled;
          complete();
        }
      });
    } else {
      complete();
    }
  }

  setTemplateTemplate(); //will call setPrecompiledTemplate when done
}

function loadTemplate(name, context, callback) {
  ensureTemplateTemplates(context, function(err) {
    if (err) {
      return callback(err);
    }
    context.fileUtil.readFileArtifact(name, 'template', function(err, cache) {
      if (err) {
        callback(new Error('Failed to load template "' + name + '"\n\t' + err));
        return;
      }

      var artifact = cache.artifact || {},
          data = artifact.data || cache.data.toString(),
          attr = context.config.attributes,
          templates = attr.templates || attr.views || {},
          appModule = context.config.scopedAppModuleName(context.module),
          templateCache = (context.config.attributes.templates && context.config.attributes.templates.cache) ||
            context.config.attributes.templateCache ||
            ((appModule ? appModule + '.' : '') + 'templates'),
          template = context.configCache.templateTemplate;

      // We have the template data, now convert it into the proper format
      name = templateUtil.escapeJsString(name);
      if (!cache.artifact) {
        if (templates.precompile) {
          var options = context.configCache.precompileTemplates;
          if (!options) {
            context.configCache.precompileTemplates = options = _.clone(templates.precompile);
            if (options.knownHelpers) {
              options.knownHelpers = options.knownHelpers.reduce(
                  function(value, helper) {
                    value[helper] = true;
                    return value;
                  }, {});
            }
          }
          try {
            data = handlebars.precompile(data, options);
            template = context.configCache.precompiledTemplate;
          } catch (err) {
            return callback(err);
          }
        } else {
          data = templateUtil.escapeJsString(data);
        }
        context.fileUtil.setFileArtifact(name, 'template', {data: data, template: template});
      } else {
        template = artifact.template;
      }

      callback(
        undefined,
        template({
          name: name,
          templateCache: templateCache,
          data: data
        })
      );
    });
  });
}

module.exports = {
  mode: 'scripts',
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinTemplates = context.loadedMixin.templates;
    if (mixinTemplates) {
      var templates = context.mixins.originalConfig.templates || {},
          configTemplates = _.clone(context.config.attributes.templates || templates),
          assigned = false;

      ['template', 'precompile', 'cache'].forEach(function(key) {
        if (mixinTemplates[key] && !templates[key]) {
          configTemplates[key] = mixinTemplates[key];
          assigned = true;
        }
      });

      if (assigned) {
        context.config.attributes.templates = configTemplates;
      }
    }
    next(complete);
  },

  resource: function(context, next, complete) {
    var resource = context.resource;

    if (/\.handlebars$/.test(resource.src) || resource.template) {
      var loadedTemplates = context.fileCache.loadedTemplates;
      if (!loadedTemplates) {
        loadedTemplates = context.fileCache.loadedTemplates = {};
      }

      var templatePath = resource.src;
      if (loadedTemplates[templatePath]) {
        return complete();
      } else {
        loadedTemplates[templatePath] = true;

        var generator = function(buildContext, callback) {
          var output = [],
              inputs = [];
          context.fileUtil.fileList(templatePath, /\.handlebars$/, function(err, files) {
            if (err) {
              callback(err);
              return;
            }

            inputs = files.filter(function(file) { return file.dir; });

            files.forEach(function(file) {
              if (file.dir) {
                return;
              }

              loadTemplate(file.src || file, context, function(err, data) {
                if (err) {
                  return callback(err);
                }

                output.push(data.data || data);
                inputs.push(file.src || file);

                if (inputs.length === files.length) {
                  // Sorting is effectively sorting on the file name due to the name comment in the template
                  callback(undefined, { inputs: inputs, data: output.sort().join(''), noSeparator: true});
                }
              });
            });
          });
        };
        generator.sourceFile = templatePath;
        complete(undefined, generator);
      }
    } else {
      next(complete);
    }
  }
};
