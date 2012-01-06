module.exports = {  
  mode: 'static',  

  fileName: function(context, next, complete) {
    var components = /(.*?)(?:\.([^.]+))?$/.exec(context.resource.src || context.resource.sourceFile);

    complete(undefined, {path: context.platformPath + components[1], extension: components[2]});  
  }
};
