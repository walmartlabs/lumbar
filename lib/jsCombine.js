var fu = require('./fileUtil'),
    uglify = require('uglify-js');

exports.combine = function(files, output, minimize, callback) {

    function outputIfCompleted() {
        if (completed >= files.length) {
            var lastEl;
            var data = content.reduce(function(prev, el) {
                var ret = el.content;
                if (prev) {
                  ret = prev + (!lastEl || !lastEl.noSeparator ? ';;\n' : '') + ret
                }
                lastEl = el;
                return ret;
              }, '');

            // Minimize the content if flagged
            if (minimize) {
                var ast = uglify.parser.parse(data);
                ast = uglify.uglify.ast_mangle(ast);
                ast = uglify.uglify.ast_squeeze(ast);
                data = uglify.uglify.gen_code(ast);
            }

            fu.writeFile(output, data, function(err) {
              callback(err, {
                fileName: output,
                input: content.map(function(el) { return el.name; }).filter(function(el) { return el; })
              });
            });
        }
    }
    var completed = 0,
        content = [];

    files.forEach(function(resource) {
        var fileInfo = {name: resource.hasOwnProperty('sourceFile') ? resource.sourceFile : resource.src};
        content.push(fileInfo);

        function loaded(err, data) {
            if (err) {
              callback(err);
              return;
            }
            fileInfo.noSeparator = data.noSeparator;
            fileInfo.content = data.data || data;

            completed++;
            outputIfCompleted();
        }
        function load() {
            if (typeof resource === 'function') {
                resource(loaded);
            } else {
                // Assume a file page, attempt to load
                fu.readFile(resource.src, loaded);
            }
        }
        load();
    });

    outputIfCompleted();
};
