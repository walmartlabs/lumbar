var fs = require('fs');

var readFileSync = fs.readFileSync,
    readFile = fs.readFile,
    statSync = fs.statSync;

module.exports = exports = function(compiler, config) {
  var $render = compiler.render;

  var read = [];

  fs.readFileSync = function(path) {
    if (/file1\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
      read.push(path);
      return '.test\n  display $display\n';
    } else if (/lumbar\.json$/.test(path)) {
      read.push(path);
      return JSON.stringify(config);
    } else if (/two\.json$/.test(path)) {
      read.push(path);
      return '{"$display": "red","value!":10}';
    } else if (/\.json$/.test(path)) {
      read.push(path);
      return '{"$display": "black"}';
    } else {
      return readFileSync.apply(this, arguments);
    }
  };
  fs.readFile = function(path, callback) {
    process.nextTick(function() {
      try {
        callback(undefined, fs.readFileSync(path));
      } catch (err) {
        callback(err);
      }
    });
  };
  fs.statSync = function(path) {
    if (!/(foo|two|lumbar|file1)\.(styl|png|json)$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
      return statSync.apply(this, arguments);
    }
  };

  compiler.render = function(callback) {
    try {
      $render.call(this, callback);
    } finally {
      fs.readFileSync = readFileSync;
      fs.readFile = readFile;
      fs.statSync = statSync;
    }
  };
};
