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
module.exports.moduleMap({"base":{"css":[{"href":"base.css","maxRatio":1.5},{"href":"base@2x.css","minRatio":1.5}],"js":"base.js"},"modules":{"home":{"css":[{"href":"home.css","maxRatio":1.5},{"href":"home@2x.css","minRatio":1.5}],"js":"home.js"}},"routes":{"":"home","home":"home"}});
return module.exports;
}).call(this);
