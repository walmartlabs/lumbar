module.exports = {
  mode: 'scripts',
  priority: 99,

  fileFilter: function(context, next) {
    return /\.(js|json)$/;
  },

  fileName: function(context, next, complete) {
    complete(undefined, {path: context.baseName, extension: 'js'});
  },

  moduleResources: function(context, next, complete) {
    var module = context.module;
    complete(undefined, (module.scripts || module.files || (module.slice && module) || []).slice());
  }
};
