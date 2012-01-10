var handlebars = require('handlebars');

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
  mode: 'scripts',
  priority: 50,

  moduleResources: function(context, next, complete) {
    next(function(err, ret) {
      if (err) {
        return complete(err);
      }

      // Generate the router if we have the info for it
      var module = context.module;
      if (module.routes) {
        ret.unshift({ routes: module.routes });
      }

      complete(undefined, ret);
    });
  },
  resource: function(context, next, complete) {
    var resource = context.resource,
        module = context.module.name;

    if (resource.routes) {
      var routerGen = function(context, callback) {
        loadRouter(context, module, resource.routes, function(err, data) {
          callback(err, data && {data: data, noSeparator: true});
        });
      };
      routerGen.sourceFile = undefined;
      complete(undefined, routerGen);
    } else {
      next(complete);
    }
  }
};
