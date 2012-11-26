module.exports = {
  mode: 'styles',
  priority: 99,

  fileName: function(context, next, complete) {
    complete(undefined, {path: context.baseName, extension: 'css'});
  }
};
