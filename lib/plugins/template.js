/**
 * Template Plugin : Includes templates associated with a given file when said file is imported.
 *
 * Config:
 *    root:
 *      templates:
 *        Key value hash mapping file names to arrays of templates to include
 *
 *        Special Values:
 *          auto-include: Key value pair mapping a regular expression key to a series of values
 *              to insert. Matching groups in the regular expression may be replaced using $i notation.
 *
 *              Example: 'js/views/(.*)\\.js': ['templates/$1.handlebars']
 *
 * Mixins:
 *  The template plugin will mixin auto-include mappings per item, giving priority to the local version.
 *  File mappings will be mixed in but are executed within the scope of the mixin only. I.e. foo.js
 *  in the local file will not match file mappings for foo.js in a mixin.
 *
 */
var _ = require('underscore'),
    build = require('../build'),
    path = require('path');

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

              var watchDirs = [];
              autoIncludes = _.filter(autoIncludes, function(file) {
                if (file.enoent) {
                  watchDirs.push({watch: path.dirname(file.src)});
                } else {
                  return true;
                }
              });
              autoIncludes = _.map(autoIncludes, function(include) { return include.src || include; });

              pushTemplates(autoIncludes);
              ret.push.apply(ret, watchDirs);

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

  resource: function(context, next, complete) {
    var resource = context.resource;

    if (resource.watch) {
      function generator(buildContext, callback) {
        callback(undefined, {data: '', noSeparator: true});
      }
      generator.sourceFile = resource.watch;
      complete(undefined, generator);
    } else {
      next(complete);
    }
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
        var i = match.length;
        while (i--) {
          template = template.replace('$' + i, match[i]);
        }
        return template;
      });
    }
  }
};
