var _ = require('underscore'),
    fs = require('fs'),
    path = require('path');

const EMFILE_RETRY = 250;

var fileCache = {};

function cacheRead(path, callback, exec) {
  path = exports.resolvePath(path);

  var cache = fileCache[path];
  if (cache) {
    if (cache.data) {
      callback(undefined, cache.data);
    } else {
      cache.pending.push(callback);
    }
    return;
  }

  cache = fileCache[path] = {
    pending: [callback]
  };

  exec(path, function _callback(err, data) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exec.bind(this, path, _callback), EMFILE_RETRY);
    } else {
      if (err) {
        delete fileCache[path];
      }

      cache.data = data;
      cache.pending.forEach(function(callback) {
        callback(err, data);
      });
    }
  });
}

exports.resetCache = function(path) {
  if (path) {
    delete fileCache[path];
  } else {
    fileCache = {};
  }
};

var lookupPath;
exports.resolvePath = function(pathName) {
  // Poormans path.resolve. We aren't able to use the bundled path.resolve due to
  // it throwing sync EMFILE errors without a type to key on.
  if (lookupPath
      && (pathName[0] !== '/' && pathName.indexOf(':/') === -1 && pathName.indexOf(':\\') === -1)
      && pathName.indexOf(lookupPath) !== 0) {
    return lookupPath + pathName;
  } else {
    return pathName;
  }
};
exports.makeRelative = function(pathName) {
  if (pathName.indexOf(lookupPath) === 0) {
    return pathName.substring(lookupPath.length);
  } else {
    return pathName;
  }
};

exports.lookupPath = function(pathName) {
  if (pathName !== undefined) {
    lookupPath = pathName;
    if (lookupPath && !/\/$/.test(lookupPath)) {
      lookupPath += '/';
    }
  }
  return lookupPath;
};

exports.stat = function(file, callback) {
  fs.stat(file, function(err, stat) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.stat.bind(exports, file, callback), EMFILE_RETRY);
    } else {
      callback(err, stat);
    }
  });
};

exports.readFileSync = function(file) {
  return fs.readFileSync(exports.resolvePath(file), 'utf8');
};
exports.readFile = function(file, callback) {
  cacheRead(file, callback, function(file, callback) {
    fs.readFile(file, 'utf8', callback);
  });
};
exports.readdir = function(dir, callback) {
  cacheRead(dir, callback, fs.readdir.bind(fs));
};

exports.ensureDirs = function(pathname, callback) {
  var dirname = path.dirname(pathname)
  exports.stat(dirname, function(err, stat) {
    if (err && err.code === 'ENOENT') {
      // If we don't exist, check to see if our parent exists before trying to create ourselves
      exports.ensureDirs(dirname, function(err) {
        fs.mkdir(dirname, function _callback(err) {
          if (err && err.code === 'EMFILE') {
            setTimeout(fs.mkdir.bind(fs, dirnane, _callback), EMFILE_RETRY);
          } else {
            // Off to the races... and we lost.
            callback(err && err.code === 'EEXIST' ? undefined : err);
          }
        });
      });
    } else {
      callback();
    }
  });
};

exports.writeFile = function(file, data, callback) {
  delete fileCache[file];
  exports.ensureDirs(file, function(err) {
    if (err) {
      return callback(err);
    }

    fs.writeFile(file, data, 'utf8', function _callback(err) {
      if (err && err.code === 'EMFILE') {
        setTimeout(fs.writeFile.bind(fs, file, data, 'utf8', _callback), EMFILE_RETRY);
      } else {
        callback(err);
      }
    });
  });
};

exports.fileList = function(pathname, extension, callback, dirList, resource, srcDir) {
  if (_.isFunction(extension)) {
    callback = extension;
    extension = /.*/;
  }

  if (_.isArray(pathname)) {
    var files = pathname;
    pathname = '';
    if (!files.length) {
      return callback(undefined, []);
    }
    return handleFiles(false, undefined, _.uniq(files));
  } else if (!dirList) {
    if (pathname.src) {
      resource = resource || pathname;
      pathname = pathname.src;
    }

    pathname = exports.resolvePath(pathname);
  }
  if (resource && resource.src) {
    resource = _.clone(resource);
    delete resource.src;
  }

  function handleFiles(dirname, err, files, srcDir) {
    if (err) {
      return callback(err);
    }

    var ret = [],
        count = 0,
        expected = files.length,
        prefix = pathname ? pathname.replace(/\/$/, '') + '/' : '';

    function complete(files, index) {
      count++;

      ret[index] = files;

      if (count === expected) {
        ret = _.flatten(ret);

        if (srcDir) {
          ret = ret.map(function(file) {
            if (!file.src && !file.dir) {
              file = { src: file };
            }
            file.srcDir = srcDir;
            return file;
          });
        }

        if (dirname) {
          ret.push(_.defaults({dir: dirname}, resource));
          ret = ret.sort(function(a, b) {
            return (a.dir || a.src || a).localeCompare(b.dir || b.src || b);
          });
        }

        callback(undefined, ret);
      }
    }

    if (!files.length) {
      callback(undefined, []);
    }

    files.forEach(function(file, index) {
      var fileResource = resource;
      if (file.src) {
        fileResource = resource || file;
        file = file.src;
      } else if (_.isObject(file)) {
        complete(file, index);
        return;
      }

      exports.fileList(prefix + file, extension, function(err, files) {
        if (err) {
          callback(err);
          return;
        }

        complete(files, index);
      }, dirname, fileResource, srcDir);
    });
  }

  exports.stat(pathname, function(err, stat) {
    if (err) {
      if (err.code === 'ENOENT') {
        callback(undefined, [ _.extend({src: exports.makeRelative(pathname), enoent: true}, resource) ]);
      } else {
        callback(err);
      }
      return;
    }

    if (stat.isDirectory()) {
      var self = this;
      exports.readdir(pathname, function(err, files) {
        var _pathname = exports.makeRelative(pathname);
        handleFiles(_pathname, undefined, files, srcDir || _pathname);
      });
    } else {
      pathname = exports.makeRelative(pathname);

      var basename = path.basename(pathname),
          namePasses = basename[0] !== '.' && basename !== 'vendor' && (!dirList || extension.test(pathname)),
          ret = [];
      if (namePasses) {
        if (resource) {
          ret = [ _.defaults({src: pathname, srcDir: srcDir}, resource) ];
        } else if (srcDir) {
          ret = [ { src: pathname, srcDir: srcDir } ];
        } else {
          ret = [ pathname ];
        }
      }
      callback(undefined, ret);
    }
  });
};


exports.loadResource = function(resource, callback) {
  var fileInfo = {name: resource.hasOwnProperty('sourceFile') ? resource.sourceFile : resource.src};

  function loaded(err, data) {
    if (err) {
      callback(err);
      return;
    }
    fileInfo.inputs = data.inputs;
    fileInfo.noSeparator = data.noSeparator;
    fileInfo.content = data.data != null ? data.data : data;

    // Ensure that we dump off the stack
    _.defer(function() {
      callback(err, fileInfo);
    });
  }

  if (typeof resource === 'function') {
    resource(loaded);
  } else if (resource.src) {
    // Assume a file page, attempt to load
    exports.readFile(resource.src, loaded);
  } else {
    loaded(undefined, {data: '', noSeparator: true, inputs: resource.dir ? [resource.dir] : []});
  }

  return fileInfo;
};
