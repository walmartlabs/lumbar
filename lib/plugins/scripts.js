module.exports = {  
  mode: 'scripts',

  fileName: function(context, next, complete) {  
    var name = context.module ? context.module.name : context.package;
    complete(undefined, {path: context.platformPath + name, extension: 'js'});  
  },

  moduleResources: function(context, next, complete) {
    var module = context.module;
    complete(undefined, (module.scripts || module.files || (module.slice && module) || []).slice());
  }
};