/**
 * Inline-Styles Plugin : Include stylesheet in javascript modules
 *
 * Config:
 *    root:
 *      styles:
 *        inline: Truthy to inline styles on build.
 *        inlineLoader: Javascript method used to load sheets on the client.
 *
 * Mixins:
 *  All fields may be mixed in. In the case of conflicts the local config wins.
 */
var _ = require('underscore');

function isInline(context) {
  return (context.config.attributes.styles || {}).inline;
}

module.exports = {
  isInline: isInline,
  mode: ['scripts', 'styles'],
  priority: 10,

  loadMixin: function(context, next, complete) {
    var mixinStyles = context.loadedLibrary.styles;
    if (mixinStyles) {
      var styles = context.libraries.originalConfig.styles || {},
          configStyles = _.clone(context.config.attributes.styles || styles),
          assigned = false;

      ['inline', 'inlineLoader'].forEach(function(key) {
        if ((key in mixinStyles) && !(key in styles)) {
          configStyles[key] = mixinStyles[key];

          assigned = true;
        }
      });

      if (assigned) {
        context.config.attributes.styles = configStyles;
      }
    }
    next(complete);
  },

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
                    generated: true,
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
