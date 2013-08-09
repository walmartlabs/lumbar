var _ = require('underscore'),
    async = require('async'),
    build = require('../build'),
    defineParser = require('../util/define-parser'),
    fu = require('../fileUtil'),
    resources = require('../util/resources');

module.exports = {
  priority: 2,    // After mixins

  resourceList: function(context, next, complete) {
    if (context.config.attributes.amd
        && build.filterResource(context.resource, context)) {
      next(function(err, resources) {
        if (err) {
          return complete(err);
        }

        if (!context.platformCache.amd) {
          context.platformCache.amd = {};
        }

        if (context.config.isAppModule(context.module) && !context.platformCache.amdAppModules) {
          context.platformCache.amdAppModules = {};
        }
        if (!context.fileCache.amdFileModules) {
          context.fileCache.amdFileModules = {};
        }

        async.map(
            resources,
            function(resource, callback) {
              parseFile(resource, context, callback);
            },
            function(err, data) {
              if (data) {
                data = _.compact(_.flatten(data));
              }
              complete(err, data);
            });
      });
    } else {
      next(complete);
    }
  }
};

function parseFile(resource, context, complete) {
  var cache;

  var resourceName = resources.source(resource),
      amdName;
  if (resourceName.indexOf('!') > -1) {
    amdName = resourceName;
    resourceName = 'js/' + resourceName.replace('view!', 'views/') + '.js';
  } else if (resourceName) {
    amdName = resourceName.replace(/js\/(?:(.*?)\/)?(.*)\.js$/, function(match, type, name) {
      if (type) {
        return type === 'view' ? (type + '!' + name) : (type + '/' + name);
      } else {
        return name;
      }
    });
    if (resourceName.indexOf('.') === -1) {
      resourceName = 'js/' + resourceName + '.js';
    }
  }

  var isAppModule = context.config.isAppModule(context.module),
      inApp = context.platformCache.amdAppModules[amdName],
      inFile = context.fileCache.amdFileModules[amdName];

  if (inApp || inFile) {
    return complete();
  }

  if (resourceName && /\.js$/.test(resourceName)) {
    // Flag state now so we don't read multiple times due to IO wait in the readFile call
    if (isAppModule) {
      context.platformCache.amdAppModules[amdName] = true;
    }
    context.fileCache.amdFileModules[amdName] = true;

    cache = fu.readFileArtifact(resourceName, 'amd', function(err, data) {
      if (err) {
        return complete(err);
      }
      var cache = data.artifact;

      // If we have something in the cache, shortcircuit the parsing
      if (!cache) {
        data = defineParser(data.data.toString(), {file: resourceName});
        cache = {
          defined: _.map(data, function(data) {
            var ret = _.omit(data, 'deps');
            ret.name = ret.name || amdName;
            return ret;
          }),
          dependencies: _.compact(_.flatten(_.pluck(data, 'deps')))
        };
        fu.setFileArtifact(resourceName, 'amd', cache);
      }
      if (isAppModule) {
        context.platformCache.amdAppModules[amdName] = cache.dependencies;
      }
      context.fileCache.amdFileModules[amdName] = cache.dependencies;

      async.map(
        cache.dependencies,
        function(resource, callback) {
          parseFile(resource, context, callback);
        },
        function(err, data) {
          if (data) {
            data = _.compact(_.flatten(data));
            data.push(_.isString(resource) ? resourceName : resource);
          }

          complete(err, data);
        });
    });
  } else {
    complete(undefined, resource);
  }
}
