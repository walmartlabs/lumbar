var fu = require('../fileUtil'),
    handlebars = require('handlebars');

const TEMPLATE = "/* router : {{{name}}} */\nnamespace.routes = {{{routes}}};\n";
var routerTemplate = handlebars.compile(TEMPLATE);

function loadRouter(context, name, routes, callback) {
  callback(
    undefined,
    routerTemplate({
      name: name,
      routes: JSON.stringify(routes)
    })
  );
}

module.exports = {
  moduleResources: function(context, next) {
    var module = context.module;

    // Generate the router if we have the info for it
    if (module.router || module.controller) {
      var ret = (module.support || []).slice();
      ret.push({ router: module.router || module.controller, routes: module.routes });
      ret.push(module.router || module.controller);

      return ret;
    } else {
      return next();
    }
  },
  resource: function(context, next) {
    var resource = context.resource;

    if (resource.router) {
      var routerGen = function(callback) {
        loadRouter(context, resource.router, resource.routes, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      routerGen.sourceFile = resource.router;
      return routerGen;
    }

    return next();
  }
};
