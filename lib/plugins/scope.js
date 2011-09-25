function generator(string) {
  var ret = function(callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.sourceFile = string;
  return ret;
}
function wrapResources(resources, context) {
  var cache = context.moduleCache;
  if (!cache.scopeName) {
    var app = context.config.attributes.application,
        appName = (app && app.name) || app;
    if (!appName || context.moduleCache.isAppModule) {
      cache.isTopNamespace = true;
      cache.scopeName = appName || context.module.name;
    } else {
      cache.scopeName = appName + '.' + context.module.name;
    }
  }

  // Wrap the module content in a javascript module
  resources.unshift(generator('(function(namespace, global) {\n'));
  resources.push(generator('})(' + cache.scopeName +  ', this);\n'));
  return resources;
}

module.exports = {
  resourceList: function(context, next) {
    if (context.config.attributes.scope === 'resource') {
      return wrapResources(next(), context);
    } else {
      return next();
    }
  },

  module: function(context, next) {
    next();
    if (!context.config.attributes.scope || context.config.attributes.scope === 'module') {
      wrapResources(context.moduleResources, context);
    }

    // Insert the package declaration
    var app = context.config.attributes.application;
    if (context.moduleCache.scopeName) {
      if (context.moduleCache.isTopNamespace) {
        context.moduleResources.unshift(generator('var ' + context.moduleCache.scopeName + ' = {};\n'));
      } else {
        context.moduleResources.unshift(generator(context.moduleCache.scopeName + ' = {};\n'));
      }
    }
  }
};
