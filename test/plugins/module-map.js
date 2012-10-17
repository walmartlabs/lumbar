var _ = require('underscore'),
    lib = require('../lib'),
    moduleMap = require('../../lib/plugins/module-map'),
    should = require('should');

describe('module-map plugin', function() {
  var config = {
    modules: {
      module1: {
        routes: {'foo': 'bar', 'baz': 'bat'},
        scripts: [{'module-map': true}]
      },
      module2: {
        routes: {'foo': 'bar', 'baz': 'bat'}
      }
    },
    scope: 'none'
  };

  describe('resources', function() {
    var buildMap = moduleMap.buildMap;
    after(function() {
      moduleMap.buildMap = buildMap;
    });

    it('should include module-map resource', function(done) {
      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        _.pluck(resources, 'originalResource').should.eql([{routes: {'foo': 'bar', 'baz': 'bat'}}, {'module-map': true}]);
        done();
      });
    });

    it('should output module-map', function(done) {
      moduleMap.buildMap = function(context, callback) {
        callback(undefined, {module: true}, 'prefix!');
      };

      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        resources[1](context, function(err, data) {
          if (err) {
            throw err;
          }

          data.should.eql({
            data: '/* lumbar module map */\nmodule.exports.moduleMap({"module":true});\n',
            noSeparator: true
          });
        });
        done();
      });
    });
  });
});
