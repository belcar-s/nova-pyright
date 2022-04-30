const CONFIG_KEY = "belcar.pyright.user_path";
const parentDirectoryPath = nova.path.normalize(nova.path.join(__dirname, "..", "Pyright Language Server"));

function getServerPath(name: string) {
	return nova.path.join(
		parentDirectoryPath,
		name,
		"langserver.index.js" // Entrypoint
	);
}
export function serverPaths () {
	return {
		// Default Path
		primary: getServerPath("primary"),

		// Alternative Path
		updated: getServerPath("updated"),

		// User Path
		user: nova.config.get(CONFIG_KEY),
	};
}

export function serverFolders () {
	return {
		primary: nova.path.join(parentDirectoryPath, "primary"),
		updated: nova.path.join(parentDirectoryPath, "updated"),
	};
}

export const USER_PATH_CONFIG_KEY = CONFIG_KEY;
export const downloadPath = parentDirectoryPath;
