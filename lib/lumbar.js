var _ = require('underscore'),
    combine = require('./jsCombine'),
    config = require('./config'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    templateUtil = require('./templateUtil'),
    watch = require('./watcher.js'),
    growl = require('growl');

const corePlugins = ['generator'];
var globalPlugins = {};

exports.plugin = function(name, plugin) {
  globalPlugins[name] = plugin;
};

function runPlugins(context, plugins) {
  var len = plugins.length;
  return (function next() {
    len--;
    var plugin = plugins[len];
    if (!plugin) {
      return context.resource;
    } else {
      return plugin(context, next);
    }
  })();
}

function logError(err) {
    // TODO : Move this to the executable
    console.error(err.stack || err.message);
    growl.notify(err.message, { title: 'Lumbar error' });
}

function loadConfig(path) {
  try {
     config.load(path);
  } catch (err) {
    // Do not die a horrible death if this is just a syntax error
    logError(err);
  }
}
function applyGenerators(context) {
  var loadedTemplates = {};
    var resource = context.resource,
        package = context.package,
        options = context.options,
        loadedTemplates = context.fileCache.loadedTemplates;

    if (!loadedTemplates) {
      loadedTemplates = context.fileCache.loadedTemplates = {};
    }

    if (resource.map) {
      // We do not generate a module map if we are in combine mode
      if (config.combineModules(package)) {
        return;
      }

      var buildModuleMap = function(callback) {
        var modules = config.moduleList(package),
            map = {};
        modules.forEach(function(module) {
          var routes = config.routeList(module);
          if (routes) {
            for (var route in routes) {
              map[route] = module + '.js';
            }
          }
        });

        templateUtil.loadModuleMap(map, config.moduleMap(), config.loadPrefix() + context.platformPath, callback);
      };
      buildModuleMap.sourceFile = 'module_map.json';
      return buildModuleMap;
    } else if (resource.packageConfig) {
      var packageConfigGen = function(callback) {
        templateUtil.loadPackageConfig(config.packageConfig(), options.packageConfigFile, callback);
      };
      packageConfigGen.sourceFile = 'package_config.json';
      return packageConfigGen;
    } else if (resource.router) {
      var routerGen = function(callback) {
        templateUtil.loadRouter(resource.router, resource.routes, callback);
      };
      routerGen.sourceFile = resource.router;
      return routerGen;
    } else if (resource.template) {
      if (loadedTemplates[resource.template]) {
        return;
      } else {
        loadedTemplates[resource.template] = true;
        var generator = function(callback) {
          templateUtil.loadTemplate(resource.template, config.templateCache(), callback);
        };
        generator.sourceFile = resource.template;
        return generator;
      }
    } else {
      return resource;
    }
}

exports.init = function(configFile, options) {
    var outdir = options.outdir,
        minimize = options.minimize,
        plugins = [];

    function registerPlugin(plugin) {
      plugins.push(globalPlugins[plugin] || plugin);
    }
    if (options.plugins) {
      options.plugins.forEach(registerPlugin);
    }

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
      context.platformPath = (context.platform ? context.platform + '/' : '');

      var modules = config.moduleList(context.package);
      modules.forEach(function(module) {
        context.module = module;
        buildModule(context, callback)
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
      var fileList = config.fileList(context.module, context.platform);

      context.fileCache = context.fileCache || {};
      context.moduleCache = {};

      var resources = fileList.map(function(resource) {
        context.resource = resource;
        context.options = options;
        context.config = config;
        return runPlugins(context, plugins);
      }).filter(function(resource) { return resource; });

      if (!context.combined) {
        context.resources = resources;
        combineResources(context, context.module, function(err, data) {
          if (data) {
            data.package = context.package;
            data.module = context.module;
          }
          callback(err, data);
        });
      } else {
        context.resources = context.resources || [];
        context.resources.push.apply(context.resources, resources);
      }
    }
    function combineResources(context, name, callback) {
      var fileName = outdir + '/' + context.platformPath + name + '.js';
      combine.combine(context.resources, fileName, options.minimize, function(err, data) {
        if (err) {
          fs.unlink(fileName);
        }

        context.fileCache = undefined;

        if (data) {
          data.platform = context.platform;
        }
        callback(err, data)
      });
    }

    loadConfig(configFile);
    initPlatforms();

    return {
        use: registerPlugin,
        build: function(packageName, callback) {
            var packages = packageName ? [packageName] : config.packageList();
            packages.forEach(function(package) {
              var platforms = config.platformList(package);
              platforms.forEach(function(platform) {
                buildPlatform({package: package, platform: platform}, callback);
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

                    if (status.fileName === 'module_map.json') {
                        return;
                    }
                    watch.watchFile("foo" + status.fileName + "foo", status.input, function() {
                      if (status.module) {
                        buildModule(_.clone(status), callback);
                      } else {
                        buildPlatform(_.clone(status), callback);
                      }
                    });
                });
            });
        }
    };
};
