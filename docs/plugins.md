# Plugins

Lumbar may be extended through plugins that can inject or modify the behavior at numerous different
places in the build process.

## Plugin Points

Plugins primary method of interaction with Lumbar it through the `moduleResources`, `resourceList`,
`file`, `module`, and `resource` callbacks. Each of these callbacks are implemented as a chain,
allowing for a plugin to modify the current context object and determine if subsequent plugins are
allowed to operate, via the `next` parameter passed to the callback.

### moduleResources(context, next)

Called when generating a list of all resources that a given module will need. This method may be
used to add additional content to the module one time such as the router declaration for router
modules.

This callback is called when generating the `moduleResources` list and has access to the
`module`, `platformPath`, `options`, `config`, `configCache`, `fileCache`, and `moduleCache`
context fields. It should return a list of resource objects.

Example from the router plugin:

``` javascript 
moduleResources: function(context, next) {
    var ret = next();

    // Generate the router if we have the info for it
    var module = context.module;
    if (module.routes) {
        ret.unshift({ routes: module.routes });
    }

    return ret;
}
```

### resourceList(context, next)

Allows plugins to create multiple resources from a single resource. Called once for each
resource generated from the `moduleResources` callback. Returns an array of resources.
Resources may be any object the plugin wishes. Strings will be treated as file or directory
includes as will object that define a `src` field. Resources that define a `platform` or
`platforms` fields will be filtered based on the current platform settings.

Example from the scope plugin:

``` javascript 
resourceList: function(context, next) {
    var resources = next();
    if (context.config.attributes.scope === 'resource' && 
        !context.resource.global) {

        resources.unshift(generator('(function() {\n'));
        resources.push(generator('}).call(this);\n'));
    }
    return resources;
}
```

### file(context, next)

Allows plugins to apply file-level changes to the resources. Called once for each file
generated, just prior to resources being combined. May alter the `context.resources` field
to change the resource list.

### module(context, next)

Allow plugins to apply module-level changes to the resources. Called once for each module.
May alter the resource list associated with the module by altering the `context.moduleResources`
field.

### resource(context, msg)

Allows plugins to include content other than direct file references. Called once per each resource
to be included in the output. Should return a function accepting one `callback(err, data)` parameter.
On execution the function should take any steps needed to generate the resource's content and call
the callback on completion or error.

`data` may be a `String`, `Buffer`, or object defining a `data` field whose value is a `String` or
`Buffer`.

If the content of the resource is directly associated with a source file or files the function may
define a `sourceFile` field which will be watched in watch mode and trigger a rebuild if it changed.
If multiple files are needed or are not known until execution time, the returned `data` object may
define an `inputs` field containing an array of the files that should be watched.

The `data` object may also specify a `noSeparator` field, which if truthy will prevent the combiner
logic from emitting a separator after this content. Resources that always end in a complete statement
should utilize this field.

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

As most Lumbar projects are dealing with a large number of files it is quite susceptible to
**EMFILE** exceptions under OSX. The current recovery method for this is to utilize async
methods and retry methods that fail due to this error. A variety of file methods that are
protected from this case have been made available on the `lumbar.fileUtil` object. It
is recommended that these methods are used whenever possible while dealing with files throughout
the system.
