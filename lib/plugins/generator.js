var templateUtil = require('../templateUtil');

module.exports = function(context, next) {
  var resource = context.resource,
      package = context.package,
      config = context.config,
      options = context.options;

  if (resource.map) {
    // We do not generate a module map if we are in combine mode
    if (config.combineModules(package)) {
      return;
    }

    var buildModuleMap = function(callback) {
      var modules = config.moduleList(package),
          map = {};
      modules.forEach(function(module) {
        var routes = config.routeList(module);
        if (routes) {
          for (var route in routes) {
            map[route] = module + '.js';
          }
        }
      });

      templateUtil.loadModuleMap(map, config.moduleMap(), config.loadPrefix() + context.platformPath, callback);
    };
    buildModuleMap.sourceFile = 'module_map.json';
    return buildModuleMap;
  } else if (resource.packageConfig) {
    var packageConfigGen = function(callback) {
      templateUtil.loadPackageConfig(config.packageConfig(), options.packageConfigFile, callback);
    };
    packageConfigGen.sourceFile = 'package_config.json';
    return packageConfigGen;
  }

  return next();
};
