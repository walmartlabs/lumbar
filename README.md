# Lumbar

Supporting your backbone since 2011, Lumbar is a module build system that allows for generation of platform specific javascript modules.

## Watch File Limit

For larger projects watch mode may run into issues relating to too many open files depending
on the size of the project and environment settings. If **EMFILE** errors are encountered while
running in watch mode there are two options:

  1. Increate the maximum number of open files. On most systems this can be achieved
      via the `ulimit -n <value>` command.
  1. Use an outside recompile method such as an IDE or general execution.

Issue #18 has been filed to track the creation of a connect middleware implementation that
that provides another workaround for this issue.
