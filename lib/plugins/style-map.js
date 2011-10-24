var fu = require('../fileUtil'),
    handlebars = require('handlebars');

const DEFAULT_CONFIG_TEMPLATE = "{{{mapper}}}({{{map}}}, '{{{loadPrefix}}}');\n";
var template = handlebars.compile(DEFAULT_CONFIG_TEMPLATE);

module.exports = {
  resource: function(context, next) {
    var resource = context.resource,
        package = context.package,
        config = context.config;

    if (resource.src === 'style_map.json' || resource.src === 'style-map.json') {
      var buildMap = function(callback) {
        var map;

        if (context.combined) {
          map = {base: package + '.css'};
        } else {
          var attr = context.config.attributes || {},
              app = attr.application || {},
              modules = config.moduleList(package);

          map = {modules: {}, routes: {}};
          if (app.module) {
            map.base = app.module + '.css';
          }

          modules.forEach(function(module) {
            var routes = config.routeList(module);
            if (routes) {
              map.modules[module] = module + '.css';

              for (var route in routes) {
                map.routes[route] = module;
              }
            }
          });
        }

        var mapper = config.attributes.styleMap || 'module.exports.styleMap';
        callback(
          undefined,
          {
            data: template({
              mapper: mapper,
              loadPrefix: config.loadPrefix() + context.platformPath,
              map: JSON.stringify(map)
            }),
            noSeparator: true
          });
      };
      buildMap.sourceFile = undefined;
      return buildMap;
    }

    return next();
  }
};
