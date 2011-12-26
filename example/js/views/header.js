/* BEGIN js/views/header.js */
exports.Views.Header = Backbone.View.extend({
  el: ".header",

  render: function() {
    $(this.el).html(exports.templates('templates/header.handlebars'));
  }
});
/* END js/views/header.js */
