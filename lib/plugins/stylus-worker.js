var _ = require('underscore'),
    nib = require('nib'),
    stylusImages = require('stylus-images');

var stylus = stylusImages.stylus || require('stylus'),
    $superLookup = stylus.utils.lookup;

var importCache = {};

exports.exec = function(msg, callback) {
  var lookupPath = msg.lookupPath,
      minimize = msg.minimize,
      useNib = msg.useNib,
      styleRoot = msg.styleRoot,

      source = msg.source,
      imageOptions = msg.imageOptions,

      // TODO : Remove
      context = msg.context,
      module = msg.module,
      plugins = msg.plugins;

  imageOptions.nameResolver = function(url) {
    if (this.mixinPaths && this.mixinPaths.length) {
      return this.mixinPaths[0] + '/' + url.href;
    } else {
      return url.href;
    }
  };

  var options = {
    images: imageOptions,

    externals: [],    // Used to track "imports" that aren't actually stylus imports
    _imports: [],
    _importCache: importCache
  };

  var compiler = (stylusImages.plugin ? stylusImages : stylus)(source, options)
    .set('filename', msg.filename)
    .set('compress', minimize);

  if (!stylusImages.plugin) {
    compiler.use(stylusImages(options.images));
  }

  compiler
    .use(pathScopes(msg, context, module))
    .include(lookupPath);

  if (styleRoot) {
    compiler.include(styleRoot);
  }
  if (useNib) {
    compiler
      .include(nib.path)
      .use(nib);
  }

  // Allow any plugins to do their thing
  _.each(plugins, function(plugin) {
    plugin(compiler);
  });

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
};


function pathScopes(msg, context, module) {
  function getPaths(mixin) {
    var root = mixin && mixin.root,
        stylusRoot;

    mixin = mixin && context.mixins.get(mixin);

    if (mixin) {
      // TODO : What changed in here to break this?
      var mixinConfig = (mixin.parent || mixin).styles || {};
      stylusRoot = mixinConfig.styleRoot;
      if (stylusRoot) {
        stylusRoot = root + stylusRoot;
      }
    } else {
      root = msg.lookupPath;
      if (msg.styleRoot) {
        stylusRoot = context.fileUtil.resolvePath(msg.styleRoot);
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
