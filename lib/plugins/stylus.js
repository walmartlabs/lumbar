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

    var styleConfig = context.config.attributes.styles || {},
        imports = styleConfig.imports || [],
        pixelDensity = context.fileConfig.pixelDensity;

    var compiler = stylus(data)
      .set('filename', name)
      .include(fu.lookupPath());

    context.config.platformList().forEach(function(platform) {
      compiler.define('$' + platform, platform === context.platform ? stylus.nodes.true : stylus.nodes.false);
    });

    imports.forEach(function(import) {
      compiler.import(import);
    });

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
