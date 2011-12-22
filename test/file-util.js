var assert = require('assert'),
    fu = require('../lib/fileUtil');

exports['teardown'] = function(done) {
  fu.lookupPath('');
  done();
};

exports['resolve-path'] = function() {
  fu.lookupPath('foo/bar');

  assert.equal(fu.resolvePath('foo'), 'foo/bar/foo');
  assert.equal(fu.resolvePath('foo/bar/foo'), 'foo/bar/foo');
  assert.equal(fu.resolvePath('/foo'), '/foo');
  assert.equal(fu.resolvePath('c:\\foo'), 'c:\\foo');
  assert.equal(fu.resolvePath('c:/foo'), 'c:/foo');
};
