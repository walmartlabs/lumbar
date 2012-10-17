var _ = require('underscore'),
    lib = require('../lib'),
    should = require('should');

describe('package-config plugin', function() {
  var module = {
    scripts: [{'package-config': true}],
    name: 'foo'
  };
  var config = {
    packageConfig: "App.config",
    scope: 'none'
  };

  it('should inlcude package-config resource', function(done) {
    lib.pluginExec('package-config', 'scripts', module, [], config, function(resources, context) {
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
      }).should.throwError('package_config.json specified without file being set');
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
          noSeparator: true
        });
        done();
      });
    });
  });
});
