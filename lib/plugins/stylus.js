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
    ChildPool = require('child-pool'),
    inlineStyles = require('./inline-styles'),
    path = require('path'),
      normalize = path.normalize,
    fu = require('../fileUtil'),
    resources = require('../util/resources');

// Forward cache resets to any workers
fu.on('cache:reset', function(path) {
  worker.sendAll({type: 'cache:reset', path: path});
});

var worker = new ChildPool(__dirname + '/stylus-worker', {logId: 'stylus-worker'});

function generateSource(context, options, styleConfig) {
  var includes = (styleConfig.includes || []).concat(options.files),
      module = options.module;

  var nibLocation = includes.indexOf('nib'),
      useNib;
  if (styleConfig.useNib) {
    useNib = true;
    includes.unshift('nib');
  } else if (nibLocation >= 0) {
    // Special case nib handling to maintain backwards compatibility
    // WARN: This may be deprecated in future releases
    useNib = true;
    includes.splice(nibLocation, 1);
  }

  var declare =  context.config.platformList().map(function(platform) {
    return '$' + platform + ' = ' + (platform === context.platform);
  }).join('\n') + '\n';

  var mixins = [],
      mixinLUT = {};

  var source = declare + includes.map(function(include) {
    var source = include.library;
    var statement = '@import ("' + (include.originalSrc || include.src || include) + '")\n';
    if (source) {
      var name = '',
          root = (source.parent || source).root || '',
          stylusRoot = ((source.parent || source).styles || {}).styleRoot,
          library = (source.parent || source).name || '';
      if (source.parent) {
        name = source.name || '';
      }
      var mixinName = name + '_' + library;

      if (!mixinLUT[mixinName]) {
        var overrides = resources.calcOverrides(source, function(library, src, ret) {
          if (library && library.root) {
            ret.root = normalize(library.root);
          }

          if (library) {
            var styles = library.styles || {};
            ret.stylusRoot = styles.styleRoot;
            if (ret.styleRoot) {
              ret.styleRoot = normalize(ret.styleRoot);
            }
          }
        });
        mixins.push({
          root: normalize(root),
          stylusRoot: stylusRoot && normalize(stylusRoot),
          overrides: overrides
        });
        mixinLUT[mixinName] = mixins.length-1;
      }
      mixinName = mixinLUT[mixinName];

      return 'push-mixin("' + mixinName + '")\n'
          + statement
          + 'pop-mixin()\n';
    } else {
      return statement;
    }
  }).join('');

  return {
    useNib: useNib,
    source: source,
    mixins: mixins
  };
}

function compile(options, callback) {
  var context = options.context,

      styleConfig = context.config.attributes.styles || {};

  var loadPrefix = context.config.loadPrefix(),
      externalPrefix;
  if (loadPrefix) {
    externalPrefix = loadPrefix + (context.buildPath.indexOf('/') >= 0 ? path.dirname(context.buildPath) + '/' : '');
  }

  var imageOptions = {
    outdir: path.dirname(context.fileName),
    resolutions: context.modeCache.pixelDensity,
    limit: styleConfig.urlSizeLimit,
    copyFiles: styleConfig.copyFiles,
    externalPrefix: externalPrefix
  };

  var source = generateSource(context, options, styleConfig);

  context.fileUtil.ensureDirs(context.fileName, function(err) {
    if (err) {
      return callback(err);
    }

    worker.send({
        plugins: options.plugins,

        useNib: source.useNib,
        imageOptions: imageOptions,

        filename: options.filename,
        minimize: context.options.minimize,

        source: source.source,
        mixins: source.mixins,

        lookupPath: context.fileUtil.lookupPath(),
        styleRoot: styleConfig.styleRoot && context.fileUtil.resolvePath(styleConfig.styleRoot)
      },
      callback);
  });
}

module.exports = {
  // scripts mode is used also to support inline styles
  mode: ['styles', 'scripts'],
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinStyles = context.loadedLibrary.styles;
    if (mixinStyles) {
      var styles = context.libraries.originalConfig.styles || {},
          configStyles = _.clone(context.config.attributes.styles || styles),
          assigned = false;

      ['urlSizeLimit', 'copyFiles', 'useNib'].forEach(function(key) {
        if ((key in mixinStyles) && !(key in styles)) {
          configStyles[key] = mixinStyles[key];

          assigned = true;
        }
      });

      if (context.libraries.mergeFiles('includes', styles, mixinStyles, configStyles, context.loadedLibrary)) {
        assigned = true;
      }

      if (context.libraries.mergeHash('pixelDensity', styles, mixinStyles, configStyles)) {
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

  module: function(moduleContext, next, complete) {
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
            var options = {
              filename: filename,
              files: generator.inputs,

              context: context,
              module: moduleContext.module,    // To play nicely with combined mode
              plugins: generator.plugins
            };
            compile(options, function(err, data) {
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
        generator.inputs = resources.splice(start, rangeEnd - start + 1);
        generator.filename = 'stylus_' + _.map(generator.inputs, function(file) { return file.originalSrc || file.src; }).join(';');
        generator.style = true;
        generator.stylus = true;
        generator.plugins = [];

        resources.splice(start, 0, generator);
        rangeEnd = undefined;
      }

      // Merge all consequtive stylus files together
      var resources = moduleContext.moduleResources,
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
