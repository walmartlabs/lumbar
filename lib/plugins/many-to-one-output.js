var lumbar = require('../lumbar');

function combineResources(context, callback) {
  var resources = context.resources || [];
  if (!resources.length) {
    return callback();
  }

  context.outputFile(function(callback) {
    lumbar.combine(
      resources,
      context.fileName,
      context.options.minimize && context.mode === 'scripts',
      context.mode === 'styles',
      function(err, data) {
        if (data) {
          data.fileConfig = context.fileConfig;
          data.platform = context.platform;
          data.mode = context.mode;
        }
        callback(err, data)
      });
    },
    callback);
}

module.exports = {
  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      if (!context.combined) {
        context.resources = context.moduleResources;
        context.moduleResources = undefined;
        combineResources(context, function(err, data) {
          if (data) {
            data.package = context.package;
            data.module = context.module.name;
          }
          complete(err, data);
        });
      } else {
        context.combineResources = context.combineResources || {};
        context.combineResources[context.module.name] = context.moduleResources;
        context.moduleResources = undefined;
        complete();
      }
    });
  }
};
