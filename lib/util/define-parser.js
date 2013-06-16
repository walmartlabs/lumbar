var esprima = require('esprima'),
    traverse = require('estraverse').traverse;

var sourceMap = require('source-map'),
      SourceMapConsumer = sourceMap.SourceMapConsumer,
      SourceMapGenerator = sourceMap.SourceMapGenerator;

function expect(node, type, hint) {
  if (node.type !== type) {
    throw new Error((hint || 'Expected ') + '"' + type + '" but found "' + node.type + '"' + errorLocation(node));
  }
}
function errorLocation(node) {
  return ' location: line: ' + node.loc.start.line + ' column: ' + node.loc.start.column;
}

var workers = {
  defineView: function(node) {
    var args = node.arguments,
        deps = [],
        functionArg = args[1];

    expect(args[0], 'Literal', 'Expected view name to be ');

    if (args.length > 2) {
      expect(args[1], 'ArrayExpression', 'Expected second argument to be ');
      args[1].elements.forEach(function(arg) {
        expect(arg, 'Literal', 'Expected dependency to be ');
      });

      functionArg = args[2];

      deps = args[1].elements.map(function(arg) { return arg.value; });
    }

    expect(functionArg, 'FunctionExpression');
    return {
      view: args[0].value,
      deps: deps,
      range: functionArg.range,
      loc: functionArg.loc
    };
  }
};

module.exports = function(src, options) {
  options = options || {};

  var ast = esprima.parse(src, {range: true, loc: true}),
      defineInfo,
      defineNode,
      rangeStart = 0,
      locStart = {line: 1, column: 0},
      locEnd,
      ret = [];

  traverse(ast, {
    enter: function(node, parent) {
      if (node.type === 'CallExpression') {
        var worker = workers[node.callee.name];
        if (worker) {
          if (defineInfo) {
            throw new Error('Unsupported nested define "' + node.arguments[0].value + '" found' + errorLocation(node));
          }

          defineInfo = worker(node);
          defineNode = node;


          defineInfo.source = src.slice.apply(src, defineInfo.range);
          delete defineInfo.range;

          if (rangeStart !== node.range[0]) {
            ret.push({
              source: src.slice(rangeStart, node.range[0]),
              loc: {
                start: locStart,
                end: {line: node.loc.start.line, column: Math.max(node.loc.start.column-1, 0)}
              }
            });
          }
        }
      }
    },
    leave: function(node, parent) {
      if (node === defineNode) {
        ret.push(defineInfo);

        rangeStart = defineNode.range[1] + 1;
        locStart = {line: node.loc.end.line, column: node.loc.end.column + 1};

        defineNode = defineInfo = undefined;
      }
      locEnd = node.loc.end;
    }
  });

  // Handle trailing source
  if (rangeStart !== src.length) {
    ret.push({
      source: src.slice(rangeStart),
      loc: {
        start: locStart,
        end: locEnd
      }
    });
  }

  return ret;
};
