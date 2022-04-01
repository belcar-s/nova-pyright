// Run a version of the Pyright Language Server

// The files we obtain (nodeMain.js) export a 'main'
// function. Calling the function starts the server —not just
// executing the file.

// The extension runs this file with Node.js, and passes:
//     1) a path
//     2) '--stdio'

const args = process.argv.slice(2);

const { main } = require(args[0]);
main();