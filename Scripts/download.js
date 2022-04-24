const { downloadPath } = require("./paths.js");

async function getLatestVersionNumber () {
	const redirectLink = "https://github.com/microsoft/pyright/releases/latest";
	const response = await fetch(redirectLink);

	const parts = response.url.split("/");
	return parts[parts.length - 1];
}
function startProcess(location, args, cwd) {
	const options = {
		args,
		cwd
	};
	console.log(JSON.stringify(options));
	const process = new Process(location, options);
	process.onStdout(line => console.log(line));

	const onExit = new Promise((resolve, reject) => {
		process.onDidExit(status => {
			const action = status == 0 ? resolve : reject;
			action(status);
		});
	});

	process.start();
	return onExit;
}
function download (url, outputPath) {
	console.log(url, outputPath);
	const args = [url, "-L", "--output", outputPath];
	return startProcess("/usr/bin/curl", args);
}
async function unzip (file, outputPath) {
	const tempPath = outputPath + "temp";
	const args = ["-q", file, "-d", tempPath];
	await startProcess("/usr/bin/unzip", args);
	const directory = nova.path.join(tempPath, nova.fs.listdir(tempPath)[0]);
	await startProcess("/bin/mv", [directory, outputPath]);
	nova.fs.rmdir(tempPath);
}
function install (directory) {
	const cwd = directory;
	const args = ["npm", "install"];
	return startProcess("/usr/bin/env", args, cwd);
}
function runTask (task, directory) {
	const args = ["npm", "run", task];
	const cwd = directory;
	return startProcess("/usr/bin/env", args, cwd);
}

exports.downloadLanguageServer = async (name) => {
	console.log("Downloading " + name + ".");
	const version = await getLatestVersionNumber();

	console.log("Going to download Pyright version " + version + ".");

	const address = `https://github.com/microsoft/pyright/archive/refs/tags/${version}.zip`;
	console.log(address);
	console.log(downloadPath, name, ".zip");
	const archivePath = nova.path.join(downloadPath, name + ".zip");
	console.log(archivePath);
	await download(address, archivePath);

	console.log("Downloaded archive.");
	console.log("Extracting…");

	const dirname = nova.path.join(downloadPath, name);
	await unzip(archivePath, dirname);

	console.log("Installing Pyright dependencies…");
	await install(dirname);

	console.log("Building…");
	let progressNotification = new NotificationRequest;
	progressNotification.title = nova.localize("Still Downloading Pyright");
	progressNotification.body = nova.localize("Just one more second…");
	nova.notifications.add(progressNotification);

	await runTask(
		"build",
		nova.path.join(dirname, "packages", "pyright"),
	);

	console.log(dirname);

	nova.fs.remove(archivePath);
};
