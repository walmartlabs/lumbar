var _ = require('underscore'),
    bower = require('bower'),
    path = require('path'),
      normalize = path.normalize;

/**
 * Standalone helpers for resource lifetime management and mapping.
 */
var resources = module.exports = {
  cast: function(resource) {
    if (_.isString(resource)) {
      return {src: resource};
    } else {
      return resource;
    }
  },

  source: function(resource) {
    return resource.src || resource.dir || resource;
  },

  map: function(resource, library, config) {
    var bowerPath;
    if (_.isString(resource.bower)) {
      bowerPath = path.join(bower.config.directory, resource.bower);
    }

    // If no mixin was defined on either side then return the identity
    if (!library && !bowerPath) {
      return resource;
    }

    resource = resources.cast(_.clone(resource));

    var src = resources.source(resource);

    // Include any config information such as env or platform that may have been
    // specified on the library settings
    _.extend(resource, _.omit(config, 'overrideLibrary'));

    if (_.isString(src)) {
      var override = library && library.overrides && library.overrides[src],
          librarySrc = bowerPath || library.root || '';
      librarySrc = librarySrc ? path.join(librarySrc, src) : src;

      if (override) {
        resource.originalSrc = librarySrc;
        librarySrc = _.isString(override) ? override : src;

        if (library.overrideLibrary) {
          librarySrc = path.join(library.overrideLibrary.root || '', librarySrc);
        }
      } else if (override === false) {
        return;
      }

      if (resource.src) {
        resource.src = librarySrc;
      } else if (resource.dir) {
        resource.dir = librarySrc;
      }
    }

    resource.library = library;
    return resource;
  },

  relativePath: function(src, library) {
    if (src.indexOf('./') === 0) {
      src = src.substring(2);
    }
    src = normalize(src);

    if (!library) {
      return src;
    }

    // Attempt to strip either the root of the base or overriding library as we don't know
    // which we might be
    var mixinRoot = library.root || '';
    if (src.indexOf(mixinRoot) === 0) {
      src = src.substring(mixinRoot.length);
    } else if (library.overrideLibrary) {
      mixinRoot = library.overrideLibrary.root || '';

      if (src.indexOf(mixinRoot) === 0) {
        src = src.substring(mixinRoot.length);
      }
    }
    return src;
  },

  pathToLibrary: function(src, library) {
    src = resources.relativePath(src, library);

    var overrides = library && library.overrides;
    if (overrides) {
      overrides = _.invert(overrides);

      // Warn not supporting directories at this point in time. Matches must be 1 to 1
      return overrides[src] || src;
    }

    return src;
  }
};
