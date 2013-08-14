/**
 * Scope Plugin : Wrap javascript units in module scopes.
 *
 * Config:
 *    root:
 *      scope:
 *        scope: Size of the smallest module scope. May be: 'module', 'resource', 'none'
 *        template: Template used override the default module logic.
 *            This may be an inline handlebars template or a reference to a handlebars file.
 *            Available fields:
 *              scope : Name of the javascript module
 *              isTopNamespace : Truthy if the current module is a top level namespace
 *              appName : Name of the application object
 *              yield : Location that the embedded javascript will be inserted
 *              aliases : Key value mapping of objects that will be imported into the module locally.
 *                  This is useful for allowing minimization of commonly used objects such as the
 *                  application object or common libraries.
 *
 *      root.scope may be set to the scope values as a shorthand.
 *
 * Mixins:
 *  All fields may be mixed in. Template file references are converted to mixin space. The alias
 *  field will be mixed in per-key with the local definition taking priority.
 */
var _ = require('underscore');

function getScope(attr) {
  return (attr.scope && attr.scope.scope) || attr.scope;
}
function toObj(obj) {
  return _.isString(obj) ? {scope: obj} : obj;
}

function generator(string) {
  var ret = function(context, callback) { callback(undefined, {data: string, generated: true, noSeparator: true}); };
  ret.stringValue = string;
  ret.sourceFile = undefined;
  ret.ignoreWarnings = true;
  return ret;
}

var scopeTemplateDelimiter = /\{?\{\{yield\}\}\}?/;

function ensureModuleTemplates(context, complete) {
  if (!context.configCache.moduleTemplate) {
    var template = context.config.attributes.scope && context.config.attributes.scope.template;
    if (!template) {
      template = __dirname + '/scope-module.handlebars';
    }

    context.fileUtil.loadTemplate(template, scopeTemplateDelimiter, function(err, templates) {
      if (err) {
        complete(err);
      } else {
        context.configCache.moduleTemplate = {
          start: templates[0],
          end: templates[1]
        };
        complete();
      }
    });
  } else {
    complete();
  }
}

function wrapResources(resources, context) {
  var cache = context.moduleCache;
  if (!cache.scopeName) {
    var app = context.config.attributes.application,
        appName = app && app.name;

    if (!appName || context.module.topLevelName || context.config.isAppModule(context.module)) {
      cache.isTopNamespace = true;
      cache.scopeName = context.module.topLevelName || appName || context.module.name;
    } else {
      cache.scopeName = appName + "['" + context.module.name + "']";
    }
    cache.appName = appName;
  }

  // Wrap the module content in a javascript module
  if (resources.length) {
    function isModule(reference) {
      var stripOperators = /['"\]]/g;
      return reference === cache.scopeName
          || (!cache.isTopNamespace
            && reference.replace(stripOperators, '').substr(-context.module.name.length) === context.module.name);
    }

    var scope = context.config.attributes.scope || {},

        // Call args calculation
        aliasesHash = context.module.aliases === false ? {} : _.extend({}, scope.aliases, context.module.aliases),
        aliases = _.pairs(aliasesHash),
        aliases = _.filter(aliases, function(alias) { return alias[1]; }),
        externals = _.filter(aliases, function(alias) { return !isModule(alias[1]); }),
        aliasVars = _.pluck(externals, '0'),
        callSpec = _.pluck(externals, '1'),

        // Internal scope calculation
        internals = _.filter(aliases, function(alias) { return isModule(alias[1]); }),
        internalVars = _.pluck(internals, '0'),
        internalScope = '';

    callSpec.unshift('this');
    if (cache.isTopNamespace) {
      internalVars.unshift(cache.scopeName);
    } else {
      internalScope += cache.scopeName + ' = exports;';
    }
    internalVars = _.map(internalVars, function(name) { return name + ' = exports'; });
    if (internalVars.length) {
      internalScope += 'var ' + internalVars.join(', ') + ';';
    }

    var scopeDecl = '';
    if (context.moduleCache.isTopNamespace) {
      // Insert the package declaration
      scopeDecl = 'var ' + context.moduleCache.scopeName + ';';
    }
    var templateContext = {
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scopeDecl: scopeDecl,
      scope: cache.scopeName,
      aliasVars: aliasVars.join(', '),
      internalScope: internalScope,
      callSpec: callSpec.join(', ')
    };

    resources.unshift(generator(context.configCache.moduleTemplate.start(templateContext)));
    resources.push(generator(context.configCache.moduleTemplate.end(templateContext)));
  }
  return resources;
}

module.exports = {
  mode: 'scripts',
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinScope = toObj(context.loadedLibrary.scope);
    if (mixinScope) {
      var scope = toObj(context.libraries.originalConfig.scope || {}),
          configScope = toObj(_.clone(context.config.attributes.scope || scope)),
          assigned = false;

      if (('scope' in mixinScope) && !('scope' in scope)) {
        configScope.scope = mixinScope.scope;

        assigned = true;
      }

      if (('template' in mixinScope) && !('template' in scope)) {
        configScope.template = (context.loadedLibrary.root || '') + mixinScope.template;

        assigned = true;
      }

      if (context.libraries.mergeHash('aliases', scope, mixinScope, configScope)) {
        assigned = true;
      }

      if (assigned) {
        context.config.attributes.scope = configScope;
      }
    }
    next(complete);
  },
  loadConfig: function(context, next, complete) {
    var modules = context.config.attributes.modules;

    try {
      _.each(modules, function(module) {
        var mixins = context.libraries.moduleMixins(module);

        _.each(mixins, function(mixin) {
          context.libraries.mergeHash('aliases', module, mixin.library.attributes, module);
        });
      });
    } catch (err) {
      return complete(err);
    }

    next(complete);
  },

  resourceList: function(context, next, complete) {
    next(function(err, resources) {
      if (err) {
        return complete(err);
      }

      if (getScope(context.config.attributes) === 'resource'
          && !context.resource.global
          && !context.resource.dir) {
        resources.unshift(generator('(function() {\n'));
        resources.push(generator('}).call(this);\n'));
      }
      complete(undefined, resources);
    });
  },

  module: function(context, next, complete) {
    next(function(err) {
      if (err) {
        return complete(err);
      }

      var resources = context.moduleResources,
          scope = getScope(context.config.attributes);

      if (resources.length && scope !== 'none') {
        ensureModuleTemplates(context, function(err) {
          if (err) {
            complete(err);
          } else {
            // Split up globals and non-globals
            var globals = [],
                children = [],
                moduleStart = [];
            for (var i = 0; i < resources.length; i++) {
              var resource = resources[i];
              if (resource.moduleStart) {
                moduleStart.push(resource);
              } else if (!resource.global) {
                children.push(resource);
              } else {
                if (children.length) {
                  throw new Error('Scoped files may not appear before global files.\n' + _.map(children, function(resource) {
                    return resource.stringValue || resource.sourceFile || resource.src || resource;
                  }).join(', ') + ', ' + (resource.src || resource));
                }
                globals.push(resource);
              }
            }

            children = moduleStart.concat(children);
            globals.push.apply(globals, wrapResources(children, context, complete));

            context.moduleResources = globals;
            complete();
          }
        });
      } else {
        complete();
      }
    });
  }
};

