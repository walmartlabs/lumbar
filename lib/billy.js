var combine = require('./jsCombine'),
    fs = require('fs'),
    templateUtil = require('./templateUtil'),
    watch = require('./watcher.js');

function logError(err) {
    console.error(err.stack);
}

function loadConfig(path) {
    var config = fs.readFileSync(path, 'utf8');

    try {
        return JSON.parse(config);
    } catch (err) {
        // Do not die a horrible death if this is just a syntax error
        logError(err);
        return {};
    }
}
function loadList(config) {
    var moduleList = [];
    for (var name in config.modules) {
        moduleList.push(name);
    }
    return moduleList;
}
function explodeViews(module, config) {
    var views = config.views,
        loadedTemplates = {},
        ret = [],

        files = module.controller ? module.support : module;

    for (var i = 0, len = files.length; i < len; i++) {
        var resource = files[i];
        if (resource === 'module_map.json') {
            var buildModuleMap = function(callback) {
                var map = {};
                for (var name in config.modules) {
                    var module = config.modules[name];
                    if (module.routes) {
                        for (var route in module.routes) {
                            map[route] = name;
                        }
                    }
                }

                templateUtil.loadModuleMap(map, config.moduleMap, callback);
            };
            buildModuleMap.sourceFile = 'module_map.json';

            ret.push(buildModuleMap);
        } else {
            ret.push(resource);
        }

        if (views[resource]) {
            views[resource].forEach(function(template) {
                var generator = function(callback) {
                    templateUtil.loadTemplate(template, config.templateCache, callback);
                };
                generator.sourceFile = template;
                ret.push(generator);
            });
        }
    }

    // Generate the controller if we have the info for it
    if (module.controller) {
      var controllerGen = function(callback) {
        templateUtil.loadController(module.controller, module.routes, callback);
      };
      controllerGen.sourceFile = module.controller;
      ret.push(controllerGen);
    }

    return ret;
}

exports.init = function(configFile, outdir) {
    var config = loadConfig(configFile),
        moduleList = loadList(config);

    return {
        build: function(moduleName, callback) {
            var modules = moduleName ? [moduleName] : moduleList;
            modules.forEach(function(name) {
                var resources = explodeViews(config.modules[name], config),
                    moduleName = outdir + '/' + name + '.js';
                combine.combine(resources, moduleName, function(err, data) {
                    if (err) {
                        fs.unlink(moduleName);
                    }

                    callback(err, data)
                });
            });
        },
        watch: function(moduleName, callback) {
            var modules = moduleName ? [moduleName] : moduleList,
                self = this;

            // Watch for changes in the config file
            // WARN : This isn't really safe for multiple executions, this is a concious design decision
            watch.watchFile(configFile, [], function() {
                // Reload our config
                config = loadConfig(configFile);
                moduleList = loadList(config);

                // Cleanup what we can, breaking things along the way
                watch.unwatchAll();
                self.watch(moduleName, callback);
            });

            // Watch the individual components
            modules.forEach(function(name) {
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
                        self.build(name, callback);
                    });
                });
            });
        }
    };
};
