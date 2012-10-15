/**
 * Template Plugin : Includes templates associated with a given file when said file is imported.
 *
 * Config:
 *    root:
 *      templates:
 *        Key value hash mapping file names to arrays of templates to include
 *
 */
var _ = require('underscore'),
    build = require('../build');

module.exports = {
  mode: 'scripts',
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinTemplates = context.loadedMixin.templates;
    if (mixinTemplates) {
      var templates = context.mixins.originalConfig.templates || {},
          configTemplates = _.clone(context.config.attributes.templates || templates),
          assigned = false;

      var value = mixinTemplates['auto-include'];
      if (value) {
        if (!_.has(templates, 'auto-include')) {
          configTemplates['auto-include'] = _.clone(value);
          assigned = true;
        } else {
          _.defaults(configTemplates['auto-include'], value);
          assigned = true;
        }
      }

      if (assigned) {
        context.config.attributes.templates = configTemplates;
      }
    }
    next(complete);
  },

  resourceList: function(context, next, complete) {
    var mixin = context.resource.mixin,
        attr = (mixin && mixin.parent) || context.config.attributes;

    next(function(err, ret) {
      if (err || !ret) {
        return complete(err);
      }

      function pushTemplates(templates) {
        _.each(templates, function(template) {
          ret.push({
            src: context.mixins.resolvePath(template, context.resource.mixin),
            name: template,
            template: true
          });
        });
      }

      var views = attr.templates || attr.views || {},
          resource = context.resource.originalSrc || context.resource.src || context.resource,
          mixinRoot = (context.resource.mixin && context.resource.mixin.root) || '';
      if (_.isString(resource) && resource.indexOf(mixinRoot) === 0) {
        resource = resource.substring(mixinRoot.length);
      }

      var deferComplete;
      if (build.filterResource(context.resource, context)) {
        pushTemplates(views[resource]);

        if (views['auto-include']) {
          var config = context.configCache['template-auto-include'];
          if (!config) {
            config = module.exports.generateMappings(views['auto-include']);
            context.configCache['template-auto-include'] = config;
          }

          var autoIncludes = [];
          _.each(config, function(mapping) {
            var remap = module.exports.remapFile(mapping, resource);
            if (remap) {
              autoIncludes.push.apply(autoIncludes, remap);
            }
          });
          if (autoIncludes.length) {
            deferComplete = true;

            context.fileUtil.fileList(autoIncludes, function(err, autoIncludes) {
              if (err) {
                return complete(err);
              }

              autoIncludes = _.filter(autoIncludes, function(file) { return !file.enoent; });

              pushTemplates(autoIncludes);

              complete(undefined, ret);
            });
          }
        }
      }
      if (!deferComplete) {
        complete(undefined, ret);
      }
    });
  },

  generateMappings: function(autoInclude) {
    return _.map(autoInclude, function(templates, source) {
      if (!_.isArray(templates)) {
        templates = [templates];
      }
      return {regex: new RegExp(source), templates: templates};
    });
  },
  remapFile: function(mapping, resource) {
    var match;
    if (match = mapping.regex.exec(resource)) {
      return _.map(mapping.templates, function(template) {
        // Work in reverse so $10 takes priority over $1
        for (var i = match.length-1; i > 0; i--) {
          template = template.replace('$' + i, match[i]);
        }
        return template;
      });
    }
  }
};
