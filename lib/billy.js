var combine = require('./jsCombine'),
    fs = require('fs'),
    templateUtil = require('./templateUtil'),
    watch = require('./watcher.js');

function loadConfig(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
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
        ret = [];

    for (var i = 0, len = module.length; i < len; i++) {
        var resource = module[i];
        ret.push(resource);

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
                combine.combine(resources, moduleName, callback);
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
                        throw err;
                    }

                    callback(err, status);

                    watch.watchFile("foo" + status.fileName + "foo", status.input, function() {
                        self.build(name, callback);
                    });
                });
            });
        }
    };
};
