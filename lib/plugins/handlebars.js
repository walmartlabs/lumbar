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
    handlebars = require('handlebars'),
    path = require('path'),
    resources = require('../util/resources'),
    templateUtil = require('../templateUtil');

handlebars.registerHelper('without-extension', function(str) {
  return str.replace(/\.[a-zA-Z0-9]+$/, '');
});


const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = {{handlebarsCall}}({{{data}}});\n";

function ensureTemplateTemplates(context, complete) {
  if (!context.configCache.templateTemplate) {
    var templateTemplate = (context.config.attributes.templates && context.config.attributes.templates.template) || DEFAULT_TEMPLATE_TEMPLATE;
    context.fileUtil.loadTemplate(templateTemplate, false, function(err, compiled) {
      if (err) {
        complete(err);
      } else {
        context.configCache.templateTemplate = compiled;
        complete();
      }
    });
  } else {
    complete();
  }
}

function loadTemplate(src, resource, context, callback) {
  ensureTemplateTemplates(context, function(err) {
    if (err) {
      return callback(err);
    }
    var artifactType = 'template' + context.fileConfig.server;
    context.fileUtil.readFileArtifact(src, artifactType, function(err, cache) {
      if (err) {
        callback(new Error('Failed to load template "' + src + '"\n\t' + err));
        return;
      }

      var artifact = cache.artifact || {},
          data = artifact.data || cache.data.toString(),
          attr = context.config.attributes,
          templates = attr.templates || {},
          appModule = context.config.scopedAppModuleName(context.module),
          templateCache = (attr.templates && attr.templates.cache)
            || attr.templateCache
            || ((appModule ? appModule + '.' : '') + 'templates'),
          template = context.configCache.templateTemplate;

      // Figure out what this file is called. This could vary due to prefixing and overriding
      var name = context.libraries.mapPathToLibrary(src, resource.library);
      // Replace \ on windows with slashes, so that the templates prefix matches.
      name = name.replace(/\\/g, '/');
      if (templates.root && name.indexOf(templates.root) === 0) {
        name = name.substring(templates.root.length);
      }
      name = templateUtil.escapeJsString(name);

      // We have the template data, now convert it into the proper format
      if (!cache.artifact) {
        if (templates.precompile) {
          var options = context.fileCache.precompileTemplates;
          if (!options) {
            context.fileCache.precompileTemplates = options = _.clone(templates.precompile);
            if (templates.knownHelpers || options.knownHelpers) {
              options.knownHelpers = (options.knownHelpers || templates.knownHelpers).reduce(
                  function(value, helper) {
                    value[helper] = true;
                    return value;
                  }, {});
            }
            if (context.fileConfig.server && templates.server) {
              _.extend(options, templates.server);
            }
          }
          try {
            data = handlebars.precompile(data, options);
          } catch (err) {
            return callback(err);
          }
        } else {
          data = "'" + templateUtil.escapeJsString(data) + "'";
        }
        context.fileUtil.setFileArtifact(src, artifactType, {data: data, template: template});
      }

      callback(
        undefined,
        template({
          name: name,
          handlebarsCall: templates.precompile ? 'Handlebars.template' : 'Handlebars.compile',
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
    var mixinTemplates = context.loadedLibrary.templates;
    if (mixinTemplates) {
      var templates = context.libraries.originalConfig.templates || {},
          configTemplates = _.clone(context.config.attributes.templates || templates),
          assigned = false;

      ['template', 'precompile', 'cache', 'root', 'server'].forEach(function(key) {
        if (_.has(mixinTemplates, key) && !_.has(templates, key)) {
          configTemplates[key] = mixinTemplates[key];
          assigned = true;
        }
      });

      if (_.has(mixinTemplates, 'knownHelpers')) {
        configTemplates.knownHelpers = (configTemplates.knownHelpers || []).concat(mixinTemplates.knownHelpers);
        assigned = true;
      }

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

      var generator = function(buildContext, callback) {
        var output = [],
            inputs = [];
        context.fileUtil.fileList(resource.src, /\.handlebars$/, function(err, files) {
          if (err) {
            callback(err);
            return;
          }

          function ignore(file) {
            return file.dir || loadedTemplates[resources.source(file)];
          }
          function checkComplete() {
            if (inputs.length === files.length) {
              // Sorting is effectively sorting on the file name due to the name comment in the template
              callback(undefined, {
                inputs: inputs,
                data: output.sort().join(''),
                name: resource.src,
                generated: true,
                noSeparator: true,
                ignoreWarnings: true
              });
              return true;
            }
          }

          inputs = _.map(files.filter(ignore), function(input) { return input.src || input; });
          if (checkComplete()) {
            return;
          }

          files.forEach(function(file) {
            if (ignore(file)) {
              return;
            }

            var src = file.src || file;
            loadedTemplates[src] = true;
            loadTemplate(src, resource, context, function(err, data) {
              if (err) {
                return callback(err);
              }

              output.push(data.data || data);
              inputs.push(src);
              checkComplete();
            });
          });
        });
      };
      generator.sourceFile = resource.src;
      complete(undefined, generator);
    } else {
      next(complete);
    }
  }
};
