var _ = require('underscore'),
    async = require('async'),
    ChildPool = require('child-pool'),
    Context = require('./context'),
    EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    stateMachine = require('./state-machine'),
    WatchManager = require('./watch-manager');

exports.build = require('./build');
exports.fileUtil = require('./fileUtil');
exports.plugin = require('./plugin').plugin;
exports.combine = require('./jsCombine').combine;
exports.config = require('./config');

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
    // Clone so we can mutate in the use API
    options = _.clone(options || {});
    options.plugins = _.clone(options.plugins || []);

    function logError(err) {
      if (err) {
        event.emit('error', err);
      }
    }

    var event = new EventEmitter(),
        watch,
        watchContext;

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

      var originalContext = watchContext;
      watch.moduleOutput(status, function() {
        if (watchContext !== originalContext) {
          // Ignore builds that may have occured at the same time as a config file change (i.e. a branch switch)
          return;
        }

        stateMachine.loadPlatform(watchContext.clone(status), function(err, contexts) {
          if (err) {
            return logError(err);
          }

          stateMachine.buildContexts(contexts, logError);
        });
      });
    }

    return _.extend(event, {
      use: function(plugin) {
        // Only has impact before exec
        options.plugins.push(plugin);
      },

      moduleMap: function(packageName, mapOptions, callback) {
        if (!callback) {
          callback = mapOptions;
          mapOptions = {};
        }
        if (!callback) {
          callback = packageName;
          packageName = undefined;
        }

        stateMachine.loadConfig(lumbarFile, event, options, function(err, rootContext) {
          if (err) {
            return callback(err);
          }

          rootContext.mode = 'scripts';
          stateMachine.loadPackages(rootContext, packageName, function(err, contexts) {
            if (err) {
              return callback(err);
            }

            var ModuleMap = rootContext.plugins.get('module-map'),
                packages = _.keys(contexts),
                platforms = [];
            async.forEach(packages, function(packageName, callback) {
                var package = contexts[packageName],
                    packagePlatforms = _.keys(package);
                platforms = platforms.concat(packagePlatforms);

                async.forEach(packagePlatforms, function(platformName, callback) {
                    var platform = package[platformName],
                        context = platform[0];

                    ModuleMap.buildMap(context, mapOptions, function(err, map, loadPrefix) {
                      if (!err) {
                        // Provide some sort of waypoint
                        map.isMap = true;
                        map.loadPrefix = context.config.loadPrefix() + context.platformPath + loadPrefix;

                        ModuleMap.stripPrefix(map, loadPrefix)

                        function mapModule(module) {
                          module.js = platformMap(module.js);
                          if (module.css) {
                            module.css.href = platformMap(module.css.href);
                          }
                        }
                        function platformMap(path) {
                          if (path) {
                            return context.platformPath + loadPrefix + path;
                          }
                        }

                        // The user requested the file system paths, construct
                        if (mapOptions.localPath) {
                          if (map.base) {
                            mapModule(map.base);
                          }
                          _.each(map.modules, mapModule);
                        }

                        if (!platformName || platformName === 'undefined') {
                          contexts[packageName] = map;
                        } else {
                          package[platformName] = map;
                        }
                      }
                      callback(err);
                    });
                  },
                  callback);
              },
              function(err) {
                callback(err, contexts);
              });
          });
        });
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
        stateMachine.loadAndInitDir(lumbarFile, event, options, function(err, rootContext) {
          if (err) {
            if (!callback) {
              throw err;
            }
            return callback(err);
          }

          stateMachine.buildPackages(rootContext, packageName, modules, callback);
        });
      },
      watch: function(packageName, modules, callback) {
        if (!fs.watch) {
          throw new Error('Watch requires fs.watch, introduced in Node v0.6.0');
        }

        ChildPool.isBackground(true);

        watch = new WatchManager();
        watch.on('watch-change', function(info) {
          event.emit('watch-change', info);
        });

        var self = this;
        stateMachine.loadAndInitDir(lumbarFile, event, options, function(err, rootContext) {
          if (err) {
            logError(err);
          }

          if (!callback) {
            callback = modules;
            modules = undefined;
          }

          watchContext = rootContext;

          // Watch for changes in the config file
          var mixinPaths = _.filter(_.pluck(rootContext.libraries.configs, 'path'), function(path) { return path; });
          watch.configFile(lumbarFile, mixinPaths, function() {
            watchContext = undefined;
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
          var packages = packageName ? [packageName] : rootContext.config.packageList();
          packages.forEach(function(name) {
            stateMachine.buildPackages(rootContext, name, modules, logError);
          });
        });
      },
      unwatch: function() {
        event.removeListener('output', watchOutputHandler);
        if (watch) {
          watch.removeAllListeners();
          watch.reset();
          watch = undefined;
          watchContext = undefined;
        }
      }
    });
};
