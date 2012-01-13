module.exports = {
  mode: 'styles',
  priority: 99,

  fileName: function(context, next, complete) {
    var name = !context.combined ? context.module.name : context.package;
    complete(undefined, {path: name, extension: 'css'});
  }
};
