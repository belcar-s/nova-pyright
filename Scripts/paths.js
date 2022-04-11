const CONFIG_KEY = "belcar.pyright.user_path";
const parentDirectoryPath = nova.path.normalize(nova.path.join(__dirname, "..", "Pyright Language Server"));

exports.runnerPath = nova.path.join(parentDirectoryPath, "run.js");

function getServerPath(name) {
	return nova.path.join(
		parentDirectoryPath,
		name,
		"built",
		"nodeMain.js", // Entrypoint
	);
}
exports.serverPaths = () => ({
	// Default Path
	primary: getServerPath("primary"),

	// Alternative Path
	updated: getServerPath("updated"),

	// User Path
	user: nova.config.get(CONFIG_KEY),
});

exports.USER_PATH_CONFIG_KEY = CONFIG_KEY;
exports.downloaderPath = nova.path.join(parentDirectoryPath, "download.py");
