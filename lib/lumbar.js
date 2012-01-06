var _ = require('underscore'),
    async = require('async'),
    combine = require('./jsCombine'),
    configLoader = require('./config'),
    Context = require('./context'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    fu = require('./fileUtil'),
    plugin = require('./plugin'),
    watch = require('./watcher.js');

exports.fileUtil = fu;
exports.plugin = plugin.plugin;
exports.combine = combine.combine;

/**
 * 
 * @name init
 * @function This function initializes a Lumbar instance
 * @param {string} lumbarFile The lumbarFile is the main
 *  file. Its responsible to define all the platforms,
 *  packages, modules, and templates for Lumbar to use.
 * @param {Object} options supports the following options:
 *   packageConfigFile (string): name of the package config file.
 *   outdir (string): path to directory of where to output the files.
 *   minimize (boolean): Should we minimize the files?
 * @return {Object.<Function>}
 */
exports.init = function(lumbarFile, options) {
    var outdir = options.outdir,
        plugins = plugin.create(options),
        config,
        configCache;

    function logError(err) {
      if (err) {
        event.emit('error', err);
      }
    }

    function loadConfig(path, fail) {
      try {
        fu.resetCache();

        configCache = {};
        config = configLoader.load(path);
      } catch (err) {
        // Do not die a horrible death if this is just a syntax error
        if (fail) {
          throw err;
        }
        logError(err);
      }
    }

    function buildPlatform(context, callback) {
      var modes = plugins.modes();
      async.forEach(modes, function(mode, callback) {
          buildMode(mode, context, callback);
        },
        callback);
    }
    function buildMode(mode, context, callback) {
      var modules = config.moduleList(context.package);

      context = context.clone();
      context.options = options;
      context.outdir = outdir;
      context.mode = mode;

      if (context.fileConfig) {
        processConfig(context.fileConfig, callback);
      } else {
        plugins.outputConfigs(context, function(err, configs) {
          if (err) {
            return callback(err);
          }
          async.forEach(configs, processConfig, callback);
        });
      }

      function processConfig(fileConfig, callback) {
        var fileContext = context.clone(true);
        fileContext.fileConfig = fileConfig;
        fileContext.resources = [];
        fileContext.combineResources = {};
        fileContext.fileCache = fileContext.combined ? {} : undefined;

        async.forEach(modules, function(module, callback) {
          var moduleContext = fileContext.clone();
          moduleContext.module = module;

          buildModule(moduleContext, callback);
        },
        function(err) {
          if (err) {
            return callback(err);
          }

          plugins.modeComplete(fileContext, callback);
        });
      }
    }
    function buildModule(context, callback) {
      context.module = config.module(context.module);
      context.configCache = configCache;
      context.fileCache = context.combined ? context.fileCache : {};
      context.moduleCache = {};

      // Load all resources associated with this module
      config.fileList(plugins, context, function(err, resources) {
        if (err) {
          return callback(err);
        }

        async.map(resources, function(resource, callback) {
          var resourceContext = context.clone();
          resourceContext.resource = resource;
          plugins.resource(resourceContext, callback);
        },
        function(err, resources) {
          if (err) {
            return callback(err);
          }

          resources = resources.filter(function(resource) { return resource; });

          context.moduleResources = resources;
          plugins.module(context, callback);
        });
      });
    }

    var event = new EventEmitter(),
        watching = {};

    function watchOutputHandler(status) {
      // If we are already watching a file don't do it again. Not that this prevents inputs
      // from changing without the config also changing.
      if (watching[status.fileName]) {
        return;
      }

      var rebuild = _.debounce(function() {
        if (context.module) {
          buildModule(context.clone(), logError);
        } else {
          buildMode(context.mode, context.clone(), logError);
        }
      }, 500);

      var context = new Context(status, config, plugins, event),
          input = status.input.map(function(input) { return fu.resolvePath(input.dir || input); });
      context.outdir = outdir;
      context.options = options;
      watch.watchFile({ virtual: status.fileName }, input, function(type, filename, sourceChange) {
          fu.resetCache(sourceChange);
          rebuild();
        });
      watching[status.fileName] = true;
    }

    return _.extend(event, {
      use: function(plugin) {
        plugins.use(plugin);
      },
      /**
       * 
       * @name build
       * @function This function builds out the package(s). 
       * @param {string} packageName the name of the package listed under
       *  'packages' from the lumbarFile passed in during the call to init().
       * @param {Function} callback the node process Function
       */
      build: function(packageName, callback) {
        if (!config) {
          loadConfig(lumbarFile, true);
        }

        var packageNames = packageName ? [packageName] : config.packageList(),
            contexts = [];
        packageNames.forEach(function(pkg) {
          var platforms = config.platformList(pkg);
          platforms.forEach(function(platform) {
            contexts.push(new Context({
                'package': pkg, 
                'platform': platform
              }, 
              config, plugins, event));
          });
        });

        async.forEach(contexts, buildPlatform, callback);
      },
      watch: function(packageName, callback) {
        if (!fs.watch) {
          throw new Error('Watch requires fs.watch, introduced in Node v0.6.0');
        }
        if (!config) {
          loadConfig(lumbarFile);
        }

        var packages = packageName ? [packageName] : config.packageList(),
            self = this;

        // Watch for changes in the config file
        // WARN : This isn't really safe for multiple executions, this is a concious design decision
        watch.watchFile(lumbarFile, [], function() {
          loadConfig(lumbarFile);

          // Cleanup what we can, breaking things along the way
          watch.unwatchAll();
          watching = {};

          // Give it a chance to cleanup before start recreating. Attempting to avoid the too many files error.
          setTimeout(function() {
            self.watch(packageName, callback);
          }, 1000);
        });

        // Watch the individual components
        event.removeListener('output', watchOutputHandler);
        event.on('output', watchOutputHandler);

        // Actual build everything
        packages.forEach(function(name) {
          self.build(name, logError);
        });
      },
      unwatch: function() {
        watch.unwatchAll();
      }
    });
};
