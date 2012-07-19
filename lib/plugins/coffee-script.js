var CoffeeScript = require('coffee-script'),
    path = require('path'),
    fu = require('../fileUtil');

module.exports = {
  mode: 'scripts',
  priority: 50,
  resource: function(context, next, complete) {
    var resource = context.resource;
    if (/\.coffee$/.test(resource.src)) {
      complete(undefined, function(context, callback) {
        fu.readFile(path.join(context.fileUtil.lookupPath(), resource.src), function(err, coffeeScriptSrc) {
          if (err) {
            return callback(err);
          }
          callback(undefined, CoffeeScript.compile(coffeeScriptSrc.toString()));
        });
      });
    } else {
      next(complete);
    }
  }
};