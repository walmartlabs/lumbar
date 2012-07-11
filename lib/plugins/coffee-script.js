module.exports = {
  // scripts mode is used also to support inline styles
  mode: ['scripts'],
  priority: 50,
  module: function(context, next, complete) {
    next(function(err) {
      complete();
    });
  }
};