var fu = require('../fileUtil'),
    handlebars = require('handlebars');

function setRouterTemplate(configCache, path) {
  configCache.routerTemplate = handlebars.compile(fu.readFileSync(path));
};
function getRouterTemplate(context) {
  if (!context.configCache.routerTemplate) {
    var attrs = context.config.attributes,
        templatePath = attrs.routerTemplate || attrs.controllerTemplate || (__dirname + '/router.handlebars');
    setRouterTemplate(context.configCache, templatePath);
  }
  return context.configCache.routerTemplate;
}
function loadRouter(context, name, routes, callback) {
  fu.readFile(name, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var routerTemplate = getRouterTemplate(context);
    callback(
      undefined,
      routerTemplate({
        name: name,
        routerLogic: data,
        routes: JSON.stringify(routes)
      })
    );
  });
}

module.exports = function(context, next) {
  var resource = context.resource;

  if (resource.router) {
    var routerGen = function(callback) {
      loadRouter(context, resource.router, resource.routes, callback);
    };
    routerGen.sourceFile = resource.router;
    return routerGen;
  }

  return next();
};
