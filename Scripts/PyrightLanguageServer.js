function which(command) {
	return new Promise((resolve) => {
		const options = {
			args: [command]
		};
		let process = new Process("/usr/bin/which", options);
		process.onStdout((line) =>
			// The value ends with a newline,
			// which we need to remove.
			resolve(line.trim())
		);
		process.start();
	});
}
function exists(path) {
	return !!nova.fs.stat(path);
}

class AlreadyStartedError extends Error { }
class PyrightLanguageServer {
	constructor({ serverPaths, runnerPath }) {
		// pick the best path
		if (serverPaths.user) {
			this.path = serverPaths.user;
		} else if (exists(serverPaths.updated)) {
			this.path = serverPaths.updated;
		} else {
			this.path = serverPaths.primary;
		}

		this.runnerPath = runnerPath;
		this.stopped = true;
	}

	async start() {
		if (!this.stopped) {
			// If the server was started and isn't
			// being stopped, abort.
			throw new AlreadyStartedError(
				"Cannot start the Language Server; it is already running, and hasn't been stopped."
			);
		}
		this.stopped = false;

		const nodePath = await which("node");

		console.log("Hi; sorry to bother. I'm starting the server.");
		const serverOptions = {
			path: nodePath,
			// See `run.js` for an explanation of its
			// importance.
			args: [this.runnerPath, this.path, "--stdio"],
			type: "stdio"
		};
		const clientOptions = {
			syntaxes: ["python"]
		};
		this.languageClient = new LanguageClient(
			"pyright",
			"Pyright",
			serverOptions,
			clientOptions
		);

		const onStop = new Promise((_resolve, reject) => this.languageClient.onDidStop(reject));

		this.languageClient.start();
		return onStop;
	}

	deactivate() {
		this.languageClient.stop();
		this.stopped = true;
	}
}

exports.PyrightLanguageServer = PyrightLanguageServer;