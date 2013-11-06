var _ = require('underscore');

module.exports = {
  mode: 'scripts',
  priority: 98,   // Just below the core scripts plugin....

  fileFilter: function(context, next) {
    return /\.(js|json)$/;
  },

  outputConfigs: function(context, next, complete) {
    next(function(err, files) {
      if (err) {
        return complete(err);
      }

      // Permutation of other configs and ours
      var ret = [];
      files.forEach(function(fileConfig) {
        [true, false].forEach(function(server) {
          // If they did not opt into server mode then we want to only emit non-server
          // mode
          if (context.config.attributes.server || !server) {
            var config = _.clone(fileConfig);
            config.server = server;
            ret.push(config);
          }
        });
      });
      complete(undefined, ret);
    });
  },

  fileName: function(context, next, complete) {
    next(function(err, ret) {
      if (ret && context.fileConfig.server) {
        ret.path += '-server';
      }
      complete(err, ret);
    });
  },

  moduleResources: function(context, next, complete) {
    var module = context.module;

    if (module.server && context.fileConfig.server) {
      return complete(undefined, module.server);
    }

    next(function(err, scripts) {
      if (err) {
        return complete(err);
      }

      var files = [];
      _.each(scripts, function(script) {
        if (!_.has(script, 'server') || script.server === context.fileConfig.server) {
          files.push(script);
        }
      });
      complete(undefined, files);
    });
  }
};
