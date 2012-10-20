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
  function check(value, singular, plural) {
    if (singular) {
      return singular.not ? singular.not !== value : singular === value;
    } else if (plural) {
      var ret = (plural.not || plural).reduce(function(found, filePlatform) {
          return found || filePlatform === value;
        }, false);
      return plural.not ? !ret : ret;
    }
    return true;
  }

  return check(context.platform, resource.platform, resource.platforms)
      && check(context.package, resource.package, resource.packages);
};


/**
 * Runs a set of resources through the resource plugin.
 *
 * Context state: module
 *
 * Plugin Calls:
 *    resource
 */
exports.processResources = function(resources, context, callback) {
  var plugins = context.plugins;

  async.map(resources, function(resource, callback) {
      var resourceContext = context.clone();
      resourceContext.resource = resource;
      plugins.resource(resourceContext, function(err, newResource) {
        if (newResource && newResource !== resource) {
          newResource.originalResource = resource;
        }

        callback(err, newResource);
      });
    },
    function(err, resources) {
      if (err) {
        return callback(err);
      }

      callback(err, resources.filter(function(resource) { return resource; }));
    });
};
