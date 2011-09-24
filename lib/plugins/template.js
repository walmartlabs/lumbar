var templateUtil = require('../templateUtil');

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
        templateUtil.loadTemplate(resource.template, config.templateCache(), callback);
      };
      generator.sourceFile = resource.template;
      return generator;
    }
  }

  return next();
};
