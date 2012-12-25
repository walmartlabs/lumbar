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
    stylusImages = require('stylus-images');


var stylus = stylusImages.stylus || require('stylus'),
    $superLookup = stylus.utils.lookup;

var importCache = {};

// Reset the import cache if the file has changed
fu.on('cache:reset', function(path) {
  if (path) {
    delete importCache[path];
  } else {
    importCache = {};
  }
});

function compile(files, filename, plugins, context, callback) {
  var styleConfig = context.config.attributes.styles || {},
      includes = styleConfig.includes || [];

  includes = includes.concat(files);

  var nibLocation = includes.indexOf('nib');
  if (styleConfig.useNib) {
    includes.unshift('nib');
  } else if (nibLocation >= 0) {
    // Special case nib handling to maintain backwards compatibility
    // WARN: This may be deprecated in future releases
    styleConfig.useNib = true;
    includes.splice(nibLocation, 1);
  }

  var loadPrefix = context.config.loadPrefix(),
      externalPrefix;
  if (loadPrefix) {
    externalPrefix = loadPrefix + (context.buildPath.indexOf('/') >= 0 ? path.dirname(context.buildPath) + '/' : '');
  }

  var source = includes.map(function(include) {
    var mixin = _.find(_.keys(context.mixins.mixins), function(name) {
      var mixin = context.mixins.mixins[name];
      return include.indexOf(mixin.root) === 0;
    });
    var statement = '@import ("' + include + '")\n';
    if (mixin) {
      return 'push-mixin("' + mixin + '")\n'
          + statement
          + 'pop-mixin()\n';
    } else {
      return statement;
    }
  }).join('');

  var options = {
    images: {
      outdir: path.dirname(context.fileName),
      resolutions: context.modeCache.pixelDensity,
      limit: styleConfig.urlSizeLimit,
      copyFiles: styleConfig.copyFiles,
      externalPrefix: externalPrefix,

      nameResolver: function(url) {
        if (this.mixinPaths && this.mixinPaths.length) {
          return this.mixinPaths[0] + '/' + url.href;
        } else {
          return url.href;
        }
      }
    },
    externals: [],    // Used to track "imports" that aren't actually stylus imports
    _imports: [],
    _importCache: importCache
  };

  var compiler = (stylusImages.plugin ? stylusImages : stylus)(source, options)
    .set('filename', filename)
    .set('compress', context.options.minimize);

  if (!stylusImages.plugin) {
    compiler.use(stylusImages(options.images));
  }

  compiler
    .use(pathScopes(context, styleConfig))
    .include(context.fileUtil.lookupPath());

  if (styleConfig.styleRoot) {
    compiler.include(context.fileUtil.resolvePath(styleConfig.styleRoot));
  }
  if (styleConfig.useNib) {
    compiler
      .include(nib.path)
      .use(nib);
  }

  // Allow any plugins to do their thing
  _.each(plugins, function(plugin) {
    plugin(compiler);
  });

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
                .concat(compiler.options.externals)
                .map(function(file) { return file.path || file; })
                // Filter out nib files from any watch as these are known and not likely to change
                .filter(function(file) { return _.isString(file) && file.indexOf('/nib/') === -1 && file.indexOf('\\nib\\') === -1; });

        if (err && err.code === 'EMFILE') {
          // If we are in EMFILE mode just kill everything now as this is a systemic problem
          // and we need the user to fix this.
          var err = new Error();
          err.code = err.errno = 'EMFILE';
          callback(err);
          return;
        }

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

function pathScopes(context, styleConfig) {
  function getPaths(mixin) {
    var root,
        stylusRoot;

    mixin = mixin && context.mixins.get(mixin);

    if (mixin) {
      root = mixin.root;
      if (mixin.parent.styles.stylusRoot) {
        stylusRoot = root + mixin.parent.styles.stylusRoot;
      }
    } else {
      root = context.fileUtil.lookupPath();
      if (styleConfig.styleRoot) {
        stylusRoot = context.fileUtil.resolvePath(styleConfig.styleRoot);
      }
    }

    var pathList = [root || '.'];
    if (stylusRoot) {
      pathList.push(stylusRoot);
    }
    return pathList;
  }

  return function(extend) {
    stylus.utils.lookup = function(path, paths, ignore) {
      var mixinName = mixinPaths[0],
          mixin = mixinName && context.mixins.get(mixinName),
          override;

      if (path.indexOf('./') === 0) {
        path = path.substring(2);
      }

      if (mixin) {
        // Strip the mixin component name if there are any (Path lookup will add it back)
        if (path.indexOf(mixin.root) === 0) {
          path = path.substring(mixin.root.length);
        }

        // Checkout for overrides
        var mixinDecl = _.find(context.module.mixins, function(mixin) { return mixin.name === mixinName; }),
            overrides = mixinDecl && mixinDecl.overrides;
        if (overrides && overrides[path]) {
          path = overrides[path];
          override = true;
        } else {
          // If we are not overriding remove any paths outside of the mixin that may have been
          // inserted by via include operations
          paths = _.filter(paths, function(path) {
            return path.indexOf(mixin.root) === 0;
          });
        }
      }

      // If we are in override mode reset the default paths
      if (!override) {
        // Remove any duplicate paths that may have been created by the import handling
        paths = _.unique(paths, false, function(value) {
          return value && value.replace(/[\\\/]$/, '');
        });
      } else {
        paths = getPaths(undefined);
      }

      return $superLookup.call(this, path, paths, ignore);
    };

    var mixinPaths = [];
    extend.define('push-mixin', function(name) {
      mixinPaths.unshift(name.val);
      this.mixinPaths = mixinPaths;

      this.paths = getPaths(name.val);
    });
    extend.define('pop-mixin', function() {
      mixinPaths.shift();
      this.mixinPaths = mixinPaths;

      this.paths = getPaths(mixinPaths[0]);
    });
  };
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

      if (context.mixins.mergeFiles('includes', styles, mixinStyles, configStyles, context.loadedMixin.root)) {
        assigned = true;
      }

      if (context.mixins.mergeHash('pixelDensity', styles, mixinStyles, configStyles)) {
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
      context.modeCache.pixelDensity = pixelDensity;

      // Permutation of other configs and ours
      var primary = true;
      files.forEach(function(fileConfig) {
        pixelDensity.forEach(function(density) {
          var config = _.clone(fileConfig);
          config.pixelDensity = density;
          config.isPrimary = primary;
          primary = false;
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
      /*jshint eqnull: true */
      if (err) {
        return complete(err);
      }

      function mergeResources(start) {
        var generator = function(context, callback) {
          function response(data, density) {
            if (data) {
              return {
                data: data.data[density || 1],
                inputs: data.inputs,
                noSeparator: true
              };
            }
          }

          var filename = generator.filename;

          // We only want to call stylus once which will generate the css for all of the
          // resolutions we support on this platform. This ugly bit of code make sure that
          // we properly handle all of that loading states that can come into play under these
          // circumstances while still adhering to the output models prescribed by lumbar.
          var queue = context.modeCache['stylus_' + filename];
          if (_.isArray(queue)) {
            // We are currently executing
            queue.push({density: context.fileConfig.pixelDensity, callback: callback});
          } else if (_.isObject(queue)) {
            // We already have data
            callback(undefined, response(queue, context.fileConfig.pixelDensity));
          } else {
            // We need to kick of a stylus build
            queue = context.modeCache['stylus_' + filename] = [
              {density: context.fileConfig.pixelDensity, callback: callback}
            ];
            compile(generator.stylusFiles, filename, generator.plugins, context, function(err, data) {
              if (err) {
                data = undefined;
              }
              _.each(queue, function(callback) {
                callback.callback(err, response(data, callback.density));
              });
              context.modeCache['stylus_' + filename] = data;
            });
          }
        };
        generator.stylusFiles = resources.splice(start, rangeEnd - start + 1).map(function(resource) {
          return resource.originalSrc || resource.src;
        });
        generator.filename = 'stylus_' + generator.stylusFiles.join(';');
        generator.style = true;
        generator.stylus = true;
        generator.plugins = [];

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
        } else if (rangeEnd) {
          mergeResources(len + 1);
        }
      }
      if (rangeEnd != null) {
        mergeResources(0);
      }
      complete();
    });
  }
};
