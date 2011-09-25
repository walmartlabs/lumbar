function generator(string) {
  var ret = function(callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.sourceFile = string;
  return ret;
}
function wrapResources(resources, context) {
  var cache = context.moduleCache;
  if (!cache.scopeName) {
    var app = context.config.attributes.application,
        appName = app && app.name;

    context.moduleCache.isAppModule = (app && app.module) === context.module.name;

    if (!appName || context.moduleCache.isAppModule) {
      cache.isTopNamespace = true;
      cache.scopeName = appName || context.module.name;
    } else {
      cache.scopeName = appName + '.' + context.module.name;
    }
  }

  // Wrap the module content in a javascript module
  resources.unshift(generator('(function(namespace) {\n'));
  resources.push(generator('}).call(this, ' + cache.scopeName +  ');\n'));
  return resources;
}

module.exports = {
  moduleResources: function(context, next) {
    var resources = next() || context.module;
    if (!context.config.attributes.scope || context.config.attributes.scope === 'module') {
      // Split up globals and non-globals
      var globals = [],
          children = [];
      for (var i = 0; i < resources.length; i++) {
        if (!resources[i].global) {
          children.push(resources[i]);
        } else {
          if (children.length) {
            throw new Error('Global files must be first when using module scoping');
          }
          globals.push(resources[i]);
        }
      }
      globals.push.apply(globals, wrapResources(children, context));
      return globals;
    }
    return resources;
  },
  resourceList: function(context, next) {
    if (context.config.attributes.scope === 'resource'
        && !context.resource.global) {
      return wrapResources(next(), context);
    } else {
      return next();
    }
  },

  module: function(context, next) {
    next();

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
