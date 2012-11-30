var fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    handlebars = require('handlebars'),
    lib = require('../lib'),
    sinon = require('sinon');

describe('handlebars plugin', function() {
  // TODO : More explict test for normal output
  // TODO : Precompiled test with mocks
  var readFile = fs.readFile;
  after(function() {
    fs.readFile = readFile;
  });
  beforeEach(function() {
    fu.resetCache();
  });

  describe('output', function() {
    function doIt(config, done) {
      var module = {
        scripts: [
          'js/views/test.js'
        ]
      };

      lib.pluginExec('handlebars', 'scripts', module, [], config, function(resources, context) {
        resources[1](context, function(err, data) {
          if (err) {
            throw err;
          }
          done(data);
        });
      });
    }
    it('should strip root name', function(done) {
      var config = {
        templates: {
          root: __dirname + '/../artifacts/templates/',
          'js/views/test.js': [__dirname + '/../artifacts/templates/']
        }
      };

      doIt(config, function(data) {
        var name = __dirname + '/../artifacts/templates/home.handlebars';
        data.should.eql({
          inputs: [ {dir: __dirname + '/../artifacts/templates/'}, name ],
          data: '/* handsfree : home.handlebars*/\ntemplates[\'home.handlebars\'] = Handlebars.compile(\'home\\n\');\n',
          noSeparator: true
        });
        done();
      });
    });
    it('should precompile', function(done) {
      var config = {
        templates: {
          'js/views/test.js': [__dirname + '/../artifacts/templates/'],
          precompile: true
        }
      };

      sinon.stub(handlebars, 'precompile', function() { return 'wooo!'; });
      doIt(config, function(data) {
        var name = __dirname + '/../artifacts/templates/home.handlebars';
        data.should.eql({
          inputs: [ {dir: __dirname + '/../artifacts/templates/'}, name ],
          data: '/* handsfree : ' + name + '*/\ntemplates[\'' + name + '\'] = Handlebars.template(wooo!);\n',
          noSeparator: true
        });

        handlebars.precompile.restore();
        done();
      });
    });
  });

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
        resources[1].originalResource.should.eql({src: __dirname + '/../artifacts/templates/', name: __dirname + '/../artifacts/templates/', mixin: undefined, template: true});

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
    it('should output without mixin path', function(done) {
      //fu.lookupPath('');

      fs.readFile = function(path, callback) {
        callback(undefined, 'foo\n');
      };


      var mixins = [{
        root: 'mixinRoot/',
        mixins: {
          'handlebars': {
            'scripts': [
              'foo.handlebars'
            ]
          }
        }
      }];

      var config = {
        'modules': {
          'test': {
            'mixins': ['handlebars']
          }
        }
      };

      lib.pluginExec('handlebars', 'scripts', config.modules.test, mixins, config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.eql('/* handsfree : foo.handlebars*/\ntemplates[\'foo.handlebars\'] = Handlebars.compile(\'foo\\n\');\n');
          done();
        });
      });
    });

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
