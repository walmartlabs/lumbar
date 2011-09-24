var fs = require('fs'),
    path = require('path');

const EMFILE_RETRY = 500;

var lookupPath;
function resolvePath(pathName) {
  if (lookupPath) {
    return path.resolve(lookupPath, pathName);
  } else {
    return pathName;
  }
}

exports.lookupPath = function(pathName) {
  if (pathName !== undefined) {
    lookupPath = pathName;
  }
  return lookupPath;
};

exports.readFileSync = function(file) {
  return fs.readFileSync(resolvePath(file), 'utf8');
};
exports.readFile = function(file, callback) {
  fs.readFile(resolvePath(file), 'utf8', function(err, data) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.readFile.bind(exports, file, callback), EMFILE_RETRY);
    } else {
      callback(err, data);
    }
  });
};

exports.writeFile = function(file, data, callback) {
  fs.writeFile(file, data, 'utf8', function(err) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.writeFile.bind(exports, file, data, callback), EMFILE_RETRY);
    } else {
      callback(err);
    }
  });
};

var dirCache = {};

exports.resetCache = function() {
    dirCache = {};
};

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
    if (dirCache[dir]) {
        return dirCache[dir];
    }

    var paths = [];
    try {
        fs.statSync(dir);
    } catch (e) {
        dirCache[dir] = [];
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
    dirCache[dir] = paths;
    return paths;
};
