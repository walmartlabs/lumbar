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
    growl.notify(err.message, { title: 'Lumbar error' });
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
      var modules = config.moduleList(context.package);
      buildMode('scripts', modules, context, callback);
      buildMode('styles', modules, context, callback);
    }
    function buildMode(mode, modules, context, callback) {
      context.mode = mode;
      context.resources = [];
      context.fileCache = context.combined ? {} : undefined;

      modules.forEach(function(module) {
        var moduleContext = context.clone();
        moduleContext.module = module;

        buildModule(moduleContext, callback);
      });

      if (context.combined) {
        combineResources(context, context.package, function(err, data) {
          if (data) {
            data.package = context.package;
          }
          callback(err, data);
        });
      }
    }
    function buildModule(context, callback) {
      context.module = config.module(context.module);
      context.options = options;
      context.configCache = configCache;
      context.fileCache = context.combined ? context.fileCache : {};
      context.moduleCache = {};

      var resources = config.fileList(plugins, context).map(function(resource) {
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
      }
    }
    function combineResources(context, name, callback) {
      var resources = context.resources;
      if (!resources.length) {
        return;
      }

      if (context.mode === 'scripts' && resources.length) {
        context.fileName = outdir + '/' + context.platformPath + name + '.js';
      } else if (context.mode === 'styles' && resources.length) {
        context.fileName = outdir + '/' + context.platformPath + name + '.css';
      }

      plugins.file(context);
      combineFile(resources, context, name, callback);

      context.fileCache = undefined;
    }
    function combineFile(list, context, name, callback) {
      combine.combine(list, context.fileName, options.minimize, context.mode === 'styles', function(err, data) {
        if (err) {
          fs.unlink(context.fileName);
        }

        if (data) {
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
            buildPlatform(new Context({package: package, platform: platform}, config), callback);
          });
        });
      },
      watch: function(packageName, callback) {
        var packages = packageName ? [packageName] : config.packageList(),
            self = this;

        // Watch for changes in the config file
        // WARN : This isn't really safe for multiple executions, this is a concious design decision
        watch.watchFile(configFile, [], function() {
          loadConfig(configFile);

          // Cleanup what we can, breaking things along the way
          watch.unwatchAll();
          fu.resetCache();

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

            var context = new Context(status, config),
                input = status.input.map(function(input) { return fu.resolvePath(input); });
            watch.watchFile("foo" + status.fileName + "foo", input, _.debounce(function() {
              if (context.module) {
                buildModule(_.clone(context), callback);
              } else {
                buildPlatform(_.clone(context), callback);
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
