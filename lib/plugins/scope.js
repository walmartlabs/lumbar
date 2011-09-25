function wrapResources(resources) {
  // Wrap the module content in a javascript module
  resources.unshift(function(callback) { callback(undefined, '(function(){'); });
  resources.push(function(callback) { callback(undefined, '})();\n'); });
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

  file: function(context, next) {
    if (context.config.attributes.scope === 'file') {
      next();
      wrapResources(context.resources);
    }
  },
  module: function(context, next) {
    if (!context.config.attributes.scope || context.config.attributes.scope === 'module') {
      next();
      wrapResources(context.moduleResources);
    }
  }
};
