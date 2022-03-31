// This function is to aid in running the Python download
// script. It returns a Promise that is fulfilled/rejected
// when the script finishes running.
const { downloaderPath } = require("./paths.js");

exports.downloadLanguageServer = (name) => {
	const options = {
		args: ["python3", downloaderPath, name]
	};
	const process = new Process("/usr/bin/env", options);

	const onExit = new Promise((resolve, reject) => {
		process.onDidExit(status => {
			const action = (status == 0) ? resolve : reject;
			action(status);
		});
	});

	process.onStdout(line => {
		console.warn(line);
	});
	process.start();
	return onExit;
};
