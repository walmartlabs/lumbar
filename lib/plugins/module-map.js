var _ = require('underscore'),
    async = require('async'),
    fu = require('../fileUtil'),
    handlebars = require('handlebars');

var moduleMapTemplate;

function getModuleMapTemplate() {
  if (!moduleMapTemplate) {
    moduleMapTemplate = handlebars.compile(fu.readFileSync(__dirname + '/module-map.handlebars'));
  }
  return moduleMapTemplate;
};

function loadModuleMap(map, mapper, loadPrefix, callback) {
  var moduleMapTemplate = getModuleMapTemplate();
  callback(
    undefined,
    moduleMapTemplate({
      moduleMapper: mapper,
      loadPrefix: loadPrefix,
      map: JSON.stringify(map)
    })
  );
};

function buildMap(context, callback) {
  if (context.combined) {
    moduleConfig(context, undefined, function(err, config) {
      callback(err, { base: config });
    });
  } else {
    var attr = context.config.attributes || {},
        app = attr.application || {},
        modules = context.config.moduleList(context.package);

    var map = {modules: {}, routes: {}};

    async.forEach(modules, function(module, callback) {
      moduleConfig(context, module, function(err, config) {
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

        callback();
      });
    },
    function(err) {
      callback(err, map);
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
  var ret = {};

  async.forEach([{key: 'js', mode: 'scripts'}, {key: 'css', mode: 'styles'}], function(obj, callback) {
    fileList(context, obj.mode, module, function(err, list) {
      ret[obj.key] = list;
      callback(err);
    });
  },
  function(err) {
    callback(err, ret);
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
        var prefix = context.fileCache.commonFilePrefix;
        if (prefix == null) {
          prefix = context.fileCache.commonFilePrefix = path;
        }
        for (var i = 0, len = prefix.length; i < len; i++) {
          if (path.charAt(i) !== prefix.charAt(i)) {
            context.fileCache.commonFilePrefix = prefix.substring(0, i);
            break;
          }
        }

        return ret;
      });

      var ret;
      if (configs.length === 1) {
        ret = configs[0];
      } else if (configs.length) {
        ret = configs;
      }
      callback(undefined, ret);
    });
  });
}

module.exports = {
  mode: 'scripts',

  resource: function(context, next, complete) {
    var config = context.config;

    if (context.resource['module-map']) {
      var buildModuleMap = function(context, callback) {
        buildMap(context, function(err, map) {
          if (err) {
            callback(err);
          } else {
            var moduleMap = config.attributes.moduleMap || 'module.exports.moduleMap';
            stripPrefix(map, context.fileCache.commonFilePrefix);
            loadModuleMap(map, moduleMap, config.loadPrefix() + context.fileCache.commonFilePrefix, function(err, data) {
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
