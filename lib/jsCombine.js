var fs = require('fs');

exports.combine = function(files, output, callback) {

    function outputIfCompleted() {
        if (completed >= files.length) {
            var data = content.map(function(el) { return el.content; }).join('\n;;');

            fs.writeFile(output, data, "utf8", function(err) {
                callback(err, {
                    fileName: output,
                    input: content.map(function(el) { return el.name; })
                });
            });
        }
    }
    var completed = 0,
        content = [];

    files.forEach(function(name) {
        var fileInfo = {name: name.sourceFile || name};
        content.push(fileInfo);

        function loaded(err, data) {
            if (err) {
                throw err;
            }
            fileInfo.content = data;

            completed++;
            outputIfCompleted();
        }
        if (typeof name === 'function') {
            name(loaded);
        } else {
            // Assume a file page, attempt to load
            fs.readFile(name, "utf8", loaded);
        }
    });

    outputIfCompleted();
};
