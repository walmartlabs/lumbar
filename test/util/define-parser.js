var parser = require('../../lib/util/define-parser');

describe('define-parser', function() {
  function loc(startLine, startColumn, endLine, endColumn) {
    return {start: {line: startLine, column: startColumn}, end: {line: endLine, column: endColumn}};
  }

  describe('define', function() {
    it('should parse name', function() {
      parser("define('name', [], function() {});").should.eql([
        {name: 'name', deps: [], source: 'function() {}', loc: loc(1, 19, 1, 32)}
      ]);
    });
    it('should throw on non-literal name', function() {
      (function() {
        parser('define(name, [], function() {});');
      }).should.throw(/Expected name to be "Literal"/);
    });

    it('should parse deps', function() {
      parser("define('name', ['foo', 'bar'], function() {});").should.eql([
        {name: 'name', deps: ['foo', 'bar'], source: 'function() {}', loc: loc(1, 31, 1, 44)}
      ]);
    });
    it('should support no deps argument', function() {
      parser("define('name', function() {});").should.eql([
        {name: 'name', deps: undefined, source: 'function() {}', loc: loc(1, 15, 1, 28)}
      ]);
    });
    it('should throw on non-literal deps', function() {
      (function() {
        parser("define('name', [foo, bar], function() {});");
      }).should.throw(/Expected dependency to be "Literal"/);
    });

    it('should parse function', function() {
      parser("define('name', [], function() {    foo;\nbar;  bar;\n\n});").should.eql([
        {name: 'name', deps: [], source: 'function() {    foo;\nbar;  bar;\n\n}', loc: loc(1, 19, 4, 1)}
      ]);
    });

    it('should parse anonymous', function() {
      parser("define(function() {});").should.eql([
        {name: undefined, deps: undefined, source: 'function() {}', loc: loc(1, 7, 1, 20)}
      ]);
    });

    it('should parse anonymous with deps', function() {
      parser("define(['foo', 'bar'], function() {});").should.eql([
        {name: undefined, deps: ['foo', 'bar'], source: 'function() {}', loc: loc(1, 23, 1, 36)}
      ]);
    });

    it('should fail with nested', function() {
      (function() {
        parser("define('name', [], function() { define('foo', function() {}); });");
      }).should.throw(/Unsupported nested define/);
    });
  });

  describe('defineView', function() {
    it('should parse', function() {
      parser("defineView('name', ['foo', 'bar'], function() {    foo;\nbar;  bar;\n\n});").should.eql([
        {name: 'name', deps: ['foo', 'bar'], source: 'function() {    foo;\nbar;  bar;\n\n}', loc: loc(1, 35, 4, 1), view: true}
      ]);
    });

    it('should fail with nested views', function() {
      (function() {
        parser("define('name', [], function() { defineView('foo', function() {}); });");
      }).should.throw(/Unsupported nested define/);
    });
  });

  describe('defineHelper', function() {
    it('should parse', function() {
      parser("defineHelper('name', ['foo'], function() {});").should.eql([
        {'name': 'name', deps: ['foo'], source: 'function() {}', loc: loc(1, 30, 1, 43), helper: true}
      ]);
    });

    it('should fail with nested', function() {
      (function() {
        parser("defineView('name', [], function() { defineHelper('foo', function() {}); });");
      }).should.throw(/Unsupported nested define/);
    });
  });

  it('should support multiple declarations', function() {
    parser(
        "\ndefineView('name', function() {});"
        + "\nfoo\ndefine('name', function() {});foo"
        + "\nfoo\ndefineHelper('name', function() {});foo").should.eql([
      {source: "\n", loc: loc(1, 0, 2, 0)},
      {name: 'name', deps: undefined, source: 'function() {}', loc: loc(2, 19, 2, 32), view: true},
      {source: "\nfoo\n", loc: loc(2, 34, 4, 0)},
      {name: 'name', deps: undefined, source: 'function() {}', loc: loc(4, 15, 4, 28)},
      {source: "foo\nfoo\n", loc: loc(4, 30, 6, 0)},
      {name: 'name', deps: undefined, source: 'function() {}', loc: loc(6, 21, 6, 34), helper: true},
      {source: "foo", loc: loc(6, 36, 6, 39)}
    ]);
  });
});
