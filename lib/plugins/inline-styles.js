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

  resource: function(context, next) {
    var resource = next();

    if (isInline(context) && (resource.style || /\.css$/.test(resource.src))) {
      var generator = function(callback) {
        function loaded(err, data) {
          if (err) {
            return callback(err);
          }

          var config = context.config,
              loaderName = config.attributes.styles.inlineLoader || (config.scopedAppModuleName(context.module) + '.loader.loadInlineCSS');
          callback(err, {
            data: loaderName + '("'
                + (data.data != null ? data.data : data)
                    .replace(/\\/g, '\\')
                    .replace(/\n/g, '\\n')
                    .replace(/"/g, '\\"')
                + '");\n',
            inputs: data.inputs,
            noSeparator: true
          });
        }
        if (typeof resource === 'function') {
          resource(loaded);
        } else if (resource.src) {
          fu.readFile(resource.src, loaded);
        }
      };
      generator.style = true;
      generator.sourceFile = resource.sourceFile || resource.src;
      return generator;
    }

    return resource;
  }
};
