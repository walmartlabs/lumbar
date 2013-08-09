var fs = require('fs');

var readFileSync = fs.readFileSync,
    statSync = fs.statSync;

module.exports = exports = function(compiler, config) {
  var $render = compiler.render,
      read = [];

  fs.readFileSync = function(path) {
    if (/(mixinRoot|mixin2)\/mixin-import.styl$/.test(path)) {
      read.push(path);
      return '@import "foo"\n';
    } else if (/\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
      read.push(path);
      return '.test\n  background url("img.png")\n';
    } else {
      return readFileSync.apply(this, arguments);
    }
  };
  fs.statSync = function(path) {
    if (!/\.styl|png$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
      return statSync.apply(this, arguments);
    } else if (/(mixinRoot|mixin2)/.test(path)) {
      if (/stylusRoot/.test(path)) {
        read.push(path);
        throw new Error();
      }
    }
  };

  compiler.render = function(callback) {
    try {
      $render.call(this, function(err, data) {
        if (config && config.rewrite) {
          callback(err, data && [0, JSON.stringify(read)]);
        } else {
          callback(err, data);
        }
      });
    } finally {
      fs.readFileSync = readFileSync;
      fs.statSync = statSync;
    }
  };
};
