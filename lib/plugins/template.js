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
    path = require('path'),
    resources = require('../util/resources');

module.exports = {
  mode: 'scripts',
  priority: 50,

  loadMixin: function(context, next, complete) {
    var mixinTemplates = context.loadedLibrary.templates;
    if (mixinTemplates) {
      var templates = context.libraries.originalConfig.templates || {},
          configTemplates = _.clone(context.config.attributes.templates || templates),
          assigned = false;

      if (context.libraries.mergeHash('auto-include', templates, mixinTemplates, configTemplates)) {
        assigned = true;
      }

      if (assigned) {
        context.config.attributes.templates = configTemplates;
      }
    }
    next(complete);
  },

  resourceList: function(context, next, complete) {
    var library = context.resource.library,
        attr = (library && library.parent || library) || context.config.attributes;

    next(function(err, ret) {
      if (err || !ret) {
        return complete(err);
      }

      function pushTemplates(templates) {
        _.each(templates, function(template) {
          var src = template.src;
          if (!src || (template.library && !template.library.attributes)) {
            var templateLibrary = template.library ? context.libraries.getConfig(template.library) : library;
            src = mapSrc(template.src || template, templateLibrary, context);
          }

          ret.unshift({
            src: src,
            name: template.name || template.src || template,
            library: templateLibrary || template.library || library,
            template: true
          });
        });
      }

      var views = attr.templates || {},
          globalConfig = context.config.attributes.templates || {},
          resource = context.resource.originalSrc || context.resource.src || context.resource,
          mixinRoot = (context.resource.library && context.resource.library.root) || '';
      if (_.isString(resource) && resource.indexOf(mixinRoot) === 0) {
        resource = resource.substring(mixinRoot.length);
      }

      var deferComplete;
      if (build.filterResource(context.resource, context)) {
        pushTemplates(views[resource]);

        if (globalConfig['auto-include']) {
          var config = context.configCache['template-auto-include'];
          if (!config) {
            config = module.exports.generateMappings(globalConfig['auto-include']);
            context.configCache['template-auto-include'] = config;
          }

          var autoIncludes = module.exports.autoIncludes(resource, config, context);
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

              if (autoIncludes.length) {
                context.event.emit('log', 'Autoincludes for "' + resource + '" ' + JSON.stringify(_.pluck(autoIncludes, 'src'), undefined, 2));
              }

              pushTemplates(autoIncludes);
              ret.unshift.apply(ret, watchDirs);

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
        // Ensure that the directory actually exists
        var path = context.fileUtil.resolvePath(resource.watch);
        context.fileUtil.stat(path, function(err, stat) {
          // Ignore any errors here
          var inputs = [];
          if (stat && stat.isDirectory()) {
            inputs.push(path);
          }
          callback(undefined, {inputs: inputs, data: '', noSeparator: true});
        });
      }
      complete(undefined, generator);
    } else {
      next(complete);
    }
  },

  autoIncludes: function(resource, config, context) {
    var autoIncludes = [];
    _.each(config, function(mapping) {
      var remap = module.exports.remapFile(mapping, resource, context);
      if (remap) {
        autoIncludes.push.apply(autoIncludes, remap);
      }
    });
    return autoIncludes;
  },
  generateMappings: function(autoInclude) {
    return _.map(autoInclude, function(templates, source) {
      if (!_.isArray(templates)) {
        templates = [templates];
      }
      return {regex: new RegExp(source), templates: templates};
    });
  },
  remapFile: function(mapping, resource, context) {
    /*jshint boss:true */
    var match;
    if (match = mapping.regex.exec(resource)) {
      return _.map(mapping.templates, function(template) {
        // Work in reverse so $10 takes priority over $1
        var i = match.length;
        while (i--) {
          template = template.replace('$' + i, match[i]);
        }
        var resource = context.libraries.mapFile(template, template.library || context.resource.library);
        resource = resources.cast(resource);
        resource.name = template;
        return resource;
      });
    }
  }
};

function mapSrc(template, library, context) {
  var resource = context.libraries.mapFile(template, library);
  return _.isString(resource.src) ? resource.src : resource;
}
