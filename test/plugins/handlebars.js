var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    lib = require('../lib'),
    should = require('should');

describe('template plugin', function() {
  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          templates: {
            'foo': 'bar',
            'template': 'template!',
            'precompile': true,
            'cache': 'cache!'
          }
        },
        {
          templates: {
            'bar': 'foo',
            'precompile': { 'template': 'another template!', 'bar': 'foo' }
          }
        }
      ];

      var config = {
        templates: {
          'foo': 'baz',
          'template': 'not in my house',

          'baz1.1': [
            'foo1.1',
            'foo1.2'
          ]
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.templates.should.eql({
          'foo': 'baz',
          'template': 'not in my house',
          'precompile': { 'template': 'another template!', 'bar': 'foo' },
          'cache': 'cache!',

          'baz1.1': [
            'foo1.1',
            'foo1.2'
          ]
        });
        done();
      });
    });
    it('should create templates config if necessary', function(done) {
      var mixins = [
        {
          templates: {
            'foo': 'bar',
            'template': 'template!',
            'precompile': true,
            'cache': 'cache!'
          }
        }
      ];

      lib.mixinExec({}, mixins, {}, function(mixins, context) {
        context.config.attributes.templates.should.eql({
          'template': 'template!',
          'precompile': true,
          'cache': 'cache!'
        });
        done();
      });
    });
  });
});
