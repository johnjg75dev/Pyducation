// -------------------------------------------------------------
// Data: Dunders (selected, common, real-world)
// -------------------------------------------------------------
const DUNDERS = [
    // lifecycle / representation
    ["__new__", "dunder", "class", "Create instance (before __init__), used for immutables & metaprogramming."],
    ["__init__", "dunder", "instance", "Initialize instance after creation."],
    ["__del__", "dunder", "instance", "Finalizer (GC-time). Avoid for critical resource cleanup."],
    ["__repr__", "dunder", "instance", "Dev-facing representation (REPL/debug/logs)."],
    ["__str__", "dunder", "instance", "Human-facing string (print, f-strings)."],
    ["__format__", "dunder", "instance", "Custom format() / f-string formatting."],
    ["__bytes__", "dunder", "instance", "bytes(obj) conversion."],
    ["__sizeof__", "dunder", "instance", "sys.getsizeof hook."],
    ["__call__", "dunder", "instance", "Make an instance callable: obj(...)."],

    // attribute access / descriptors
    ["__getattribute__", "dunder", "instance", "Runs on every attribute access. Very powerful; easy to infinite-loop."],
    ["__getattr__", "dunder", "instance", "Runs only if normal lookup fails (dynamic proxies)."],
    ["__setattr__", "dunder", "instance", "Runs on attribute set. Use object.__setattr__ to avoid recursion."],
    ["__delattr__", "dunder", "instance", "Runs on attribute delete."],
    ["__dir__", "dunder", "instance/class", "Customize dir(obj)."],
    ["__get__", "dunder", "descriptor", "Descriptor protocol: access hook (powers properties, methods)."],
    ["__set__", "dunder", "descriptor", "Descriptor protocol: assignment hook."],
    ["__delete__", "dunder", "descriptor", "Descriptor protocol: deletion hook."],
    ["__set_name__", "dunder", "descriptor", "Called at class creation with owner + attribute name."],

    // containers / iteration
    ["__len__", "dunder", "container", "len(x). Also truthiness fallback if __bool__ missing."],
    ["__bool__", "dunder", "any", "bool(x) / if x: ..."],
    ["__contains__", "dunder", "container", "x in container"],
    ["__iter__", "dunder", "iterable", "iter(x) / for loops"],
    ["__next__", "dunder", "iterator", "next(it) / for loops"],
    ["__getitem__", "dunder", "seq/map", "x[i], x[slice], x[key]"],
    ["__setitem__", "dunder", "mutable seq/map", "x[i] = v"],
    ["__delitem__", "dunder", "mutable seq/map", "del x[i]"],
    ["__reversed__", "dunder", "sequence", "reversed(x)"],
    ["__missing__", "dunder", "dict subclass", "dict missing-key hook"],
    ["__length_hint__", "dunder", "iterator", "optional size hint for performance"],

    // operators (selected "most encountered")
    ["__add__", "dunder", "numeric", "x + y"],
    ["__sub__", "dunder", "numeric", "x - y"],
    ["__mul__", "dunder", "numeric", "x * y"],
    ["__matmul__", "dunder", "numeric", "x @ y (matrix multiply protocol)"],
    ["__truediv__", "dunder", "numeric", "x / y"],
    ["__floordiv__", "dunder", "numeric", "x // y"],
    ["__mod__", "dunder", "numeric", "x % y"],
    ["__pow__", "dunder", "numeric", "x ** y"],
    ["__neg__", "dunder", "numeric", "-x"],
    ["__abs__", "dunder", "numeric", "abs(x)"],
    ["__round__", "dunder", "numeric", "round(x, n)"],
    ["__and__", "dunder", "bitwise", "x & y"],
    ["__or__", "dunder", "bitwise", "x | y"],
    ["__xor__", "dunder", "bitwise", "x ^ y"],
    ["__invert__", "dunder", "bitwise", "~x"],
    ["__lshift__", "dunder", "bitwise", "x << y"],
    ["__rshift__", "dunder", "bitwise", "x >> y"],
    ["__eq__", "dunder", "compare", "x == y"],
    ["__lt__", "dunder", "compare", "x < y"],
    ["__hash__", "dunder", "hashing", "hash(x) for dict/set keys"],

    // context / async
    ["__enter__", "dunder", "context manager", "with x: entry hook"],
    ["__exit__", "dunder", "context manager", "with x: exit hook (can suppress exception)"],
    ["__aenter__", "dunder", "async context", "async with x: entry hook"],
    ["__aexit__", "dunder", "async context", "async with x: exit hook"],
    ["__await__", "dunder", "awaitable", "await x protocol"],
    ["__aiter__", "dunder", "async iterable", "async for protocol"],
    ["__anext__", "dunder", "async iterator", "async for next protocol"],

    // exceptions
    ["__traceback__", "dunder", "exception", "Traceback object for an exception (stack frames)."],
    ["__cause__", "dunder", "exception", "Explicit chaining: raise X from Y"],
    ["__context__", "dunder", "exception", "Implicit chaining (error during handling)."],
    ["__suppress_context__", "dunder", "exception", "Suppress showing __context__ (raise X from None)."],
    ["__notes__", "dunder", "exception", "Extra notes attached to exception (Python 3.11+)."],

    // typing / modern class features
    ["__annotations__", "dunder", "module/class/function", "Type hints live here (huge in modern tooling)."],
    ["__class_getitem__", "dunder", "class", "Implements C[T] (generics / typing)."],
    ["__init_subclass__", "dunder", "base class", "Called when subclass is created (registries/validation)."],
    ["__match_args__", "dunder", "class", "Pattern matching positional attribute names."],

    // module/function/class identity
    ["__name__", "dunder", "module/function/class", "Object name; used by __main__ idiom."],
    ["__qualname__", "dunder", "function/class", "Qualified nested name."],
    ["__module__", "dunder", "function/class", "Module where defined."],
    ["__dict__", "dunder", "instance/class/module", "Attribute storage mapping (if present)."],
    ["__slots__", "dunder", "class", "Declare fixed attrs to reduce memory / speed access."],
    ["__all__", "dunder", "module", "Public export list for `from x import *`."],
    ["__file__", "dunder", "module", "Module filename (if available)."],
    ["__package__", "dunder", "module", "Package name used for relative imports."],
    ["__spec__", "dunder", "module", "Import machinery ModuleSpec."],
];

// -------------------------------------------------------------
// Data: Non-dunder internals you'll encounter in tracebacks,
// inspect/debuggers, decorators, generators/coroutines, code objects.
// -------------------------------------------------------------
const NOND = [
    // Traceback objects (tb_*)
    ["tb_frame", "nond", "traceback", "Traceback \u2192 frame at this level (inspectable stack frame)."],
    ["tb_lineno", "nond", "traceback", "Line number for this traceback level."],
    ["tb_next", "nond", "traceback", "Next traceback (caller) link."],

    // Frame objects (f_*)
    ["f_code", "nond", "frame", "The code object being executed in this frame."],
    ["f_locals", "nond", "frame", "Local variables mapping (debuggers love this)."],
    ["f_globals", "nond", "frame", "Global variables mapping for the frame."],
    ["f_builtins", "nond", "frame", "Builtins mapping used in name resolution."],
    ["f_lineno", "nond", "frame", "Current line number in the frame."],
    ["f_back", "nond", "frame", "Previous (caller) frame."],

    // Code objects (co_*)
    ["co_name", "nond", "code object", "Function/code name."],
    ["co_qualname", "nond", "code object", "Qualified name (where available)."],
    ["co_filename", "nond", "code object", "Filename where code was defined."],
    ["co_firstlineno", "nond", "code object", "First line number of the code object."],
    ["co_varnames", "nond", "code object", "Local variable names."],
    ["co_argcount", "nond", "code object", "Number of positional args."],
    ["co_posonlyargcount", "nond", "code object", "Number of positional-only args."],
    ["co_kwonlyargcount", "nond", "code object", "Number of keyword-only args."],
    ["co_names", "nond", "code object", "Names referenced by bytecode (globals/attrs)."],
    ["co_consts", "nond", "code object", "Constants used by bytecode (literals, nested code)."],
    ["co_freevars", "nond", "code object", "Free variables (from enclosing scopes)."],
    ["co_cellvars", "nond", "code object", "Cell variables captured by inner functions."],

    // Functions & decorators (not dunder, but common)
    ["__wrapped__", "nond", "function (decorators)", "Set by functools.wraps; points to the original function. Massive in tooling."],
    ["__signature__", "nond", "function (tooling)", "Sometimes set by libs to override inspect.signature output."],

    // Generators (gi_*)
    ["gi_frame", "nond", "generator", "Frame object of generator (debug/inspect)."],
    ["gi_code", "nond", "generator", "Code object of generator."],
    ["gi_running", "nond", "generator", "True if generator is currently executing."],

    // Coroutines / async (cr_*)
    ["cr_frame", "nond", "coroutine", "Frame of coroutine (debug/inspect)."],
    ["cr_code", "nond", "coroutine", "Code object of coroutine."],
    ["cr_running", "nond", "coroutine", "True if coroutine is currently executing."],

    // Async generators (ag_*)
    ["ag_frame", "nond", "async generator", "Frame of async generator."],
    ["ag_code", "nond", "async generator", "Code object of async generator."],
    ["ag_running", "nond", "async generator", "True if async generator is running."],

    // Exceptions common non-dunder fields you'll still inspect
    ["args", "nond", "exception", "Tuple of arguments passed to the exception."],

    // Dataclasses / attrs / pydantic ecosystem-ish (common to see)
    ["__dataclass_fields__", "nond", "dataclasses", "Dataclasses store field metadata here."],
    ["__dataclass_params__", "nond", "dataclasses", "Dataclass configuration parameters."],
    ["model_fields", "nond", "pydantic (v2)", "Field definitions in pydantic models (very common in apps)."],
    ["model_dump", "nond", "pydantic (v2)", "Serialize model data; shows up everywhere in modern Python."],

    // Packaging/runtime
    ["__version__", "nond", "modules/packages", "Very common convention for package version (not guaranteed)."],
];

