# Plugins

## Overview
Lumbar may be extended through plugins that can inject or modify the behavior at numerous different
places in the build process.  A chaining pattern is used so each plugin can either return, modify or
replace the response from plugins that are later in the chain.


## Installation
Plugins can be used in 2 ways. The first allows passing configuration options to the plugin
which can be accessed as the first parameter if the plugin exports a function.

    module.exports = function(options) {
      return {
        // plugin methods
      };
    };

For plugins that do not require instance options, a singleton exports pattern can be used

    module.exports = {
      // plugin methods
    };

## Modes
A mode is an operating context or filter so that only plugins that are registered for a given mode are
allowed to operate - otherwise they are ignored.

The plugin can contribute new modes (or bind to existing modes) by exporting a `mode` value which can either
be a string or an array of strings.  Lumber operates with 3 defined modes by default:

* **scripts**: Compile and copy all javascript artifacts to build
* **styles**: Compile and copy all stylus and css artifacts to build
* **static**: Copy all static resources to build

Lumbar will iterate a build lifecycle for each unique platform, module and mode combination.  This
allows the plugins to filter build resources and operations to only what is meaningful for their purpose.

    module.exports = {
      mode: 'scripts' // operate within the scripts mode along with other core plugins
      mode: ['scripts', 'foo'] // scripts mode and add a new mode called 'foo'
      mode: ['foo', 'all'] // add a new 'foo' mode and also operate under all modes
      // if no mode is defined, the plugin will operate under all modes
    }

It is recommended that, unless necessary, a mode be explicitly defined.

## Plugin API

Plugins primary method of interaction with Lumbar it through the `moduleResources`, `resourceList`,
`file`, `module`, and `resource` callbacks.

Each of these callbacks are implemented as a chain,
allowing for a plugin to modify the current context object and determine if subsequent plugins are
allowed to operate, via the `next` parameter passed to the callback.

Almost all plugin methods are asynchronous and have the same signature - (context, next, complete)

* context: provides access to all data that a plugin should need.
* next: the chaining callback used to execute the remaining plugins
* complete: the completion callback

All parameters are described in more detail after the method documentation.


### moduleResources *moduleResources(context, next, complete)*

Called when generating a list of all resources that a given module will need. This method may be
used to add additional content to the module such as the router declaration for router
modules.

The expected return value is an array.  The contents of the array can be whatever is meaningful to the plugin.
Other plugin methods can be used to take action on individual entries in the returned list.

#### Resource expansion
Each value in the returned array will be expanded if that value represents a directory structure.
This is done by either using a simple string or using the `src` attribute.  In this case, every
child directory and file will automatically be added as a resource entry.

For example, if the application structure is:

    app
      - lumbar.json
      - files
      --- file1.txt
      --- sub-files
      ----- file2.txt

And a resource entry is returned with the value of

    {src: "files", foo: "bar"}

or

    "files"

The resource entries will be converted to

    [
      {dir: "files", foo: "bar"},
      {src: "files/file1.txt", srcDir: "files", foo: "bar"}
      {dir: "files/sub-files", srcDir: "files", foo: "bar"}
      {src: "files/sub-files/file2.txt", srcDir: "files", foo: "bar"}
    ]

The existence of `srcDir` to determine if the resource was auto-generated from a resource entry representing a directory.

Any additional attributes that were provided will be added to all created entries as you can
see with the `foo` attribute.

Note: the `foo` attribute would not be present if the resource
entry was just `files` - just `{src: "files", foo: "bar"}`.

#### Current behavior
Without implementing this method, the resources retrieved will be the serialized JSON value referenced by the mode key on the module.

For example, if the plugin has defined a mode called `foo` and a lumbar.json file of:

    {
      "modules": {
        "myModule": {

          "foo": [
            "abc", "def"
          ],

          "bar": [
            "ghi", "jkl"
          ]
        }
      }
    }

The resources available to the plugin would be:

    ["abc", "def"]

#### Example
If the plugin intends to use the 'bar' value (disregarding the fact that maybe the mode should be 'bar'),
a sample moduleResources would be:

    module.exports = {
      moduleResources: function(context, next, complete) {
        complete(undefined, context.module.bar);
      }
    }

It is also possible to add to the module resources when multiple plugins operate within the same mode.
Here is an example of the router plugin:

    moduleResources: function(context, next, complete) {
      next(function(err, ret) {
        if (err) {
          return complete(err);
        }

        // Generate the router if we have the info for it
        var module = context.module;
        if (module.routes) {
          ret.unshift({ routes: module.routes });
        }

        complete(undefined, ret);
      });


### resourceList *resourceList(context, next, complete)*

Allows plugins to create multiple resources from a single resource. This is called once for each
resource generated from the `moduleResources` callback.

This is useful for plugins that expand on specific resources.

The expected return value is an array of resource objects. The data associated with these objects may be anything the plugin or other plugins will operate on.

Strings will be treated as file or directory includes as will object that define a `src` field.
Resources that define a `platform` or `platforms` fields will be filtered based on the current platform being executed.

For example, the scope plugin wraps the returned resources add a execution scope.

    resourceList: function(context, next, complete) {
      next(function(err, resources) {
        if (err) {
          return complete(err);
        }

        if (context.config.attributes.scope === 'resource'
            && !context.resource.global
            && !context.resource.dir) {
          resources.unshift(generator('(function() {\n'));
          resources.push(generator('}).call(this);\n'));
        }
        complete(undefined, resources);
      });
    }


### file *file(context, next, complete)*

Allows plugins to apply file-level changes to the resources. Called once for each file
generated, just prior to resources being combined. May alter the `context.resources` field
to change the resource list.

This could be used, for example, to append JSONP callbacks to a file.


### fileName *fileName(context, next, complete)*
Allows for plugins to override the default file name used for output file creation.

The return value should be an object with the following attributes:

* **path**: the file path relative to the output directory (minus the extension)
* **extension**: the file extension

For example, the script plugin uses the platform path and module name to create the file name:

    fileName: function(context, next, complete) {
      var name = context.module ? context.module.name : context.package;
      complete(undefined, {path: name, extension: 'js'});
    }


### module *module(context, next, complete)*

Allow plugins to apply module-level changes to the resources. Called once for each module.
May alter the resource list associated with the module by altering the `context.moduleResources`
field.

This can be useful for writing resources to the output directory.  For example, this is how the
static-output plugin adds the static files to the output directory:

    module: function(context, next, complete) {
      next(function(err) {
        async.forEach(context.moduleResources, function(resource, callback) {
            var fileContext = context.clone();
            fileContext.resource = resource;
            var fileInfo = fu.loadResource(resource, function(err, data) {
              if (err || !data || !data.content) {
                return callback(err);
              }

              fileContext.outputFile(function(callback) {
                var ret = {
                  fileName: fileContext.fileName,
                  inputs: fileInfo.inputs || [ fileInfo.name ],
                  fileConfig: context.fileConfig,
                  platform: context.platform,
                  package: context.package,
                  mode: context.mode
                };

                fu.writeFile(fileContext.fileName, data.content, function(err) {
                  callback(err, ret);
                });
              },
              callback);
            });
          },
          complete);
      });
    }


### resource *resource(context, next, complete)*
Allows plugins to include content other than direct file references as well as chain resource modifications.

The current resource can be referenced using `context.resource`.

In general, the plugin should have one of the following return values:

#### Return: callback function
This function is used for asynchronous data loading. The callback has the standard `(err, data)` signature

* **err** is used to indicate an error
* **data** can be a string or buffer representing file contents or a hash with the following values:
  * **data**: the string or buffer file contents
  * **noSeparator**: truthy - adds ';;' separator for when content is known to be validated javascript or css,  Resources that always end in a complete statement should utilize this field.
  * **inputs**: a list of files that, if in watch mode, impact the generation of this file

For example, this is how the async callback function can be used to write "Hello World!"

    resource: function(context, next, complete) {
      complete(undefined, function(context, complete) {
        if ( *simple* ) {
          complete(undefined, "Hello World!");
        } else {
          var dependantFiles = [...];
          complete(undefined, {data: "Hello World!", inputs: dependantFiles}
        }
      });
    }

#### Return: An object
This object should have the following attributes:
* **src**: file path relative to the lumbar.json file
* **dest**: only applicable for static resources - the destination path relative to the platform
* **sourceFile**: file path that, if in watch mode, should be watched to trigger a rebuild.  This is not needed if src is defined.


### Method parameters
#### Context
Each plugin method is passed a `context` parameter which describes the entire state of the build
at the point of the call. Plugins are free to modify this structure as they please.

The context is cloned at various times during the lumbar lifecycle so any modifications to the context
can not be guaranteed to exist outside of the plugin method that made the modification.

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

Some utility functions are also available:

* **loadResource(resource, callback)**: Async method for retrieving file contents of a resource.
    * **resource**: the resource that is provided as `context.resource` in the resource method
    * **callback**: async callback method with the following parameters:
        * **err**: error if anything went wrong
        * **data**: buffer or what was returned if the resource provided was a function 

* **outputFile(writer, callback)**: write content to a file
    * **writer**: 
    * **callback**: 
FIXME: Kevin, can you document the parameter usage?

#### Next and Complete
Each plugin is responsible for completing the plugin chain by calling next() or compete().
Next is called to let the other plugins respond while complete is used to stop the plugin
chain and directly return a result.

The complete callback can be provided as a parameter to next if desired but not necessary.

see examples below:

    module.exports = {
      moduleResources: function(context, next, complete) {
        if ( *continue with chain* ) {
          next();

        } else if ( *modify plugin result* ) {
          // define a new complete function
          function _complete (err, data) {
            if (err) {
              // something bad happened
              complete(err, data);
            } else {
              data.push("something new");
              complete(undefined, data);
            }
          }
          // call next and override the existing complete function
          next(_complete);

        } else if ( *stop the plugin chain and return something* ) {
          var something = [...];
          complete(undefined, something);

        } else {
          // we're asyncronous - *always* make sure to call next or complete!
          next();
        }
      }
    }


### Lifecycle Pseudocode
For an understanding of how these methods work together, see the following *extremely simplified* pseudocode:

    for each defined platform
      for each mode {added by `plugin.mode`}
        for each module in platform {as determined by package}
          resources = `plugin.moduleResources`
          for each resource in resources
            if resource matches `plugin.fileFilter`
              replace/expand resource if it matches a directory
            else
              remove from the list of resources

          for each resource in resources
            replace/flatten resource with `plugin.resourceList`

          call `plugin.module`
          for each resource in resources
            resource = 'plugin.resource'


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


## FileUtils

With respect to the previous warning about EMFILE, all file access should be done using fileUtils (fileUtils.js).
This should be accessed from the context using the `fileUtil` key.  This wraps much of the functionality of `fs`
with handling of EMFILE errors.

FileUtils also caches files that are referenced to optimize build time.

### resetCache *resetCache(path)*
Clear all cached file content

* **path**: Clear all or clear for a specific path. falsy or missing input for path will clear all.

### resolvePath *resolvePath(path)*
Return a file path that, if relative, is appropriatly qualitied with the build output path based on the 'lookupPath'

* **path**: the file path

### readFileSync *readFileSync(path)*
Same as fs.readFileSync but uses `resolvePath`

* **path**: the file path

### makeRelative *makeRelative(path)*
The opposite of resolvePath.  This will remove the lookup path if the path has that as a prefix.

### stat *stat(file, callback)*
Same as fs.stat but with EMFILE handling

* **file**: the file path
* **callback**: the asynchronous callback

### readFile *readFile(file, callback)*
Same as fs.readFile cacheing.  A buffer is returned.

* **file**: the file path
* **callback**: the asynchronous callback

### readdir *readdir(dir, callback)*
same as fs.readdir with cacheing.

* **dir**: the directory path
* **callback**: the asynchronous callback

### ensureDirs *ensureDirs(pathname, callback)*
Ensure that the parent directories for the provided file path exist and create otherwise.

* **pathname**: the file path
* **callback**: the asynchronous callback

### writeFile *writeFile(file, data, callback)*
Same as fs.writefile but will also ensure directories, cache file contents, and handle EMFILE errors gracefully.

* **file**: the file path
* **data**: the file contents
* **callback**: the asynchronous callback

### loadResource *loadResource(resource, callback)*
Specifically designed to load a lumbar resource (see the lumbar API `resource` method).

* **resource**: the lumbar resource
* **callback**: the asynchronous callback
