var assert = require('assert'),
    fs = require('fs'),
    lib = require('./lib'),
    watcher = require('../lib/watcher'),
    wrench = require('wrench');

if (!fs.watch) {
  // Watch is unsupported on 0.4 and earlier, no tests for this case
  exports['nop'] = function(done) {
    done();
  };
  return;
}

function cleanupTimeout(callback) {
  return function(done) {
    function complete(err) {
      process.removeListener('uncaughtException', complete);
      done();
    }
    process.on('uncaughtException', complete);
    callback.call(this, complete);
  };
}

exports['teardown'] = function(done) {
  watcher.unwatchAll();
  done();
};

exports['read'] = cleanupTimeout(function(done) {
  var outdir = lib.testDir('watcher', 'touch');

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  watcher.watchFile(outdir + '/index.html', [], function(type, fileName, sourceChange) {
    assert.fail('Watch event occurred.');
  });

  fs.open(outdir + '/index.html', 'r+', function(err, fd) {
    var buffer = new Buffer(4);
    fs.read(fd, buffer, 0, buffer.length, 0, function(err, bytesRead, buffer) {
      fs.close(fd, function() {
        setTimeout(done, 500);
      });
    });
  });
});

exports['write'] = cleanupTimeout(function(done) {
  var outdir = lib.testDir('watcher', 'touch'),
      count = 0;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/index.html';
  watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
    assert.equal(1, ++count);
    assert.equal('change', type);
    assert.equal(testFile, fileName);
    assert.equal(testFile, sourceChange);
    done();
  });

  fs.open(testFile, 'w', function(err, fd) {
    var buffer = new Buffer([1, 2, 3, 4]);
    fs.write(fd, buffer, 0, buffer.length, 0, function(err, written, buffer) {
      fs.close(fd);
    });
  });
});

exports['unlink'] = cleanupTimeout(function(done) {
  var outdir = lib.testDir('watcher', 'touch'),
      count = 0;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/index.html';
  watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
    assert.equal(1, ++count);
    assert.equal('remove', type);
    assert.equal(testFile, fileName);
    assert.equal(testFile, sourceChange);
    done();
  });

  setTimeout(function() {
    fs.unlink(testFile);
  }, 100);
});

exports['rename'] = cleanupTimeout(function(done) {
  if (require('os').platform() !== 'darwin') {
    // This does not appear to work on linux and has not been tested on windows.
    // Unclear at this time if the error is do to the events not being sent
    // or if the fs.rename API doesn't generate the proper events
    return done();
  }

  var outdir = lib.testDir('watcher', 'touch'),
      count = 0;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/index.html';
  watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
    assert.equal(1, ++count);
    assert.equal('remove', type);
    assert.equal(testFile, fileName);
    assert.equal(testFile, sourceChange);
    done();
  });

  setTimeout(function() {
    fs.rename(testFile, outdir + '/foo');
  }, 100);
});

exports['overwrite'] = cleanupTimeout(function(done) {
  var outdir = lib.testDir('watcher', 'touch'),
      count = require('os').platform() === 'darwin' ? 0 : 1;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/index.html';
  watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
    assert.ok(2 >= ++count, 'Unexpected count:' + count);
    assert.equal(count === 1 ? 'rename' : 'change', type);
    assert.equal(testFile, fileName);
    assert.equal(testFile, sourceChange);
    if (count >= 2) {
      done();
    }
  });

  setTimeout(function() {
    fs.rename(outdir + '/static.json', testFile, function() {
      setTimeout(function() {
        fs.open(testFile, 'w', function(err, fd) {
          var buffer = new Buffer([1, 2, 3, 4]);
          fs.write(fd, buffer, 0, buffer.length, 0, function(err, written, buffer) {
            fs.close(fd);
          });
        });
      }, 100);
    });
  }, 100);
});

exports['create-child'] = cleanupTimeout(function(done) {
  var outdir = lib.testDir('watcher', 'touch'),
      count = 0;

  wrench.copyDirSyncRecursive('test/artifacts', outdir);

  var testFile = outdir + '/foo';
  watcher.watchFile(outdir, [], function(type, fileName, sourceChange) {
    assert.equal(1, ++count);
    assert.equal('create', type);
    assert.equal(outdir, fileName);
    assert.equal(outdir, sourceChange);
    done();
  });

  setTimeout(function() {
    fs.writeFile(testFile, 'foo');
  }, 100);
});
