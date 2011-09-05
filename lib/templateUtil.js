var fs = require('fs'),
    fu = require('./fileUtil'),
    hbs = require('hbs');

// Totally Meta
const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const DEFAULT_CONFIG_TEMPLATE = "{{{name}}} = {{{data}}};\n";
var templateTemplate = hbs.compile(DEFAULT_TEMPLATE_TEMPLATE),
    packageConfigTemplate = hbs.compile(DEFAULT_CONFIG_TEMPLATE),
    controllerTemplate,
    moduleMapTemplate,
    moduleTemplate;

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
    templateTemplate = hbs.compile(template || DEFAULT_TEMPLATE_TEMPLATE);
};

exports.setControllerTemplate = function(path) {
    controllerTemplate = hbs.compile(fs.readFileSync(path, 'utf8'));
};
exports.getControllerTemplate = function() {
    if (!controllerTemplate) {
        exports.setControllerTemplate(__dirname + '/controller.handlebars');
    }
    return controllerTemplate;
};
exports.getModuleMapTemplate = function() {
    if (!moduleMapTemplate) {
        moduleMapTemplate = hbs.compile(fs.readFileSync(__dirname + '/moduleMap.handlebars', 'utf8'));
    }
    return moduleMapTemplate;
};
exports.getPackageConfigTemplate = function() {
    if (!moduleMapTemplate) {
        moduleMapTemplate = hbs.compile(fs.readFileSync(__dirname + '/moduleMap.handlebars', 'utf8'));
    }
    return moduleMapTemplate;
};
exports.getModuleTemplate = function() {
    if (!moduleTemplate) {
        moduleTemplate = hbs.compile(fs.readFileSync(__dirname + '/module.handlebars', 'utf8'));
    }
    return moduleTemplate;
};

exports.loadController = function(name, routes, callback) {
    fs.readFile(name, 'utf8', function(err, data) {
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

exports.loadModule = function(fileName, name, namespace, type, callback) {
    var moduleTemplate = exports.getModuleTemplate();
    fs.readFile(fileName, "utf8", function(err, data) {
        if (err) {
            callback(err);
            return;
        }
        callback(
            undefined,
            moduleTemplate({
                fileName: exports.escapeJsString(fileName),
                name: exports.escapeJsString(name),
                namespace: namespace,
                type: type,
                moduleContents: data
            })
        );
    });
};

exports.loadTemplate = function(name, templateCacheName, callback) {
    if (fu.isDirectory(name)) {
        fu.filesWithExtension(name,/\.handlebars$/).forEach(function(path) {
            exports.loadTemplate(path,templateCacheName,callback);
        });
    } else {
        fs.readFile(name, "utf8", function(err, data) {
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

    fs.readFile(configFile, "utf8", function(err, data) {
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
