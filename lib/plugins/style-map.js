var fu = require('../fileUtil'),
    handlebars = require('handlebars');

const DEFAULT_CONFIG_TEMPLATE = "{{{mapper}}}({{{map}}}, '{{{loadPrefix}}}');\n";
var template = handlebars.compile(DEFAULT_CONFIG_TEMPLATE);

function loadMap(mapper, map, loadPrefix, callback) {
};

module.exports = {
  resource: function(context, next) {
    var resource = context.resource,
        package = context.package,
        config = context.config;

    if (resource.src === 'style_map.json' || resource.src === 'style-map.json') {
      var buildMap = function(callback) {
        var modules = config.moduleList(package),
            map = {};
        modules.forEach(function(module) {
          var routes = config.routeList(module);
          if (routes) {
            for (var route in routes) {
              map[route] = (context.combined ? package : module) + '.css';
            }
          }
        });

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
