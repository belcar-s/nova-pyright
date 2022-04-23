const {
	serverPaths,
	USER_PATH_CONFIG_KEY
} = require("./paths.js");
const { StatusDataProvider } = require("./StatusDataProvider.js");
const { PyrightLanguageServer } = require("./PyrightLanguageServer.js");
const { downloadLanguageServer } = require("./download.js");

let languageServer;

exports.activate = async function () {
	await ensureLanguageServer();
	
	// This function loads the sidebar. It then returns
	// a StatusDataProvider, which is used to update
	// status information on the sidebar.
	const dataProvider = loadSidebar();

	nova.config.observe(USER_PATH_CONFIG_KEY, () => restartServer(dataProvider));

	registerCommands(dataProvider);
};
async function ensureLanguageServer() {
	function exists(path) {
		return !!nova.fs.stat(path);
	}

	const primaryPath = serverPaths().primary;
	if (!exists(primaryPath)) {
		let notificationRequest = new NotificationRequest;
		notificationRequest.title = nova.localize("Downloading Pyright…");
		notificationRequest.body = nova.localize("Before you can use Pyright, it needs to be downloaded. Please wait.");
		
		nova.notifications.add(notificationRequest);
		
		await downloadLanguageServer("primary");
		
		let finishedNotificationRequest = new NotificationRequest;
		finishedNotificationRequest.title = nova.localize("Finished downloading Pyright for the first time");
		finishedNotificationRequest.body = nova.localize("Language features will be enabled in a moment.");
		
		nova.notifications.add(finishedNotificationRequest);
	}

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
	});

	// load it :)
	loadLanguageServer(languageServer, dataProvider);
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
			nova.notifications.add(alreadyStartedNotificationRequest);
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
			return;
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
		restartServer(dataProvider);
	});
	nova.commands.register("useBundledServer", async () => {
		if (nova.config.get(USER_PATH_CONFIG_KEY)) {
			// For a user who has downloaded an updated version of
			// the server, switching to the bundled version will
			// unfortunately involve invoking this command twice.
			let errorNotificationRequest = new NotificationRequest;
			errorNotificationRequest.title =
				nova.localize("Configuration Change Needed");
			errorNotificationRequest.body =
				nova.localize("To use the built-in server, empty the text box labelled 'Server Location'.");
			nova.notifications.add(errorNotificationRequest);
		} else {
			const updatedPath = serverPaths().updated;
			// I'm very anxious of that this deletes everything.
			// If it does, I'm sorry. I didn't mean to.
			let actionNotificationRequest = new NotificationRequest;
			actionNotificationRequest.title = 
				nova.localize("Provide permission to delete a directory");
			actionNotificationRequest.body =
				`To use the bundled server, the extension needs to remove ${updatedPath}. This is where the updated version of Pyright was downloaded.`;
			actionNotificationRequest.actions = [
				nova.localize("Cancel"),
				nova.localize("Remove folder"),
			];
			
			const reply = await nova.notifications.add(actionNotificationRequest);
			if (reply.actionIdx == 1) {
				nova.fs.rmdir(updatedPath);
				restartServer(dataProvider);
			}
		}
	});
}
