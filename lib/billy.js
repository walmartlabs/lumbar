var combine = require('./jsCombine'),
    fs = require('fs'),
    templateUtil = require('./templateUtil');

function loadConfig(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
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
        moduleList = [];

    for (var name in config.modules) {
        moduleList.push(name);
    }

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
        }
    };
};
