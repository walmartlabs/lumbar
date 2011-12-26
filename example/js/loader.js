/* BEGIN js/loader.js */
exports.moduleMap = function(map, loadPrefix) {
  /*
  We are ignoring load prefix here as the index files are in the same directory as the source.
  Depending on the environment this value should be prepended to the route source file name.
  */

  function loader(name) {
    return function() {
      $script(name, function() {
        // Reload with the new route
        Backbone.history.loadUrl();
      });
    };
  }

  var routes = {},
    handlers = {
      routes: routes
    };

  // For each route create a handler that will load the associated module on request
  for (var route in map) {
    var name = map[route];
    var handlerName = "loader" + name;
    routes[route] = handlerName
    handlers[handlerName] = loader(name);
  }

  new (Backbone.Router.extend(handlers));
};
/* END js/loader.js */
