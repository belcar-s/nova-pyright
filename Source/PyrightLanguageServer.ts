function which(command: string): Promise<string> {
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
function exists(path: string) {
	return !!nova.fs.stat(path);
}

class AlreadyStartedError extends Error { }
export class PyrightLanguageServer {
	path: string
	type: string
	stopped: boolean
	languageClient: undefined | LanguageClient

	constructor({ serverPaths }) {
		// pick the best path and set `this.type`
		if (serverPaths.user) {
			this.path = serverPaths.user;
			this.type = "user";
		} else if (exists(serverPaths.updated)) {
			this.path = serverPaths.updated;
			this.type = "updated";
		} else {
			this.path = serverPaths.primary;
			this.type = "primary";
		}

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
		const serverOptions: ServerOptions = {
			path: nodePath,
			args: [this.path, "--stdio"],
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

		// This can throw:
		this.languageClient.start();
		return onStop;
	}

	deactivate() {
		console.log("Bye; sorry to have bothered. I'm stopping the server.");
		this.languageClient.stop();
		this.stopped = true;
	}
}
