var assert = require('assert'),
    fs = require('fs'),
    lib = require('./lib'),
    watcher = require('../lib/watcher'),
    wrench = require('wrench');

exports['read'] = function(done) {
  var outdir = lib.testDir('watcher', 'touch');

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  watcher.watchFile(outdir + '/index.html', [], function(type, fileName, sourceChange) {
    assert.fail('Watch event occurred.');
  });

  fs.open(outdir + '/index.html', 'r+', function(err, fd) {
    var buffer = new Buffer(4);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, bytesRead, buffer) {
      fs.close(fd, function() {
        watcher.unwatchAll();
        setTimeout(done, 500);
      });
    });
  });
};

exports['write'] = function(done) {
  var outdir = lib.testDir('watcher', 'touch'),
      count = 0;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/index.html';
  watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
    assert.equal(1, ++count);
    assert.equal('change', type);
    assert.equal(testFile, fileName);
    assert.equal(testFile, sourceChange);
    watcher.unwatchAll();
    done();
  });

  fs.open(testFile, 'w', function(err, fd) {
    var buffer = new Buffer([1, 2, 3, 4]);
    fs.write(fd, buffer, 0, buffer.length, 0, function(err, written, buffer) {
      fs.close(fd);
    });
  });
};
