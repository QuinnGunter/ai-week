#  CxxCEF

A wrapper framework containing all CEF C++ header files. Only those headers are made public that are strictly necessary to build a Swift app with it.
Making all headers public is currently _A Very Bad Idea_™ since Swift 5/6 easily chokes on the parts that it can't grok yet.

Note that in its current guise, CxxCEF builds as a framework that when linked against, needs to also link against `libcef_dll_wrapper` to see the actual implementations declared in the CEF headers it is wrapping.

### Name

Following Swift cxx-interop, this framework calls itself CxxCEF.

## Swift cxx-interop

https://www.swift.org/documentation/cxx-interop
