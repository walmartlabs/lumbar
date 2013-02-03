module.exports = exports = function(compiler, config) {
  compiler.options.externals.push.apply(compiler.options.externals, config);

  compiler.str = config.map(function(config) {
      return 'json("' + (config.src || config).replace(/\/"/g, '$0') + '")\n';
    }).join('')
    + compiler.str;
};
