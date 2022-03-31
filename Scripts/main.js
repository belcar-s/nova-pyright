const {
	serverPaths,
	runnerPath,
	USER_PATH_CONFIG_KEY
} = require("./paths.js");
const { StatusDataProvider } = require("./StatusDataProvider.js");
const { PyrightLanguageServer } = require("./PyrightLanguageServer.js");

exports.activate = async function () {
	// This function loads the sidebar. It then returns
	// a StatusDataProvider, which is used to update
	// status information on the sidebar.
	const dataProvider = loadSidebar();

	let languageServer;
	nova.config.observe(USER_PATH_CONFIG_KEY, () => {
		if (languageServer) {
			languageServer.deactivate();
		}

		// This is run immediately and once. Later, it
		// may be run upon changes to the user's path
		// setting.

		// create server object
		languageServer = new PyrightLanguageServer({
			serverPaths: serverPaths(),
			runnerPath,
		});

		// load it :)
		loadLanguageServer(languageServer, dataProvider);
	});

	registerCommands(languageServer, dataProvider);
};

function loadSidebar() {
	const SECTION_ID = "pyright.status-details";

	const dataProvider = new StatusDataProvider();
	const treeView = new TreeView(SECTION_ID, { dataProvider });
	dataProvider.treeView = treeView;

	// (?) The use of this is unknown to me.
	nova.subscriptions.add(treeView);

	return dataProvider;
}
function loadLanguageServer(server, dataProvider) {
	function loadJSON(path) {
		const file = nova.fs.open(path);
		const lines = file.readlines();
		const contents = lines.join("\n");
		return JSON.parse(contents);
	}

	// the Pyright server's `package.json` file, decoded
	const serverPackageJSON = loadJSON(
		nova.path.normalize(nova.path.join(
			server.path, // the server's entry point
			"..",
			"..",
			"package.json"
		))
	);

	dataProvider.updateStatus(nova.localize("Starting…"));
	dataProvider.updateVersion(serverPackageJSON.version);

	server.start().catch(e => {
		// This function is run after the server quits.
		dataProvider.updateStatus(nova.localize("Stopped"));

		// inform the user of the error
		const notificationRequest = new NotificationRequest;
		notificationRequest.title = nova.localize("Pyright Language Server Stopped");

		// obtain the notification's body, which depends
		// on the cause of the error

		if (e /*has x quality*/) {
			/* do y thing */
		} else if (e.yy /* has z quality*/) {
			/* do ☈ thing */
		}
	});

	// (?) I'm unsure of whether this is a good idea :)
	setInterval(() => {
		if (server.languageClient?.running) {
			dataProvider.updateStatus(nova.localize("Running"));
		} else {
			dataProvider.updateStatus(nova.localize("Stopped"));
		}
	}, 2000);
}
function registerCommands(server, dataProvider) {
	nova.commands.register("restartLanguageServer", () => {
		server.deactivate();
		loadLanguageServer(server, dataProvider);
	});
}