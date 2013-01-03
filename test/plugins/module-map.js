var _ = require('underscore'),
    lib = require('../lib'),
    moduleMap = require('../../lib/plugins/module-map');

describe('module-map plugin', function() {
  var modules, config;

  beforeEach(function() {
    modules = {
      module1: {
        routes: {'foo': 'bar', 'baz': 'bat'},
        scripts: [{'module-map': true}]
      },
      module2: {
        routes: {'food': 'bar'}
      }
    };
    config = {
      packages: {
        'my shoe': {combine: true}
      },

      modules: modules,
      scope: 'none'
    };
  });

  describe('resources', function() {
    var buildMap = moduleMap.buildMap;
    after(function() {
      moduleMap.buildMap = buildMap;
    });

    it('should include module-map resource', function(done) {
      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources) {
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
            generated: true,
            noSeparator: true,
            ignoreWarnings: true
          });
        });
        done();
      });
    });
  });

  describe('#buildMap', function() {
    it('should build module map', function(done) {
      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        var plugin = context.plugins.get('module-map');

        plugin.buildMap(context, function(err, map, prefix) {
          map.should.eql({
            modules: {
              module1: {js: 'module1.js', css: undefined},
              module2: {js: 'module2.js', css: undefined}
            },
            routes: {
              'foo': 'module1',
              'baz': 'module1',
              'food': 'module2'
            }
          });
          prefix.should.equal('');
          done();
        });
      });
    });
    it('should handle combined mode', function(done) {
      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        var plugin = context.plugins.get('module-map');

        context._package = 'my shoe';
        plugin.buildMap(context, function(err, map, prefix) {
          map.should.eql({base: {js: 'my shoe.js', css: undefined}});
          prefix.should.equal('');
          done();
        });
      });
    });
    it('should include all pixel densities', function(done) {
      modules.module2.styles = ['stylez.styl'];
      config.styles = {pixelDensity: [1, 2, 3]};

      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        var plugin = context.plugins.get('module-map');

        plugin.buildMap(context, function(err, map, prefix) {
          map.should.eql({
            modules: {
              module1: {js: 'module1.js', css: undefined},
              module2: {js: 'module2.js', css: [
                  {href: 'module2.css', maxRatio: 1.5},
                  {href: 'module2@2x.css', minRatio: 1.5, maxRatio: 2.5},
                  {href: 'module2@3x.css', minRatio: 2.5}
                ]}
            },
            routes: {
              'foo': 'module1',
              'baz': 'module1',
              'food': 'module2'
            }
          });
          prefix.should.equal('');
          done();
        });
      });
    });
    it('should include preload modules', function(done) {
      modules.module2.preload = ['module1'];
      lib.pluginExec('module-map', 'scripts', config.modules.module1, [], config, function(resources, context) {
        var plugin = context.plugins.get('module-map');

        plugin.buildMap(context, function(err, map, prefix) {
          map.should.eql({
            modules: {
              module1: {js: 'module1.js', css: undefined},
              module2: {js: 'module2.js', css: undefined, preload: ['module1']}
            },
            routes: {
              'foo': 'module1',
              'baz': 'module1',
              'food': 'module2'
            }
          });
          prefix.should.equal('');
          done();
        });
      });
    });
  });
});
