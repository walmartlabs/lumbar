var esprima = require('esprima'),
    traverse = require('estraverse').traverse;

var sourceMap = require('source-map'),
      SourceMapConsumer = sourceMap.SourceMapConsumer,
      SourceMapGenerator = sourceMap.SourceMapGenerator;

function expect(node, type, hint) {
  node = node || {};

  if (node.type !== type) {
    throw new Error((hint || 'Expected ') + '"' + type + '" but found "' + node.type + '"' + errorLocation(node));
  }
}
function errorLocation(node) {
  return ' location: line: ' + node.loc.start.line + ' column: ' + node.loc.start.column;
}

function parseDefine(node) {
  var args = node.arguments,
      name,
      deps,
      functionArg;

  if (args[0].type === 'FunctionExpression') {
    functionArg = args[0];
  } else if (args[0].type === 'ArrayExpression') {
    deps = args[0];
    functionArg = args[1];
  } else if (args[0].type === 'Literal') {
    name = args[0].value;
    if (args.length > 2) {
      deps = args[1];
      functionArg = args[2];
    } else {
      functionArg = args[1];
    }
  } else {
    expect(args[0], 'Literal', 'Expected name to be ');
  }

  if (deps) {
    expect(deps, 'ArrayExpression', 'Expected second argument to be ');
    deps.elements.forEach(function(arg) {
      expect(arg, 'Literal', 'Expected dependency to be ');
    });

    deps = deps.elements.map(function(arg) { return arg.value; });
  }

  expect(functionArg, 'FunctionExpression');
  return {
    define: true,
    name: name,
    deps: deps,
    range: functionArg.range,
    loc: functionArg.loc
  };
}
var workers = {
  define: function(node) {
    return parseDefine(node);
  },
  defineView: function(node) {
    var ret = parseDefine(node);
    ret.view = true;
    return ret;
  },
  defineHelper: function(node) {
    var ret = parseDefine(node);
    ret.helper = true;
    return ret;
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
          defineInfo = worker(node);

          if (defineNode) {
            throw new Error('Unsupported nested define "' + defineInfo.name + '" found' + errorLocation(node));
          }
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
  if (rangeStart < src.length) {
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
