var _ = require('underscore'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('./index'),
    lumbar = require('../../lib/lumbar'),
    sinon = require('sinon'),
    watcher = require('../../lib/util/watcher'),
    WatchManager = require('../../lib/watch-manager'),
    wrench = require('wrench');

exports.canWatch = function() {
  // Watch is unsupported on 0.4 and earlier
  return !!fs.watch;
};

exports.appendSync = function(path, content) {
  var fd = fs.openSync(path, 'a');
  fs.writeSync(fd, content);
  fs.closeSync(fd);
};
exports.appendSpaceSync = function(path) {
  exports.appendSync(path, ' ');
};
exports.append = function(path, content) {
  setTimeout(function() {
    exports.appendSync(path, content);
  }, 500);
};
exports.appendSpace = function(path) {
  exports.append(path, ' ');
};

exports.appendRapidSpace = function(path1, path2) {
  setTimeout(function() {
    var fd = fs.openSync(path1, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);

    var fd = fs.openSync(path2, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 500);
};

exports.mockWatch = function() {
  var original = watcher.watchFile;

  sinon.stub(WatchManager.prototype, 'setupExec', function() {
    return _.debounce(_.bind(this.flushQueue, this), 10);
  });
  watcher.watchFile = function(filename, dependencies, callback) {
    function makeVirtual(filename) {
      if (!filename.virtual) {
        filename = {virtual: filename};
      }
      return filename;
    }
    filename = makeVirtual(filename);
    dependencies = dependencies.map(makeVirtual);
    return original.call(this, filename, dependencies, callback);
  };

  return {
    trigger: function(type, filename) {
      watcher.trigger(type, filename);
    },
    cleanup: function() {
      WatchManager.prototype.setupExec.restore();
      watcher.watchFile = original;
    }
  };
};

exports.runWatchTest = function(srcdir, config, operations, expectedFiles, options, done) {
  // Mocha: this.test.title
  // Expresso: this.title
  var title = (this.test && this.test.title) || this.title || config,
      testdir = lib.testDir(title, 'example'),
      outdir = lib.testDir(title, 'test');
  if (this.title) {
    this.title += ' ' + outdir;
  }

  wrench.copyDirSyncRecursive(srcdir, testdir, {forceDelete: true});

  function complete() {
    process.removeListener('uncaughtException', complete);
    done();
  }
  process.on('uncaughtException', complete);

  options.outdir = outdir;
  var arise = lumbar.init(testdir + '/' + config, options);

  var handler = checkOutput(operations, expectedFiles, arise, options, function() {
    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(testdir);
    wrench.rmdirSyncRecursive(outdir);

    complete();
  });
  arise.on('error', function() { /* NOP : Blows up if not defined */ });
  arise.on('output', handler);

  arise.watch(undefined, function(err) {
    err = err || new Error('Callback called without fatal error');
    throw err;
  });
};

function checkOutput(operations, expectedFiles, arise, options, cleanup) {
  var seenFiles = [];

  return function(status) {
    var statusFile
    if (status.error || status instanceof Error) {
      statusFile = 'error';
    } else {
      statusFile = status.fileName.substring(options.outdir.length);
    }
    if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
      arise.unwatch();
      if (statusFile === 'error') {
        statusFile = status;
      }
      throw new Error('watchFile:' + statusFile + ': missing from expected list');
    } else {
      seenFiles.push(statusFile);
    }
    var seen = seenFiles.length;
    process.nextTick(function() {
      operations[seen] && operations[seen](fu.lookupPath());
    });
    if (seenFiles.length < expectedFiles.length) {
      return;
    }

    arise.unwatch();

    seenFiles = seenFiles.sort();
    expectedFiles = expectedFiles.sort();
    seenFiles.should.eql(expectedFiles, 'watchFile: seen file list matches ' + options.outdir);

    if (options.expectedDir) {
      lib.assertExpected(options.outdir, options.expectedDir, 'watchfile: ' + options.outdir);
    }

    cleanup();
  };
}
