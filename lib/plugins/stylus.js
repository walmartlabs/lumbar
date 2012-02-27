var _ = require('underscore'),
    inlineStyles = require('./inline-styles'),
    path = require('path'),
    ChildPool = require('../child-pool');

var stylus = new ChildPool(__dirname + '/stylus-worker.js');

function compile(files, context, callback) {
  context.fileUtil.ensureDirs(context.fileName, function(err) {
    if (err) {
      return callback(err);
    }

    var styleConfig = context.config.attributes.styles || {};

    stylus.send({
      files: files,
      lookupPath: context.fileUtil.lookupPath(),
      minimize: context.options.minimize,
      outdir: path.dirname(context.fileName),
      platform: context.platform,
      platforms: context.config.platformList(),
      styleConfig: styleConfig,
      styleRoot: styleConfig.styleRoot && context.fileUtil.resolvePath(styleConfig.styleRoot),
      pixelDensity: context.fileConfig.pixelDensity
    },
    callback);
  });
};

module.exports = {
  // scripts mode is used also to support inline styles
  mode: ['styles', 'scripts'],
  priority: 50,

  outputConfigs: function(context, next, complete) {
    if (!inlineStyles.isInline(context) && context.mode !== 'styles') {
      return next(complete);
    }

    next(function(err, files) {
      if (err) {
        return complete(err);
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
      files.forEach(function(fileConfig) {
        pixelDensity.forEach(function(density) {
          var config = _.clone(fileConfig);
          config.pixelDensity = density;
          ret.push(config);
        });
      });
      complete(undefined, ret);
    });
  },

  fileName: function(context, next, complete) {
    if (!inlineStyles.isInline(context) && context.mode !== 'styles') {
      return next(complete);
    }

    next(function(err, ret) {
      if (ret && context.fileConfig.pixelDensity !== 1) {
        ret.path += '@' + context.fileConfig.pixelDensity + 'x';
      }
      complete(err, ret);
    });
  },

  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      function mergeResources(start) {
        var files = resources.splice(start, rangeEnd-start+1).map(function(resource) { return resource.src; });

        var generator = function(context, callback) {
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
      complete();
    });
  }
};
