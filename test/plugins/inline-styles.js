var lib = require('../lib');

describe('inline-styles plugin', function() {
  describe('mixin', function() {
    it('should include special values from mixins', function(done) {
      var mixins = [
        {name: 'mixin', styles: { "inlineLoader": "foo" }},
        {name: 'mixin2', styles: { "inline": false }}
      ];

      var config = {styles: { "inline": true }};

      lib.mixinExec({}, mixins, config, function(libraries, context) {
        context.config.attributes.styles.should.eql({
          "inline": true,
          "inlineLoader": "foo"
        });
        done();
      });
    });
    it('should create styles config if necessary', function(done) {
      var mixins = [
        {name: 'mixin', styles: { "inlineLoader": "foo" }},
        {name: 'mixin2', styles: { "inline": false }}
      ];

      lib.mixinExec({}, mixins, {}, function(libraries, context) {
        context.config.attributes.styles.should.eql({
          "inline": false,
          "inlineLoader": "foo"
        });
        done();
      });
    });
    it('should overwrite falsy values', function(done) {
      var mixins = [
        {name: 'mixin', styles: { "inlineLoader": "foo", "inline": true }},
        {name: 'mixin2', styles: { "inline": false }}
      ];

      lib.mixinExec({}, mixins, {}, function(libraries, context) {
        context.config.attributes.styles.should.eql({
          "inline": false,
          "inlineLoader": "foo"
        });
        done();
      });
    });
  });
});
