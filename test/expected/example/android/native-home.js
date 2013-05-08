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
var Example;
Example = (function() {
  var module = {exports: {}};
  var exports = module.exports;
  var Example = exports;

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
var Bridge = exports.Bridge = {
  sendMessage: function() {}
};
  
;;
Bridge.nativeHost = 'android';

;;
module.exports.config = {
  "port": 8080,
  "securePort": 8081
}
;
/* lumbar module map */
module.exports.moduleMap({"base":{"css":[{"href":"native-home.css","maxRatio":1.25},{"href":"native-home@1.5x.css","minRatio":1.25}],"js":"native-home.js"}});


  if (Example !== module.exports) {
    console.warn("Example internally differs from global");
  }
  return module.exports;
}).call(this);

Example['home'] = (function() {
  var module = {exports: {}};
  var exports = module.exports;
  Example['home'] = exports;

  /* router : home */
module.name = "home";
module.routes = {"":"home","home":"home"};
/* handsfree : templates/home/footer.handlebars*/
Example.templates['templates/home/footer.handlebars'] = Handlebars.compile('<div>Footer</div>\n');
/* handsfree : templates/home/home.handlebars*/
Example.templates['templates/home/home.handlebars'] = Handlebars.compile('Home\n ');
Example.Views.Home = Backbone.View.extend({
  el: ".layout",

  render: function() {
    $(this.el).html(Example.templates('templates/home/home.handlebars'));
    $(this.el).append(Example.templates('templates/home/footer.handlebars'));
  }
});

;;
Example.Router.create(module, {
  home: function() {
    var home = new Example.Views.Home();
    home.render();
  }
});

;;


  if (Example['home'] !== module.exports) {
    console.warn("Example['home'] internally differs from global");
  }
  return module.exports;
}).call(this);
