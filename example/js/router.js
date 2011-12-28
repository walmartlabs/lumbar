/* BEGIN js/router.js */
exports.Router = {
  create: function(module, protoProps, classProps) {
    return new (Backbone.Router.extend(_.extend({}, module, protoProps), classProps));
  }
};
/* END js/router.js */
