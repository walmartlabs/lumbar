var Example;
_.extend(exports, {
  Views: {},
  templates: function(name, context) {
    return exports.templates[name](context);
  }
});

$(document).ready(function() {
  if (exports.Views.Header) {
    var header = new exports.Views.Header();
    header.render();
  }

  Backbone.history.start();
});
;;
exports.Router = {
  create: function(module, protoProps, classProps) {
    return new (Backbone.Router.extend(_.extend({}, module, protoProps), classProps));
  }
};
;;
Example = (function() {
var module = {exports: {}};
var exports = module.exports;
_.extend(exports, {
  Views: {},
  templates: function(name, context) {
    return exports.templates[name](context);
  }
});

$(document).ready(function() {
  if (exports.Views.Header) {
    var header = new exports.Views.Header();
    header.render();
  }

  Backbone.history.start();
});
;;
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
;;
exports.Views.Header = Backbone.View.extend({
  el: ".header",

  render: function() {
    $(this.el).html(exports.templates('templates/header.handlebars'));
  }
});
;;
/* handsfree : templates/header.handlebars*/
module.exports.templates['templates/header.handlebars'] = Handlebars.compile('Header\n');
module.exports.config = {
  "port": 8080,
  "securePort": 8081
}
;
/* lumbar module map */
module.exports.moduleMap({"modules":{"home":{"js":"home.js","css":[{"href":"home.css","maxRatio":1.5},{"href":"home@2x.css","minRatio":1.5}]}},"routes":{"":"home","home":"home"},"base":{"js":"base.js","css":[{"href":"base.css","maxRatio":1.5},{"href":"base@2x.css","minRatio":1.5}]}}, 'web/');
return module.exports;
}).call(this);
