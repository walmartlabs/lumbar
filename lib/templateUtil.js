var fs = require('fs'),
    hbs = require('hbs');

// Totally Meta
const DEFAULT_TEMPLATE_TEMPLATE = "/* handsfree : {{{name}}}*/\n{{{templateCache}}}['{{{name}}}'] = Handlebars.compile('{{{data}}}');\n";
var templateTemplate = hbs.compile(DEFAULT_TEMPLATE_TEMPLATE);

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

exports.loadTemplate = function(name, callback) {
    fs.readFile(path, "utf8", function(err, data) {
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
                templateCache: templateCache,
                data: data
            })
        );
    });
};
