var CoffeeScript = require('coffee-script'),
    path = require('path'),
    fu = require('../fileUtil');

module.exports = {
  mode: 'scripts',
  priority: 50,
  resource: function(context, next, complete) {
    var resource = context.resource;
    if (/\.coffee$/.test(resource.src)) {
      next(function(err, coffeeScriptSrc) {
        if (err) {
          return complete(err);
        }
        complete(undefined, CoffeeScript.compile(coffeeScriptSrc.toString()));
      });
    } else {
      next(complete);
    }
  }
};
