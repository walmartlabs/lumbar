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

        function fileList(module) {
          var configs = context.fileNamesForModule('styles', module);
          configs = configs.sort(function(a, b) { return a.pixelDensity - b.pixelDensity; });
          return configs.map(function(config, i) {
            var path = config.fileName.path;
            if (path.indexOf(context.platformPath) === 0) {
              path = path.substring(context.platformPath.length);
            }
            var ret = { href: path + '.' + config.fileName.extension };

            if (config.pixelDensity) {
              if (0 < i) {
                ret.minRatio = configs[i-1].pixelDensity + 0.01;
              }
              if (i < configs.length - 1) {
                ret.maxRatio = configs[i+1].pixelDensity - 0.01;
              }
            }
            return ret;
          });
          return configs;
        }

        if (context.combined) {
          map = {base: fileList()};
        } else {
          var attr = context.config.attributes || {},
              app = attr.application || {},
              modules = config.moduleList(package);

          map = {modules: {}, routes: {}};
          if (app.module) {
            map.base = fileList(app.module);
          }

          modules.forEach(function(module) {
            var routes = config.routeList(module);
            if (routes) {
              map.modules[module] = fileList(module);

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
