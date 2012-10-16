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
 *
 *      root.scope may be set to the scope values as a shorthand.
 *
 * Mixins:
 *  All fields may be mixed in. Template file references are converted to mixin space.
 */
var _ = require('underscore'),
    handlebars = require('handlebars'),
    fu = require('../fileUtil');

function getScope(attr) {
  return (attr.scope && attr.scope.scope) || attr.scope;
}
function toObj(obj) {
  return _.isString(obj) ? {scope: obj} : obj;
}

function generator(string) {
  var ret = function(context, callback) { callback(undefined, {data: string, noSeparator: true}); };
  ret.stringValue = string;
  ret.sourceFile = undefined;
  return ret;
}

const DEFAULT_MODULE_START_TEMPLATE = '{{{scope}}} = (function() {\nvar module = {exports: {}};\nvar exports = module.exports;\n';
const DEFAULT_MODULE_END_TEMPLATE = 'return module.exports;\n}).call(this);\n';

var scopeTemplateDelimiter = /\{?\{\{yield\}\}\}?/;

function ensureModuleTemplates(context, complete) {
  function setTemplates(start, end) {
    context.configCache.moduleStartTemplate = start;
    context.configCache.moduleEndTemplate = end;
  }

  if (!context.configCache.moduleStartTemplate) {
    var template = context.config.attributes.scope && context.config.attributes.scope.template;
    if (template) {
      // Mixin support for template loading?
      context.fileUtil.loadTemplate(template, scopeTemplateDelimiter, function(err, templates) {
        if (err) {
          complete(err);
        } else {
          setTemplates(templates[0], templates[1]);
          complete();
        }
      });
    } else {
      setTemplates(handlebars.compile(DEFAULT_MODULE_START_TEMPLATE), handlebars.compile(DEFAULT_MODULE_END_TEMPLATE));
      complete();
    }
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
    resources.unshift(generator(context.configCache.moduleStartTemplate({
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scope: cache.scopeName
    })));
    resources.push(generator(context.configCache.moduleEndTemplate({
      isTopNamespace: cache.isTopNamespace,
      name: cache.appName,
      scope: cache.scopeName
    })));
  }
  return resources;
}

module.exports = {
  mode: 'scripts',
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinScope = toObj(context.loadedMixin.scope);
    if (mixinScope) {
      var scope = toObj(context.mixins.originalConfig.scope || {}),
          configScope = toObj(_.clone(context.config.attributes.scope || scope)),
          assigned = false;

      if (('scope' in mixinScope) && !('scope' in scope)) {
        configScope.scope = mixinScope.scope;

        assigned = true;
      }

      if (('template' in mixinScope) && !('template' in scope)) {
        configScope.template = (context.loadedMixin.root || '') + mixinScope.template;

        assigned = true;
      }

      if (assigned) {
        context.config.attributes.scope = configScope;
      }
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
                  throw new Error('Scoped files may not appear before global files.');
                }
                globals.push(resource);
              }
            }

            children = moduleStart.concat(children);
            globals.push.apply(globals, wrapResources(children, context, complete));

            // Insert the package declaration
            if (context.moduleCache.isTopNamespace) {
              globals.unshift(generator('var ' + context.moduleCache.scopeName + ';\n'));
            }

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

