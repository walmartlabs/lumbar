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
  fu.fileList('foo-bar-baz', function(err, files) {
    assert.deepEqual(files, [{src: 'foo-bar-baz', enoent: true}]);

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
      {dir: 'artifacts/js'},
      {src: 'artifacts/js/base.js', srcDir: 'artifacts/js'},
      {dir: 'artifacts/js/home', srcDir: 'artifacts/js'},
      {src: 'artifacts/js/home/home.js', srcDir: 'artifacts/js'},
      {src: 'artifacts/js/iphone.js', srcDir: 'artifacts/js'},
      {src: 'artifacts/js/web.js', srcDir: 'artifacts/js'}
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
      {dir: 'artifacts'},
      {dir: 'artifacts/config', srcDir: 'artifacts'},
      {dir: 'artifacts/images', srcDir: 'artifacts'},
      {dir: 'artifacts/js', srcDir: 'artifacts'},
      {src: 'artifacts/js/base.js', srcDir: 'artifacts'},
      {dir: 'artifacts/js/home', srcDir: 'artifacts'},
      {src: 'artifacts/js/home/home.js', srcDir: 'artifacts'},
      {src: 'artifacts/js/iphone.js', srcDir: 'artifacts'},
      {src: 'artifacts/js/web.js', srcDir: 'artifacts'},
      {dir: 'artifacts/node_modules', srcDir: 'artifacts'},
      {dir: 'artifacts/node_modules/json-plugins-test-plugin', srcDir: 'artifacts'},
      {dir: 'artifacts/styles', srcDir: 'artifacts'},
      {dir: 'artifacts/templates', srcDir: 'artifacts'}
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
      { dir: 'artifacts', global: true},
      { dir: 'artifacts/config', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/images', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/js', global: true, srcDir: 'artifacts'},
      { src: 'artifacts/js/base.js', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/js/home', global: true, srcDir: 'artifacts'},
      { src: 'artifacts/js/home/home.js', global: true, srcDir: 'artifacts'},
      { src: 'artifacts/js/iphone.js', global: true, srcDir: 'artifacts'},
      { src: 'artifacts/js/web.js', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/node_modules', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/node_modules/json-plugins-test-plugin', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/styles', global: true, srcDir: 'artifacts'},
      { dir: 'artifacts/templates', global: true, srcDir: 'artifacts'},
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
