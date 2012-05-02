var _ = require('underscore'),
    async = require('async'),
    handlebars = require('handlebars'),
    path = require('path'),
      dirname = path.dirname;

var moduleMapTemplate;

function getModuleMapTemplate(fileUtil) {
  if (!moduleMapTemplate) {
    moduleMapTemplate = handlebars.compile(fileUtil.readFileSync(__dirname + '/module-map.handlebars').toString());
  }
  return moduleMapTemplate;
};

function loadModuleMap(map, mapper, fileUtil, callback) {
  var moduleMapTemplate = getModuleMapTemplate(fileUtil);

  // This bit of voodoo forces uniform ordering for the output under node. This is used primarily for
  // testing purposes.
  map = (function orderObject(map) {
    var ret = _.isArray(map) ? [] : {};
    _.keys(map).sort().forEach(function(key) {
      var value = map[key];
      ret[key] = _.isObject(value) ? orderObject(value) : value;
    });
    return ret;
  })(map);

  callback(
    undefined,
    moduleMapTemplate({
      moduleMapper: mapper,
      map: JSON.stringify(map)
    })
  );
};

function buildMap(context, callback) {
  if (context.combined) {
    moduleConfig(context, undefined, function(err, config, prefix) {
      callback(err, { base: config }, prefix);
    });
  } else {
    var attr = context.config.attributes || {},
        app = attr.application || {},
        modules = context.config.moduleList(context.package);

    var map = {modules: {}, routes: {}},
        commonPrefix;

    async.forEach(modules, function(module, callback) {
      moduleConfig(context, module, function(err, config, prefix) {
        if (err) {
          return callback(err);
        }

        if (app.module === module) {
          map.base = config;
        } else {
          map.modules[module] = config;

          var routes = context.config.routeList(module);
          if (routes) {
            for (var route in routes) {
              map.routes[route] = module;
            }
          }
        }
        commonPrefix = findPrefix(prefix, commonPrefix);

        callback();
      });
    },
    function(err) {
      callback(err, map, commonPrefix);
    });
  }
}

function stripPrefix(map, prefix) {
  if (!prefix) {
    return;
  }

  function stripModule(module) {
    if (module.js) {
      module.js = stripList(module.js);
    }
    if (module.css) {
      module.css = stripList(module.css);
    }
  }
  function stripList(list) {
    if (_.isArray(list)) {
      return list.map(stripEntry);
    } else {
      return stripEntry(list);
    }
  }
  function stripEntry(entry) {
    if (entry.href) {
      entry.href = entry.href.substring(prefix.length);
      return entry;
    } else {
      return entry.substring(prefix.length);
    }
  }
  if (map.base) {
    stripModule(map.base);
  }
  if (map.modules) {
    _.each(map.modules, stripModule);
  }
}
function moduleConfig(context, module, callback) {
  var ret = {},
      commonPrefix;
  var preload = module && context.config.module(module).preload;
  if (preload) {
    ret.preload = preload;
  }
  async.forEach([{key: 'js', mode: 'scripts'}, {key: 'css', mode: 'styles'}], function(obj, callback) {
    fileList(context, obj.mode, module, function(err, list, prefix) {
      ret[obj.key] = list;
      commonPrefix = findPrefix(prefix, commonPrefix);
      callback(err);
    });
  },
  function(err) {
    callback(err, ret, commonPrefix);
  });
}
function fileList(context, mode, module, callback) {
  // Check to see if we even have this type of resource
  var modules = !context.combined ? [ module ] : context.config.moduleList(context.package);
  async.some(modules, function(module, callback) {
      var resourceContext = context.clone();
      resourceContext.mode = mode;
      resourceContext.module = context.config.module(module);

      resourceContext.plugins.moduleResources(resourceContext, function(err, resources) {
        callback((resources || []).length);
      });
  },
  function(hasResource) {
    if (!hasResource) {
      return callback();
    }

    // Output the config
    context.fileNamesForModule(mode, module, function(err, configs) {
      if (err) {
        return callback(err);
      }

      var prefix;
      configs = configs.sort(function(a, b) { return a.pixelDensity - b.pixelDensity; });
      configs = configs.map(function(config, i) {
        var path = config.fileName.path,
            ret = path + '.' + config.fileName.extension;

        if (config.pixelDensity) {
          ret = { href: ret };
          if (0 < i) {
            ret.minRatio = configs[i-1].pixelDensity + (config.pixelDensity - configs[i-1].pixelDensity) / 2;
          }
          if (i < configs.length - 1) {
            ret.maxRatio = config.pixelDensity + (configs[i+1].pixelDensity - config.pixelDensity) / 2;
          }
        }

        // Update the prefix tracker
        prefix = findPrefix(path, prefix);

        return ret;
      });

      var ret;
      if (configs.length === 1) {
        ret = configs[0];
      } else if (configs.length) {
        ret = configs;
      }
      callback(undefined, ret, prefix);
    });
  });
}

function findPrefix(path, prefix) {
  if (path == null) {
    return prefix;
  }
  if (prefix == null) {
    // Ensure that we get 'x' for strings of type 'x/'
    prefix = dirname(path + 'a') + '/';
  }
  for (var i = 0, len = prefix.length; i < len; i++) {
    if (path.charAt(i) !== prefix.charAt(i)) {
      return prefix.substring(0, i);
      break;
    }
  }
  return prefix;
}

module.exports = {
  mode: 'scripts',
  priority: 50,

  buildMap: buildMap,

  resource: function(context, next, complete) {
    var config = context.config;

    if (context.resource['module-map']) {
      var buildModuleMap = function(context, callback) {
        buildMap(context, function(err, map, prefix) {
          if (err) {
            callback(err);
          } else {
            var moduleMap = config.attributes.moduleMap || 'module.exports.moduleMap';
            stripPrefix(map, prefix);
            loadModuleMap(map, moduleMap, context.fileUtil, function(err, data) {
              callback(err, data && {data: data, noSeparator: true});
            });
          }
        });
      };
      buildModuleMap.sourceFile = undefined;
      complete(undefined, buildModuleMap);
    } else {
      next(complete);
    }
  }
};
