var fu = require('../fileUtil'),
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

function buildMap(context) {
  var map;

  if (context.combined) {
    map = { base: moduleConfig(context) };
  } else {
    var attr = context.config.attributes || {},
        app = attr.application || {},
        modules = context.config.moduleList(context.package);

    map = {modules: {}, routes: {}};
    if (app.module) {
      map.base = moduleConfig(context, app.module);
    }

    modules.forEach(function(module) {
      if (app.module === module) {
        return;
      }

      map.modules[module] = moduleConfig(context, module);

      var routes = context.config.routeList(module);
      if (routes) {
        for (var route in routes) {
          map.routes[route] = module;
        }
      }
    });
  }
  return map;
}

function moduleConfig(context, module) {
  return {
    js: fileList(context, 'scripts', module),
    css: fileList(context, 'styles', module)
  };
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
    return undefined;
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
  if (configs.length === 1) {
    return configs[0];
  } else if (!configs.length) {
    return undefined;
  } else {
    return configs;
  }
}

module.exports = {
  resource: function(context, next) {
    var config = context.config;

    if (context.resource['module-map']) {
      var buildModuleMap = function(callback) {
        var moduleMap = config.attributes.moduleMap || 'module.exports.moduleMap';
        loadModuleMap(buildMap(context), moduleMap, config.loadPrefix() + context.platformPath, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      buildModuleMap.sourceFile = undefined;
      return buildModuleMap;
    }

    return next();
  }
};
