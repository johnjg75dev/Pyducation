# Python Internals Decoding Ring

This project is an interactive web application designed to help developers explore and understand Python's internal mechanisms, including its special methods (often called "dunder" methods) and other runtime attributes. It provides a comprehensive, searchable, and filterable reference that clarifies what these internals are, where they are used, and their significance.

A core feature of this application is an integrated, floating Python Read-Eval-Print Loop (REPL) powered by **Pyodide**. Pyodide compiles CPython to WebAssembly, enabling you to run Python code directly within your web browser. This REPL includes a virtual filesystem with both temporary (in-memory) and persistent (IndexedDB) storage, along with a file explorer for managing your Python environment.

## Features

*   **Dunder Methods Reference**: Explore Python's special methods (`__init__`, `__add__`, etc.) with detailed explanations.
*   **Non-Dunder Internals**: Understand common runtime attributes found in tracebacks, debuggers, and the Python ecosystem.
*   **Interactive Python REPL**: Execute Python code directly in your browser using Pyodide.
*   **Virtual Filesystem**: Manage files and directories within the REPL environment, with options for persistent storage.
*   **Draggable and Dockable Windows**: Customize the layout of the REPL and file explorer for a personalized workflow.
*   **Search and Filter**: Easily find specific internals by name, category, or meaning.

## Getting Started

To get started with the Python Internals Decoding Ring, simply open the `index.html` file in your web browser.

```bash
# Assuming you have cloned this repository
cd Pyducation
open index.html # On macOS
start index.html # On Windows
xdg-open index.html # On Linux
```

The application will load, and you can immediately begin browsing the Python internals reference.

## Pyodide Setup (CDN-first with local fallback)

The REPL will try to load Pyodide from the CDN first and fall back to local files in the project directory if the CDN is unavailable. This means the REPL should work online out of the box as long as `pyodide.js` is present in the project root (this repo includes it already).

**If the REPL shows "loading..." indefinitely or you want offline support, place the Pyodide core files locally:**

1.  **Download Pyodide Core Files**:
    *   `pyodide.js`: [https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js](https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js)
    *   `pyodide.asm.wasm`: [https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.asm.wasm](https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.asm.wasm)
    *   `python_stdlib.zip`: [https://cdn.jsdelivr.net/pyodide/v0.29.3/full/python_stdlib.zip](https://cdn.jsdelivr.net/pyodide/v0.29.3/full/python_stdlib.zip)

2.  **Place Files in Project Directory**:
    Move the downloaded `pyodide.js`, `pyodide.asm.wasm`, and `python_stdlib.zip` files into the root directory of this project (the same directory as `index.html`).

Once these files are in place, refresh `index.html` in your browser. The REPL should now initialize successfully.

## Usage

*   **Browse Internals**: Use the search bar and category filters to explore dunder methods and non-dunder attributes.
*   **Interactive REPL**:
    *   Type Python code into the input area of the floating REPL.
    *   Press `Ctrl+Enter` to execute the code.
    *   Use the "Clear" button to clear the output.
    *   Drag the REPL header to move it around, or use the docking buttons to snap it to different parts of the screen.
    *   Click the `+` button to collapse/expand the REPL.
*   **File Explorer**:
    *   Use the "Files" button in the REPL to toggle the file explorer.
    *   Manage files in `/persist` (persistent storage via IndexedDB) or `/tmp` (temporary RAM storage).
    *   Create, edit, save, download, upload, and delete files.
    *   Remember to `await persist_sync()` in the REPL after making changes to `/persist` if you want to ensure data is saved to IndexedDB.

## Development

This project is built using vanilla HTML, CSS, and JavaScript, without the use of complex frameworks, making it easy to understand and modify.

*   `index.html`: The main entry point and structure of the application.
*   `pyducation.main.js`: Initializes the application components.
*   `pyducation.data.js`: Contains the structured data for Python internals.
*   `pyducation.repl.js`: Manages the Pyodide REPL and file explorer logic.
*   `pyducation.windowing.js`: Handles the interactive window management (dragging, resizing, docking).
*   `pyducation.theme.js`: Manages theme switching.
*   `pyducation.state.js`: Centralizes global state variables.
*   `*.css`: Stylesheets for the application's appearance.

Feel free to explore the codebase and contribute!
