function isInline(context) {
  return (context.config.attributes.styles || {}).inline;
}

module.exports = {
  isInline: isInline,
  mode: ['scripts', 'styles'],
  priority: 10,

  outputConfigs: function(context, next, complete) {
    if (isInline(context) && context.mode === 'styles') {
      // Prevent stylesheet output if in inline mode
      complete(undefined, []);
    } else {
      next(complete);
    }
  },

  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      if (isInline(context)) {
        context.moduleResources = context.moduleResources.map(function(resource) {
           if (resource.style || /\.css$/.test(resource.src)) {
              var generator = function(context, callback) {
                context.loadResource(resource, function(err, data) {
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

      complete();
    });
  }
};
