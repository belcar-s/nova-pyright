const {
	serverPaths,
	runnerPath,
	USER_PATH_CONFIG_KEY
} = require("./paths.js");
const { StatusDataProvider } = require("./StatusDataProvider.js");
const { PyrightLanguageServer } = require("./PyrightLanguageServer.js");
const { downloadLanguageServer } = require("./download.js");

let languageServer;

exports.activate = async function () {
	// This function loads the sidebar. It then returns
	// a StatusDataProvider, which is used to update
	// status information on the sidebar.
	const dataProvider = loadSidebar();

	nova.config.observe(USER_PATH_CONFIG_KEY, () => restartServer(dataProvider));

	registerCommands(dataProvider);
};

function restartServer(dataProvider) {
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
}
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
	dataProvider.updateVersion(
		serverPackageJSON.version + ` (${nova.localize(server.type)})`
	);

	server.start().catch(e => {
		// This function is run after the server quits.
		dataProvider.updateStatus(nova.localize("Stopped"));

		// inform the user of the error
		let notificationRequest = new NotificationRequest;
		notificationRequest.title =
			nova.localize("Pyright Language Server Stopped");

		// obtain the notification's body, which depends
		// on the cause of the error

		if (e /*has x quality*/) {
			/* do y thing */
		} else if (e.yy /* has z quality*/) {
			/* do ☈ thing */
		}

		nova.notifications.add(notificationRequest);
	});

	// (?) I'm unsure of whether this is a good idea :)
	setTimeout(() => {
		if (server.languageClient?.running) {
			dataProvider.updateStatus(nova.localize("Running"));
		} else {
			dataProvider.updateStatus(nova.localize("Startup Delayed"));
		}
	}, 1000);
}
function registerCommands(dataProvider) {
	nova.commands.register("restartLanguageServer", () => {
		languageServer.deactivate();
		loadLanguageServer(languageServer, dataProvider);
	});

	let isDownloading = false;
	nova.commands.register("updateLanguageServer", async () => {
		if (isDownloading) {
			let alreadyStartedNotificationRequest = new NotificationRequest;
			alreadyStartedNotificationRequest.title =
				nova.localize("Cannot Download Right Now");
			alreadyStartedNotificationRequest.body =
				nova.localize("Pyright is already being downloaded.");

			return;
		}

		isDownloading = true;

		// provide an immediate reaction
		let initialNotificationRequest = new NotificationRequest;
		initialNotificationRequest.title =
			nova.localize("Downloading");
		initialNotificationRequest.body =
			nova.localize(
				"The latest version of Pyright is being downloaded."
			);
		nova.notifications.add(initialNotificationRequest);

		// actually download
		try {
			await downloadLanguageServer("updated");
		} catch (e) {
			// This code runs if the script quits with a non-zero
			// exit code.
			let errorNotificationRequest = new NotificationRequest;
			errorNotificationRequest.title =
				nova.localize("Could Not Update Pyright");

			// (?) I'm not confident of that this is a good
			// message :)
			errorNotificationRequest.body =
				nova.localize(`An unknown error occurred. (${e})`);

			nova.notifications.add(errorNotificationRequest);
		}

		isDownloading = false;

		// notify of completion
		let completionNotificationRequest = new NotificationRequest;
		completionNotificationRequest.title =
			nova.localize("Download Completed");
		completionNotificationRequest.body =
			nova.localize(
				"The latest version of Pyright was downloaded."
			);
		nova.notifications.add(completionNotificationRequest);

		// restart Language Server
		restartServer();
	});
}
