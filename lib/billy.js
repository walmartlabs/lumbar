var combine = require('./jsCombine'),
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
    var config = fs.readFileSync(path, 'utf8');

    try {
        config = JSON.parse(config);

        if (config.controllerTemplate) {
            templateUtil.setControllerTemplate(config.controllerTemplate);
        }

        return config;
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

    var iterator = function(resource) {
        if (resource === 'module_map.json') {
            var buildModuleMap = function(callback) {
                var map = {};
                for (var name in config.modules) {
                    var module = config.modules[name];
                    if (module.routes) {
                        for (var route in module.routes) {
                            map[route] = name + '.js';
                        }
                    }
                }

                templateUtil.loadModuleMap(map, config.moduleMap, config.loadPrefix, callback);
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
    };

    for (var i = 0, len = files.length; i < len; i++) {
        if(fu.isDirectory(files[i])) {
            fu.filesWithExtension(files[i],/\.(js|json)/).forEach(iterator);
        } else {
            iterator(files[i]);
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
        moduleList = loadList(config),
        platforms = config.platforms || [''];


    function initPlatforms() {
        platforms.forEach(function(platform) {
            if (!platform) {
                return;
            }
            try {
                console.log("mkdir:\t\033[90mmaking directory\033[0m " + platform);
                fs.mkdirSync(outdir + '/' + platform, 0755);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
        });
    }
    initPlatforms();

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
                platforms = config.platforms || [''];

                // Cleanup what we can, breaking things along the way
                watch.unwatchAll();
                fu.resetCache();

                // Give it a chance to cleanup before start recreating. Attempting to avoid the too many files error.
                setTimeout(function() {
                    initPlatforms();
                    self.watch(moduleName, callback);
                }, 1000);
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
