var _ = require('underscore'),
    async = require('async'),
    build = require('../build'),
    defineParser = require('../util/define-parser'),
    fu = require('../fileUtil'),
    resources = require('../util/resources');

module.exports = {
  loaders: {},

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

module.exports.loaders.view = {
  resource: function(name) {
    return 'js/views/' + name + '.js';
  }
};

// Left out of the loaders object so we do not have to worry about enumaration order
module.exports.defaultLoader = {
  resource: function(name, resource) {
    if (name.indexOf('.') === -1) {
      return 'js/' + name + '.js';
    }
    return resource;
  },
  output: function(defined, isGlobal) {
    return [
      generator('wmd["' + defined.name + '"] = ('),
      generator(defined.source),
      generator(')();\n')
    ];
  }
};

function parseFile(resource, context, complete) {
  var cache;

  var resourceName = resources.source(resource),
      loader = module.exports.defaultLoader,
      amdName,
      name = resourceName;

  if (!resourceName) {
    return complete(undefined, resource);
  }

  if (/^(.*)!(.*)$/.test(resourceName)) {
    amdName = resourceName;

    var loaderName = RegExp.$1;
    loader = module.exports.loaders[loaderName],
    name = RegExp.$2;
  } else {
    // TODO : Refactor this to be pluggable
    amdName = resourceName.replace(/js\/(?:(.*?)\/)?(.*)\.js$/, function(match, type, name) {
      if (type) {
        return type === 'view' ? (type + '!' + name) : (type + '/' + name);
      } else {
        return name;
      }
    });
  }

  if (loader.resource) {
    resource = loader.resource(name, resource);
    resourceName = resources.source(resource);
  }

  var isAppModule = context.config.isAppModule(context.module),
      inApp = context.platformCache.amdAppModules[amdName] != null,
      inFile = context.fileCache.amdFileModules[amdName] != null;

  if (inApp || inFile) {
    return complete();
  }

  if (/\.js$/.test(resourceName)) {
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
      if (cache === undefined) {
        try {
          data = defineParser(data.data.toString(), {file: resourceName});
          cache = {
            defined: _.map(data, function(data) {
              var ret = _.omit(data, 'deps', 'define');
              if (data.define) {
                ret.amd = data.define;
                ret.name = ret.name || amdName;
              }
              return ret;
            }),
            dependencies: _.compact(_.flatten(_.pluck(data, 'deps')))
          };

          // If we have no AMD content then leave this as is
          if (!_.any(cache.defined, function(define) { return define.amd; })) {
            cache = false;
          }
        } catch (err) {
          context.event.emit('debug', 'Failed to parse AMD file: ' + err);
          cache = false;
        }
        fu.setFileArtifact(resourceName, 'amd', cache);
      }
      if (isAppModule) {
        context.platformCache.amdAppModules[amdName] = cache.dependencies;
      }
      context.fileCache.amdFileModules[amdName] = cache.dependencies;

      async.map(
        cache.dependencies || [],
        function(resource, callback) {
          parseFile(resource, context, callback);
        },
        function(err, data) {
          if (data) {
            if (cache) {
              // If we have AMD content then handle it
              _.each(cache.defined, function(defined) {
                data.push(module.exports.defaultLoader.output(defined));
              });
            } else {
              // Otherwise pass through
              data.push(resource);
            }

            // Reduce everything to a tidy list
            data = _.compact(_.flatten(data));
          }

          complete(err, data);
        });
    });
  } else {
    complete(undefined, resource);
  }
}

function generator(string) {
  // TODO : Handle proper source mapping here
  var ret = function(context, callback) { callback(undefined, {data: string, generated: true, noSeparator: true}); };
  ret.stringValue = string;
  ret.sourceFile = undefined;
  ret.ignoreWarnings = true;
  return ret;
}
