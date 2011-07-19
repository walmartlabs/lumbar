var fs = require('fs');

exports.isDirectory = function(dir) {
    var stat;
    try {
        stat = fs.statSync(dir);
    } catch (e) {
        return false;
    }
    return stat.isDirectory();
};

exports.filesWithExtension = function(dir, extension) {
    var paths = [];
    try {
        fs.statSync(dir);
    } catch (e) {
        return [];
    }
    var traverse = function(dir, stack) {
        stack.push(dir);
        fs.readdirSync(stack.join('/')).map(function(file) {
            var path, stat;
            path = stack.concat([file]).join('/');
            stat = fs.statSync(path);
            if (file[0] === '.' || file === 'vendor') {
                return;
            }
            if (stat.isFile() && extension.test(file)) {
                paths.push(path);
            }
            if (stat.isDirectory()) {
                return traverse(file, stack);
            }
        });
        return stack.pop();
    };
    traverse(dir || '.', []);
    return paths;
};
