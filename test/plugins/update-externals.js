/*jshint multistr: true */
var _ = require('underscore'),
    lib = require('../lib'),
    updateExternals = require('../../lib/plugins/update-externals');

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
          if (!err) {
            src.should.equal(expected);
          }

          done(err);
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

    it('should insert before all module references', function(done) {
      test(
        {fileName: '1.hml'},

        '<link href="foo.js"><link href="module:module">'
        + '<script type="text/javascript" src="foo.js"></script><script src="module:module"></script><script src="module:module"></script>',

        '<link href="foo.js"><link rel="stylesheet" type="text/css" href="bar/module.css">'
          + '<script type="text/javascript" src="foo.js"></script>'
          + '<script type="text/javascript">var lumbarLoadPrefix = \'bar/\';</script>'
          + '<script type="text/javascript" src="bar/module.js"></script>'
          + '<script type="text/javascript" src="bar/module.js"></script>',
        done);
    });

    it('should error on unknown script module', function(done) {
      test({fileName: '1.hml'}, '<script src="module:go ... San Diego"></script>', undefined, function(err) {
        err.message.should.eql('Unknown module "go ... San Diego"');
        done();
      });
    });
    it('should error on unknown style module', function(done) {
      test({fileName: '1.hml'}, '<link href="module:go ... San Diego">', undefined, function(err) {
        err.message.should.eql('Unknown module "go ... San Diego"');
        done();
      });
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

    describe('embedded template support', function() {
      function testTemplate(template, done) {
        test(
          {fileName: '1.html'},

          '<script src="module:module"></script>' + template,

          '<script type="text/javascript">var lumbarLoadPrefix = \'bar/\';</script>'
            + '<script type="text/javascript" src="bar/module.js"></script>' + template,
          done);
      }

      it.skip('should support ejs style templates', function(done) {
        testTemplate('<div><%= name %></div>', done);
      });
      it('should support mustache style templates', function(done) {
        testTemplate('<div>{{#name}}{{name}}{{/name}}</div>', done);
      });
    });
  });
});
