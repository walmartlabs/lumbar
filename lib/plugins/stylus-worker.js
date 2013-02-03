var _ = require('underscore'),
    nib = require('nib'),
    path = require('path'),
    stylusImages = require('stylus-images');

var stylus = stylusImages.stylus || require('stylus'),
    $superLookup = stylus.utils.lookup;

exports.exec = function(msg) {
  var files = msg.files,
      lookupPath = msg.lookupPath,
      minimize = msg.minimize,
      outdir = msg.outdir,
      currentPlatform = msg.platform,
      platforms = msg.platforms,
      styleConfig = msg.styleConfig,
      styleRoot = msg.styleRoot,

      includes = styleConfig.includes || [],
      pixelDensity = msg.pixelDensity;

  includes = includes.concat(files);

  var options = { _imports: [] };

  var compiler = stylus(includes.map(function(include) { return '@import ("' + include + '")\n'; }).join(''), options)
    .set('filename', files.join(';'))
    .set('compress', minimize)
    .include(nib.path)
    .include(lookupPath)
    .use(nib)
    .use(stylusImages({
      outdir: outdir,
      res: pixelDensity,
      limit: styleConfig.urlSizeLimit,
      copyFiles: styleConfig.copyFiles
    }));

  if (styleRoot) {
    compiler.include(styleRoot);
  }

  platforms.forEach(function(platform) {
    compiler.define('$' + platform, platform === currentPlatform ? stylus.nodes.true : stylus.nodes.false);
  });

  try {
    compiler.render(function(err, data) {
      var inputs = compiler.options._imports
              .map(function(file) { return file.path; })
              // Filter out nib files from any watch as these are known and not likely to change
              .filter(function(file) { return file.indexOf('/nib/') === -1 && file.indexOf('\\nib\\') === -1; });
      process.send({
        err: err,
        data: {
          data: data,
          inputs: inputs,
          noSeparator: true
        }
      });
    });
  } catch (err) {
    process.send({ err: err });
  }
};



function pathScopes(context, module, styleConfig) {
  function getPaths(mixin) {
    var root,
        stylusRoot;

    mixin = mixin && context.mixins.get(mixin);

    if (mixin) {
      root = mixin.root;

      var mixinConfig = (mixin.parent || mixin).styles || {};
      stylusRoot = mixinConfig.styleRoot;
      if (stylusRoot) {
        stylusRoot = root + stylusRoot;
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
          mixinRoot = mixinName && mixinName.root,
          mixin = mixinName && context.mixins.get(mixinName),
          override;

      if (path.indexOf('./') === 0) {
        path = path.substring(2);
      }

      if (mixin) {
        // Strip the mixin component name if there are any (Path lookup will add it back)
        if (path.indexOf(mixinRoot) === 0) {
          path = path.substring(mixinRoot.length);
        }

        // Checkout for overrides
        var mixinDecl = context.mixins.findDecl(module.mixins, mixinName),
            overrides = mixinDecl && mixinDecl.overrides;
        if (overrides) {
          _.find(paths, function(root) {
            // Strip the mixin path
            if (root.indexOf(mixinRoot) === 0) {
              root = root.substring(mixinRoot.length);
            }
            if (root === '.' || root === './') {
              root = '.';
            }
            override = overrides[root + path];
            return override;
          });
          override = override || overrides[path];
        }
        if (override) {
          if (override !== true) {
            path = override;
          }
          override = true;
        } else {
          // If we are not overriding remove any paths outside of the mixin that may have been
          // inserted by via include operations
          paths = _.filter(paths, function(path) {
            return path.indexOf(mixinRoot) === 0;
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
    extend.define('push-mixin', function(name, container, root) {
      var mixin = {
        name: name.val || undefined,
        container: container.val,
        root: root.val || undefined
      };
      mixinPaths.unshift(mixin);
      this.mixinPaths = mixinPaths;

      this.paths = getPaths(mixin);
    });
    extend.define('pop-mixin', function() {
      mixinPaths.shift();
      this.mixinPaths = mixinPaths;

      this.paths = getPaths(mixinPaths[0]);
    });
  };
}

exports.pathScopes = pathScopes;
