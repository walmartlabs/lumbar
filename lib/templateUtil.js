var fs = require('fs'),
    hbs = require('hbs');

// Totally Meta
const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
var templateTemplate = hbs.compile(DEFAULT_TEMPLATE_TEMPLATE),
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
    templateTemplate = hbs.compile(template || DEFAULT_TEMPLATE_TEMPLATE);
};

exports.getControllerTemplate = function() {
    if (!controllerTemplate) {
        controllerTemplate = hbs.compile(fs.readFileSync(__dirname + '/controller.handlebars', 'utf8'));
    }
    return controllerTemplate;
};
exports.getModuleMapTemplate = function() {
    if (!moduleMapTemplate) {
        moduleMapTemplate = hbs.compile(fs.readFileSync(__dirname + '/moduleMap.handlebars', 'utf8'));
    }
    return moduleMapTemplate;
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
exports.loadModuleMap = function(map, mapper, callback) {
    var moduleMapTemplate = exports.getModuleMapTemplate();
    callback(
        undefined,
        moduleMapTemplate({
            moduleMapper: mapper,
            map: JSON.stringify(map)
        })
    );
};

exports.loadTemplate = function(name, templateCacheName, callback) {
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
};
