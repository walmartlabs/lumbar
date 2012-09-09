var _ = require('underscore'),
    async = require('async'),
    fu = require('./fileUtil');

/**
 * Creates a list of all of the resources for the current module.
 *
 * Context state: module
 *
 * Plugin Calls:
 *    moduleResources
 *    fileFilter
 *    resourceList
 */
exports.loadResources = function(context, callback) {
  var plugins = context.plugins;

  var ret = [];

  function filterResource(resource) {
    if (_.isString(resource)) {
      resource = { src: resource };
    }

    if (exports.filterResource(resource, context)) {
      ret.push(resource);
    }
  }

  plugins.moduleResources(context, function(err, files) {
    if (err) {
      return callback(err);
    }

    var fileFilter = plugins.fileFilter(context) || /.*/;
    fu.fileList(files, fileFilter, function(err, files) {
      if (err) {
        callback(err);
        return;
      }

      async.forEach(files, function(resource, callback) {
        var resourceContext = context.clone();
        resourceContext.resource = resource;
        plugins.resourceList(resourceContext, function(err, resource) {
          if (resource) {
            resource.forEach(filterResource);
          }
          callback(err, resource);
        });
      },
      function(err) {
        callback(err, ret);
      });
    });
  });
};

/**
 * Filters a given resource for platform constraints, if specified.
 */
exports.filterResource = function(resource, context) {
  var platform = context.platform;

  if (resource.platform) {
    return resource.platform === platform;
  } else if (resource.platforms) {
    return resource.platforms.reduce(function(found, filePlatform) {
        return found || filePlatform === platform;
      }, false);
  }

  return true;
};
