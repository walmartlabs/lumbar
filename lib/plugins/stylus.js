/**
 * Stylus Plugin : Compile stylus files.
 *
 * Config:
 *    root:
 *      styles:
 *        includes: Array of paths to add to stylus includes.
 *        pixelDensity: Defines the pixel densities generated for each plaform.
 *        urlSizeLimit: Maximum file size to inline. Passed to stylus-images plugin
 *        copyFiles: Boolean specifying if non-inlined url references should be compied
 *            To the build directly. Passed to stylus-images plugin.
 *        styleRoot: Project path to resolve files from.
 *        useNib: Truthy to include nib in the project build
 *
 * Mixins:
 *  All fields may be mixed in. In the case of conflicts the local config wins for simple values and
 *  for arrays the content will be merged in order. pixelDensity is mixed in at the platform definition
 *  level. File references are converted to mixin space.
 *
 *  styleRoot is used locally for file lookup when compiling the mixin content.
 */
var _ = require('underscore'),
    fu = require('../fileUtil'),
    inlineStyles = require('./inline-styles'),
    nib = require('nib'),
    path = require('path'),
    stylus = require('stylus'),
    stylusImages = require('stylus-images');

var importCache = {};

// Reset the import cache if the file has changed
fu.on('cache:reset', function(path) {
  if (path) {
    delete importCache[path];
  } else {
    importCache = {};
  }
});

function compile(files, context, callback) {
  var styleConfig = context.config.attributes.styles || {},
      includes = styleConfig.includes || [],
      pixelDensity = context.fileConfig.pixelDensity;

  includes = includes.concat(files);

  if (styleConfig.useNib) {
    includes.unshift('nib');
  }

  var options = { _imports: [], _importCache: importCache };

  var loadPrefix = context.config.loadPrefix(),
      externalPrefix;
  if (loadPrefix) {
    externalPrefix = loadPrefix + (context.buildPath.indexOf('/') >= 0 ? path.dirname(context.buildPath) + '/' : '');
  }

  var compiler = stylus(includes.map(function(include) { return '@import ("' + include + '")\n'; }).join(''), options)
    .set('filename', files.join(';'))
    .set('compress', context.options.minimize)
    .include(context.fileUtil.lookupPath())
    .use(stylusImages({
      outdir: path.dirname(context.fileName),
      res: pixelDensity,
      limit: styleConfig.urlSizeLimit,
      copyFiles: styleConfig.copyFiles,
      externalPrefix: externalPrefix
    }));

  if (styleConfig.useNib) {
    compiler
      .include(nib.path)
      .use(nib);
  }

  if (styleConfig.styleRoot) {
    compiler.include(context.fileUtil.resolvePath(styleConfig.styleRoot));
  }

  context.config.platformList().forEach(function(platform) {
    compiler.define('$' + platform, platform === context.platform ? stylus.nodes.true : stylus.nodes.false);
  });

  context.fileUtil.ensureDirs(context.fileName, function(err) {
    if (err) {
      return callback(err);
    }

    try {
      compiler.render(function(err, data) {
        var inputs = compiler.options._imports
                .map(function(file) { return file.path; })
                // Filter out nib files from any watch as these are known and not likely to change
                .filter(function(file) { return file && file.indexOf('/nib/') === -1 && file.indexOf('\\nib\\') === -1; });
        callback(err, {
          data: data,
          inputs: inputs,
          noSeparator: true
        });
      });
    } catch (err) {
      callback(err);
    }
  });
}

module.exports = {
  // scripts mode is used also to support inline styles
  mode: ['styles', 'scripts'],
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinStyles = context.loadedMixin.styles;
    if (mixinStyles) {
      var styles = context.mixins.originalConfig.styles || {},
          configStyles = _.clone(context.config.attributes.styles || styles),
          assigned = false;

      ['urlSizeLimit', 'copyFiles', 'useNib'].forEach(function(key) {
        if ((key in mixinStyles) && !(key in styles)) {
          configStyles[key] = mixinStyles[key];

          assigned = true;
        }
      });
      if (mixinStyles.includes) {
        var styleIncludes = styles.includes || [];
        if (!configStyles.includes || styleIncludes === configStyles.includes) {
          configStyles.includes = _.clone(styleIncludes);
        }

        // Insert point is at the start of the upstream list, which we are
        // assuming occurs at length postions from the end.
        _.each(mixinStyles.includes, function(value) {
          //Make the include relative to the mixin
          value = (context.loadedMixin.root || '') + value;

          configStyles.includes.splice(
              configStyles.includes.length-styleIncludes.length,
              0,
              value);
        });

        assigned = true;
      }
      if (mixinStyles.pixelDensity) {
        if (!configStyles.pixelDensity || configStyles.pixelDensity === styles.pixelDensity) {
          configStyles.pixelDensity = _.clone(styles.pixelDensity || {});
        }
        _.each(mixinStyles.pixelDensity, function(value, key) {
          if (!styles.pixelDensity || !(key in styles.pixelDensity)) {
            configStyles.pixelDensity[key] = value;
          }
        });
        assigned = true;
      }

      if (assigned) {
        context.config.attributes.styles = configStyles;
      }
    }
    next(complete);
  },

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
        } else if(rangeEnd) {
          mergeResources(len+1);
        }
      }
      if (rangeEnd != null) {
        mergeResources(0);
      }
      complete();
    });
  }
};
