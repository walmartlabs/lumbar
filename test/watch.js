var fs = require('fs'),
    lib = require('./lib'),
    watch = require('./lib/watch'),
    wrench = require('wrench');

if (!watch.canWatch()) {
  // Watch is unsupported on 0.4 and earlier, no tests for this case
  return;
}

function runWatchTest(srcdir, config, operations, expectedFiles, expectedDir, done) {
  var options = {packageConfigFile: 'config/dev.json', expectedDir: expectedDir};

  watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
}

describe('watch integration', function() {
  var mock;
  beforeEach(function() {
    mock = watch.mockWatch();
  });
  afterEach(function() {
    mock.cleanup();
  });

  it('should watch script files', function(done) {
    this.timeout(15000);

    var expectedFiles = [
            '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
                '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
                '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
                '/web/index.html', '/web/web-file.txt',
                '/iphone/index.html', '/iphone/iphone-file.txt',
                '/android/index.html', '/android/android-file.txt',
            '/android/native-home.js', '/android/native-home.css', '/android/native-home@1.5x.css',
                '/iphone/native-home.js', '/iphone/native-home.css', '/iphone/native-home@2x.css',
                '/web/base.js', '/web/base.css', '/web/base@2x.css', '/web/home.js', '/web/home.css', '/web/home@2x.css',
                '/web/index.html', '/web/web-file.txt',
                '/iphone/index.html', '/iphone/iphone-file.txt',
                '/android/index.html', '/android/android-file.txt',
            '/android/native-home.js', '/iphone/native-home.js',
                '/web/web-file.txt', '/iphone/iphone-file.txt', '/android/android-file.txt',
            '/android/native-home.js', '/iphone/native-home.js',
                '/web/web-file.txt', '/iphone/iphone-file.txt', '/android/android-file.txt',
            '/android/native-home.js', '/iphone/native-home.js', '/web/home.js'
          ],
        operations = {
          18: function(testdir) {
            // Modify the config file
            watch.appendSpaceSync(testdir + 'lumbar.json');
            mock.trigger('change', testdir + 'lumbar.json');
          },
          36: function(testdir) {
            // Modify the bridge file
            watch.appendSpaceSync(testdir + 'js/bridge.js');
            mock.trigger('change', testdir + 'js/bridge.js');
          },
          41: function(testdir) {
            watch.appendSpaceSync(testdir + 'js/bridge.js');
            watch.appendSpaceSync(testdir + 'js/bridge-iphone.js');
            mock.trigger('change', testdir + 'js/bridge-iphone.js');
            mock.trigger('change', testdir + 'js/bridge.js');
          },
          46: function(testdir) {
            // Modify the home template
            watch.appendSpaceSync(testdir + 'templates/home/home.handlebars');
            mock.trigger('change', testdir + 'templates/home/home.handlebars');
          }
        };

    runWatchTest.call(this,
      'test/example', 'lumbar.json',
      operations, expectedFiles, 'test/expected/example',
      done);
  });

  it('should watch style files', function(done) {
    var expectedFiles = [
            '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
            '/iphone/native.css', '/iphone/base.css', '/iphone/home.css', '/web/base.css', '/web/home.css',
            '/iphone/native.css', '/iphone/base.css', '/web/base.css',
            '/iphone/native.css', '/iphone/base.css', '/web/base.css'
          ],
        operations = {
          5: function(testdir) {
            watch.appendSpaceSync(testdir + 'styles.json');
            mock.trigger('change', testdir + 'styles.json');
          },
          10: function(testdir) {
            watch.appendSpaceSync(testdir + 'styles/base.css');
            mock.trigger('change', testdir + 'styles/base.css');
          },
          13: function(testdir) {
            watch.appendSpaceSync(testdir + 'styles/base.css');
            watch.appendSpaceSync(testdir + 'styles/iphone.css');
            mock.trigger('change', testdir + 'styles/base.css');
            mock.trigger('change', testdir + 'styles/iphone.css');
          }
        };

    runWatchTest.call(this,
      'test/artifacts', 'styles.json',
      operations, expectedFiles, 'test/expected/styles-watch',
      done);
  });

  it('should watch stylus files', function(done) {
    this.timeout(15000);

    var expectedFiles = [
            '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css',
            '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css',
            '/iphone/base.css', '/iphone/base@2x.css',
            '/iphone/base.css', '/iphone/base@2x.css', '/web/base.css'
          ],
        operations = {
          3: function(testdir) {
            watch.appendSpaceSync(testdir + 'stylus.json');
            mock.trigger('change', testdir + 'stylus.json');
          },
          6: function(testdir) {
            watch.appendSync(testdir + 'styles/iphone.styl', '\nfoo\n  bar 1');
            mock.trigger('change', testdir + 'styles/iphone.styl');
          },
          8: function(testdir) {
            watch.appendSpaceSync(testdir + 'styles/base.styl');
            watch.appendSpaceSync(testdir + 'styles/iphone.styl');
            mock.trigger('change', testdir + 'styles/base.styl');
            mock.trigger('change', testdir + 'styles/iphone.styl');
          }
        };

    runWatchTest.call(this,
      'test/artifacts', 'stylus.json',
      operations, expectedFiles, 'test/expected/stylus-watch',
      done);
  });

  it('should watch directories', function(done) {
    var expectedFiles = [
            '/base.js', '/base.js'
          ],
        operations = {
          1: function(testdir) {
            watch.appendSpaceSync(testdir + 'js/iphone.js');
            mock.trigger('change', testdir + 'js/iphone.js');
          }
        };

    runWatchTest.call(this,
      'test/artifacts', 'single-directory.json',
      operations, expectedFiles, 'test/expected/watch-dir',
      done);
  });

  it('should watch added files', function(done) {
    var expectedFiles = [
            '/base.js', '/base.js'
          ],
        operations = {
          1: function(testdir) {
            fs.writeFileSync(testdir + 'js/home/home2.js', ' ');
            mock.trigger('change', testdir + 'js/home');
          }
        };

    runWatchTest.call(this,
      'test/artifacts', 'single-directory.json',
      operations, expectedFiles, 'test/expected/watch-add',
      done);
  });

  it('should watch removed files', function(done) {
    this.timeout(15000);

    var expectedFiles = [
            '/base.js', '/base.js'
          ],
        operations = {
          1: function(testdir) {
            fs.unlinkSync(testdir + 'js/home/home.js');
            mock.trigger('remove', testdir + 'js/home/home.js');
          }
        };

    runWatchTest.call(this,
      'test/artifacts', 'single-directory.json',
      operations, expectedFiles, 'test/expected/watch-remove',
      done);
  });
});
