var _ = require('underscore'),
    async = require('async'),
    fu = require('./fileUtil'),
    resources = require('./util/resources');

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

  function filterResource(resource) {
    resource = resources.cast(resource);

    if (exports.filterResource(resource, context)) {
      return resource;
    }
  }

  plugins.moduleResources(context, function(err, files) {
    if (err) {
      return callback(err);
    }

    var fileFilter = plugins.fileFilter(context) || /.*/;
    fu.fileList(files, fileFilter, function(err, files) {
      if (err) {
        return callback(err);
      }

      async.map(files, function(resource, callback) {
        var resourceContext = context.clone();
        resourceContext.resource = resource;
        plugins.resourceList(resourceContext, callback);
      },
      function(err, resources) {
        resources = _.flatten(resources);
        resources = _.map(resources, filterResource);
        resources = _.filter(resources, function(resource) { return resource; });
        callback(err, resources);
      });
    });
  });
};

/**
 * Filters a given resource for platform constraints, if specified.
 */
exports.filterResource = function(resource, context) {
  function check(value, singular, plural) {
    if (typeof singular !== 'undefined') {
      return singular.not ? singular.not !== value : singular === value;
    } else if (plural) {
      var ret = (plural.not || plural).reduce(function(found, filePlatform) {
          return found || filePlatform === value;
        }, false);
      return plural.not ? !ret : ret;
    }
    return true;
  }

  function checkResource(resource) {
    return check(context.platform, resource.platform, resource.platforms)
        && check(context.package, resource.package, resource.packages)
        && check(!!context.combined, resource.combined);
  }
  return checkResource(resource)
      && (!resource.originalResource || checkResource(resource.originalResource));
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
