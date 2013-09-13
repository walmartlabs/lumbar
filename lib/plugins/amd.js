var _ = require('underscore'),
    async = require('async'),
    build = require('../build'),
    defineParser = require('../util/define-parser'),
    fu = require('../fileUtil'),
    path = require('path'),
      join = path.join,
    resources = require('../util/resources'),
    templateUtil = require('../templateUtil');

module.exports = {
  loaders: {},
  generator: generator,
  registerOutput: function(path, context) {
    var fileId = context.fileCache.amdFileModules[path],
        ret = 'lwmd[' + fileId + '] = ';

    if (!_.isNumber(fileId)) {
      throw new Error('Missing module definition for ' + path);
    }

    return generator(ret);
  },

  priority: 2,    // After mixins

  resourceList: function(context, next, complete) {
    if (context.config.attributes.amd
        && build.filterResource(context.resource, context)) {
      next(function(err, resources) {
        if (err) {
          return complete(err);
        }

        if (!context.fileCache.amdFileModules) {
          context.fileCache.amdFileModules = {};
        }
        if (context.config.isAppModule(context.module) && !context.platformCache.amdAppModules) {
          context.platformCache.amdAppModules = context.fileCache.amdFileModules;
        }

        async.map(
            resources,
            function(resource, callback) {
              parseFile(resource, undefined, context, true, callback);
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
        fileId = context.fileCache.amdFileModules[defined.resourceName];

    return [
      module.exports.registerOutput(defined.resourceName, context),
      generator('Thorax.Views["' + viewName + '"] = ('),
      generator(defined.source, defined.resourceName),
      generator(')(' + dependencies + ');\n'),

      generator('lwmd[' + fileId + '].prototype.name = "' + viewName + '";\n')
    ];
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
      return generator(defined.source, defined.resourceName);
    } else {
      return [
        module.exports.registerOutput(defined.resourceName, context),
        generator('(' + defined.source, defined.resourceName),
        generator(')(' + dependencies + ');\n')
      ];
    }
  },
  lookup: function(name, path, isAppModule, context) {
    // WARN : We are assuming that the dependency has been looked up at some point
    var appId = context.platformCache.amdAppModules[path],
        fileId = context.fileCache.amdFileModules[path],
        lookup = 'lwmd[',
        id = fileId;

    if (appId) {
      lookup = 'wmd[';
      id = appId;
    }
    if (id) {
      return lookup + id + ']';
    }
  }
};

function parseFile(resource, library, context, isRoot, complete) {
  /*jshint eqnull: true */
  var cache;

  var resourceName = resources.source(resource);
  if (!resourceName || !_.isString(resourceName) || resource.amd === false) {
    return complete(undefined, resource);
  }

  var loaderInfo = loaderFromName(resourceName, context),
      loader = loaderInfo.loader,
      amdName = loaderInfo.amdName;

  library = loaderInfo.library || library || resource.library;

  if (!isRoot && loader && loader.resource) {
    resource = loader.resource(loaderInfo.name, resource, context);

    // Map the returned resource name to the library
    resourceName = join((library && library.root) || '', resources.source(resource));
  }

  // Remap the amdName for the current library
  if (library && amdName.indexOf(':') < 0) {
    amdName = amdName.replace(/^(.*!)?(.*)$/, function(match, loader, name) { return (loader || '') + library.name + ':' + name; });
  }

  var isAppModule = context.config.isAppModule(context.module),
      isTopModule = !isAppModule && context.config.isTopLevel(context.module),
      inApp = context.platformCache.amdAppModules && (context.platformCache.amdAppModules[resourceName] != null),
      inFile = context.fileCache.amdFileModules[resourceName] != null,
      fileId = _.keys(context.fileCache.amdFileModules).length + 1;

  if (!isRoot && ((!isTopModule && inApp) || inFile)) {
    return complete();
  }

  if (!resource.global && /\bjs\/.*\.js$/.test(resourceName)) {
    // Handle any overrides as necessary
    resource = resources.map(resource, library);
    var fileName = resources.source(resource);

    // Flag state now so we don't read multiple times due to IO wait in the readFile call
    context.fileCache.amdFileModules[resourceName] = true;

    cache = fu.readFileArtifact(fileName, 'amd', function(err, data) {
      if (err) {
        return complete(err);
      }
      var cache = data.artifact;

      // If we have something in the cache, shortcircuit the parsing
      if (cache === undefined) {
        try {
          data = defineParser(data.data.toString(), {file: fileName});
        } catch (err) {
          context.event.emit('log', 'Failed to parse AMD file: ' + fileName + ' ' + err);
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
                ret.resourceName = resourceName;
              }
              ret.loader = loader;
              return ret;
            }),
            dependencies: _.compact(_.flatten(_.pluck(data, 'deps')))
          };

          // If we have no AMD content then leave this as is
          var defines = _.filter(cache.defined, function(define) { return define.amd; });
          if (!defines.length) {
            cache = false;
          } else if (defines.length > 1) {
            return complete(new Error('Multiple modules defined in "' + fileName + '"'));
          } else {
            context.event.emit('debug', 'Dependencies ' + cache.dependencies + ' found for ' + amdName);
          }
        } else {
          cache = false;
        }

        fu.setFileArtifact(fileName, 'amd', cache);
      }
      context.fileCache.amdFileModules[resourceName] = cache && fileId;

      async.map(
        cache.dependencies || [],
        function(resource, callback) {
          parseFile(resource, library, context, false, callback);
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
    if (library) {
      resource = resources.map(resource, library);
    }

    complete(undefined, resource);
  }
}

function loaderFromName(name, context) {
  var amdName = name,
      loader = module.exports.defaultLoader,
      library;
  if (/^(.*)!(.*)$/.test(name)) {
    amdName = name;

    var loaderName = RegExp.$1;
    loader = module.exports.loaders[loaderName] || loader,
    name = RegExp.$2;
  } else {
    var remapedName = amdName;
    _.find(module.exports.loaders, function(loader) {
      return remapedName = (loader.amdName && loader.amdName(name));
    });
    amdName = remapedName || module.exports.defaultLoader.amdName(amdName);
  }

  if (/^(.*):(.*)$/.test(name)) {
    library = context.libraries.getConfig(RegExp.$1);
    name = RegExp.$2;
  }

  return {
    loader: loader,
    amdName: amdName,
    name: name,
    library: library
  };
}

function lookupDepenencies(dependencies, isAppModule, context) {
  return _.map(dependencies, function(dep) {
    var loaderInfo = loaderFromName(dep, context);

    dep = resources.source(loaderInfo.loader.resource(loaderInfo.name, undefined, context));
    if (loaderInfo.loader.lookup) {
      return loaderInfo.loader.lookup(loaderInfo.name, dep, isAppModule, context) || 'undefined';
    }

    // Lookup javascript resources using normal means if the loader does not define any helpers
    if (/\.js$/.test(dep)) {
      return module.exports.defaultLoader.lookup(loaderInfo.name, dep, isAppModule, context) || 'undefined';
    }

    return 'undefined';
  }).join(', ');
}

function generator(string, source) {
  // TODO : Handle proper source mapping here
  var ret = function(context, callback) { callback(undefined, {data: string, generated: true, noSeparator: true}); };
  ret.stringValue = string;
  ret.sourceFile = source;
  ret.ignoreWarnings = true;
  return ret;
}
