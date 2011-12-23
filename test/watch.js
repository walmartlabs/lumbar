var assert = require('assert'),
    fs = require('fs'),
    glob = require('glob'),
    lib = require('./lib'),
    lumbar = require('../lib/lumbar'),
    wrench = require('wrench');

function appendSpace(path) {
  setTimeout(function() {
    console.error('append:', path);
    var fd = fs.openSync(path, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 1000);
}
function appendRapidSpace(path1, path2) {
  setTimeout(function() {
    console.error('append rapid:', path1, path2);
    var fd = fs.openSync(path1, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);

    var fd = fs.openSync(path2, 'a');
    fs.writeSync(fd, ' ');
    fs.closeSync(fd);
  }, 1000);
}
function runWatchTest(srcdir, config, operations, expectedFiles, expectedDir, done) {
  var testdir = lib.testDir(this.title, 'example'),
      outdir = lib.testDir(this.title, 'test'),
      seenFiles = [];
  this.title += ' ' + outdir;

  wrench.copyDirSyncRecursive(srcdir, testdir);

  var arise = lumbar.init(testdir + '/' + config, {packageConfigFile: 'config/dev.json', outdir: outdir});
  arise.watch(undefined, function(err, status) {
    if (err) {
      throw err;
    }

    var statusFile = status.fileName.substring(outdir.length);
    if (!expectedFiles.some(function(fileName) { return statusFile === fileName; })) {
      arise.unwatch();
      assert.fail(undefined, status.fileName,  'watchFile:' + statusFile + ': missing from expected list');
    } else {
      seenFiles.push(statusFile);
    }
    var seen = seenFiles.length;
    setTimeout(function() {
      operations[seen] && operations[seen](testdir);
    }, 0);
    if (seenFiles.length < expectedFiles.length) {
      return;
    }

    arise.unwatch();

    seenFiles = seenFiles.sort();
    expectedFiles = expectedFiles.sort();
    assert.deepEqual(seenFiles, expectedFiles, 'watchFile: seen file list matches');

    lib.assertExpected(outdir, expectedDir, 'watchfile');

    // Cleanup (Do cleanup here so the files remain for the failure case)
    wrench.rmdirSyncRecursive(testdir);
    wrench.rmdirSyncRecursive(outdir);

    done();
  });
}

exports['watch-script'] = function(done) {
  var expectedFiles = [
          '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
              '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
              '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
          '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
              '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
              '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
          '/android/native-home.js', '/iphone/native-home.js',
          '/android/native-home.js', '/iphone/native-home.js',
          '/android/native-home.js', '/iphone/native-home.js', '/web/home.js'
        ],
      operations = {
        12: function(testdir) {
          // Modify the config file
          appendSpace(testdir + '/lumbar.json');
        },
        24: function(testdir) {
          // Modify the bridge file
          appendSpace(testdir + '/js/bridge.js');
        },
        26: function(testdir) {
          appendRapidSpace(testdir + '/js/bridge.js', testdir + '/js/bridge-iphone.js');
        },
        28: function(testdir) {
          // Modify the home template
          appendSpace(testdir + '/templates/home/home.handlebars');
        }
      };

  runWatchTest.call(this,
    'example', 'lumbar.json',
    operations, expectedFiles, 'test/expected/example',
    done);
};

exports['watch-style'] = function(done) {
  var expectedFiles = [
          '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
          '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
          '/iphone/native.css', '/iphone/base.css', '/web/base.css',
          '/iphone/native.css', '/iphone/base.css', '/web/base.css'
        ],
      operations = {
        5: function(testdir) {
          appendSpace(testdir + '/styles.json');
        },
        10: function(testdir) {
          appendSpace(testdir + '/styles/base.css');
        },
        13: function(testdir) {
          appendRapidSpace(testdir + '/styles/base.css', testdir + '/styles/iphone.css');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'styles.json',
    operations, expectedFiles, 'test/expected/styles-watch',
    done);
};

exports['watch-add'] = function(done) {
  var expectedFiles = [
          '/base.js', '/base.js'
        ],
      operations = {
        1: function(testdir) {
          fs.writeFileSync(testdir + '/js/home/home2.js', ' ');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'single-directory.json',
    operations, expectedFiles, 'test/expected/watch-add',
    done);
};

exports['watch-remove'] = function(done) {
  var expectedFiles = [
          '/base.js', '/base.js'
        ],
      operations = {
        1: function(testdir) {
          fs.unlinkSync(testdir + '/js/home/home.js');
        }
      };

  runWatchTest.call(this,
    'test/artifacts', 'single-directory.json',
    operations, expectedFiles, 'test/expected/watch-remove',
    done);
};
