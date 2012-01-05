var _ = require('underscore'),
    lumbar = require('../lumbar');

function combineResources(context, outputData, callback) {
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
          _.extend(data, outputData, {
            fileConfig: context.fileConfig,
            platform: context.platform,
            mode: context.mode
          });
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
        combineResources(context, {
            package: context.package,
            module: context.module.name
          },
          complete);
      } else {
        context.combineResources = context.combineResources || {};
        context.combineResources[context.module.name] = context.moduleResources;
        context.moduleResources = undefined;
        complete();
      }
    });
  }
};
