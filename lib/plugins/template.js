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

module.exports = function(context, next) {
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
      var generator = function(callback) {
        loadTemplate(resource.template, config.templateCache(), callback);
      };
      generator.sourceFile = resource.template;
      return generator;
    }
  }

  return next();
};
