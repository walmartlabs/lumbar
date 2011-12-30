var _ = require('underscore'),
    fu = require('../fileUtil'),
    inlineStyles = require('./inline-styles'),
    nib = require('nib'),
    path = require('path'),
    stylus = require('stylus'),
    stylusImages = require('stylus-images');

function compile(files, context, callback) {
  var styleConfig = context.config.attributes.styles || {},
      includes = styleConfig.includes || [],
      pixelDensity = context.fileConfig.pixelDensity;

  includes = includes.concat(files);

  var options = { _imports: [] };

  var compiler = stylus(includes.map(function(include) { return '@import ("' + include + '")\n'; }).join(''), options)
    .set('filename', files.join(';'))
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

  try {
    compiler.render(function(err, data) {
      var lookupPath = fu.lookupPath(),
          inputs = compiler.options._imports
              .map(function(file) { return file.path; })
              .filter(function(file) { return file.indexOf(lookupPath) === 0; });
      callback(err, {
        data: data,
        inputs: inputs,
        noSeparator: true
      });
    });
  } catch (err) {
    callback(err);
  }
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

  module: function(context, next) {
    next();

    function mergeResources(start) {
      var files = resources.splice(start, rangeEnd-start+1).map(function(resource) { return resource.src; });

      var generator = function(callback) {
        compile(files, context, callback);
      };
      generator.style = true;

      resources.splice(start, 0, generator);
      rangeEnd = undefined;
    }

    // Merge all consequtive stylus files together
    var resources = context.moduleResources,
        len = resources.length,
        rangeEnd;
    while (len--) {
      var resource = resources[len];

      if (/\.styl$/.test(resource.src)) {
        if (!rangeEnd) {
          rangeEnd = len;
        }
      } else {
        rangeEnd && mergeResources(len+1);
      }
    }
    rangeEnd != null && mergeResources(0);
  }
};
