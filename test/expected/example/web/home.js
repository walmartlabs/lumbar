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
