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
      context.combined = config.combineModules(context.package);
      context.fileCache = context.combined ? {} : undefined;

      var modules = config.moduleList(context.package);
      modules.forEach(function(module) {
        context = _.clone(context);
        context.module = module;
        buildModule(context, callback);
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
      context.platformPath = (context.platform ? context.platform + '/' : '');
      context.module = config.module(context.module);
      context.options = options;
      context.config = config;
      context.configCache = configCache;
      context.fileCache = context.combined ? context.fileCache : {};
      context.moduleCache = {};

      var resources = {};
      var fileList = config.fileList(plugins, context);
      function processList(list, mode) {
        if (!list) { return };

        context.mode = mode;
        return list.map(function(resource) {
            context.resource = resource;
            return plugins.resource(context);
          }).filter(function(resource) { return resource; });
      }
      resources.scripts = processList(fileList.scripts, 'scripts');
      resources.styles = processList(fileList.styles, 'styles');
      context.mode = undefined;

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
        context.resources = context.resources || {scripts: [], styles: []};
        if (context.moduleResources.scripts) {
          context.resources.scripts.push.apply(context.resources.scripts, context.moduleResources.scripts);
        }
        if (context.moduleResources.styles) {
          context.resources.styles.push.apply(context.resources.styles, context.moduleResources.styles);
        }
        context.moduleResources = undefined;
      }
    }
    function combineResources(context, name, callback) {
      var resources = context.resources;
      if (resources.scripts && resources.scripts.length) {
        var fileName = outdir + '/' + context.platformPath + name + '.js';

        context.mode = 'scripts';
        context.fileName = fileName;
        plugins.file(context);

        combineFile(resources.scripts, context, name, callback);
      }
      if (resources.styles && resources.styles.length) {
        var fileName = outdir + '/' + context.platformPath + name + '.css';

        context.mode = 'styles';
        context.fileName = fileName;
        plugins.file(context);

        combineFile(resources.styles, context, name, callback);
      }

      context.fileCache = undefined;
    }
    function combineFile(list, context, name, callback) {
      combine.combine(list, context.fileName, options.minimize, function(err, data) {
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
