var async = require('async'),
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
  var resourceContext = context.clone(),
      hasResource;
  resourceContext.mode = mode;

  if (!context.combined) {
    resourceContext.module = context.config.module(module);
    hasResource = (resourceContext.plugins.moduleResources(resourceContext) || []).length;
  } else {
    var modules = context.config.moduleList(context.package);
    modules.forEach(function(module) {
      resourceContext.module = context.config.module(module);
      hasResource = hasResource || (resourceContext.plugins.moduleResources(resourceContext) || []).length;
    });
  }
  if (!hasResource) {
    return callback();
  }

  // Output the config
  var configs = context.fileNamesForModule(mode, module),
  configs = configs.sort(function(a, b) { return a.pixelDensity - b.pixelDensity; });
  configs = configs.map(function(config, i) {
    var path = config.fileName.path;
    if (path.indexOf(context.platformPath) === 0) {
      path = path.substring(context.platformPath.length);
    }
    var ret = path + '.' + config.fileName.extension;

    if (config.pixelDensity) {
      ret = { href: ret };
      if (0 < i) {
        ret.minRatio = configs[i-1].pixelDensity + (config.pixelDensity - configs[i-1].pixelDensity) / 2;
      }
      if (i < configs.length - 1) {
        ret.maxRatio = config.pixelDensity + (configs[i+1].pixelDensity - config.pixelDensity) / 2;
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
}

module.exports = {
  resource: function(context, next) {
    var config = context.config;

    if (context.resource['module-map']) {
      var buildModuleMap = function(callback) {
        buildMap(context, function(err, map) {
          if (err) {
            callback(err);
          } else {
            var moduleMap = config.attributes.moduleMap || 'module.exports.moduleMap';
            loadModuleMap(map, moduleMap, config.loadPrefix() + context.platformPath, function(err, data) {
              callback(err, data && {data: data, noSeparator: true});
            });
          }
        });
      };
      buildModuleMap.sourceFile = undefined;
      return buildModuleMap;
    }

    return next();
  }
};
