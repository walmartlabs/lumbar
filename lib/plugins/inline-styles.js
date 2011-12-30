var fu = require('../fileUtil');

function isInline(context) {
  return (context.config.attributes.styles || {}).inline;
}

module.exports = {
  isInline: isInline,

  generatedFiles: function(context, next) {
    if (isInline(context) && context.mode === 'styles') {
      // Prevent stylesheet output if in inline mode
      return [];
    } else {
      return next();
    }
  },

  module: function(context, next) {
    next();

    if (isInline(context)) {
      context.moduleResources = context.moduleResources.map(function(resource) {
         if (resource.style || /\.css$/.test(resource.src)) {
            var generator = function(callback) {
              fu.loadResource(resource, function(err, data) {
                if (err) {
                  return callback(err);
                }

                var config = context.config,
                    loaderName = config.attributes.styles.inlineLoader || (config.scopedAppModuleName(context.module) + '.loader.loadInlineCSS');
                callback(err, {
                  data: loaderName + '("'
                      + data.content
                          .replace(/\\/g, '\\')
                          .replace(/\n/g, '\\n')
                          .replace(/"/g, '\\"')
                      + '");\n',
                  inputs: data.inputs,
                  noSeparator: true
                });
              });
            };
            generator.style = true;
            generator.sourceFile = resource.sourceFile || resource.src;
            return generator;
          } else {
            return resource;
          }
        });
    }
  }
};
