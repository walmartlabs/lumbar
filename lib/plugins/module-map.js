var templateUtil = require('../templateUtil');

module.exports = function(context, next) {
  var resource = context.resource,
      package = context.package,
      config = context.config;

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
  }

  return next();
};
