var fu = require('./fileUtil'),
    handlebars = require('handlebars');

var routerTemplate,
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

exports.setRouterTemplate = function(path) {
  routerTemplate = handlebars.compile(fu.readFileSync(path));
};
exports.getRouterTemplate = function() {
    if (!routerTemplate) {
        exports.setRouterTemplate(__dirname + '/router.handlebars');
    }
    return routerTemplate;
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
