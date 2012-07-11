var CoffeeScript = require('coffee-script'),
    path = require('path'),
    fu = require('../fileUtil');

module.exports = {
  mode: 'scripts',
  priority: 50,
  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }
      var resources = context.moduleResources,
          len = resources.length;
      while (len--) {
        var resource = resources[len];
        if (/\.coffee$/.test(resource.src)) {
          var file = resources.splice(len, 1)[0],
              filename = file.src || file;
          resources.splice(len, 0, function(context, callback) {
            context.fileUtil.ensureDirs(context.fileName, function(err) {
              if (err) {
                return callback(err);
              }
              fu.readFile(path.join(context.fileUtil.lookupPath(), filename), function(err, coffeeScriptSrc) {
                if (err) {
                  return callback(err);
                }
                callback(undefined, CoffeeScript.compile(coffeeScriptSrc.toString()));
              });
            });
          });
        }
      }
      complete();
    });
  }
};