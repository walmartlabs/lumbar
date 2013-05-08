# Libraries

Libraries provide abstractions that allow lumbar components to be bundled into sharable, reusable components. The are able to extend almost any aspect of the lumbar configuration, from setting global config values up to defining entire reusable modules.

## Creating Libraries

Libraries consist of a *lumbar.json* configuration file with at minimum a `name` field which uniquely identifies the library within the current project. This is the human readable method of referencing this library in case of conflicts. (See [Handling Conficts](#handling-conflicts) below for more information on conflicts.

    {
      "name": "my-library"
    }

With the base in we now want to add functionality to this. Generally this is going to be a combination of global settings for the project and mixins that can be loaded at specific points in the project.

### Mixins

A library's mixins are generally implement their primary functionality. They allow for the addition of arbitrary behaviors to a specific module. At the most basic level a mixin can apply any attribute value to a module including additional file references.

For example a mixin that may be used to bootstrap a project:

    "mixins": {
      "core-lib": {
        "scripts": [
          {"src": "js/lib/backbone.queryparams.js", "global": true},
          {"src": "js/lib/backbone.historytracker.js", "global": true},
          {"src": "js/lib/fastclick.js", "global": true},

          {"src": "lumbar-loader-backbone.js", "library": "lumbar-loader", "platform": "web"},

          {"package-config": true},
          {"stylus-config": true},

          {"src": "js/init.js"}
        ],
        "styles": [
          "styles/reset.styl",
          "styles/normalize.styl",
          "styles/tap-highlight.styl"
        ]
      }
    }

In general you would define the contents of a mixin in the same manner as the contents of a normal module, with a few alterations to the behaviors.

All mixin source files are output first in the resulting module. Exception for script files which are marked as global. In that case the files will be output as follows:

> [mixin globals, module globals, mixin locals, module locals]

All file references in the mixin are relative to the library unless explicitly listed in the reference. In the example above, *js/init.js* refers to *libraryDir/js/init.js* at build time. Effectively mixins have their own form of a sandboxed file system. Clients may override portions of this behavior, which is discussed [below](#overriding-files).


### Modules

Libraries may also define entire modules, useful for utility modules such as the generic loader behavior:

    "modules": {
      "loader": {
        "topLevelName": "Loader",
        "mixins": [
          {"name": "lumbar-loader", "env": "dev"},
          {"name": "lumbar-localstorage-loader", "env": "production"}
        ],
        "scripts": [
          "js/load.js"
        ]
      }
    }

Note that any modules defined in a library are automatically accessible as mixins. As a consequence of this, mixins and modules may not have the same name in a given library.

### Global settings

Libraries are able to provide default values for settings that otherwise would be duplicated across projects. For example the Thorax library [defines](https://github.com/walmartlabs/thorax/blob/master/lumbar.json#L73) the template handler that it expects for all projects that import the library.

    "templates": {
      "template": "Handlebars.templates['{{{without-extension name}}}'] = {{handlebarsCall}}({{{data}}});"
    }

The default behavior for global settings is to extend the current project exactly as if the `_.extend` operation occurred. Individual plugins will modify this behavior based on what makes sense. The majority of these cases will be to augment rather than replace behavior, as is the case with the root `template` setting in the example above. Please consult the documentation for each plugin to see the expected behavior for global setting changes.

### Examples

 - [Lumbar Loader](https://github.com/walmartlabs/lumbar-loader/blob/master/lumbar.json)
 - [Thorax](https://github.com/walmartlabs/thorax/blob/master/lumbar.json)
 - [Phoenix Build](https://github.com/walmartlabs/phoenix-build/blob/master/mixin/lumbar.json)

## Using Libraries

Once [defined](#creating-libraries) using a library is as simple as referencing it's path to load it.

    "libraries": [
      "components/lumbar-loader"
    ]

This will load the global settings defined in the config and make any mixins defined in the library available for use. Note that the default library file name is *lumbar.json*. Libraries that use another file name will need to reference that file explicitly rather than the containing directory.

### Mixins

Once the library is loaded, it's mixins may be used with in specific modules. This is done by creating a `mixins` array within the module and referencing the name of the library's mixin or module.

    "modules": {
      "loader": {
        "mixins": [
          {"name": "lumbar-loader", "env": "dev"},
          "core-lib"
        ]
      }
    }

This may be done via simple strings or for overrides and conditional behavior, via a JSON object whose name value is set to the mixin name.

When a mixin is included with additional properties such as the `lumbar-loader` include above, these properties will be applied to all resources defined in the mixin. For this allows for the project to override or define their own conditional behavior as necessary.

#### Overriding Files

If a mixin includes a file that is not desired, it's possible to replace the file by specifying the overrides key when including the mixin.

    "mixins": [
      {
        "name": "banner-carousel",
        "overrides": {
          "static/images/page-dot.png": "images/page-dot.png"
        }
      }
    }

This will replace any file references to *static/images/page-dot.png* in the mixin with *image/page-dot.png* in the project's file structure. It's also possible to use the value `true` to specify the exact same file name, just in the local file space and `false` to prevent the file from being output.

## Additional information

### Handling Conflicts

If two libraries define a mixin or module of the same name, lumbar will not be able to resolve them by name alone. Under situations such as this mixin's must be included using the fully qualified form:

    "mixins": [
      { "name": "banner-carousel", "library": "shared" }
    }

Outside of the additional parameter, this does not impact the include operation.

### Overriding Modules

It's possible to override modules that are defined in a library by creating a module in the root project lumbar config file and then importing the library module as a mixin.

    "modules": {
      "base": {
        "mixins": [ {"name": "base", "library": "shared"} ]
        "scripts": [ "additiona-file.js" ]
      }
    }

Alternatively modules can be removed from output by assigning `false` to that particular module's name in the root config.

### File Management

Lumbar purposefully avoids tackling the hows of getting the shared library files into a location accessible to the project. There are too many different needs for this and many existing ways for doing package management.

There are many ways that this can be done, each with their own pros and cons. Some investigated by the WalmartLabs team included:

1. Git Submodules
1. Git Subtrees
1. npm
1. bower

