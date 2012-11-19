var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    should = require('should');

describe('stylus plugin', function() {
  var readFileSync = fs.readFileSync,
      statSync = fs.statSync,
      read = [];
  after(function() {
    fs.readFileSync = readFileSync;
    fs.statSync = statSync;
  });

  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {
          styles: {
            "pixelDensity": {
              "iphone": [ 1, 2, 3 ],
              "web": [ 1, 2 ]
            },
            "urlSizeLimit": 103,
            "copyFiles": true,
            "useNib": true,
            "includes": [
              "styles/global.styl",
              "styles/1.styl"
            ]
          }
        },
        {
          styles: {
            "pixelDensity": {
              "android": [ 1, 2 ],
              "web": [ 1, 2, 3 ]
            },
            "urlSizeLimit": 104,
            "copyFiles": false,
            "styleRoot": "foo/",
            "includes": [
              "styles/2.styl"
            ]
          }
        }
      ];

      var config = {
        styles: {
          "pixelDensity": {
            "iphone": [ 1, 2 ]
          },
          "useNib": false,
          "includes": [
            "styles/config.styl"
          ]
        }
      };

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "pixelDensity": {
            "iphone": [ 1, 2 ],
            "web": [ 1, 2, 3 ],
            "android": [ 1, 2 ]
          },
          "useNib": false,
          "includes": [
            "styles/global.styl",
            "styles/1.styl",
            "styles/2.styl",
            "styles/config.styl"
          ],
          "urlSizeLimit": 104,
          "copyFiles": false
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixin = {
        "styles": {
          "pixelDensity": {
            "iphone": [ 1, 2 ]
          },
          "useNib": true
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "pixelDensity": {
              "iphone": [ 1, 2 ]
            },
            "useNib": true
          });
          done();
        });
      });
    });
    it('should update path references', function(done) {
      var mixin = {
        "styles": {
          "includes": ['foo', 'bar'],
          "styleRoot": 'baz'
        }
      };

      lib.mixinExec({}, [], {}, function(mixins, context) {
        mixin.root = 'a/';
        mixins.load(context, mixin, function() {
          context.config.attributes.styles.should.eql({
            "includes": ['a/foo', 'a/bar']
          });
          done();
        });
      });
    });

    it('should lookup files from mixins', function(done) {
      fu.lookupPath('');

      fs.readFileSync = function(path) {
        if (path === 'mixinRoot/mixin-import.styl') {
          read.push(path);
          return '@import "foo"\n';
        } else if (/\.styl|png$/.test(path) && !/functions(?:[\\\/]index)?.styl/.test(path)) {
          read.push(path);
          return '.test\n  background url("img.png")\n';
        } else {
          return readFileSync.apply(this, arguments);
        }
      };
      fs.statSync = function(path) {
        if (!/\.styl|png$/.test(path) || /functions(?:[\\\/]index)?.styl/.test(path)) {
          return statSync.apply(this, arguments);
        } else if (/mixinRoot/.test(path)) {
          if (/stylusRoot/.test(path)) {
            read.push(path);
            throw new Error();
          }
        }
      };

      var mixins = [{
        root: 'mixinRoot/',
        mixins: {
          'stylus': {
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        },
        'styles': {
          'stylusRoot': 'stylusRoot/',
          'includes': [
            'mixin-import.styl'
          ]
        }
      }];

      var config = {
        'modules': {
          'test': {
            'mixins': [
              {name: 'stylus', overrides: {'file1.styl': 'bar1.styl'}}
            ],
            'styles': [
              'file1.styl',
              'file2.styl'
            ]
          }
        }
      };

      lib.pluginExec('stylus', 'styles', config.modules.test, mixins, config, function(resources, context) {
        context.loadResource(resources[0], function(err, data) {
          if (err) {
            throw err;
          }

          read.should.eql([
            'mixinRoot/stylusRoot/mixin-import.styl',
            'mixinRoot/mixin-import.styl',
            'mixinRoot/stylusRoot/foo.styl',
            'mixinRoot/foo.styl',
            'mixinRoot/stylusRoot/img.png',
            'mixinRoot/img.png',
            'bar1.styl',
            'mixinRoot/stylusRoot/img.png',
            'mixinRoot/img.png',
            'mixinRoot/stylusRoot/file2.styl',
            'mixinRoot/file2.styl',
            'mixinRoot/stylusRoot/img.png',
            'mixinRoot/img.png',
            'file1.styl',
            'img.png',
            'file2.styl',
            'img.png'
          ]);
          done();
        });
      });
    });
  });
});
