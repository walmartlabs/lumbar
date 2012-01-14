# Lumbar #

Lumbar is a js-build tool that takes a _general application_ and list of _platforms_ to generate modular _platform specific applications_.

## Introduction ##

You can think of lumbar as a conditional compiler that targets platforms. However, it doesn’t rely on variables in your source code. There’s no #ifdef or #endifs. Rather you can include and exclude files by associating them with a platform. It uses a json file, [_lumbar.json_](#lumbar.json), to describe project meta-data.

*  It allows you to define multiple routers in your code.
*  It pulls in your mustache or handlebars templates.
*  It pulls in your stylus styles and generates css files.
*  It outputs stand alone javascript and css files.
*  It wraps your code in the correct scope (module pattern), or not.

Lumbar works well with Backbone which can group routers, models, views and other application code into stand alone modular javascript and css files which can be lazy loaded when the route is encountered.

Best of all, if what’s included out of the box doesn’t satisfy your needs, then you should be able to build a plugin relatively easily to support it. Lumbar was built around a Plugin architecture which makes it very extensible.

## High Level Overview ##

Lumbar is really modeled and built around [_platform(s)_](#platforms). Platform(s) are defined by you, to fit your representations. When a platform flag is present on a resource, such as a javascript file, then that resource will be included for that platform’s output only.

The next big term are [_module(s)_](#modules). A module is a grouping of multiple resources, such as static files, stylesheets, templates, and routes, into a logical unit. Lumbar will process all the resources in each module and output them appropriately for each platform.

Following module(s) are [_package(s)_](#packages). When platform(s) are processed one by one, they are output based on rules found in the packages. Therefore, a package gives more flexibility on how to output files. Theoretically, you could have one package that referenced all your platform(s).

### lumbar.json ###

The main configuration file for lumbar is by default named lumbar.json. It is a JSON formatted document that has six (6) main sections. They are [_application_](#application), [_platforms_](#platforms), [_packages_](#packages), [_modules_](#modules), [_templates_](#templates), and [_styles_](#styles).

Each section of lumbar.json is discussed in more detail below. There is a lumbar.json included in the example directory.

#### Application ####

First lets discuss the application section. The “name” key is used to give your resultant application a global variable to hang everything from. If I were to use the name “Example” then the first line in my resultant javascript file would be var Example;

There’s also a “module” key used to identify the module that will be loaded into the root namespace. It is the only one that can be relied on when running code in any other modules. This is a special module that kicks off everything and presumably contains the core library code for your application.

For example, if we listed two platforms for our package, say "base" and "home" we would get two files called home.js and base.js. If we chose “base” as the value for module then our base.js file would declare Example and home.js would use it. If we chose “home” as the value for module then our base.js file would use Example while home.js would declare it.

#### Platforms ####

Second, lets discuss the platforms section. Each platform is given as a name in an array. Remember that each platform will have a corresponding directory. If the directory already exists then it won’t be created, otherwise it will. To keep it simple, our example has pre-loaded resources in these directories already. In each platform directory you'll find an index.html. They're not required to be there, our static resource plugin is used to copy artifacts into the platform directories.

So say you have four (4) platforms listed like “android”, “ipad”, “iphone”, and “web”. Then when you run lumbar, you’re going to have four (4) corresponding sub-directories under your output dir with the same names.

Platforms are what drive the next two sections, “packages” and “modules”. A “package” defines a one-to-many relationship with “platforms” and “modules”.

#### Modules ####

Next, lets discuss the modules section of the lumbar.json file. This sections lets you define logical groupings of code, static files, stylesheets, and templates (mustache / handlebars).

Each module can have zero or many scripts listed under the scripts key. In a similar manner, they can have zero or many styles listed under the styles key.

An entry in the scripts or styles array is either a plain filename with relative path and or an object that offers more granularity for the file. If its a filename then an entry like, “init.js” would be appropriate. If we wanted to introduce the init.js file only under specific conditions then we would list it as an object and give init.js the value to the src attribute. In that same object we would add a platform(s) attribute and list the platforms we wanted init.js to be included with. If we were targeting the ipad and iphone platforms our entry would look like this: { “src”: “init.js”, “platforms”: “ipad”, “iphone” }.

Now as we are building our modules and pulling in the javascript files, each one is checked to see if its assocaited with an entry in the _templates_ section. The association is made if the name of the javascript src file, including path, is is a match to a key in the _templates_ seciton. If there is an association, then we also add those templates to our module. As an example, if we added another entry as “header.js” and also happened to have “header.js” listed underneath the templates section, then we would pull in the templates given there.

#### Packages ####

Third, lets discuss the packages section. This section lets you define how you would like the “platforms” organized. Each package is associated with a key. The purpose of this key is discussed below.

Each package defines the platforms and modules its associated with. The packages are a one-to-many relationship with a platform. Thus the package is said to target these platforms. Or rather, what platforms does this package deliver on? If no platforms are listed then all the platforms are targeted.

Each package defines a one-to-many relationship with modules. [Modules] are discussed next, but suffice it to say that modules are groupings of code, stylesheets and templates. This relationship establishes what modules the package includes. If no modules are listed than all the modules are targeted.

The last attribute is combine. Setting combine to true results in one file being output with the name given for the package. This one file will include all the output from the modules given. This one file will be output to the directories given in platforms.

For example, if we listed “foo” for the platform, and “bar”, “baz” for the modules under the “default” package, then we would combine the bar and baz modules into a file named default.js under the foo directory.

[TODO: Discuss reason for having multiple packages in greater detail.]

#### Templates ####

Next to last, is the templates section which lists out all the views for a given key. Views are a mixture of html and logic using either handlebars or mustache. When templates are found they are automatically compiled and included into the module requesting it.

[TODO Needs work. Mention keywords like 'precompile'].

#### Styles ####

Finally the templates sections lists out all the views for a given key. Styles are a mixture of css and and logic using Stylus.

[TODO Discuss further]

#### Summary ####

We just discussed the six (6) major sections of the lumbar.json configuration file. The [_application_](#application), [_platforms_](#platforms), [_packages_](#packages), [_modules_](#modules), [_templates_](#templates), and [_styles_](#styles) sections are very important instruction sets for lumbar to work properly.

### Scoping ###

Lumbar creates a private scope for all generated modules using the javascript module
pattern.

### Routes ###

Lumbar automatically takes the routes found in module(s) and processes them. Routes are defined in each module.

### Dependencies ###

[Todo]

### Directory structure ###

The following diagram shows an example directory structure. This is where your actual development code and live trunk live. You will probably have three (3) distinct folders for your markup (templates), css (styles), and javascript (js). We tend to break our js folder down into backbone centric terms as you can see from the diagram below.

What’s great about this approach is that you don’t have to maintain two (2), three (3), four (4), or more branches of your app for different platforms. Lumbar will handle outputting the platform specific versions for you.


### Command Line ###

    lumbar help
            Prints out the long help message.

    lumbar build [--package name] [--config file] [--minimize] lumbarFile outputDir
            Build out the package(s).

    lumbar watch [--package name]
            Start watching the files for changes and rebuild as necessary.


    * package    - represents the name of a corresponding package listed under 'packages' in lumbarFile. If not given, all packages are built.
    * minimize   - flag whether we should shrink the resultant file(s).
    * lumbarFile - is the name and path to the lumbar config file, if not given then lumbar.json is assumed.
    * outputDir  - _Required_-designates where the files will be placed.

### Plugins ###

Lumbar offers tons of customization and extensibly through its Plugin Architecture.

Read more about our architecture [here](plugins.md).

#### Module extensibility through Plugins ####

[TODO Move all this into their own plugin doc files]

[TODO Some code doesn't like when its loaded within a scope object. might be good to have an example and explain why.]

The _global_ flag controls the scoping rules that are applied by the scope plugin. For example, some code doesn’t like when its loaded within a scope object. This is particularly true usually for browser focused 3rd party libraries. With this flag set, it will force the library to be loaded as normal.

The package-config plugin lets you set an arbitrary config object from the command line. This lets you create dev and production config at build time. 

The module-map plugin outputs the data necessary to load modules in response to routing events. Basically this creates a list of css and javascript files to load when a backbone route event occurs and the supporting module has not yet been loaded.

[Discuss Plugins]


## FAQ ##

1. Do we have a visual tool available for editing lumbar.json? No
1. Is there a lint checker for lumbar.json? No
1. Is there a script to automatically build up lumbar.json? No
1. Does lumbar.json have to be in the root our our application?

No, not necessarily. The root is the current working directory that you are running _lumbar_ from.

However, the files mentioned in lumbar.json would have to be relative to its location. So if you dropped lumbar into a sub directory, you would have to ../ all files from the root. You would also have to run lumbar from the sub directory.

So to keep it simple, keep lumbar.json in the root.

