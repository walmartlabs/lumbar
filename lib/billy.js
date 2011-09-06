var combine = require('./jsCombine'),
    config = require('./config'),
    fs = require('fs'),
    fu = require('./fileUtil'),
    templateUtil = require('./templateUtil'),
    watch = require('./watcher.js'),
    growl = require('growl');

function logError(err) {
    console.error(err.stack || err.message);
    growl.notify(err.message, { title: 'Billy error' });
}

function loadConfig(path) {
  try {
     config.load(path);
  } catch (err) {
    // Do not die a horrible death if this is just a syntax error
    logError(err);
  }
}
function applyGenerators(resources, package, platform, options) {
  var loadedTemplates = {};
  return resources.map(function(resource) {    
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

        templateUtil.loadModuleMap(map, config.moduleMap(), config.loadPrefix() + (platform ? platform + '/' : ''), callback);
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
      var controllerGen = function(callback) {
        templateUtil.loadController(resource.router, resource.routes, callback);
      };
      controllerGen.sourceFile = resource.router;
      return controllerGen;
    } else if (resource.template) {
      var filename = config.templatesPath() + resource.template;
      if (loadedTemplates[resource.template]) {
        return;
      } else {
        loadedTemplates[resource.template] = true;
        var generator = function(callback) {
          templateUtil.loadTemplate(filename, config.templateCache(), callback);
        };
        generator.sourceFile = filename;
        return generator;
      }
    } else if (resource.model) {
      return (function(resource) {
        var filename = config.modelsPath() + resource.model;
        var modelGenerator = function(callback) {
          templateUtil.loadModule(config.modelsNamespace(), resource.model.replace(/\.js$/, ''), filename, callback);
        };
        modelGenerator.sourceFile = filename;
        return modelGenerator;
      })(resource);
    } else if (resource.collection) {
      return (function(resource) {
        var filename = config.collectionsPath() + resource.collection;
        var collectionGenerator = function(callback) {
          templateUtil.loadModule(config.collectionsNamespace(), resource.collection.replace(/\.js$/, ''), filename, callback);
        };
        collectionGenerator.sourceFile = filename;
        return collectionGenerator;
      })(resource);
    } else if (resource.view) {
      return (function(resource) {
        var filename = config.viewsPath() + resource.view;
        var viewGenerator = function(callback) {
          templateUtil.loadModule(config.viewsNamespace(), resource.view.replace(/\.js$/, ''), filename, callback);
        };
        viewGenerator.sourceFile = filename;
        return viewGenerator;
      })(resource);
    } else {
      return resource;
    }
  }).filter(function(resource) { return resource; });
}

exports.init = function(configFile, options) {
    var outdir = options.outdir,
        minimize = options.minimize;

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

    function buildPlatform(package, platform, callback) {
      var modules = config.moduleList(package),
          allResources = config.combineModules(package) && [];
      modules.forEach(function(module, i) {
        //help prevent too many open files (fs.*sync methods don't really appear to be sync when it comes to closing file descriptors)
        setTimeout(function(){
          buildModule(package, platform, module, allResources, callback);
        }, i * 100);
      });

      if (allResources) {
        combineResources(allResources, platform, package, function(err, data) {
          if (data) {
            data.package = package;
          }
          callback(err, data);
        });
      }
    }
    function buildModule(package, platform, module, allResources, callback) {
      var fileList = config.fileList(module, platform),
          resources = applyGenerators(fileList, package, platform, options);
      if (!allResources) {
        combineResources(resources, platform, module, function(err, data) {
          if (data) {
            data.package = package;
            data.module = module;
          }
          callback(err, data);
        });
      } else {
        allResources.push.apply(allResources, resources);
      }
    }
    function combineResources(resources, platform, name, callback) {
      var fileName = outdir + '/' + (platform ? platform + '/' : '') + name + '.js';
      combine.combine(resources, fileName, options.minimize, function(err, data) {
        if (err) {
          fs.unlink(fileName);
        }

        if (data) {
          data.platform = platform;
        }
        callback(err, data)
      });
    }

    loadConfig(configFile);
    initPlatforms();

    return {
        build: function(packageName, callback) {
            var packages = packageName ? [packageName] : config.packageList();
            packages.forEach(function(package) {
              var platforms = config.platformList(package);
              platforms.forEach(function(platform) {
                buildPlatform(package, platform, callback);
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
                        buildModule(status.package, status.platform, status.module, undefined, callback);
                      } else {
                        buildPlatform(status.package, status.platform, callback);
                      }
                    });
                });
            });
        }
    };
};
