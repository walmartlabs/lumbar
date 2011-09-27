var fu = require('../fileUtil'),
    handlebars = require('handlebars'),
    templateUtil = require('../templateUtil');

const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
var templateTemplate = handlebars.compile(DEFAULT_TEMPLATE_TEMPLATE);

function loadTemplate(name, templateCacheName, callback) {
  if (fu.isDirectory(name)) {
    fu.filesWithExtension(name, /\.handlebars$/).forEach(function(path) {
      loadTemplate(path, templateCacheName, callback);
    });
  } else {
    fu.readFile(name, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      // We have the template data, now convert it into a safe javascript string
      name = templateUtil.escapeJsString(name);
      data = templateUtil.escapeJsString(data);

      callback(
        undefined,
        templateTemplate({
          name: name,
          templateCache: templateCacheName,
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
    if (views && views[resource]) {
      views[resource].forEach(function(template) {
        ret.push({ template: template });
      });
    }
    return ret;
  },
  resource: function(context, next) {
    var resource = context.resource,
        config = context.config;

    if (resource.template) {
      var loadedTemplates = context.fileCache.loadedTemplates;
      if (!loadedTemplates) {
        loadedTemplates = context.fileCache.loadedTemplates = {};
      }

      if (loadedTemplates[resource.template]) {
        return;
      } else {
        loadedTemplates[resource.template] = true;

        var appModule = config.scopedAppModuleName(context.module),
            templateCache = config.attributes.templateCache || ((appModule ? appModule + '.' : '') + 'templates');
        var generator = function(callback) {
          loadTemplate(resource.template, templateCache, function(err, data) {
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
