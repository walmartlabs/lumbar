var _ = require('underscore'),
    fs = require('fs'),
    lib = require('../lib'),
    watch = require('../lib/watch');

describe('package-config plugin', function() {
  var module, config;

  beforeEach(function() {
    module = {
      scripts: [{'package-config': true}],
      name: 'foo'
    };
    config = {
      packageConfig: "App.config",
      scope: 'none'
    };
  });

  it('should inlcude package-config resource', function(done) {
    lib.pluginExec('package-config', 'scripts', module, [], config, function(resources) {
      _.pluck(resources, 'originalResource').should.eql([{'package-config': true}]);
      done();
    });
  });

  it('should fail without dev flags', function(done) {
    lib.pluginExec('package-config', 'scripts', module, [], config, function(resources, context) {
      (function() {
        resources[0](context, function(err) {
          if (err) {
            throw err;
          }
          should.fail();
        });
      }).should.throw('package_config.json specified without file being set');
      done();
    });
  });
  it('should include passed config', function(done) {
    lib.pluginExec('package-config', 'scripts', module, [], config, function(resources, context) {
      context.options = {
        packageConfigFile: __dirname + '/../example/config/dev.json'
      };

      resources[0](context, function(err, data) {
        if (err) {
          throw err;
        }

        data.should.eql({
          data: 'App.config = {\n  "port": 8080,\n  "securePort": 8081\n}\n;\n',
          inputs: [context.options.packageConfigFile],
          generated: true,
          noSeparator: true
        });
        done();
      });
    });
  });

  describe('watch', function() {
    var mock;
    beforeEach(function() {
      var readFile = fs.readFile;

      mock = watch.mockWatch();

      this.stub(fs, 'readFileSync', function() {
        return JSON.stringify({
          modules: {
            module: {scripts: [{'package-config': true}]}
          }
        });
      });

      this.stub(fs, 'readFile', function(path, callback) {
        if (/test.(js|foo)$/.test(path)) {
          return callback(undefined, 'foo');
        } else {
          return readFile.apply(this, arguments);
        }
      });
    });
    afterEach(function() {
      mock.cleanup();
    });


    function runWatchTest(srcdir, config, operations, expectedFiles, done) {
      var options = {packageConfigFile: 'config/dev.json'};

      watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
    }

    it('should rebuild modules on config change', function(done) {
      var expectedFiles = ['/module.js', '/module.js'],
          operations = {
            1: function(testdir) {
              mock.trigger('change', testdir + 'config/dev.json');
            }
          };

      runWatchTest.call(this,
        'test/artifacts', 'lumbar.json',
        operations, expectedFiles,
        done);
    });
  });
});
