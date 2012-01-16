# Scope Plugin #

## Introduction ##

The scope plugin implements a CommonJS-like module system. This allows for simple sharing of
code and state across different resources.

## Usage ##

The scope plugin operates by default in module-level scope mode. This behavior can be changed
through the `scope` field on the lumbar configuration object.

### Configuration ###

The `scope` field may either a string specifying the scoping mode or an object. If an object,
it may have the following fields:

  * `mode`: One of
    * **module** : Specifies scoping on the combined module level. All files within the same
        module will execute in the same scope and share the same `module` instance. This is
        the default behavior.
    * **resource** : Each individual resource executes within a single scope. This mode creates
        additional overhead due to multiple scoping objects but prevents variable name conflicts
        between files in the same module. All resources within the same module share the same
        `module` instance, unless overridden in the resource's local scope.
    * **none** : All resources are executed in the global scope. No `module` instance is created.
        This effectively disables the scope plugin. Note that other plugins may fail or require
        additional configuration if operating in this mode.

Additionally the scope plugin allows for specific resources to be loaded in the global scope by
specifying `"global": true` on the specific resource. This is useful for 3rd party libraries such
as zepto and backbone that expect to be loaded in the global scope. Global scoped files must
appear at the beginning of a module.

## Example ##

