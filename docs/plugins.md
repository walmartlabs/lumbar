# Plugins

Lumbar may be extended through plugins that can inject or modify the behavior at numerous different
places in the build process.

## Plugin Points

## Context

Each plugin method is passed a `context` parameter which describes the entire state of the build
at the point of the call. Plugins are free to modify this structure as they please.

 * **package** : The name of the package currently being operated on.
 * **platform** : The name of the platform currently being operated on.
 * **module** : The module currently being operated on, as defined in the JSON file.
 * **resource** : The resource currently being operated on, if applicable. Definition depends on plugins.
 * **moduleResources** : All resources associated with the current module, if available.
 * **resources** : All resources associated with a file. For non-combined cases this is identical to `moduleResources`
 * **platformPath** : Path to the output path for the current platform
 * **options** : Options passed to the lumbar initialize call
 * **config** : Current lumbar configuration. See _config.js_
 * **combined** : Truthy if the output content is intended to be combined when possible

### Caches

Each context object defines a variety of caches that are reset at specific points through the
build process. This allows plugins to cache any relevant data for specific timeframes. Note
that these objects are shared across all plugins so proper naming conventions should be followed
to prevent conflicts.

 * **configCache** : Reset when the configuration file changes
 * **fileCache** : Reset when the current file processing completes
 * **moduleCache** : Reset when the current module processing completes

## Warnings

