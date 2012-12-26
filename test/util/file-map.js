var FileMap = require('../../lib/util/file-map'),
    fu = require('../../lib/fileUtil'),
    sinon = require('sinon'),
    sourceMap;

try {
  sourceMap = require('source-map');
} catch (err) {
  /* NOP */
}

describe('file-map', function() {
  describe('#add', function() {
    it('should add to content', function() {
      var map = new FileMap('foo');
      map.add(undefined, ';;');
      map.content().should.equal(';;');
    });
    it('should clear cache on add', function() {
      var map = new FileMap('foo');
      map._sourceMap = 'foo';

      map.add(undefined, ';;');
      map._sourceMap.should.equal('');
    });
    it('should update offsets', function() {
      var map = new FileMap('foo');
      map.add(undefined, ';;');
      map.line.should.equal(1);
      map.column.should.equal(3);

      map.add(undefined, '\n;;');
      map.line.should.equal(2);
      map.column.should.equal(3);

      map.add(undefined, ';;');
      map.line.should.equal(2);
      map.column.should.equal(5);

      map.add(undefined, '\n;;\n');
      map.line.should.equal(4);
      map.column.should.equal(1);
    });
    it('should cache named content', function() {
      var map = new FileMap('foo');
      map.add('bar', ';;\n::\n');
      map.contentCache.bar.should.eql([
        ';;',
        '::',
        ''
      ]);
    });
    if (sourceMap) {
      // This test only applies if we have source map support
      it('should add source mapping', function() {
        var map = new FileMap('foo');
        sinon.stub(map.generator, 'addMapping');

        map.add('bar', ';;\n::');
        map.add('baz', ';;\n');

        map.generator.addMapping.args[0][0].should.eql({
          source: 'bar',
          generated: {line: 1, column: 1},
          original: {line: 1, column: 1}
        });
        map.generator.addMapping.args[1][0].should.eql({
          source: 'bar',
          generated: {line: 2, column: 1},
          original: {line: 2, column: 1}
        });
        map.generator.addMapping.args[2][0].should.eql({
          source: 'baz',
          generated: {line: 2, column: 3},
          original: {line: 1, column: 1}
        });
      });
    }
  });
  describe('#messageContext', function() {
    var map;
    beforeEach(function() {
      map = new FileMap('foo');
      map.add('foo', 'foo1\nfoo2\nfoo3');   // 3, 4
      map.add(undefined, ';;');   // 3, 6
      map.add('bar', 'bar1\nbar2\nbar3\nbar1\nbar2\nbar3\nbar1\nbar2\nbar3\n');
    });

    if (sourceMap) {
      it('should output context', function() {
        map.context(1, 1).should.eql({
          file: 'foo',
          line: 1,
          column: 1,
          context: '1:  foo1\n2   foo2\n3   foo3'
        });
      });

      it('should output proper gutter width', function() {
        map.context(10, 1).should.eql({
          file: 'bar',
          line: 8,
          column: 1,
          context: ' 6   bar3\n 7   bar1\n 8:  bar2\n 9   bar3\n10   '
        });
      });
      it('should output original lines for unnamed contexts', function() {
        map.context(3, 5).should.eql({
          file: '<generated>',
          line: 3,
          column: 5
        });
      });
      it('should clip context to the file', function() {
        map.context(3, 7).should.eql({
          file: 'bar',
          line: 1,
          column: 1,
          context: '1:  bar1\n2   bar2\n3   bar3'
        });
        map.context(11, 1).should.eql({
          file: 'bar',
          line: 9,
          column: 1,
          context: ' 7   bar1\n 8   bar2\n 9:  bar3\n10   '
        });
      });
    } else {
      it('should output without context', function() {
        map.context(11, 1).should.eql({
          file: 'foo',
          line: 11,
          column: 1
        });
      });
    }
  });
  describe('#writeSourceMap', function() {
    var map;
    beforeEach(function() {
      sinon.stub(fu, 'writeFile', function(path, content, callback) { callback(); });
      sinon.stub(fu, 'ensureDirs', function(path, callback) { callback(); });
      map = new FileMap('output/here!');
      sinon.stub(map, 'sourceMap', function() { return 'zee map!'; });
    });
    afterEach(function() {
      fu.ensureDirs.restore();
      fu.writeFile.restore();
    });
    it('should output map file', function(done) {
      map.writeSourceMap(function(err) {
        if (err) {
          throw err;
        }

        fu.writeFile.args[0][0].should.equal('output/here!.map');
        fu.writeFile.args[0][1].should.equal('"zee map!"');
        done();
      });
    });
    it('should output source files', function(done) {
      map.add('foo', 'foo1\nfoo2\n');
      map.add('bar', 'bar1');
      map.writeSourceMap(function(err) {
        if (err) {
          throw err;
        }

        fu.writeFile.args[1][0].should.equal('output/foo');
        fu.writeFile.args[1][1].should.equal('foo1\nfoo2\n');

        fu.writeFile.args[2][0].should.equal('output/bar');
        fu.writeFile.args[2][1].should.equal('bar1');
        done();
      });
    });
    it('should add declaration commment', function(done) {
      sinon.stub(map, 'add');
      map.writeSourceMap(function(err) {
        if (err) {
          throw err;
        }

        map.add.args[0][1].should.match(/\/\/@ sourceMappingURL=here!.map\n/);
        done();
      });
    });
  });
});
