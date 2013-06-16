var FileMap = require('../../lib/util/file-map'),
    fu = require('../../lib/fileUtil'),
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
      map.add('bar', ';;\n::\n', 42);
      map.contentCache.bar.should.eql({
        lines: [
          ';;',
          '::',
          ''
        ],
        context: 42
      });
    });
    if (sourceMap) {
      // This test only applies if we have source map support
      it('should add source mapping', function() {
        var map = new FileMap('foo');
        this.stub(map.generator, 'addMapping');

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
      map.add('foo', 'foo1\nfoo2\nfoo3', 1);   // 3, 4
      map.add(undefined, ';;');   // 3, 6
      map.add('bar', 'bar1\nbar2\nbar3\nbar1\nbar2\nbar3\nbar1\nbar2\nbar3\n');
    });

    if (sourceMap) {
      it('should output context', function() {
        map.context(1, 1).should.eql({
          file: 'foo',
          fileContext: 1,
          line: 1,
          column: 1,
          context: [
            '1:  foo1',
            '2   foo2',
            '3   foo3'
          ]
        });
      });

      it('should output proper gutter width', function() {
        map.context(10, 1).should.eql({
          file: 'bar',
          fileContext: undefined,
          line: 8,
          column: 1,
          context: [
            ' 6   bar3',
            ' 7   bar1',
            ' 8:  bar2',
            ' 9   bar3',
            '10   '
          ]
        });
      });
      it('should not output for unnamed contexts', function() {
        should.not.exist(map.context(3, 5));
      });
      it('should clip context to the file', function() {
        map.context(3, 7).should.eql({
          file: 'bar',
          fileContext: undefined,
          line: 1,
          column: 1,
          context: [
            '1:  bar1',
            '2   bar2',
            '3   bar3'
          ]
        });
        map.context(11, 1).should.eql({
          file: 'bar',
          fileContext: undefined,
          line: 9,
          column: 1,
          context: [
            ' 7   bar1',
            ' 8   bar2',
            ' 9:  bar3',
            '10   '
          ]
        });
      });
    } else {
      it('should output without context', function() {
        map.context(11, 1).should.eql({
          file: 'foo',
          fileContext: undefined,
          line: 11,
          column: 1
        });
      });
    }
  });
  describe('#writeSourceMap', function() {
    var map;
    beforeEach(function() {
      this.stub(fu, 'writeFile', function(path, content, callback) { callback(); });
      this.stub(fu, 'ensureDirs', function(path, callback) { callback(); });
      map = new FileMap('output/here!');
      this.stub(map, 'sourceMap', function() { return 'zee map!'; });
    });
    it('should output map file', function(done) {
      map.writeSourceMap({
        callback: function(err) {
          if (err) {
            throw err;
          }

          fu.writeFile.args[0][0].should.equal('output/here!.map');
          fu.writeFile.args[0][1].should.equal('zee map!');
          done();
        }
      });
    });
    it('should output source files', function(done) {
      map.add('foo', 'foo1\nfoo2\n');
      map.add('bar', 'bar1');
      map.writeSourceMap({
        outputSource: true,
        callback: function(err) {
          if (err) {
            throw err;
          }

          fu.writeFile.args[1][0].should.equal('output/foo');
          fu.writeFile.args[1][1].should.equal('foo1\nfoo2\n');

          fu.writeFile.args[2][0].should.equal('output/bar');
          fu.writeFile.args[2][1].should.equal('bar1');
          done();
        }
      });
    });
    it('should add declaration commment', function(done) {
      this.stub(map, 'add');
      map.writeSourceMap({
        callback: function(err) {
          if (err) {
            throw err;
          }

          map.add.args[0][1].should.match(/\/\/@ sourceMappingURL=here!.map\n/);
          done();
        }
      });
    });
  });
});
