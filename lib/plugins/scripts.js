module.exports = {  
  mode: 'scripts',

  fileFilter: function(context, next) {
    return /\.(js|json)$/;
  },

  fileName: function(context, next, complete) {  
    var name = !context.combined ? context.module.name : context.package;
    complete(undefined, {path: context.platformPath + name, extension: 'js'});  
  },

  moduleResources: function(context, next, complete) {
    var module = context.module;
    complete(undefined, (module.scripts || module.files || (module.slice && module) || []).slice());
  }
};
