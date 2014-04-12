var _ = require('underscore'),
    lumbar = require('../lumbar');

function filterDuplicates(context) {
  if (context.config.attributes.filterDuplicates === false) {
    return context.moduleResources;
  }

  var paths = {};
  return _.filter(context.moduleResources, function(resource) {
    if (resource.src) {
      var id = (resource.global ? 'global_' : '') + resource.src;
      if (paths[id] && !resource.duplicate) {
        return false;
      }
      paths[id] = true;
    }
    return true;
  });
}

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
      context.options.minimize && context.mode === 'scripts' && !context.fileConfig.server,
      context.mode === 'styles',
      function(err, data) {
        data = data || {};
        _.extend(data, outputData);

        if (!data.fileName) {
          data.fileName = context.fileName;
        }
        if (!data.inputs) {
          data.inputs = _.chain(resources)
              .map(function(resource) { return resource.inputs || resource; })
              .flatten()
              .map(function(resource) { return resource.src || resource; })
              .filter(function(resource) { return _.isString(resource); })
              .map(context.fileUtil.makeRelative, context.fileUtil)
              .value();
        }

        callback(err, data);
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
        context.resources = filterDuplicates(context);
        context.moduleResources = undefined;
        combineResources(context, {
            module: context.module.name
          },
          complete);
      } else {
        context.combineResources = context.combineResources || {};
        context.combineResources[context.module.name] = filterDuplicates(context);
        context.moduleResources = undefined;
        complete();
      }
    });
  }
};
