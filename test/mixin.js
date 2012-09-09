var _ = require('underscore'),
    assert = require('assert'),
    build = require('../lib/build'),
    Context = require('../lib/context'),
    plugin = require('../lib/plugin').create({});

plugin.initialize({ attributes: {} });

var mixin = plugin.get('mixin');

function exec(module, mixins, callback) {
  var context = new Context({
      mode: 'scripts',
      module: module
    },
    { attributes: {} },
    plugin);
  context.mixins = mixins;
  build.loadResources(context, callback);
}

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

  exec(module, mixins, function() {
      assert.equal(module.foo, 1, 'foo should be written');
      assert.equal(module.bar, 2, 'bar should be written');
      assert.equal(module.baz, 2, 'baz should be overwritten');
      assert.equal(module.bat, 3, 'bat should not be overwritten');

      assert.deepEqual(mixins.mixin1.attributes, {foo: 1, baz: 1, bat: 1});
      assert.deepEqual(mixins.mixin2.attributes, {bar: 2, baz: 2, bat: 2});
    });
};

exports['mixins merge routes'] = function() {
  var module = {
    mixins: ['mixin1', 'mixin2'],
    routes: { bat: 3 }
  };

  var mixins = {
    mixin1: {
      attributes: {
        routes: { foo: 1, baz: 1, bat: 1 }
      }
    },
    mixin2: {
      attributes: {
        routes: { bar: 2, baz: 2, bat: 2 }
      }
    }
  };

  exec(module, mixins, function() {
      assert.equal(module.routes.foo, 1);//, 'foo should be written');
      assert.equal(module.routes.bar, 2, 'bar should be written');
      assert.equal(module.routes.baz, 2, 'baz should be overwritten');
      assert.equal(module.routes.bat, 3, 'bat should not be overwritten');

      assert.deepEqual(mixins.mixin1.attributes.routes, {foo: 1, baz: 1, bat: 1});
      assert.deepEqual(mixins.mixin2.attributes.routes, {bar: 2, baz: 2, bat: 2});
    });
};

exports['mixins merge routes without modification'] = function() {
  var module = {
    mixins: ['mixin1', 'mixin2']
  };

  var mixins = {
    mixin1: {
      attributes: {
        routes: { foo: 1, baz: 1, bat: 1 }
      }
    },
    mixin2: {
      attributes: {
        routes: { bar: 2, baz: 2, bat: 2 }
      }
    }
  };

  exec(module, mixins, function() {
      assert.equal(module.routes.foo, 1, 'foo should be written');
      assert.equal(module.routes.bar, 2, 'bar should be written');
      assert.equal(module.routes.baz, 2, 'baz should be overwritten');
      assert.equal(module.routes.bat, 2, 'bat should not be overwritten');

      assert.deepEqual(mixins.mixin1.attributes.routes, {foo: 1, baz: 1, bat: 1});
      assert.deepEqual(mixins.mixin2.attributes.routes, {bar: 2, baz: 2, bat: 2});
    });
};

exports['mixins merge file arrays'] = function() {
  var module = {
    mixins: ['mixin1', 'mixin2'],
    scripts: [ {src: 'foo0', global: true }, {src: 'foo0.1', global: true}, 'bar0.1', 'bar0.2' ],
    styles: [ 'foo0', 'bar0' ]
  };

  var mixins = {
    mixin1: {
      root: 'mixin1/',
      attributes: {
        scripts: [ {src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2'],
        static: [ 'baz1.1', 'baz1.2' ]
      }
    },
    mixin2: {
      root: 'mixin2/',
      attributes: {
        scripts: [ {src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2'],
        styles: [ 'foo2', 'bar2' ],
        static: [ 'baz2.1', 'baz2.2' ]
      }
    }
  };

  exec(module, mixins, function() {
      assert.deepEqual(module.scripts, [
        {src: 'mixin1/foo1.1', global: true, mixin: mixins.mixin1}, {src: 'mixin1/foo1.2', global: true, mixin: mixins.mixin1},
        {src: 'mixin2/foo2.1', global: true, mixin: mixins.mixin2}, {src: 'mixin2/foo2.2', global: true, mixin: mixins.mixin2},
        {src: 'foo0', global: true }, {src: 'foo0.1', global: true},
        {src: 'mixin1/bar1.1', mixin: mixins.mixin1}, {src: 'mixin1/bar1.2', mixin: mixins.mixin1},
        {src: 'mixin2/bar2.1', mixin: mixins.mixin2}, {src: 'mixin2/bar2.2', mixin: mixins.mixin2},
        'bar0.1', 'bar0.2'
      ]);
      assert.deepEqual(module.styles, [
        {src: 'mixin2/foo2', mixin: mixins.mixin2}, {src: 'mixin2/bar2', mixin: mixins.mixin2},
        'foo0', 'bar0'
      ]);
      assert.deepEqual(module.static, [
        {src: 'mixin1/baz1.1', mixin: mixins.mixin1}, {src: 'mixin1/baz1.2', mixin: mixins.mixin1},
        {src: 'mixin2/baz2.1', mixin: mixins.mixin2}, {src: 'mixin2/baz2.2', mixin: mixins.mixin2}
      ]);

      assert.deepEqual(mixins.mixin1.attributes.scripts, [ {src: 'foo1.1', global: true}, {src: 'foo1.2', global: true}, 'bar1.1', 'bar1.2']);
      assert.deepEqual(mixins.mixin1.attributes.static, [ 'baz1.1', 'baz1.2' ]);

      assert.deepEqual(mixins.mixin2.attributes.scripts, [ {src: 'foo2.1', global: true}, {src: 'foo2.2', global: true}, 'bar2.1', 'bar2.2']);
      assert.deepEqual(mixins.mixin2.attributes.styles, [ 'foo2', 'bar2' ]);
      assert.deepEqual(mixins.mixin2.attributes.static, [ 'baz2.1', 'baz2.2' ]);
    });
};

exports['mixin files can be overriden'] = function() {
  var mixinDecl = {
    name: 'mixin1',
    overrides: {
      'baz1.1': 'foo',
      'baz1.2': true
    }
  };
  var module = {
    mixins: [
      mixinDecl,
      'mixin2'
    ],
    static: [ 'baz1.1' ]
  };

  var mixins = {
    mixin1: {
      root: 'mixin1/',
      attributes: {
        static: [ 'baz1.1', 'baz1.2' ]
      }
    },
    mixin2: {
      root: 'mixin2/',
      attributes: {
        static: [ 'baz1.1', 'baz1.2' ]
      }
    }
  };

  exec(module, mixins, function() {
      var mixin1 = _.extend({}, mixinDecl, mixins.mixin1);

      assert.deepEqual(module.static, [
        {src: 'foo', originalSrc: 'mixin1/baz1.1', mixin: mixin1},
        {src: 'baz1.2', originalSrc: 'mixin1/baz1.2', mixin: mixin1},
        {src: 'mixin2/baz1.1', mixin: mixins.mixin2},
        {src: 'mixin2/baz1.2', mixin: mixins.mixin2},
        'baz1.1'
      ]);

      assert.deepEqual(mixins.mixin1.attributes.static, [ 'baz1.1', 'baz1.2' ]);
      assert.deepEqual(mixins.mixin2.attributes.static, [ 'baz1.1', 'baz1.2' ]);
    });
};
