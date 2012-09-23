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

    it('should pull in templates from mixins', function(done) {
      var mixinDecl = {
        name: 'mixin1',
        overrides: {
          'baz1.1': 'foo',
          'baz1.2': true,
          'foo1.1': true
        }
      };
      var module = {
        mixins: [
          mixinDecl,
          'mixin2'
        ],
        scripts: [ 'baz1.1' ]
      };
      var config = {
        modules: {module: module},
        templates: {
          'baz1.1': [
            'foo1.1',
            'foo1.2'
          ]
        }
      };

      var mixins = [
        {
          root: 'mixin1/',
          mixins: {
            mixin1: {
              scripts: [ 'baz1.1', 'baz1.2' ]
            },
          },
          templates: {
            'baz1.1': [
              'foo1.1',
              'foo1.2'
            ]
          }
        },
        {
          root: 'mixin2/',
          mixins: {
            mixin2: {
              scripts: [ 'baz1.1', 'baz1.2' ]
            },
          },
          templates: {
            'baz1.1': [
              'foo1.1',
              'foo1.2'
            ]
          }
        }
      ];

      lib.mixinExec(module, mixins, config, function(mixins, context) {
        mixins = mixins.mixins;

        context.mode = 'scripts';
        build.loadResources(context, function(err, resources) {
          // Drop the mixin reference to make testing easier
          _.each(resources, function(resource) { delete resource.mixin; });

          assert.deepEqual(resources, [
            {src: 'foo', originalSrc: 'mixin1/baz1.1', enoent: true},
            {template: 'foo1.1', name: 'foo1.1'},
            {template: 'mixin1/foo1.2', name: 'foo1.2'},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', enoent: true},
            {src: 'mixin2/baz1.1', enoent: true},
            {template: 'mixin2/foo1.1', name: 'foo1.1'},
            {template: 'mixin2/foo1.2', name: 'foo1.2'},
            {src: 'mixin2/baz1.2', enoent: true},
            {src: 'baz1.1', enoent: true},
            {template: 'foo1.1', name: 'foo1.1'},
            {template: 'foo1.2', name: 'foo1.2'}
          ]);
          done();
        });
      });
    });
  });
});
