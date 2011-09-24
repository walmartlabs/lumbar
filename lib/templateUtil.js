var fu = require('./fileUtil'),
    handlebars = require('handlebars');

// Totally Meta
const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
const DEFAULT_CONFIG_TEMPLATE = "{{{name}}} = {{{data}}};\n";
var templateTemplate = handlebars.compile(DEFAULT_TEMPLATE_TEMPLATE),
    packageConfigTemplate = handlebars.compile(DEFAULT_CONFIG_TEMPLATE),
    routerTemplate,
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

exports.setRouterTemplate = function(path) {
  routerTemplate = handlebars.compile(fu.readFileSync(path));
};
exports.getRouterTemplate = function() {
    if (!routerTemplate) {
        exports.setRouterTemplate(__dirname + '/router.handlebars');
    }
    return routerTemplate;
};
exports.getModuleMapTemplate = function() {
    if (!moduleMapTemplate) {
      moduleMapTemplate = handlebars.compile(fu.readFileSync(__dirname + '/moduleMap.handlebars'));
    }
    return moduleMapTemplate;
};
exports.getPackageConfigTemplate = function() {
    if (!moduleMapTemplate) {
      moduleMapTemplate = handlebars.compile(fu.readFileSync(__dirname + '/moduleMap.handlebars'));
    }
    return moduleMapTemplate;
};

exports.loadRouter = function(name, routes, callback) {
    fu.readFile(name, function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        var routerTemplate = exports.getRouterTemplate();
        callback(
            undefined,
            routerTemplate({
                name: name,
                routerLogic: data,
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
