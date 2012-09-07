var assert = require('assert'),
    plugin = require('../lib/plugin').create({});

plugin.initialize({ attributes: {} });

var mixin = plugin.get('mixin');

exports['mixins apply attributes'] = function() {
  var module = {
    mixins: ['mixin1', 'mixin2'],
    bat: 3
  };

  var mixins = {
    mixin1: {
      attributes: { foo: 1, baz: 1, bat: 1 }
    },
    mixin2: {
      attributes: { bar: 2, baz: 2, bat: 2 }
    }
  };

  mixin.moduleResources({
      module: module,
      mixins: mixins
    },
    function() {
      assert.equal(module.foo, 1, 'foo should be written');
      assert.equal(module.bar, 2, 'bar should be written');
      assert.equal(module.baz, 2, 'baz should be overwritten');
      assert.equal(module.bat, 3, 'bat should not be overwritten');

      assert.deepEqual(mixins.mixin1.attributes, {foo: 1, baz: 1, bat: 1});
      assert.deepEqual(mixins.mixin2.attributes, {bar: 2, baz: 2, bat: 2});
    });
};
