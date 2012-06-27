var _ = require('underscore'),
    handlebars = require('handlebars'),
    templateUtil = require('../templateUtil');

const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const PRECOMPILED_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.template({{{data}}});\n";
var templateTemplate,
    precompiledTemplate;

function ensureTemplateTemplates(context) {
  if (!templateTemplate) {
    templateTemplate = handlebars.compile(context.config.attributes.templateTemplate || DEFAULT_TEMPLATE_TEMPLATE);
  }
  if (!precompiledTemplate) {
    precompiledTemplate = handlebars.compile(context.config.attributes.precompiledTemplate || PRECOMPILED_TEMPLATE);
  }
}

function loadTemplate(name, context, callback) {
  ensureTemplateTemplates(context);

  context.fileUtil.readFile(name, function(err, data) {
    if (err) {
      callback(new Error('Failed to load template "' + name + '"\n\t' + err));
      return;
    }

    data = data.toString();
    var attr = context.config.attributes,
        templates = attr.templates || attr.views,
        appModule = context.config.scopedAppModuleName(context.module),
        templateCache = context.config.attributes.templateCache || ((appModule ? appModule + '.' : '') + 'templates'),
        template = templateTemplate;

    // We have the template data, now convert it into the proper format
    name = templateUtil.escapeJsString(name);
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
        template = precompiledTemplate;
      } catch (err) {
        return callback(err);
      }
    } else {
      data = templateUtil.escapeJsString(data);
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
};

module.exports = {
  mode: 'scripts',
  priority: 50,

  resourceList: function(context, next, complete) {
    var attr = context.config.attributes;

    next(function(err, ret) {
      if (err || !ret) {
        return complete(err);
      }

      var views = attr.templates || attr.views || {},
          resource = context.resource.src || context.resource;
      if (views[resource] && context.config.filterResource(context.resource, context)) {
        views[resource].forEach(function(template) {
          ret.push({ template: template });
        });
      }
      complete(undefined, ret);
    });
  },
  resource: function(context, next, complete) {
    var resource = context.resource;

    if (resource.template) {
      var loadedTemplates = context.fileCache.loadedTemplates;
      if (!loadedTemplates) {
        loadedTemplates = context.fileCache.loadedTemplates = {};
      }

      if (loadedTemplates[resource.template]) {
        return complete();
      } else {
        loadedTemplates[resource.template] = true;

        var generator = function(buildContext, callback) {
          var output = [],
              inputs = [];
          context.fileUtil.fileList(resource.template, /\.handlebars$/, function(err, files) {
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
        generator.sourceFile = resource.template;
        complete(undefined, generator);
      }
    } else {
      next(complete);
    }
  }
};
