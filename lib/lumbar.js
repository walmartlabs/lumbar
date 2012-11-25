var _ = require('underscore'),
    async = require('async'),
    build = require('./build'),
    combine = require('./jsCombine'),
    configLoader = require('./config'),
    Context = require('./context'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    fu = require('./fileUtil'),
    Mixin = require('./mixins'),
    plugin = require('./plugin'),
    WatchManager = require('./watch-manager');

exports.build = build;
exports.fileUtil = fu;
exports.plugin = plugin.plugin;
exports.combine = combine.combine;
exports.config = configLoader;

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
        mixins = new Mixin(options),
        config,
        configCache,
        context;

    function logError(err) {
      if (err) {
        event.emit('error', err);
      }
    }

    function loadConfig(path, callback) {
      try {
        fu.resetCache();

        configCache = {};
        config = configLoader.load(path);
        plugins.initialize(config);

        config.outdir = options.outdir = outdir || config.attributes.output;

        context = new Context(options, config, plugins, mixins, event);
        context.options = options;
        context.configCache = configCache;

        mixins.initialize(context, function(err) {
          if (err) {
            return callback(err);
          }

          plugins.loadConfig(context, function(err) {
            if (err) {
              return callback(err);
            }

            // Ensure that we have the proper build output
            if (!config.outdir) {
              return callback(new Error('Output must be defined on the command line or config file.'));
            }
            context.outdir = config.outdir;

            fu.ensureDirs(config.outdir + '/.', function(err) {
              var stat = fs.statSync(config.outdir);
              if (!stat.isDirectory()) {
                callback(new Error("Output must be a directory"));
              } else {
                callback();
              }
            });
          });
        });
      } catch (err) {
        callback(err);
      }
    }

    function buildPlatform(context, callback) {
      var modes = context.mode ? [context.mode] : plugins.modes();

      async.forEach(modes, function(mode, callback) {
          buildMode(mode, context, callback);
        },
        callback);
    }
    function buildMode(mode, context, callback) {
      var modules = context.module ? [context.module] : config.moduleList(context.package);

      context = context.clone();
      context.mode = mode;
      context.modeCache = {};

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
      var module = config.module(context.module);
      if (!module) {
        return callback(new Error('Unable to find module "' + context.module + '"'));
      }

      context.module = module;
      context.fileCache = context.combined ? context.fileCache : {};
      context.moduleCache = {};

      var resource = context.resource;
      if (resource) {
        resource = resource.originalResource || resource;
        processResources([resource]);
      } else {
        // Load all resources associated with this module
        build.loadResources(context, function(err, resources) {
          if (err) {
            return callback(err);
          }
          processResources(resources);
        });
      }

      function processResources(resources) {
        build.processResources(resources, context, function(err, resources) {
          if (err) {
            return callback(err);
          }

          context.moduleResources = resources;
          plugins.module(context, callback);
        });
      }
    }

    var event = new EventEmitter(),
        watch;

    function watchOutputHandler(status) {
      if (!watch) {
        // We've been cleaned up but residuals may still exist, do nothing on this exec
        return;
      }

      if (status.fileConfig.isPrimary) {
        delete status.fileConfig;
      } else if (status.fileConfig.isPrimary === false) {
        // This config is directly linked to another meaning we don't want to watch on it as
        // it will be rebuilt.
        return;
      }

      var originalConfig = config;
      watch.moduleOutput(status, function() {
        if (config !== originalConfig) {
          // Ignore builds that may have occured at the same time as a config file change (i.e. a branch switch)
          return;
        }

        buildPlatform(context.clone(status), logError);
      });
    }

    return _.extend(event, {
      config: function() {
        return config;
      },

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
      build: function(packageName, modules, callback) {
        if (!callback) {
          callback = modules;
          modules = undefined;
        }

        // Allow a string or a list as modules input
        if (!_.isArray(modules)) {
          modules = [modules];
        } else if (!modules.length) {
          // Special case empty array input to build all
          modules = [undefined];
        }

        loadConfig(lumbarFile, function(err) {
          if (err) {
            return callback(err);
          }

          var options = {};
          if (typeof packageName === "object") {
            options = packageName;
            packageName = options.package;
          }

          var packageNames = packageName ? [packageName] : config.packageList(),
              contexts = [];

          packageNames.forEach(function(pkg) {
            modules.forEach(function(module) {
              options.package = pkg;
              options.module = module || undefined;   // '' -> undefined

              var platforms = config.platformList(pkg);
              platforms.forEach(function(platform) {
                options.platform = platform;

                var newContext = context.clone(options);
                contexts.push(newContext);
              });
            });
          });

          async.forEach(contexts, buildPlatform, callback);
        });
      },
      watch: function(packageName, modules, callback) {
        if (!fs.watch) {
          throw new Error('Watch requires fs.watch, introduced in Node v0.6.0');
        }

        watch = new WatchManager();
        watch.on('watch-change', function(info) {
          event.emit('watch-change', info);
        });

        var self = this;
        loadConfig(lumbarFile, function(err) {
          if (err) {
            logError(err);
          }

          if (!callback) {
            callback = modules;
            modules = undefined;
          }

          // Watch for changes in the config file
          var mixinPaths = _.filter(_.pluck(mixins.configs, 'path'), function(path) { return path; });
          watch.configFile(lumbarFile, mixinPaths, function() {
            config = undefined;
            self.watch(packageName, callback);
          });

          // If we have errored do not exec everything as it could be in an indeterminate state
          if (err) {
            return;
          }

          // Watch the individual components
          event.removeListener('output', watchOutputHandler);
          event.on('output', watchOutputHandler);

          // Actual build everything
          var packages = packageName ? [packageName] : config.packageList();
          packages.forEach(function(name) {
            self.build(name, modules, logError);
          });
        });
      },
      unwatch: function() {
        event.removeListener('output', watchOutputHandler);
        if (watch) {
          watch.removeAllListeners();
          watch.reset();
          watch = undefined;
        }
      }
    });
};
