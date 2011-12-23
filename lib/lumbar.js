var _ = require('underscore'),
    combine = require('./jsCombine'),
    configLoader = require('./config'),
    Context = require('./context'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    plugin = require('./plugin'),
    watch = require('./watcher.js'),
    growl = require('growl');

function logError(err) {
    // TODO : Move this to the executable
    console.error(err.stack || err.message);
    growl(err.message, { title: 'Lumbar error' });
}

var config, configCache;
function loadConfig(path) {
  try {
    configCache = {};
    config = configLoader.load(path);
  } catch (err) {
    // Do not die a horrible death if this is just a syntax error
    logError(err);
  }
}

exports.fileUtil = fu;
exports.plugin = plugin.plugin;
exports.init = function(configFile, options) {
    var outdir = options.outdir,
        minimize = options.minimize,
        plugins = plugin.create(options);

    function initPlatforms() {
      config.platformList().forEach(function(platform) {
        if (!platform) {
          return;
        }
        try {
          console.log("mkdir:\t\033[90mmaking directory\033[0m " + outdir + '/' + platform);
          fs.mkdirSync(outdir + '/' + platform, 0755);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            throw err;
          }
        }
      });
    }

    function buildPlatform(context, callback) {
      buildMode('scripts', context, callback);
      buildMode('styles', context, callback);
    }
    function buildMode(mode, context, callback) {
      var modules = config.moduleList(context.package);

      context = context.clone();
      context.mode = mode;

      plugins.generatedFiles(context).forEach(function(fileConfig) {
        var fileContext = context.clone(true);
        fileContext.fileConfig = fileConfig;
        fileContext.resources = [];
        fileContext.fileCache = fileContext.combined ? {} : undefined;

        if (fileContext.combined) {
          var fileName = plugins.fileName(fileContext);
          fileContext.fileName = outdir + '/' + fileName.path + '.' + fileName.extension;
        }

        var returned = 0;
        modules.forEach(function(module) {
          var moduleContext = fileContext.clone();
          moduleContext.module = module;

          buildModule(moduleContext, function(err, data) {
            if (err) {
              return callback(err);
            }

            returned++;
            if (fileContext.combined) {
              if (returned === modules.length) {
                combineResources(fileContext, fileContext.package, function(err, data) {
                  if (data) {
                    data.package = fileContext.package;
                  }
                  callback(err, data);
                });
              }
            } else if (data) {    // No files for a particular module mode
              callback(err, data);
            }
          });
        });
      });
    }
    function buildModule(context, callback) {
      context.module = config.module(context.module);
      context.options = options;
      context.configCache = configCache;
      context.fileCache = context.combined ? context.fileCache : {};
      context.moduleCache = {};

      if (!context.combined) {
        var fileName = plugins.fileName(context);
        context.fileName = outdir + '/' + fileName.path + '.' + fileName.extension;
      }

      config.fileList(plugins, context, function(err, resources) {
        if (err) {
          return callback(err);
        }

        resources = resources.map(function(resource) {
          var resourceContext = context.clone();
          resourceContext.resource = resource;
          return plugins.resource(resourceContext);
        }).filter(function(resource) { return resource; });

        context.moduleResources = resources;
        plugins.module(context);

        if (!context.combined) {
          context.resources = context.moduleResources;
          context.moduleResources = undefined;
          combineResources(context, context.module.name, function(err, data) {
            if (data) {
              data.package = context.package;
              data.module = context.module.name;
            }
            callback(err, data);
          });
        } else {
          context.resources.push.apply(context.resources, context.moduleResources);
          context.moduleResources = undefined;
          callback();
        }
      });
    }
    function combineResources(context, name, callback) {
      var resources = context.resources;
      if (!resources.length) {
        return;
      }

      plugins.file(context);
      combineFile(resources, context, name, callback);

      context.fileCache = undefined;
    }
    function combineFile(list, context, name, callback) {
      combine.combine(
          list,
          context.fileName,
          options.minimize && context.mode === 'scripts',
          context.mode === 'styles',
          function(err, data) {
        if (err) {
          fs.unlink(context.fileName);
        }

        if (data) {
          data.fileConfig = context.fileConfig;
          data.platform = context.platform;
          data.mode = context.mode;
        }
        callback(err, data)
      });
    }

    loadConfig(configFile);
    initPlatforms();

    return {
      use: function(plugin) {
        plugins.use(plugin);
      },
      build: function(packageName, callback) {
        var packages = packageName ? [packageName] : config.packageList();
        packages.forEach(function(package) {
          var platforms = config.platformList(package);
          platforms.forEach(function(platform) {
            buildPlatform(new Context({package: package, platform: platform}, config, plugins), callback);
          });
        });
      },
      watch: function(packageName, callback) {
        if (!fs.watch) {
          throw new Error('Watch requires fs.watch, introduced in Node v0.6.0');
        }

        var packages = packageName ? [packageName] : config.packageList(),
            self = this;

        // Watch for changes in the config file
        // WARN : This isn't really safe for multiple executions, this is a concious design decision
        watch.watchFile(configFile, [], function() {
          loadConfig(configFile);

          // Cleanup what we can, breaking things along the way
          watch.unwatchAll();

          // Give it a chance to cleanup before start recreating. Attempting to avoid the too many files error.
          setTimeout(function() {
            initPlatforms();
            self.watch(packageName, callback);
          }, 1000);
        });

        // Watch the individual components
        packages.forEach(function(name) {
          self.build(name, function(err, status) {
            if (err) {
              logError(err);
              return;
            }

            callback(err, status);

            var context = new Context(status, config, plugins),
                input = status.input.map(function(input) { return fu.resolvePath(input.dir || input); });
            watch.watchFile({ virtual: status.fileName }, input, _.debounce(function() {
              if (context.module) {
                buildModule(context.clone(), callback);
              } else {
                buildMode(context.mode, context.clone(), callback);
              }
            }, 500));
          });
        });
      },
      unwatch: function() {
        watch.unwatchAll();
      }
    };
};
