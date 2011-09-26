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


module.exports = {
  resource: function(context, next) {
    var resource = context.resource,
        package = context.package,
        config = context.config;

    if (resource === 'module_map.json' || resource === 'module-map.json') {
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

        loadModuleMap(map, config.moduleMap(), config.loadPrefix() + context.platformPath, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      buildModuleMap.sourceFile = undefined;
      return buildModuleMap;
    }

    return next();
  }
};
