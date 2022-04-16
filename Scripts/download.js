// This function is to aid in running the Python download
// script. It returns a Promise that is fulfilled/rejected
// when the script finishes running.
const { downloaderPath } = require("./paths.js");

exports.downloadLanguageServer = (name) => {
	const options = {
		args: ["python3", downloaderPath, name]
	};

	const process = new Process("/usr/bin/env", options);
	process.onStdout(line => {
		if (line != "\n") {
			console.warn(line);
		}
	});

	const onExit = new Promise((resolve, reject) => {
		process.onDidExit(status => {
			console.warn("Exitted; status " + status);
			// reject when non-zero; resolve otherwise
			const action = (status == 0) ? resolve : reject;
			action(status);
		});
	});

	process.start();
	return onExit;
};
