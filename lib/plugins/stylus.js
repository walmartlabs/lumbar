var _ = require('underscore'),
    fu = require('../fileUtil'),
    inlineStyles = require('./inline-styles'),
    nib = require('nib'),
    path = require('path'),
    stylus = require('stylus'),
    stylusImages = require('stylus-images');

function compile(name, context, callback) {
  fu.readFile(name, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var styleConfig = context.config.attributes.styles || {},
        includes = styleConfig.includes || [],
        pixelDensity = context.fileConfig.pixelDensity;

    var compiler = stylus(data)
      .set('filename', name)
      .set('compress', context.options.minimize)
      .include(nib.path)
      .include(fu.lookupPath())
      .use(nib)
      .use(stylusImages({
        outdir: path.dirname(context.fileName),
        res: pixelDensity,
        limit: styleConfig.urlSizeLimit,
        copyFiles: styleConfig.copyFiles
      }));

    if (styleConfig.styleRoot) {
      compiler.include(fu.resolvePath(styleConfig.styleRoot));
    }

    context.config.platformList().forEach(function(platform) {
      compiler.define('$' + platform, platform === context.platform ? stylus.nodes.true : stylus.nodes.false);
    });

    includes.forEach(function(include) {
      compiler.import(include);
    });

    compiler.render(callback);
  });
};

module.exports = {
  generatedFiles: function(context, next) {
    if (!inlineStyles.isInline(context) && context.mode !== 'styles') {
      return next();
    }

    var ret = [],
        styleConfig = context.config.attributes.styles || {},
        pixelDensity = styleConfig.pixelDensity || {};
    if (context.platform) {
      pixelDensity = pixelDensity[context.platform] || pixelDensity;
    }
    if (!_.isArray(pixelDensity)) {
      pixelDensity = [ 1 ];
    }

    // Permutation of other configs and ours
    next().forEach(function(fileConfig) {
      pixelDensity.forEach(function(density) {
        var config = _.clone(fileConfig);
        config.pixelDensity = density;
        ret.push(config);
      });
    });

    return ret;
  },
  fileName: function(context, next) {
    if (!inlineStyles.isInline(context) && context.mode !== 'styles') {
      return next();
    }

    var ret = next();
    if (context.fileConfig.pixelDensity !== 1) {
      ret.path += '@' + context.fileConfig.pixelDensity + 'x';
    }
    return ret;
  },

  resource: function(context, next) {
    var resource = context.resource;

    if (/\.styl$/.test(resource.src)) {
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
      generator.style = true;
      generator.sourceFile = resource.src;
      return generator;
    }

    return next();
  }
};
