var _ = require('underscore'),
    fu = require('../fileUtil'),
    stylus = require('stylus'),
    stylusImages = require('stylus-images');


function compile(name, context, callback) {
  fu.readFile(name, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var compiler = stylus(data)
      .set('filename', name)
      .include(fu.lookupPath());

    compiler.render(callback);
  });
};

module.exports = {
  resource: function(context, next) {
    var resource = context.resource;

    if (context.mode === 'styles' && !/\.css$/.test(resource.src)) {
      var generator = function(callback) {
        compile(resource.src, context, function(err, data) {
          var ret = data;
          if (ret) {
            ret = ret.data ? data : {data: data};
            ret.noSeparator = true;
          }
          callback(err, ret);
        });
      };
      generator.sourceFile = resource.src;
      return generator;
    }

    return next();
  }
};
