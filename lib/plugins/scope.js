function wrapResources(resources) {
  // Wrap the module content in a javascript module
  function generator(string) {
    var ret = function(callback) { callback(undefined, {data: string, noSeparator: true}); };
    ret.sourceFile = string;
    return ret;
  }
  resources.unshift(generator('(function(){\n'));
  resources.push(generator('})();\n'));
  return resources;
}

module.exports = {
  resourceList: function(context, next) {
    if (context.config.attributes.scope === 'resource') {
      return wrapResources(next());
    } else {
      return next();
    }
  },

  module: function(context, next) {
    if (!context.config.attributes.scope || context.config.attributes.scope === 'module') {
      next();
      wrapResources(context.moduleResources);
    }
  }
};
