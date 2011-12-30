# Lumbar #

Lumbar is a js-build tool that takes a _general application_ and list of _platforms_ to generate modular _platform specific applications_.

## Watch File Limit

For larger projects watch mode may run into issues relating to too many open files depending
on the size of the project and environment settings. If **EMFILE** errors are encountered while
running in watch mode there are two options:

  1. Increate the maximum number of open files. On most systems this can be achieved
      via the `ulimit -n <value>` command.
  1. Use an outside recompile method such as an IDE or general execution.

Issue #18 has been filed to track the creation of a connect middleware implementation that
that provides another workaround for this issue.
