var _ = require('underscore'),
    fu = require('../fileUtil'),
    handlebars = require('handlebars'),
    templateUtil = require('../templateUtil');

const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const PRECOMPILED_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.template({{{data}}});\n";
var templateTemplate = handlebars.compile(DEFAULT_TEMPLATE_TEMPLATE),
    precompiledTemplate = handlebars.compile(PRECOMPILED_TEMPLATE);

function loadTemplate(name, context, callback) {
  if (fu.isDirectory(name)) {
    fu.filesWithExtension(name, /\.handlebars$/).forEach(function(path) {
      loadTemplate(path, context, callback);
    });
  } else {
    fu.readFile(name, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

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
        console.log(options);
        data = handlebars.precompile(data, options);
        template = precompiledTemplate;
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
  }
};

module.exports = {
  resourceList: function(context, next) {
    var attr = context.config.attributes;

    var ret = next();
    if (!ret) {
      return;
    }

    var views = attr.templates || attr.views,
        resource = context.resource.src || context.resource;
    if (views && views[resource] && context.config.filterResource(context.resource, context)) {
      views[resource].forEach(function(template) {
        ret.push({ template: template });
      });
    }
    return ret;
  },
  resource: function(context, next) {
    var resource = context.resource;

    if (resource.template) {
      var loadedTemplates = context.fileCache.loadedTemplates;
      if (!loadedTemplates) {
        loadedTemplates = context.fileCache.loadedTemplates = {};
      }

      if (loadedTemplates[resource.template]) {
        return;
      } else {
        loadedTemplates[resource.template] = true;

        var generator = function(callback) {
          loadTemplate(resource.template, context, function(err, data) {
            callback(err, data && {data: data, noSeparator: true});
          });
        };
        generator.sourceFile = resource.template;
        return generator;
      }
    }

    return next();
  }
};
