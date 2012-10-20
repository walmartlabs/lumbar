var _ = require('underscore'),
    lib = require('../lib'),
    updateExternals = require('../../lib/plugins/update-externals'),
    should = require('should');

describe('update-externals plugin', function() {
  var module, config;

  beforeEach(function() {
    module = {
      name: 'foo',
      scripts: ['foo'],
      styles: ['foo']
    };
    config = {
      scope: 'none'
    };
  });

  describe('#updateHtmlReferences', function() {
    function test(contextArgs, content, expected, done) {
      lib.pluginExec('update-externals', 'static', module, [], config, function(resources, context) {
        context._platform = 'bar';
        context.outdir = 'for';
        _.extend(context, contextArgs);

        updateExternals.updateHtmlReferences(context, content, function(err, src) {
          if (err) {
            throw err;
          }

          src.should.equal(expected);
          done();
        });
      });
    }
    function testScript(fileName, prefix, done) {
      test(
        {fileName: fileName},

        '<script src="module:module"></script>',

        '<script type="text/javascript">var lumbarLoadPrefix = \'' + prefix + '\';</script>'
          + '<script type="text/javascript" src="' + prefix + 'module.js"></script>',
        done);
    }


    it('should update module references only', function(done) {
      test(
        {fileName: '1.hml'},

        '<link href="foo.js"><link href="module:module">'
        + '<script type="text/javascript" src="foo.js"></script><script src="module:module"></script>',

        '<link href="foo.js"><link rel="stylesheet" type="text/css" href="bar/module.css">'
          + '<script type="text/javascript" src="foo.js"></script>'
          + '<script type="text/javascript">var lumbarLoadPrefix = \'bar/\';</script>'
          + '<script type="text/javascript" src="bar/module.js"></script>',
        done);
    });

    it('should error on unknown script module', function(done) {
      (function() {
        test({fileName: '1.hml'}, '<script src="module:go ... San Diego"></script>');
      }).should.throw('Unknown module "go ... San Diego"');
      done();
    });
    it('should error on unknown style module', function(done) {
      (function() {
        test({fileName: '1.hml'}, '<link href="module:go ... San Diego">');
      }).should.throw('Unknown module "go ... San Diego"');
      done();
    });

    it('should output doctype', function(done) {
      test(
          {fileName: '1.html'},

          '<!DOCTYPE html>\
          <html lang="en">\
            <head><title>Test Foo</title></head>\
            <body><script type="text/javascript" src="module:module"></script></body>\
          </html>',

          '<!DOCTYPE html>\
          <html lang="en">\
            <head><title>Test Foo</title></head>\
            <body><script type="text/javascript">var lumbarLoadPrefix = \'bar/\';</script><script type="text/javascript" src="bar/module.js"></script></body>\
          </html>',
          done);
    });

    it('should insert loadPrefix module references', function(done) {
      config.loadPrefix = 'foo/';
      testScript('1.html', 'foo/bar/', done);
    });
    describe('relative loadPrefix', function() {
      it('should handle parent directory', function(done) {
        testScript('1.html', 'bar/', done);
      });
      it('should handle the same directory', function(done) {
        testScript('for/bar/1.html', '', done);
      });
      it('should handle subdirectories', function(done) {
        testScript('for/bar/subdir/1.html', '../', done);
      });
    });
  });
});
