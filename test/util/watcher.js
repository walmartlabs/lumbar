var assert = require('assert'),
    fs = require('fs'),
    lib = require('../lib'),
    watcher = require('../../lib/util/watcher'),
    wrench = require('wrench');

describe('watcher', function() {
  this.timeout(5000);

  if (!fs.watch) {
    // Watch is unsupported on 0.4 and earlier, no tests for this case
    return;
  }

  var outdir;

  before(function() {
    outdir = lib.testDir('watcher', 'touch');

    wrench.copyDirSyncRecursive('test/artifacts', outdir, {forceDelete: true});
  });
  afterEach(function() {
    watcher.unwatchAll();
  });

  it('should not notify on file read', function(done) {
    watcher.watchFile(outdir + '/index.html', [], function() {
      assert.fail('Watch event occurred.');
    });

    fs.open(outdir + '/index.html', 'r+', function(err, fd) {
      var buffer = new Buffer(4);
      fs.read(fd, buffer, 0, buffer.length, 0, function() {
        fs.close(fd, function() {
          setTimeout(done, 500);
        });
      });
    });
  });

  it('should notify on write', function(done) {
    var count = 0;

    var testFile = outdir + '/file-modules.json';
    watcher.watchFile(testFile, [], function(type, fileName, sourceChange) {
      assert.equal('change', type);
      assert.equal(testFile, fileName);
      assert.equal(testFile, sourceChange);
      assert.equal(1, ++count);
      done();
    });

    fs.open(testFile, 'w', function(err, fd) {
      var buffer = new Buffer([1, 2, 3, 4]);
      fs.write(fd, buffer, 0, buffer.length, 0, function() {
        fs.close(fd);
      });
    });
  });

  it('should notify on unlink', function(done) {
    var count = 0;

    var testFile = outdir + '/styles.json';
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

  it('should notify on rename', function(done) {
    if (require('os').platform() !== 'darwin') {
      // This does not appear to work on linux and has not been tested on windows.
      // Unclear at this time if the error is do to the events not being sent
      // or if the fs.rename API doesn't generate the proper events
      return done();
    }

    var count = 0;

    var testFile = outdir + '/stylus.json';
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

  it('should notify on overwrite', function(done) {
    var count = require('os').platform() === 'darwin' ? 0 : 1;

    var testFile = outdir + '/multiple-files.json';
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
            fs.write(fd, buffer, 0, buffer.length, 0, function() {
              fs.close(fd);
            });
          });
        }, 1500);
      });
    }, 100);
  });

  it('should notify on child creation', function(done) {
    var count = 0;

    var testFile = outdir + '/bar';
    watcher.watchFile(outdir, [], function(type, fileName, sourceChange) {
      assert.equal('create', type);
      assert.equal(outdir, fileName);
      assert.equal(outdir, sourceChange);
      assert.equal(1, ++count);
      done();
    });

    setTimeout(function() {
      fs.writeFile(testFile, 'bar');
    }, 100);
  });

  it('should ignore unknown unwatch commands', function() {
    watcher.unwatch('foo', ['baz']);
  });
  it('should unwatch a single file', function() {
    var spy = this.spy();
    watcher.watchFile({virtual: 'foo'}, [{virtual: 'bar'}, {virtual: 'baz'}], spy);

    watcher.trigger('c', 'bar');
    watcher.trigger('c', 'baz');
    spy.callCount.should.equal(2);

    watcher.unwatch('foo', ['bar']);
    watcher.trigger('c', 'bar');
    watcher.trigger('c', 'baz');
    spy.callCount.should.equal(3);

    watcher.unwatch('foo', ['baz']);
    watcher.trigger('c', 'bar');
    watcher.trigger('c', 'baz');
    spy.callCount.should.equal(3);
  });
});
