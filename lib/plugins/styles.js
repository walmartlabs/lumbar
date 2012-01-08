module.exports = {  
  mode: 'styles',  

  fileName: function(context, next, complete) {
    var name = !context.combined ? context.module.name : context.package;
    complete(undefined, {path: context.platformPath + name, extension: 'css'});
  }
};
