var _ = require('underscore'),
    fs = require('fs'),
    fu = require('../fileUtil'),
    nib = require('nib'),
    stylusImages = require('stylus-images'),
    path = require('path'),
      join = path.join,
      normalize = path.normalize,
    resources = require('../util/resources');

var stylus = stylusImages.stylus || require('stylus');

var importCache = {};

// Reset the import cache if the file has changed
fu.on('cache:reset', function(path) {
  if (path) {
    delete importCache[path];
  } else {
    importCache = {};
  }
});

process.on('message', function(msg) {
  if (msg.type === 'cache:reset') {
    fu.emit('cache:reset', msg.path);
  } else {
    exec(msg, function(err, data) {
      return process.send({err: err, stack: err && err.stack, data: data});
    });
  }
});

function exec(msg, callback) {
  var lookupPath = msg.lookupPath,
      minimize = msg.minimize,
      useNib = msg.useNib,
      styleRoot = msg.styleRoot,

      source = msg.source,
      imageOptions = msg.imageOptions,

      plugins = msg.plugins;

  fu.lookupPath(lookupPath);

  imageOptions.nameResolver = function(url) {
    if (this.mixinPaths && this.mixinPaths.length) {
      return msg.mixins[this.mixinPaths[0]].root + url.href;
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
    .use(pathScopes(msg))
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
    var data = plugin.data;

    plugin = require(plugin.plugin);
    plugin(compiler, data);
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
}

function pathScopes(msg) {
  function getPaths(mixin) {
    var root,
        stylusRoot;

    mixin = _.isString(mixin) ? msg.mixins[mixin] : mixin;

    if (mixin) {
      root = mixin.root;
      root = normalize(fu.resolvePath(root));

      stylusRoot = mixin.stylusRoot;
      if (stylusRoot) {
        stylusRoot = root + stylusRoot;
      }

    } else {
      root = msg.lookupPath;
      if (msg.styleRoot) {
        stylusRoot = fu.resolvePath(msg.styleRoot);
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
          mixin = msg.mixins[mixinName],
          override;

      path = resources.relativePath(path, mixin);

      if (mixin) {
        // Checkout for overrides
        var overrides = mixin.overrides;
        if (overrides) {
          _.find(paths, function(root) {
            // Strip the mixin path
            root = resources.relativePath(root, mixin);
            if (root === '.' || root === './') {
              root = '';
            }
            override = overrides[root + path];
            return override;
          });
          override = override || overrides[path];
        }
        if (override) {
          if (override.override !== true) {
            path = override.override;
          }
        } else {
          // If we are not overriding remove any paths outside of the mixin that may have been
          // inserted by via include operations
          var mixinRoot = normalize(fu.resolvePath(mixin.root));
          if (mixinRoot !== './') {
            paths = _.filter(paths, function(path) {
              return path.indexOf(mixinRoot) === 0;
            });
          }
        }
      }

      // If we are in override mode reset the default paths
      if (!override) {
        // Remove any duplicate paths that may have been created by the import handling
        paths = _.unique(paths, false, function(value) {
          return value && value.replace(/[\\\/]$/, '');
        });
      } else {
        paths = getPaths(override.root ? override : undefined);
      }

      return $superForkedLookup.call(this, path, paths, ignore);
    };

    var mixinPaths = [];
    extend.define('push-mixin', function(name) {
      var mixin = name.val;
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



// Forked from stylus pre-0.34.0
// Effectively reverts the changes from
// https://github.com/LearnBoost/stylus/pull/1070/files
function $superForkedLookup(path, paths, ignore){
  var lookup,
      i = paths.length;

  // Absolute
  if (stylus.utils.absolute(path)) {
    try {
      fs.statSync(path);
      return path;
    } catch (err) {
      // Ignore, continue on
      // to trying relative lookup.
      // Needed for url(/images/foo.png)
      // for example
    }
  }

  // Relative
  while (i--) {
    try {
      lookup = join(paths[i], path);
      if (ignore == lookup) {
        continue;
      }
      fs.statSync(lookup);
      return lookup;
    } catch (err) {
      // Ignore
    }
  }
}
