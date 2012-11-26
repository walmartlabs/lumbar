var _ = require('underscore'),
    async = require('async');

module.exports = {
  mode: ['scripts', 'styles'],
  priority: 25,

  loadMixin: function(context, next, complete) {
    var mixinStyles = context.loadedMixin.styles;
    if (mixinStyles) {
      var styles = context.mixins.originalConfig.styles || {},
          configStyles = _.clone(context.config.attributes.styles || styles),
          assigned = false;

      ['configObject'].forEach(function(key) {
        if ((key in mixinStyles) && !(key in styles)) {
          configStyles[key] = mixinStyles[key];

          assigned = true;
        }
      });

      if (context.mixins.mergeFiles('config', styles, mixinStyles, configStyles, context.loadedMixin.root)) {
        assigned = true;
      }

      if (assigned) {
        context.config.attributes.styles = configStyles;
      }
    }
    next(complete);
  },

  resource: function(context, next, complete) {
    if (context.resource['stylus-config']) {
      var configGenerator = function(context, callback) {
        // TODO : Load and output the JSON config options
        // We can use normal JSON.parse here as stylus uses this -> we can call extend as part of the build
        var styles = context.config.attributes.styles || {},
            configFiles = styles.config || [],
            stylusConfig = styles.configObject || 'module.exports.stylusConfig';

        async.map(configFiles,
          function(config, callback) {
            context.fileUtil.readFile(config, function(err, data) {
              callback(err, data);
            });
          },
          function(err, data) {
            if (data) {
              try {
                var config = _.reduce(data, function(config, json) {
                  return _.extend(config, JSON.parse(json));
                }, {});
                data = {data: stylusConfig + ' = ' + JSON.stringify(config) + ';\n', inputs: configFiles, noSeparator: true};
              } catch (parseError) {
                // TODO : Better error handling here?
                err = parseError;
                data = undefined;
              }
            }
            callback(err, data);
          });
      };
      configGenerator.sourceFile = undefined;
      complete(undefined, configGenerator);
    } else {
      next(complete);
    }
  },

  module: function(context, next, complete) {
    next(function() {
      var styles = context.config.attributes.styles || {},
          config = styles.config || [];

      if (config.length) {
        _.each(context.moduleResources, function(resource) {
          if (resource.stylus) {
            resource.plugins.push(function(compiler) {
              compiler.options.externals.push.apply(compiler.options.externals, config);

              compiler.str = config.map(function(config) {
                  return 'json("' + config.replace(/\/"/g, '$0') + '")\n';
                }).join('')
                + compiler.str;
            });
          }
        });
      }

      complete();
    });
  }
};
