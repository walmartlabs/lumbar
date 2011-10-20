var fu = require('../fileUtil'),
    handlebars = require('handlebars');

const TEMPLATE = "/* router : {{{name}}} */\nmodule.name = \"{{{name}}}\";\nmodule.routes = {{{routes}}};\n";
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
    var ret = next();

    // Generate the router if we have the info for it
    var module = context.module;
    if (module.routes) {
      ret.unshift({ routes: module.routes });
    }

    return ret;
  },
  resource: function(context, next) {
    var resource = context.resource;

    if (resource.routes) {
      var routerGen = function(callback) {
        loadRouter(context, context.module.name, resource.routes, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      routerGen.sourceFile = undefined;
      return routerGen;
    }

    return next();
  }
};
