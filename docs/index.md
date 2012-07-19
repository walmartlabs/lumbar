# Lumbar #

Lumbar is a js-build tool that takes a _general codebase_ and list of _platforms_ to generate modular _platform specific applications_.

## Introduction ##

You can think of lumbar as a conditional compiler that targets platforms. However, it doesn’t rely on variables in your source code. There’s no #ifdef or #endifs. Rather you can include and exclude files by associating them with a platform. It uses a json file, [lumbar.json](#lumbar.json), to describe project meta-data.

*  It allows you to define multiple routers in your code.
*  It pulls in your mustache or handlebars templates.
*  It pulls in your stylus styles and generates css files.
*  It outputs standalone javascript and css files.
*  It wraps your code in the correct scope (module pattern), or not.

Lumbar works well with [Backbone](http://documentcloud.github.com/backbone/) allowing for grouping of routers, models, views, and other application code into stand alone modular javascript and css files which can be lazy loaded when the route is encountered.

Best of all, if what’s included out of the box doesn’t satisfy your needs, then you should be able to build a plugin relatively easily to support it. Lumbar was built around a [plugin architecture](#plugins) which makes it very extensible.

## High Level Overview ##

Lumbar is modeled and built around [platforms](#platforms). Platforms are defined by you, to fit your representations. When a platform flag is present on a resource, such as a javascript file, then that resource will be included for that platform’s output only.

The next big term are [module(s)](#modules). A module is a grouping of multiple resources, such as static files, stylesheets, templates, and routes, into a logical unit. Lumbar will process all the resources in each module and output them appropriately for each platform.

Following module(s) are [package(s)](#packages). When platform(s) are processed one by one, they are output based on rules found in the packages. Therefore, a package gives more flexibility on how to output files. Theoretically, you could have one package that referenced all your platform(s).

## lumbar.json ##

The main configuration file for lumbar is by default named *lumbar.json*. It is a JSON formatted document that has six main sections. They are [application](#application), [platforms](#platforms), [packages](#packages), [modules](#modules), [templates](#templates), and [styles](#styles).

Each section of lumbar.json is discussed in more detail below. There is an example lumbar.json included in the [thorax-example](https://github.com/walmartlabs/thorax-example) project.


### Platforms ###

    "platforms": [ "android", "iphone", "ipad", "web" ],

Platforms define the target environments that a particular lumbar build may target. This could range
from separate builds targeted to different browsing environments (I.e. embedded webview vs. full
browser) all the way up to builds targeted for specific business units.

Platforms are defined through the `platforms` field in the lumbar.json file. This is an array of names,
each of which produce a subdirectory in the build that contains all of the resources needed by that
platform.

### Packages ###

    "packages": {
      "web": {
        "platforms": [ "web" ],
        "combine": false
      },
      "native-hello-world": {
        "platforms": [ "android", "iphone", "ipad" ],
        "modules": [ "base", "hello-world" ],
        "combine": true
      }
    },

Where platforms specify what you are going to build for, packages define what will be in each platform,
at a macro level. This allows for creating applications for specific environments that are optimized
subsets of the larger codebase. For example a native+web application may have a package for all modules
that is utilized for web users and a package containing only a subset of modules that are combined
into a single HTTP request for users that are coming from the native implementation.

Packages are defined as objects on the `packages` object. Each package may define `platforms` and
`modules` keys which will limit the platforms and modules that are associated with that package to
a given set. If these fields are omitted then all platforms and modules are involved with the package.

The platforms list can be viewed as the platforms that the package will deliver on and the modules
list can be viewed as what resources will be included in the package.

The resources in a package may also be optionally combined into a single file via the `combine`
attribute. When combined the generated file will have the same name as the package name.

### Modules ###

    "modules": {
      "base": {
        "scripts": [
          {"src": "js/lib/zepto.js", "global": true},
          {"src": "js/lib/underscore.js", "global": true},
          {"src": "js/lib/backbone.js", "global": true},
          {"src": "js/lib/handlebars.js", "global": true},
          {"src": "js/lib/thorax.js", "global": true},
          {"src": "js/lib/script.js", "global": true},
          {"src": "js/lib/lumbar-loader.js", "platform": "web"},
          {"src": "js/lib/lumbar-loader-events.js", "platform": "web"},
          {"src": "js/lib/lumbar-loader-standard.js", "platform": "web"},
          {"src": "js/lib/lumbar-loader-backbone.js", "platform": "web"},
          "js/init.js",
          "js/router.js",
          "js/model.js",
          "js/collection.js",
          "js/view.js",
          {"src": "js/bridge.js", "platforms": ["iphone", "ipad", "android"]},
          {"src": "js/bridge-android.js", "platform": "android"},
          {"src": "js/bridge-ios.js", "platforms": ["ipad","iphone"]},
          {"module-map": true}
        ],
        "styles": [
          "styles/base.styl"
        ],
        "static": [
          {"src": "static/#{platform}/index.html", "dest": "index.html"}
        ]
      },
      "hello-world": {
        "routes": {
          "": "index",
          "hello": "index"
        },
        "scripts": [
          "js/views/hello-world",
          "js/routers/hello-world.js"
        ],
        "styles": [
          "styles/hello-world.styl"
        ]
      }
    },

Next, lets discuss the `modules` section of the *lumbar.json* file. This section lets you define logical
groupings of code, static files, stylesheets, and templates (mustache / handlebars).

A modules content is primarily defined by the `scripts`, `styles` and `static` fields which define arrays
of resources that will be included within the module. For the `scripts` and `styles` entries all resources
will be combined into a single script and single style file at build time. `static` resources will be copied
to the build target on build. Each of these fields are optional and omitting a given field will prevent
final output of that given file.

#### Resources ####

While left somewhat vague as plugins can provide their own definition of what a resource is, at the core
level it is content that will be output in the resulting module. In general a resource is a file on the
file system that may be transformed by plugins, but in some cases plugins define their own resources. The [module-map](plugins/module-map.md) plugin for example defines it's own resource type that outputs the 
collective routes and associated modules for the entire package.

File resources can be a simple string with relative path and or an object that offers more granularity for
the file. If it's a simple filename then an entry like, **init.js** would be appropriate. If additional
requirements are needed such as limiting to specific platforms or scope then an object with the `src` field
set to the relative path should be used, along with any plugin specific filter values. The
[conditional plugin](plugins/conditional.md) for example can define conditional inclusion via contstructs
like this following:

    {"src":"lumber-loader-localstorage.js", "env":"production"},
    {"src":"lumber-loader-storage.js", "env":"dev"}

The core implementation provides platform-specific filtering by specifying the `platform` or `platforms`
fields on the resource object; the singular form being a string reference to a platform and the plural
being an array of platform names. list the platforms we wanted init.js to be included with.
If we were targeting the ipad and iphone platforms our entry would look like this:

    { "src": "init.js", "platforms": ["ipad", "iphone"] }

#### Scoping ####

By default, Lumbar creates a private scope for all generated modules using the javascript module pattern.
This behavior is controlled by the [scope plugin](plugins/scope.md) and may be adjusted as necessary.

The scopes are somewhat akin to CommonJS modules, generating a `module` instance variable which acts as a
general input from plugins and the `exports` or `module.exports` variable allowing for the module to
expose functionality to the outside world.

The output of a module can be customized with a template which will receive `scope` (the current module scope) and `name` (the current application name) as variables.

To specify this in your lumbar file set:

    {
      "scope": {
        "template": "templates/module.template"
      }
    }

The template can be a handlebars template string or a path to a file that ends in `.handlebars`. This template **must** contain `{{yield}}`. The built in module template looks more or less like:

    {{{scope}}} = (function() {
      var module = {exports: {}};
      var exports = module.  exports;
      {{yield}}
      return module.exports;
    }).call(this);

#### Routes ####

Modules may optionally define backbone routes that it manages via the `routes` field. When paired with
[lumbar-loader](https://github.com/walmartlabs/lumbar-loader) the given module will be loaded on demand
when the user navigates to a route serviced by that module.

Any routes defined for the module are available to javascript code via the `module.routes` field.

### Application ###

    "application": {
      "name": "Example",
      "module": "base"
    },

The `application` section defines the module that serves as the root namespace for all other modules.
This is generally the module that provides the core framework for the application while other modules
implement specific subsections of the application functionality.

On this object, the `name` key defines the javascript name that other modules may access the module's
exports from. (Note that code running within this module must address itself using the `exports` object
directly until it has been fully initialized).

All other modules will namespace themselves based on this name. With the example above a module named
home would name itself `Example.home`.

There’s also a `module` key used to identify the module that will be loaded into the root namespace.
Without explicit loading this is the only one that can be relied on when running code in any other
modules. This is a special module that kicks off everything and presumably contains the core library
code for your application.

For example, if we listed two modules for our package, say "base" and "home" we would get two files called *home.js* and *base.js*. If we chose "base" as the value for module then our *base.js* file would declare `Example` and *home.js* would use it. If we chose "home" as the value for module then our *base.js* file would use `Example` while *home.js* would declare it.

### Templates ###

    "templates": {
      "js/views/hello-world/index.js": [
        "templates/hello-world/index.handlebars"
      ]
    },

Lumbar also support inclusion of templates via the `templates` field. Each entry in this object will be
matched against the files that are included in a particular module. When a match occurs all templates will
be included in the associated module (not more than once).

These templates may also be precompiled and have other optimizations applied to them. See the
[template plugin](plugins/template.md) documentation for additional information.

### Styles ###

    "styles": {
      "pixelDensity": {
        "android": [ 1, 1.5 ],
        "iphone": [ 1, 2 ],
        "web": [ 1, 2 ]
      },
      "includes": [
        "nib",
        "styles/include/global.styl"
      ]
    }

Finally the `styles` section controls how CSS is generated and included within the generated content. When
combined with [stylus](http://learnboost.github.com/stylus/), lumbar can allow for things like:

  * Platform conditional styles via stylus conditionals and `$platform` variables
  * Data URI inlined images
  * Pixel density targeted stylesheets

For more information see the [stylus plugin](plugins/stylus.md).

## Plugins ##

Lumbar offers many options for customization and extensibly through its Plugin Architecture.

### Core Plugins ###

The bulk of Lumbar's core functionality is implemented through core plugins, such as the [stylus](plugins/stylus.md),
[template](plugins/template.md), and [scope](plugins/scope.md) plugins. Documentation on all of the core plugins is
available [here](plugins/).

By default each of these plugins are utilized for all builds. If this is not desired then the `ignoreCorePlugins`
field may be specified on the build options. When doing this select core plugins may still be used by referencing
them name. See [Using 3rd Party Plugins](#plugins-using) below for details.

### Using 3rd Party Plugins ###

3rd party (and core plugins in `ignoreCorePlugins` mode) may be defined through

* The command line
  Plugins may be defined on the command line with the `--use` parameter. This should be the
  plugin module name (global or relative to the current working directory) or an explicit
  path the the module defining the plugin. For plugins that support option passing, the
  `--with` argument may be used immediately after the associated plugin to pass arbitrary
  JSON objects to the plugin.

* The project configuration
  Plugins may also be defined in the plugin configuration via the `plugins` field. This
  field should be an array of either name values or `{path: pluginPath}` objects. Path
  objects will load global node.js modules, explicit paths, or modules in the *node_modules*
  directory in the same directory as the configuration file.

* The Lumbar API
  Clients that are interfacing directly with the lumbar API may explicitly define plugins
  via the `Lumbar.use` API. This API registers a particular plugin with a given name that
  can be referenced with through the `options` parameter or the project configuration.

  API clients may also pass plugins through the `plugins` field on the `options` object.
  This field should be an array containing either the name, `{path: pluginPath}` object
  or the plugin instance. Path objects are loaded in the same manner as plugins defined
  in the configuration file.

### Implementing Custom Plugins ###

Read more about our architecture [here](plugins.md).

## Command Line ##

    lumbar build [--package name] [--config file] [--minimize] [--use path [--with options]] lumbarFile outputDir
            Build out the package(s).
    lumbar watch [--package name] [--config file] [--minimize] [--use path [--with options]] lumbarFile outputDir
            Start watching the files for changes and rebuild as necessary.

    --package:    represents the name of a corresponding package listed
                  under 'packages' in lumbarFile.

    --minimize:   to shrink the resultant file.

    --config:     is the name and path to the lumbar config file, if
                  not given then lumbar.json is assumed.

    --use:        path to your plugin to load

        --with:   an optional json config object to pass to your plugin.

    lumbarFile:   is the name and path to the lumbar config file, if
                  not given then lumbar.json is assumed.

    outputDir:    Required. Designates where the files will be placed.

## FAQ ##

1. Does lumbar.json have to be in the root our our application?

  No, not necessarily. The root is the current working directory that you are running _lumbar_ from.

  However, the files mentioned in lumbar.json would have to be relative to its location. So if you dropped lumbar into a sub directory, you would have to ../ all files from the root. You would also have to run lumbar from the sub directory.

  So to keep it simple, keep lumbar.json in the root.

1. Is there a bootstrap for Lumbar?

  The [thorax-example](https://github.com/walmartlabs/throax-example) project contains all of the content necessary
to setup a Lumbar (and Thorax) project. This may be freely copied and used as a basis for new projects.

1. What do I do about **EMFILE** errors?

  For larger projects watch mode may run into issues relating to too many open files depending
  on the size of the project and environment settings. If **EMFILE** errors are encountered while
  running in watch mode there are two options:

  1. Increate the maximum number of open files. On most systems this can be achieved via the `ulimit -n <value>` command.
  1. Use an outside recompile method such as an IDE or general execution.

1. Does Lumbar provide any options for long expires resources?

  The [lumbar long expires](https://github.com/walmartlabs/lumbar-long-expires) plugin allows for
  naming objects with arbitrary cache buster tokens, such as git SHA values. For example:

> ./android/7c18fda/index.html
> ./android/7c18fda/native-hello-world.css
> ./android/7c18fda/native-hello-world.js
> ./android/7c18fda/native-hello-world@1.5x.css
> ./ipad/7c18fda/index.html
> ./ipad/7c18fda/native-hello-world.css
> ./ipad/7c18fda/native-hello-world.js
> ./iphone/7c18fda/index.html
> ./iphone/7c18fda/native-hello-world.css
> ./iphone/7c18fda/native-hello-world.js
> ./iphone/7c18fda/native-hello-world@2x.css
> ./web/7c18fda/base.css
> ./web/7c18fda/base.js
> ./web/7c18fda/base@2x.css
> ./web/7c18fda/hello-world.css
> ./web/7c18fda/hello-world.js
> ./web/7c18fda/hello-world@2x.css
> ./web/7c18fda/index.html
