var _ = require('underscore'),
    async = require('async'),
    build = require('../build'),
    defineParser = require('../util/define-parser'),
    fu = require('../fileUtil'),
    resources = require('../util/resources'),
    templateUtil = require('../templateUtil');

module.exports = {
  loaders: {},
  generator: generator,

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
              parseFile(resource, context, true, callback);
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
  },
  amdName: function(path) {
    if (/js\/views\/(.*)\.js$/.exec(path)) {
      return 'view!' + RegExp.$1;
    }
  },

  canOutput: function(data, resource, context) {
    return data.view;
  },
  output: function(defined, isAppModule, dependencies, context) {
    var viewName = templateUtil.escapeJsString(defined.name.replace(/^.*!/, '')),
        fileId = context.fileCache.amdFileModules[defined.name];

    if (!_.isNumber(fileId)) {
      throw new Error('Missing module definition for ' + defined.name);
    }

    return [
      generator('lwmd[' + fileId + '] = '),
      generator('Thorax.Views["' + viewName + '"] = ('),
      generator(defined.source),
      generator(')(' + dependencies + ');\n'),

      generator('lwmd[' + fileId + '].prototype.name = "' + viewName + '";\n'),
    ];
  },
  lookup: function(name, isAppModule, context) {
    var fileId = context.fileCache.amdFileModules['view!' + name];
    if (_.isNumber(fileId)) {
      return 'lwmd[' + fileId + ']';
    } else {
      return 'Thorax.Views["' + templateUtil.escapeJsString(name) + '"]';
    }
  }
};

// Left out of the loaders object so we do not have to worry about enumaration order
module.exports.defaultLoader = {
  resource: function(name, resource, context) {
    if (name.indexOf('.') === -1) {
      return 'js/' + name + '.js';
    }
    return resource;
  },
  amdName: function(path) {
    if (/js\/(.*)\.js$/.exec(path)) {
      return RegExp.$1;
    } else {
      return path;
    }
  },

  output: function(defined, isAppModule, dependencies, context) {
    if (!defined.amd) {
      return generator(defined.source);
    } else {
      return [
        generator('wmd["' + templateUtil.escapeJsString(defined.name) + '"] = ('),
        generator(defined.source),
        generator(')(' + dependencies + ');\n')
      ];
    }
  },
  lookup: function(name, isAppModule, context) {
    // WARN : We are assuming that the dependency has been looked up at some point
    var isModule = context.platformCache.amdAppModules[name] || context.fileCache.amdFileModules[name];
    if (isModule) {
      return 'wmd["' + templateUtil.escapeJsString(name) + '"]';
    }
  }
};

function parseFile(resource, context, isRoot, complete) {
  var cache;

  var resourceName = resources.source(resource);

  if (!resourceName) {
    return complete(undefined, resource);
  }

  var loaderInfo = loaderFromName(resourceName),
      loader = loaderInfo.loader,
      amdName = loaderInfo.amdName;

  if (!isRoot && loader && loader.resource) {
    resource = loader.resource(loaderInfo.name, resource, context);
    resourceName = resources.source(resource);
  }

  var isAppModule = context.config.isAppModule(context.module),
      inApp = context.platformCache.amdAppModules && (context.platformCache.amdAppModules[amdName] != null),
      inFile = context.fileCache.amdFileModules[amdName] != null,
      fileId = _.keys(context.fileCache.amdFileModules).length + 1;

  if (!isRoot && (inApp || inFile)) {
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
        } catch (err) {
          context.event.emit('debug', 'Failed to parse AMD file: ' + err);
          data = false;
        }

        if (data) {
          cache = {
            defined: _.map(data, function(data) {
              var loader = _.find(module.exports.loaders, function(loader) {
                return loader.canOutput && loader.canOutput(data, resource, context);
              }) || module.exports.defaultLoader;

              var ret = _.omit(data, 'define');
              if (data.define) {
                ret.amd = data.define;
                ret.name = ret.name || amdName;
              }
              ret.loader = loader;
              return ret;
            }),
            dependencies: _.compact(_.flatten(_.pluck(data, 'deps')))
          };

          // If we have no AMD content then leave this as is
          if (!_.any(cache.defined, function(define) { return define.amd; })) {
            cache = false;
          } else {
            context.event.emit('debug', 'Dependencies ' + cache.dependencies + ' found for ' + amdName);
          }
        } else {
          cache = false;
        }

        fu.setFileArtifact(resourceName, 'amd', cache);
      }
      if (isAppModule) {
        context.platformCache.amdAppModules[amdName] = !!cache;
      }
      context.fileCache.amdFileModules[amdName] = cache && fileId;

      async.map(
        cache.dependencies || [],
        function(resource, callback) {
          parseFile(resource, context, false, callback);
        },
        function(err, data) {
          if (data) {
            if (cache) {
              // If we have AMD content then handle it
              _.each(cache.defined, function(defined) {
                var dependencies = lookupDepenencies(defined.deps, isAppModule, context),
                    output = defined.loader.output || module.exports.defaultLoader.output;
                data.push(output(defined, isAppModule, dependencies, context));
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

function loaderFromName(name) {
  var amdName = name,
      loader = module.exports.defaultLoader;
  if (/^(.*)!(.*)$/.test(name)) {
    amdName = name;

    var loaderName = RegExp.$1;
    loader = module.exports.loaders[loaderName],
    name = RegExp.$2;
  } else {
    var remapedName = amdName;
    _.find(module.exports.loaders, function(loader) {
      return remapedName = loader.amdName && loader.amdName(name);
    });
    amdName = remapedName || module.exports.defaultLoader.amdName(amdName);
  }

  return {
    loader: loader,
    amdName: amdName,
    name: name
  };
}

function lookupDepenencies(dependencies, isAppModule, context) {
  return _.map(dependencies, function(dep) {
    var loaderInfo = loaderFromName(dep);

    return loaderInfo.loader.lookup && loaderInfo.loader.lookup(loaderInfo.name, isAppModule, context) || 'undefined';
  }).join(', ');
}

function generator(string) {
  // TODO : Handle proper source mapping here
  var ret = function(context, callback) { callback(undefined, {data: string, generated: true, noSeparator: true}); };
  ret.stringValue = string;
  ret.sourceFile = undefined;
  ret.ignoreWarnings = true;
  return ret;
}
