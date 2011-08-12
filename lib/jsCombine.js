var fs = require('fs');

var EMFILE_RETRY = 500;

exports.combine = function(files, output, callback) {

    function outputIfCompleted() {
        if (completed >= files.length) {
            var data = content.map(function(el) { return el.content; }).join('\n;;');

            function write() {
                fs.writeFile(output, data, "utf8", function(err) {
                    if (err && err.code === 'EMFILE') {
                        setTimeout(write, EMFILE_RETRY);
                        return;
                    }
                    callback(err, {
                        fileName: output,
                        input: content.map(function(el) { return el.name; })
                    });
                });
            }
            write();
        }
    }
    var completed = 0,
        content = [];

    files.forEach(function(name) {
        var fileInfo = {name: name.sourceFile || name};
        content.push(fileInfo);

        function loaded(err, data) {
            if (err) {
                if (err.code === 'EMFILE') {
                    setTimeout(load, EMFILE_RETRY);
                } else {
                    callback(err);
                }
                return;
            }
            fileInfo.content = data;

            completed++;
            outputIfCompleted();
        }
        function load() {
            if (typeof name === 'function') {
                name(loaded);
            } else {
                // Assume a file page, attempt to load
                console.error('combine', name);
                fs.readFile(name, "utf8", loaded);
            }
        }
        load();
    });

    outputIfCompleted();
};
