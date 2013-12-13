var _ = require('underscore'),
    async = require('async'),
    resources = require('../util/resources');

module.exports = {
  mode: ['scripts', 'styles'],
  priority: 25,

  loadMixin: function(context, next, complete) {
    var mixinStyles = context.loadedLibrary.styles;
    if (mixinStyles) {
      var styles = context.libraries.originalConfig.styles || {},
          configStyles = _.clone(context.config.attributes.styles || styles),
          assigned = false;

      ['configObject'].forEach(function(key) {
        if ((key in mixinStyles) && !(key in styles)) {
          configStyles[key] = mixinStyles[key];

          assigned = true;
        }
      });

      if (context.libraries.mergeFiles('config', styles, mixinStyles, configStyles, context.loadedLibrary)) {
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

        configFiles = _.map(configFiles, function(config) { return config.src || config; });

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
        // Strip to just the file name.
        // This prevents errors where libary fields could cause circular JSON exceptions on serialize
        config = _.map(config, resources.source);

        _.each(context.moduleResources, function(resource) {
          if (resource.stylus) {
            resource.plugins.push({
              plugin: __dirname + '/stylus-config-worker',
              data: config
            });
          }
        });
      }

      complete();
    });
  }
};
