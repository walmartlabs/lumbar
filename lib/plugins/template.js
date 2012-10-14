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

  resourceList: function(context, next, complete) {
    var mixin = context.resource.mixin,
        attr = (mixin && mixin.parent) || context.config.attributes;

    next(function(err, ret) {
      if (err || !ret) {
        return complete(err);
      }

      var views = attr.templates || attr.views || {},
          resource = context.resource.originalSrc || context.resource.src || context.resource,
          mixinRoot = (context.resource.mixin && context.resource.mixin.root) || '';
      if (_.isString(resource) && resource.indexOf(mixinRoot) === 0) {
        resource = resource.substring(mixinRoot.length);
      }

      if (views[resource] && build.filterResource(context.resource, context)) {
        views[resource].forEach(function(template) {
          ret.push({ src: context.mixins.resolvePath(template, context.resource.mixin), name: template, template: true });
        });
      }
      complete(undefined, ret);
    });
  }
};
