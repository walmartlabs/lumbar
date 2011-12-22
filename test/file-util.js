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
exports['make-relative'] = function() {
  fu.lookupPath('foo/bar');

  assert.equal(fu.makeRelative('foo'), 'foo');
  assert.equal(fu.makeRelative('foo/bar/foo'), 'foo');
  assert.equal(fu.makeRelative('foo/baro/foo'), 'foo/baro/foo');
  assert.equal(fu.makeRelative('/foo'), '/foo');
  assert.equal(fu.makeRelative('c:\\foo'), 'c:\\foo');
  assert.equal(fu.makeRelative('c:/foo'), 'c:/foo');
};

exports['file-list-file'] = function(done) {
  fu.fileList('test/file-util.js', function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, ['test/file-util.js']);
    done();
  });
};

exports['file-list-file-lookup'] = function(done) {
  fu.lookupPath('test');
  fu.fileList('file-util.js', function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, ['file-util.js']);
    done();
  });
};

exports['file-list-file-no-filter'] = function(done) {
  fu.fileList('test/file-util.js', /notjason/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, ['test/file-util.js']);
    done();
  });
};

exports['file-list-file-not-found'] = function(done) {
  fu.fileList('test/file-util.js.foo', function(err, files) {
    assert.equal(files, undefined);
    assert.equal(err.code, 'ENOENT');

    done();
  });
};

exports['file-list-multiple'] = function(done) {
  fu.lookupPath('test');
  fu.fileList(['file-util.js', 'file-util.js', 'artifacts/router.json'], function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, ['file-util.js', 'artifacts/router.json']);
    done();
  });
};

exports['file-list-dir'] = function(done) {
  fu.lookupPath('test');
  fu.fileList(['file-util.js', 'artifacts/js'], function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, [
      'file-util.js',
      'artifacts/js/base.js',
      'artifacts/js/home/home.js',
      'artifacts/js/iphone.js',
      'artifacts/js/web.js'
    ]);
    done();
  });
};

exports['file-list-filtered'] = function(done) {
  fu.lookupPath('test');
  fu.fileList(['file-util.js', 'artifacts'], /js\/.*\.js$/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, [
      'file-util.js',
      'artifacts/js/base.js',
      'artifacts/js/home/home.js',
      'artifacts/js/iphone.js',
      'artifacts/js/web.js'
    ]);
    done();
  });
};

exports['file-list-resource'] = function(done) {
  fu.lookupPath('test');
  fu.fileList(['file-util.js', {src: 'artifacts', global: true}, {router: true}], /js\/.*\.js$/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, [
      'file-util.js',
      {src: 'artifacts/js/base.js', global: true},
      {src: 'artifacts/js/home/home.js', global: true},
      {src: 'artifacts/js/iphone.js', global: true},
      {src: 'artifacts/js/web.js', global: true},
      {router: true}
    ]);

    done();
  });
};

exports['file-list-resource-only'] = function(done) {
  fu.lookupPath('test');
  fu.fileList([{router: true}], /js\/.*\.js$/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, [{router: true}]);

    done();
  });
};

exports['file-list-none'] = function(done) {
  fu.lookupPath('test');
  fu.fileList([], /js\/.*\.js$/, function(err, files) {
    if (err) {
      throw err;
    }

    assert.deepEqual(files, []);

    done();
  });
};
