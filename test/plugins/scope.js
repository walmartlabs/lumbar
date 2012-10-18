var _ = require('underscore'),
    build = require('../../lib/build'),
    lib = require('../lib'),
    should = require('should');

describe('scope plugin', function() {
  describe('var scope', function() {
    function testScope(scope, scripts, callback) {
      if (_.isFunction(scripts)) {
        callback = scripts;
        scripts = undefined;
      }

      var module = {
        topLevelName: 'foo',
        scripts: scripts || [
          'js/init.js',
          'js/views/test.js'
        ]
      };
      var config = {
        scope: {
          scope: scope,
          template: 'moduleStart{{yield}}moduleEnd'
        }
      };

      lib.pluginExec('scope', 'scripts', module, [], config, function(resources, context) {
        resources = _.map(resources, function(resource) {
          return resource.stringValue || resource.src;
        });

        callback(resources);
      });
    }

    it('should scope files', function(done) {
      testScope('file', function(resources) {
        resources.should.eql([
          'var foo;\n',
          'moduleStart',
          'js/init.js',
          'js/views/test.js',
          'moduleEnd'
        ]);
        done();
      });
    });
    it('should scope resources', function(done) {
      testScope('resource', function(resources) {
        resources.should.eql([
          'var foo;\n',
          'moduleStart',
          '(function() {\n',
          'js/init.js',
          '}).call(this);\n',
          '(function() {\n',
          'js/views/test.js',
          '}).call(this);\n',
          'moduleEnd'
        ]);
        done();
      });
    });
    it('should scope nothing', function(done) {
      testScope('none', function(resources) {
        resources.should.eql([
          'js/init.js',
          'js/views/test.js',
        ]);
        done();
      });
    });

    it('should scope globals', function(done) {
      testScope('file', [{src: 'js/init.js', global: true}, 'js/views/test.js'], function(resources) {
        resources.should.eql([
          'var foo;\n',
          'js/init.js',
          'moduleStart',
          'js/views/test.js',
          'moduleEnd'
        ]);
        done();
      });
    });
  });
  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          root: 'mixin1/',
          scope: {
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          }
        },
        {
          scope: 'none'
        }
      ];

      var config = {
        scope: {
          scope: 'resource',
          aliases: {
            'foo': 'bat',
            'bat': 'baz'
          }
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        mixins.load(context, mixins, function() {
          context.config.attributes.scope.should.eql({
            scope: 'resource',
            template: 'mixin1/module.handlebars',
            aliases: {
              'foo': 'bat',
              'baz': 'bar',
              'bat': 'baz'
            }
          });
          done();
        });
      });
    });
    it('should merge with shorthand', function(done) {
      var mixins = [
        {
          root: 'mixin1/',
          scope: {
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          }
        },
        {
          scope: 'none'
        }
      ];

      var config = {
        scope: 'resource'
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        mixins.load(context, mixins, function() {
          context.config.attributes.scope.should.eql({
            scope: 'resource',
            template: 'mixin1/module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          });
          done();
        });
      });
    });
    it('should create scope config if necessary', function(done) {
      var mixin = {
        scope: {
          scope: 'module',
          template: 'module.handlebars',
          aliases: {
            'foo': 'bar',
            'baz': 'bar'
          }
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixins.load(context, mixin, function() {
          context.config.attributes.scope.should.eql({
            scope: 'module',
            template: 'module.handlebars',
            aliases: {
              'foo': 'bar',
              'baz': 'bar'
            }
          });
          done();
        });
      });
    });
  });
});
