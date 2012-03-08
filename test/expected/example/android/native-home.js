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
return module.exports;
}).call(this);
Example['home'] = (function() {
var module = {exports: {}};
var exports = module.exports;
/* router : home */
module.name = "home";
module.routes = {"":"home","home":"home"};
Example.Views.Home = Backbone.View.extend({
  el: ".layout",

  render: function() {
    $(this.el).html(Example.templates('templates/home/home.handlebars'));
    $(this.el).append(Example.templates('templates/home/footer.handlebars'));
  }
});
;;
/* handsfree : templates/home/footer.handlebars*/
Example.templates['templates/home/footer.handlebars'] = Handlebars.compile('<div>Footer</div>\n');
/* handsfree : templates/home/home.handlebars*/
Example.templates['templates/home/home.handlebars'] = Handlebars.compile('Home\n ');
Example.Router.create(module, {
  home: function() {
    var home = new Example.Views.Home();
    home.render();
  }
});
;;
return module.exports;
}).call(this);
