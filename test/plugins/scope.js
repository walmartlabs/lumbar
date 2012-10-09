var _ = require('underscore'),
    build = require('../../lib/build'),
    lib = require('../lib'),
    should = require('should');

describe('scope plugin', function() {
  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          root: 'mixin1/',
          scope: {
            scope: 'module',
            template: 'module.handlebars'
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
            template: 'mixin1/module.handlebars'
          });
          done();
        });
      });
    });
    it('should create scope config if necessary', function(done) {
      var mixin = {
        scope: {
          scope: 'module',
          template: 'module.handlebars'
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixins.load(context, mixin, function() {
          context.config.attributes.scope.should.eql({
            scope: 'module',
            template: 'module.handlebars'
          });
          done();
        });
      });
    });
  });
});
