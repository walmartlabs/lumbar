var _ = require('underscore'),
    fs = require('fs'),
    path = require('path');

const EMFILE_RETRY = 500;

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
  fs.readFile(exports.resolvePath(file), 'utf8', function(err, data) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.readFile.bind(exports, file, callback), EMFILE_RETRY);
    } else {
      callback(err, data);
    }
  });
};
exports.readdir = function(dir, callback) {
  fs.readdir(exports.resolvePath(dir), function(err, files) {
    if (err && err.code === 'EMFILE') {
      setTimeout(exports.readdir.bind(exports, dir, callback), EMFILE_RETRY);
    } else {
      callback(err, files);
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
