
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
