var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    lib = require('../lib'),
    should = require('should');

describe('handlebars plugin', function() {
  // TODO : More explict test for normal output
  // TODO : Precompiled test with mocks

  describe('directory include', function() {
    it('should drop trailing slashes in template names', function(done) {
      var module = {
        scripts: [
          'js/views/test.js'
        ]
      };
      var config = {
        templates: {
          'js/views/test.js': [__dirname + '/../artifacts/templates/']
        }
      };

      lib.pluginExec('handlebars', 'scripts', module, [], config, function(resources, context) {
        resources[1].originalResource.should.eql({src: __dirname + '/../artifacts/templates/', name: __dirname + '/../artifacts/templates/', template: true});

        resources[1](context, function(err, data) {
          if (err) {
            throw err;
          }

          var name = __dirname + '/../artifacts/templates/home.handlebars';
          data.should.eql({
            inputs: [ {dir: __dirname + '/../artifacts/templates/'}, name ],
            data: '/* handsfree : ' + name + '*/\ntemplates[\'' + name + '\'] = Handlebars.compile(\'home\\n\');\n',
            noSeparator: true
          });
          done();
        });
      });
    });
  });

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