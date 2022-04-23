const downloadPath = require("./paths.js");

async function getLatestVersionNumber () {
	const redirectLink = "https://github.com/microsoft/pyright/releases/latest";
	const response = await fetch(redirectLink);
	return response.url.split("/")[-1];
}
function startProcess(location, args, cwd) {
	const options = {
		args,
		cwd
	};
	const process = new Process(location, options);
	process.onStdout(console.log);
	
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
	const args = [url, "-L", "--output", outputPath];
	return startProcess("/usr/bin/curl", args);
}
function unzip (file, outputPath) {
	const args = [file, "-d", outputPath];
	return startProcess("/usr/bin/unzip", args);
}
function install (directory) {
	const cwd = directory;
	const args = ["npm", "install"];
	return startProcess("/usr/bin/env", args, cwd);
}
function runTask (task, directory) {
	const cwd = directory;
	const args = ["npm", "run", task];
	return startProcess("/usr/bin/env", args, cwd);
}

exports.downloadLanguageServer = async (name) => {
	console.log("Downloading " + name + ".");
	const version = await getLatestVersionNumber();
	
	console.log("Going to download Pyright version " + version);
	
	const address = `https://github.com/microsoft/pyright/archive/refs/tags/${version}.zip`;
	const archivePath = nova.path.join(downloadPath, name + ".zip");
	await download(address, archivePath);
	
	console.log("Downloaded archive.");
	console.log("Extracting…");	
	
	const dirname = nova.path.join(downloadPath, name);
	await unzip(archivePath, dirname);
	
	console.log("Installing Pyright dependencies…");
	await install(dirname);
	
	console.log("Building…");
	await runTask(
		"build", 
		nova.path.join(dirname, "packages", "pyright"),
	);
	
	console.log(dirname);
	
	nova.fs.remove(archivePath);
};
