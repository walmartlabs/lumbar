var fs = require('fs'),
    fu = require('./fileUtil'),
    handlebars = require('handlebars');

// Totally Meta
const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const DEFAULT_CONFIG_TEMPLATE = "{{{name}}} = {{{data}}};\n";
var templateTemplate = handlebars.compile(DEFAULT_TEMPLATE_TEMPLATE),
    packageConfigTemplate = handlebars.compile(DEFAULT_CONFIG_TEMPLATE),
    controllerTemplate,
    moduleMapTemplate;

const ESCAPER_LUT = {
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\v': '\\v',
    '\'': '\\\'',
    '\"': '\\\"',
    '\\': '\\\\'
};
const ESCAPER = /[\b\f\n\r\t\v\'\"\\]/g;

exports.escapeJsString = function(string) {
    // TODO : Handle unicode escapes
    return string.replace(ESCAPER, function(c) { return ESCAPER_LUT[c] || c; });
}

exports.setTemplateTemplate = function(template) {
    // The templates will eventually become self replecating and all will be lost...
    templateTemplate = handlebars.compile(template || DEFAULT_TEMPLATE_TEMPLATE);
};

exports.setControllerTemplate = function(path) {
    controllerTemplate = handlebars.compile(fs.readFileSync(path, 'utf8'));
};
exports.getControllerTemplate = function() {
    if (!controllerTemplate) {
        exports.setControllerTemplate(__dirname + '/controller.handlebars');
    }
    return controllerTemplate;
};
exports.getModuleMapTemplate = function() {
    if (!moduleMapTemplate) {
        moduleMapTemplate = handlebars.compile(fs.readFileSync(__dirname + '/moduleMap.handlebars', 'utf8'));
    }
    return moduleMapTemplate;
};
exports.getPackageConfigTemplate = function() {
    if (!moduleMapTemplate) {
        moduleMapTemplate = handlebars.compile(fs.readFileSync(__dirname + '/moduleMap.handlebars', 'utf8'));
    }
    return moduleMapTemplate;
};

exports.loadController = function(name, routes, callback) {
    fu.readFile(name, function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        var controllerTemplate = exports.getControllerTemplate();
        callback(
            undefined,
            controllerTemplate({
                name: name,
                controllerLogic: data,
                routes: JSON.stringify(routes)
            })
        );
    });
};
exports.loadModuleMap = function(map, mapper, loadPrefix, callback) {
    var moduleMapTemplate = exports.getModuleMapTemplate();
    callback(
        undefined,
        moduleMapTemplate({
            moduleMapper: mapper,
            loadPrefix: loadPrefix,
            map: JSON.stringify(map)
        })
    );
};

exports.loadTemplate = function(name, templateCacheName, callback) {
    if (fu.isDirectory(name)) {
        fu.filesWithExtension(name,/\.handlebars$/).forEach(function(path) {
            exports.loadTemplate(path,templateCacheName,callback);
        });
    } else {
        fu.readFile(name, function(err, data) {
            if (err) {
                callback(err);
                return;
            }

            // We have the template data, now convert it into a safe javascript string
            name = exports.escapeJsString(name);
            data = exports.escapeJsString(data);

            callback(
                undefined,
                templateTemplate({
                    name: name,
                    templateCache: templateCacheName,
                    data: data
                })
            );
        });
    }
};

exports.loadPackageConfig = function(name, configFile, callback) {
    if (!configFile) {
        return callback(new Error('package_config.json specified without file being set'));
    }

    fu.readFile(configFile, function(err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(
            undefined,
            packageConfigTemplate({
                name: name,
                data: data
            })
        );
    });
};
