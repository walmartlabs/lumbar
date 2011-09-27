exports.moduleMap = function(map, loadPrefix) {
  loadPrefix = loadPrefix || '';

  function loader(name) {
    return function() {
      $script(loadPrefix + name, function() {
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
