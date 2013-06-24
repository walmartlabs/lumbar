var _ = require('underscore'),
    async = require('async'),
    build = require('../build'),
    defineParser = require('../util/define-parser'),
    fu = require('../fileUtil');

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
  var cache = context.platformCache.amd;

  var resourceName = (_.isString(resource) ? resource : resource.src) || '',
      amdName;
  if (resourceName.indexOf('!') > -1) {
    amdName = resourceName;
    resourceName = 'js/' + resourceName.replace('!', '/') + '.js';
  } else if (resourceName) {
    amdName = resourceName.replace(/js\/(?:(.*?)\/)?(.*)\.js$/, function(match, type, name) {
      if (type) {
        return type === 'view' ? (type + '!' + name) : (type + '/' + name);
      } else {
        return name;
      }
    });
    if (resourceName.indexOf('.') === -1) {
      resourceName = 'js/' + resourceName.replace('!', '/') + '.js';
    }
  }

  var isAppModule = context.config.isAppModule(context.module),
      inApp = context.platformCache.amdAppModules[amdName],
      inFile = context.fileCache.amdFileModules[amdName];

  if (inApp || inFile) {
    return complete();
  }

  // Flag state now so we don't read multiple times due to IO wait in the readFile call
  if (isAppModule) {
    context.platformCache.amdAppModules[amdName] = true;
  }
  context.fileCache.amdFileModules[amdName] = true;

  if (resourceName && /\.js$/.test(resourceName)) {
    function processChildren() {
      async.map(
        cache[amdName].dependencies,
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
    }

    // We have something in the cache, shortcircuit the parsing
    if (cache[amdName]) {
      return processChildren();
    }

    // Load the resource content
    fu.readFile(resourceName, function(err, data) {
      if (err) {
        return complete(err);
      }

      data = defineParser(data.toString(), {file: resourceName});
      cache[amdName] = {
        defined: _.map(data, function(data) {
          var ret = _.omit(data, 'deps');
          ret.name = ret.name || amdName;
          return ret;
        }),
        dependencies: _.compact(_.flatten(_.pluck(data, 'deps')))
      };

      processChildren();
    });
  } else {
    complete(undefined, resource);
  }
}
