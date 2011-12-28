Example.Router.create(module, {
  home: function() {
    var home = new Example.Views.Home();
    home.render();
  }
});
