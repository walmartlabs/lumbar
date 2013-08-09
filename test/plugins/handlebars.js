var fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    handlebars = require('handlebars'),
    lib = require('../lib');

const TEST_DIR = require('path').normalize(__dirname + '/../artifacts/templates/');

describe('handlebars plugin', function() {
  beforeEach(function() {
    fu.resetCache();
  });

  function doIt(config, done, server) {
    var module = {
      scripts: [
        'js/views/test.js'
      ]
    };

    lib.pluginExec('handlebars', 'scripts', module, [], config, function(resources, context) {
      context.fileConfig.server = server;

      resources[0](context, function(err, data) {
        done(err || data);
      });
    });
  }

  describe('output', function() {
    it('should strip root name', function(done) {
      var config = {
        templates: {
          root: TEST_DIR,
          'js/views/test.js': [TEST_DIR]
        }
      };

      doIt(config, function(data) {
        var name = TEST_DIR + 'home.handlebars';
        data.should.eql({
          inputs: [ {dir: TEST_DIR}, name ],
          data: '/* handsfree : home.handlebars*/\ntemplates[\'home.handlebars\'] = Handlebars.compile(\'home\\n\');\n',
          generated: true,
          name: TEST_DIR,
          noSeparator: true,
          ignoreWarnings: true
        });
        done();
      });
    });
    it('should precompile', function(done) {
      var config = {
        templates: {
          'js/views/test.js': [TEST_DIR],
          precompile: true
        }
      };

      this.stub(handlebars, 'precompile', function() { return 'wooo!'; });
      doIt(config, function(data) {
        var name = TEST_DIR + 'home.handlebars';
        data.should.eql({
          inputs: [ {dir: TEST_DIR}, name ],
          data: '/* handsfree : ' + name + '*/\ntemplates[\'' + name + '\'] = Handlebars.template(wooo!);\n',
          generated: true,
          name: TEST_DIR,
          noSeparator: true,
          ignoreWarnings: true
        });

        done();
      });
    });
    it('should handle server args', function(done) {
      var config = {
        templates: {
          'js/views/test.js': [TEST_DIR],

          server: {
            bar: 3,
            bat: 4
          },
          precompile: {
            foo: 1,
            bar: 2
          }
        }
      };

      this.stub(handlebars, 'precompile', function(content, options) {
        options.should.eql({
          foo: 1,
          bar: 3,
          bat: 4
        });
        return 'wooo!';
      });
      doIt(config, function(data) {
        var name = TEST_DIR + 'home.handlebars';
        data.should.eql({
          inputs: [ {dir: TEST_DIR}, name ],
          data: '/* handsfree : ' + name + '*/\ntemplates[\'' + name + '\'] = Handlebars.template(wooo!);\n',
          generated: true,
          name: TEST_DIR,
          noSeparator: true,
          ignoreWarnings: true
        });

        done();
      }, true);
    });
    it('should output only once', function(done) {
      var config = {
        templates: {
          root: TEST_DIR,
          'js/views/test.js': [
            TEST_DIR
          ],
          'js/views/test2.js': [
            TEST_DIR + 'home.handlebars'
          ]
        }
      };

      var module = {
        scripts: [
          'js/views/test.js',
          'js/views/test2.js'
        ]
      };

      lib.pluginExec('handlebars', 'scripts', module, [], config, function(resources, context) {
        resources[0](context, function(err, data1) {
          if (err) {
            throw err;
          }
          resources[2](context, function(err, data3) {
            if (err) {
              throw err;
            }

            var name = TEST_DIR + 'home.handlebars';
            data1.should.eql({
              inputs: [ {dir: TEST_DIR}, name ],
              data: '/* handsfree : home.handlebars*/\ntemplates[\'home.handlebars\'] = Handlebars.compile(\'home\\n\');\n',
              generated: true,
              name: TEST_DIR,
              noSeparator: true,
              ignoreWarnings: true
            });
            data3.should.eql({
              inputs: [ name ],
              data: '',
              generated: true,
              name: name,
              noSeparator: true,
              ignoreWarnings: true
            });
            done();
          });
        });
      });
    });
  });

  describe('template templates', function() {
    it('should handle file errors', function(done) {
      var config = {
        templates: {
          template: 'foo.handlebars',
          root: TEST_DIR,
          'js/views/test.js': [TEST_DIR]
        }
      };

      doIt(config, function(data) {
        var name = TEST_DIR + 'home.handlebars';
        data.should.be.instanceOf(Error);
        data.code.should.equal('ENOENT');
        done();
      });
    });

    it('should strip extension name', function(done) {
      var config = {
        templates: {
          template: '{{without-extension name}}',
          root: TEST_DIR,
          'js/views/test.js': [TEST_DIR]
        }
      };

      doIt(config, function(data) {
        var name = TEST_DIR + 'home.handlebars';
        data.should.eql({
          inputs: [ {dir: TEST_DIR}, name ],
          data: 'home',
          generated: true,
          name: TEST_DIR,
          noSeparator: true,
          ignoreWarnings: true
        });
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
          'js/views/test.js': [TEST_DIR]
        }
      };

      lib.pluginExec('handlebars', 'scripts', module, [], config, function(resources, context) {
        resources[0].originalResource.should.eql({src: TEST_DIR, name: TEST_DIR, library: undefined, template: true});

        resources[0](context, function(err, data) {
          if (err) {
            throw err;
          }

          var name = TEST_DIR + 'home.handlebars';
          data.should.eql({
            inputs: [ {dir: TEST_DIR}, name ],
            data: '/* handsfree : ' + name + '*/\ntemplates[\'' + name + '\'] = Handlebars.compile(\'home\\n\');\n',
            generated: true,
            name: TEST_DIR,
            noSeparator: true,
            ignoreWarnings: true
          });
          done();
        });
      });
    });
  });

  describe('mixin', function() {
    it('should output without mixin path', function(done) {
      //fu.lookupPath('');

      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'foo\n');
      });

      var mixins = [{
        name: 'mixin',
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
    it('should output without nested mixin path', function(done) {
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'foo\n');
      });

      var config = {
        modules: {
          module: {
            mixins: [
              "mixin!"
            ]
          }
        },
        templates: {
          // Leave intact to ensure that we aren't being seeded from the mixin
        }
      };

      var mixins = [
        {
          name: 'mixin1',
          root: 'mixin1/',
          mixins: {
            'mixin!': {
              mixins: [
                {
                  name: 'mixin2',
                  overrides: {
                    'thisRoot/fot1.1.handlebars': 'otherRoot/bar.handlebars'
                  }
                }
              ]
            }
          },
          templates: {
            root: 'otherRoot/'
          }
        },
        {
          name: 'mixin2',
          root: 'mixin2/',
          mixins: {
            mixin2: {
              scripts: [ 'thisRoot/fot1.1.handlebars' ]
            }
          },
          templates: {
            root: 'thisRoot/',
          }
        }
      ];

      lib.pluginExec('handlebars', 'scripts', config.modules.module, mixins, config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.eql('/* handsfree : fot1.1.handlebars*/\ntemplates[\'fot1.1.handlebars\'] = Handlebars.compile(\'foo\\n\');\n');
          done();
        });
      });
    });

    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          name: 'mixin',
          templates: {
            'foo': 'bar',
            'template': 'template!',
            'knownHelpers': ['foo', 'bar'],
            'precompile': true,
            'cache': 'cache!'
          }
        },
        {
          name: 'mixin2',
          templates: {
            'bar': 'foo',
            'precompile': { 'template': 'another template!', 'bar': 'foo' }
          }
        }
      ];

      var config = {
        templates: {
          'foo': 'baz',
          'knownHelpers': ['baz'],
          'template': 'not in my house',

          'baz1.1': [
            'foo1.1',
            'foo1.2'
          ]
        }
      };

      lib.mixinExec({}, mixins, config, function(libraries, context) {
        context.config.attributes.templates.should.eql({
          'foo': 'baz',
          'template': 'not in my house',
          'knownHelpers': ['baz', 'foo', 'bar'],
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
          name: 'mixin',
          templates: {
            'foo': 'bar',
            'template': 'template!',
            'precompile': true,
            'cache': 'cache!'
          }
        }
      ];

      lib.mixinExec({}, mixins, {}, function(libraries, context) {
        context.config.attributes.templates.should.eql({
          'template': 'template!',
          'precompile': true,
          'cache': 'cache!'
        });
        done();
      });
    });
  });

  describe('template plugin integration', function() {
    var config = {
      defaultFilter: /.*bar.handlebars$/
    };
    lib.mockFileList(config);

    it('should handle nested auto-include mixin names (regression)', function(done) {
      this.stub(fs, 'readFile', function(path, callback) {
        callback(undefined, 'foo\n');
      });

      var module = {
        mixins: [{
          name: 'depthNotBreadth'
        }],
        scripts: [ 'baz1.1' ]
      };

      var mixins = [
        {
          name: 'depthNotBreadth',
          root: 'depthNotBreadth/',
          mixins: {
            depthNotBreadth: {
              mixins: [ 'mixin1' ]
            }
          }
        },
        {
          name: 'mixin',
          root: 'mixin1/',
          mixins: {
            mixin1: {
              scripts: [ 'baz1.1' ]
            }
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

      lib.pluginExec('handlebars', 'scripts', module, mixins, {}, function(resources, context) {
        context.loadResource(resources[1], function(err, data) {
          if (err) {
            throw err;
          }

          data.content.should.eql('/* handsfree : templates/baz1.1.handlebars*/\ntemplates[\'templates/baz1.1.handlebars\'] = Handlebars.compile(\'foo\\n\');\n');
          done();
        });
      });
    });
  });
});
