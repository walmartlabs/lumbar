// TODO : Templates that are dependent on the platform
// TODO : Test multiple template references in the same file
var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    should = require('should'),
    template = require('../../lib/plugins/template'),
    watch = require('../lib/watch');


describe('template plugin', function() {
  var config = {
    defaultFilter: /.*bar.handlebars$/
  };
  lib.mockFileList(config);

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
            {src: 'templates/foo/bar-item.handlebars', name: 'templates/foo/bar-item.handlebars', template: true},
            {watch: 'templates/foo'}
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

    describe('watch', function() {
      var mock,
          originalRead,
          originalReadSync;
      before(function() {
        mock = watch.mockWatch();
        originalRead = fs.readFile;
        originalReadSync = fs.readFileSync;

        fs.readFileSync = function(path) {
          return JSON.stringify({
            modules: {
              module: {scripts: ['js/views/test.js']}
            },
            templates: {
              'auto-include': {
                'js/views/(.*)\\.js': 'templates/$1.foo'
              }
            }
          });
        };

        fs.readFile = function(path, callback) {
          if (/test.(js|foo)$/.test(path)) {
            return callback(undefined, 'foo');
          } else {
            return originalRead.apply(this, arguments);
          }
        };
      });
      after(function() {
        mock.cleanup();
      });


      function runWatchTest(srcdir, config, operations, expectedFiles, done) {
        var options = {packageConfigFile: 'config/dev.json'};

        watch.runWatchTest.call(this, srcdir, config, operations, expectedFiles, options, done);
      }

      it('should add newly created templates', function(done) {
        var expectedFiles = ['/module.js', '/module.js'],
            operations = {
              1: function(testdir) {
                config.fileFilter = /.*\.baz$/;
                mock.trigger('create', testdir + 'templates');
              }
            };

        config.fileFilter = /.*\.foo$/;

        runWatchTest.call(this,
          'test/artifacts', 'lumbar.json',
          operations, expectedFiles,
          done);
      });

      it('should remove deleted templates', function(done) {
        var expectedFiles = ['/module.js', '/module.js'],
            operations = {
              1: function(testdir) {
                config.fileFilter = /.*\.foo$/;
                mock.trigger('remove', testdir + 'templates/test.foo');
              }
            };

        runWatchTest.call(this,
          'test/artifacts', 'lumbar.json',
          operations, expectedFiles,
          done);
      });
    });
  });

  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          templates: {
            'auto-include': {'foo': 'bar'}
          }
        },
        {
          templates: {
            'auto-include': {'baz': 'bat'}
          }
        }
      ];

      var config = {
        templates: {
          'auto-include': {'bar': 'bar', 'baz': 'bar'}
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.templates.should.eql({
          'auto-include': {'foo': 'bar', 'bar': 'bar', 'baz': 'bar'}
        });
        done();
      });
    });
    it('should auto-include within mixins', function(done) {
      var module = {
        mixins: [{
          name: 'mixin1',
          overrides: {
            'baz1.1.handlebars': 'foo'
          }
        }],
        scripts: [ 'baz1.1' ]
      };

      var mixins = [
        {
          root: 'mixin1/',
          mixins: {
            mixin1: {
              scripts: [ 'baz1.1' ]
            },
          },
          templates: {
            'auto-include': {
              '.*': [
                'templates/$0.handlebars',
                '$0.handlebars'
              ]
            }
          }
        }
      ];

      lib.mixinExec(module, mixins, function(mixins, context) {
        context.mode = 'scripts';
        build.loadResources(context, function(err, resources) {
          // Drop the mixin reference to make testing easier
          _.each(resources, function(resource) { delete resource.mixin; });

          resources.should.eql([
            {src: 'mixin1/baz1.1'},
            {src: 'mixin1/templates/baz1.1.handlebars', name: 'templates/baz1.1.handlebars', template: true},
            {src: 'foo', name: 'baz1.1.handlebars', template: true},
            {src: 'baz1.1'},
            {src: 'templates/baz1.1.handlebars', name: 'templates/baz1.1.handlebars', template: true},
            {src: 'baz1.1.handlebars', name: 'baz1.1.handlebars', template: true},
          ]);
          done();
        });
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

          resources.should.eql([
            {src: 'foo', originalSrc: 'mixin1/baz1.1'},
            {template: true, src: 'foo1.1', name: 'foo1.1'},
            {template: true, src: 'mixin1/foo1.2', name: 'foo1.2'},
            {src: 'baz1.2', originalSrc: 'mixin1/baz1.2'},
            {src: 'mixin2/baz1.1'},
            {template: true, src: 'mixin2/foo1.1', name: 'foo1.1'},
            {template: true, src: 'mixin2/foo1.2', name: 'foo1.2'},
            {src: 'mixin2/baz1.2'},
            {src: 'baz1.1'},
            {template: true, src: 'foo1.1', name: 'foo1.1'},
            {template: true, src: 'foo1.2', name: 'foo1.2'}
          ]);
          done();
        });
      });
    });
  });
});
