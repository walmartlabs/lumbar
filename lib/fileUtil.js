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

exports.writeFile = function(file, data, callback) {
  delete fileCache[file];
  fs.writeFile(file, data, 'utf8', function(err) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.writeFile.bind(exports, file, data, callback), EMFILE_RETRY);
    } else {
      callback(err);
    }
  });
};

exports.fileList = function(pathname, extension, callback, dirList, resource) {
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

  function handleFiles(dirname, err, files) {
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
      }, dirname, fileResource);
    });
  }

  exports.stat(pathname, function(err, stat) {
    if (err) {
      callback(err);
      return;
    }

    if (stat.isDirectory()) {
      exports.readdir(pathname, handleFiles.bind(this, exports.makeRelative(pathname)));
    } else {
      pathname = exports.makeRelative(pathname);

      var basename = path.basename(pathname);
      var namePasses = basename[0] !== '.' && basename !== 'vendor' && (!dirList || extension.test(pathname));
      callback(undefined, namePasses ? [ resource ? _.defaults({src: pathname}, resource) : pathname ] : []);
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
