var _ = require('underscore'),
    lumbar = require('../lumbar');

function combineResources(context, outputData, callback) {
  var resources = context.resources || [];
  if (!resources.length) {
    return callback();
  }

  context.outputFile(function(callback) {
    lumbar.combine(
      context,
      resources,
      context.fileName,
      context.options.minimize && context.mode === 'scripts',
      context.mode === 'styles',
      function(err, data) {
        if (data) {
          _.extend(data, outputData);
        }
        callback(err, data)
      });
    },
    callback);
}

module.exports = {
  priority: 1,

  modeComplete: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      if (context.combined) {
        // Build the resources array from each of the modules (Need to maintain proper ordering)
        var modules = context.config.moduleList(context.package);
        context.resources = [];
        modules.forEach(function(module) {
          context.resources.push.apply(context.resources, context.combineResources[module]);
        });
        combineResources(context, {}, complete);
      } else {
        complete();
      }
    });
  },
  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      if (!context.combined) {
        context.resources = context.moduleResources;
        context.moduleResources = undefined;
        combineResources(context, {
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
