const { downloadPath } = require("./paths.js");

function startProcess(location, args, cwd) {
	const options = {
		args,
		cwd
	};
	console.log(location, args.join(" "));
	const process = new Process(location, options);
	process.onStdout(line => console.log(line));

	const onExit = new Promise((resolve, reject) => {
		process.onDidExit(status => {
			console.log(`Exited ${location} with code ${status}`);
			const action = status == 0 ? resolve : reject;
			action(status);
		});
	});

	process.start();
	return onExit;
}
function move (origin, destination) {
	const args = [origin, destination];
	return startProcess("/bin/mv", args);
}

exports.downloadLanguageServer = async (name) => {
	console.log("Downloading " + name + ".");
	const tempDirName = "Temporary location of " + name;
	const tempDirPath = nova.path.join(downloadPath, tempDirName);
	const args = ["npm", "i", "pyright", "--no-save", "--prefix", tempDirName];
	const cwd = downloadPath;
	async function tryToInstall () {
		try {
			await startProcess("/usr/bin/env", args, cwd);
		} catch (e) {
			if (e == 127) {
				let failureNotificationRequest = new NotificationRequest;
				failureNotificationRequest.title = nova.localize("NPM Might Not Be Installed");
				failureNotificationRequest.body = nova.localize("Install NPM and try again.");
				failureNotificationRequest.actions = [
					nova.localize("Retry")
				];
				await nova.notifications.add(failureNotificationRequest);
				tryToInstall();
			} else {
				throw e;
			}
		}
	}
	await tryToInstall();

	const pyrightDownloadLocation = nova.path.join(tempDirPath, "node_modules", "pyright");
	const finalPyrightLocation = nova.path.join(downloadPath, name);
	await move(pyrightDownloadLocation, finalPyrightLocation);
	nova.fs.rmdir(tempDirPath);
};
