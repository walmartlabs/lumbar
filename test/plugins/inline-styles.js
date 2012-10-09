var _ = require('underscore'),
    assert = require('assert'),
    build = require('../../lib/build'),
    fs = require('fs'),
    fu = require('../../lib/fileUtil'),
    lib = require('../lib'),
    should = require('should');

describe('inline-styles plugin', function() {
  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {styles: { "inlineLoader": "foo" }},
        {styles: { "inline": false }}
      ];

      var config = {styles: { "inline": true }};

      lib.mixinExec({}, mixins, config, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "inline": true,
          "inlineLoader": "foo"
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixins = [
        {styles: { "inlineLoader": "foo" }},
        {styles: { "inline": false }}
      ];

      lib.mixinExec({}, mixins, {}, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "inline": false,
          "inlineLoader": "foo"
        });
        done();
      });
    });
    it('should overwrite falsy values', function(done) {
      var mixins = [
        {styles: { "inlineLoader": "foo", "inline": true }},
        {styles: { "inline": false }}
      ];

      lib.mixinExec({}, mixins, {}, function(mixins, context) {
        context.config.attributes.styles.should.eql({
          "inline": false,
          "inlineLoader": "foo"
        });
        done();
      });
    });
  });
});
