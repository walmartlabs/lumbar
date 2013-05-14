var fs = require('fs'),
    sinon = require('sinon');

var readFileSync = fs.readFileSync,
    statSync = fs.statSync;

module.exports = exports = function(compiler, config) {
  var $render = compiler.render;

  sinon.stub(fs, 'readFileSync', function(path) {
    if (/lumbar-test/.test(path) && /style\/test\.styl$/.test(path)) {
      return config.content;
    } else {
      return readFileSync.apply(this, arguments);
    }
  });
  sinon.stub(fs, 'statSync', function(path) {
    if (!/lumbar-test/.test(path) || !/style\/test\.styl$/.test(path)) {
      return statSync.apply(this, arguments);
    }
  });

  compiler.render = function(callback) {
    try {
      $render.call(this, callback);
    } finally {
      fs.readFileSync.restore();
      fs.statSync.restore();
    }
  };
};
