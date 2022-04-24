const CONFIG_KEY = "belcar.pyright.user_path";
const parentDirectoryPath = nova.path.normalize(nova.path.join(__dirname, "..", "Pyright Language Server"));

function getServerPath(name) {
	return nova.path.join(
		parentDirectoryPath,
		name,
		"packages",
		"pyright",
		"langserver.index.js" // Entrypoint
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

exports.serverFolders = () => ({
	primary: nova.path.join(parentDirectoryPath, "primary"),
	updated: nova.path.join(parentDirectoryPath, "updated")
});

exports.USER_PATH_CONFIG_KEY = CONFIG_KEY;
exports.downloadPath = parentDirectoryPath;
