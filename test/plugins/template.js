var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    should = require('should'),
    template = require('../../lib/plugins/template');

describe('template plugin', function() {
  var fileList = fu.fileList;
  before(function() {
    fu.fileList = function(list, extension, callback) {
      callback = _.isFunction(extension) ? extension : callback;
      callback(undefined, _.chain(list)
          .map(function(file) {
            if (!/.*bar.handlebars$/.test(file)) {
              return file;
            }
          })
          .filter(function(file) { return file; })
          .value());
    };
  });
  after(function() {
    fu.fileList = fileList;
  });

  describe('auto-include', function() {
    it('should remap files', function() {
      template.remapFile({
          regex: /foo(.*)bar(.*)/,
          templates: ['$1$2$3', '', '$11', 'bat']
        }, 'foo123bar')
        .should.eql(['123$3', '', '1231', 'bat']);

      should.not.exist(template.remapFile({
          regex: /foo(.*)bar(.*)/,
          templates: 'baz'
        }, 'bat'));
    });

    it('should pull in from auto-include pattern', function(done) {
      var module = {
        scripts: [
          'js/init.js',
          'js/views/test.js',
          'js/views/foo/bar.js'
        ]
      };
      var config = {
        templates: {
          'auto-include': {
            'js/views/(.*)\\.js': [
              'templates/$1.handlebars',
              'templates/$1-item.handlebars'
            ]
          }
        }
      };

      lib.mixinExec(module, [], config, function(mixins, context) {
        context.mode = 'scripts';
        build.loadResources(context, function(err, resources) {
          // Drop the mixin reference to make testing easier
          _.each(resources, function(resource) { delete resource.mixin; });

          resources.should.eql([
            {src: 'js/init.js'},
            {src: 'js/views/test.js'},
            {src: 'templates/test.handlebars', name: 'templates/test.handlebars', template: true},
            {src: 'templates/test-item.handlebars', name: 'templates/test-item.handlebars', template: true},
            {src: 'js/views/foo/bar.js'},
            {src: 'templates/foo/bar-item.handlebars', name: 'templates/foo/bar-item.handlebars', template: true}
          ]);
          done();
        });
      });
    });
    it('explicitly defined paths should be additive', function(done) {
      var module = {
        scripts: [
          'js/views/test.js'
        ]
      };
      var config = {
        templates: {
          'js/views/test.js': ['foo.handlebars'],

          'auto-include': {
            'js/views/(.*)\\.js': [
              'templates/$1.handlebars'
            ]
          }
        }
      };

      lib.mixinExec(module, [], config, function(mixins, context) {
        context.mode = 'scripts';
        build.loadResources(context, function(err, resources) {
          resources.should.eql([
            {src: 'js/views/test.js'},
            {src: 'foo.handlebars', name: 'foo.handlebars', template: true},
            {src: 'templates/test.handlebars', name: 'templates/test.handlebars', template: true}
          ]);
          done();
        });
      });
    });
  });
  describe('mixin', function() {
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

          resources.should.eql([
            {src: 'foo', originalSrc: 'mixin1/baz1.1', enoent: true},
            {template: true, src: 'foo1.1', name: 'foo1.1'},
            {template: true, src: 'mixin1/foo1.2', name: 'foo1.2'},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', enoent: true},
            {src: 'mixin2/baz1.1', enoent: true},
            {template: true, src: 'mixin2/foo1.1', name: 'foo1.1'},
            {template: true, src: 'mixin2/foo1.2', name: 'foo1.2'},
            {src: 'mixin2/baz1.2', enoent: true},
            {src: 'baz1.1', enoent: true},
            {template: true, src: 'foo1.1', name: 'foo1.1'},
            {template: true, src: 'foo1.2', name: 'foo1.2'}
          ]);
          done();
        });
      });
    });
  });
});
