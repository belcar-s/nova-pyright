import * as LSP from "vscode-languageserver-types";

import { serverPaths, serverFolders, USER_PATH_CONFIG_KEY } from "./paths";
import { StatusDataProvider, Element } from "./StatusDataProvider.js";
import { PyrightLanguageServer } from "./PyrightLanguageServer.js";
import { downloadLanguageServer } from "./download.js";
import { forcefullyUnlock, ensureLanguageServer } from "./initialization.js";
import {
	rangeToLSPrange,
	applyLSPedits,
	applyWorkspaceEdit,
} from "./LSPedits.js";

let languageServer: PyrightLanguageServer | undefined;

exports.activate = async function () {
	nova.commands.register("unlockInit", () => {
		forcefullyUnlock();
	});

	await ensureLanguageServer();

	// This function loads the sidebar. It then returns
	// a StatusDataProvider, which is used to update
	// status information on the sidebar.
	const dataProvider = loadSidebar();

	nova.config.observe(USER_PATH_CONFIG_KEY, () => restartServer(dataProvider));

	registerCommands(dataProvider);
};
function loadSidebar() {
	const SECTION_ID = "pyright.status-details";

	const dataProvider = new StatusDataProvider();
	const treeView = new TreeView(SECTION_ID, {
		dataProvider,
	}) as TreeView<Element>;
	dataProvider.treeView = treeView;

	// (?) The use of this is unknown to me.
	nova.subscriptions.add(treeView);

	return dataProvider;
}
function restartServer(dataProvider: StatusDataProvider) {
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
function loadLanguageServer(
	server: PyrightLanguageServer,
	dataProvider: StatusDataProvider
) {
	function loadJSON(path: string) {
		const file = nova.fs.open(path) as FileTextMode;
		const lines = file.readlines();
		const contents = lines.join("\n");
		return JSON.parse(contents);
	}

	// the Pyright server's `package.json` file, decoded
	const serverPackageJSON = loadJSON(
		nova.path.normalize(
			nova.path.join(
				server.path, // the server's entry point
				"..",
				"package.json"
			)
		)
	);

	dataProvider.updateStatus(nova.localize("Starting…"));
	dataProvider.updateVersion(
		serverPackageJSON.version + ` (${nova.localize(server.type)})`
	);

	server.start().catch((e) => {
		// This function is run after the server quits.
		dataProvider.updateStatus(nova.localize("Stopped"));

		// inform the user of the error

		//@ts-expect-error: NotificationRequest's parameter is optional.
		const notificationRequest = new NotificationRequest();
		notificationRequest.title = nova.localize(
			"Pyright Language Server Stopped"
		);

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
function registerCommands(dataProvider: StatusDataProvider) {
	nova.commands.register("restartLanguageServer", () => {
		languageServer.deactivate();
		loadLanguageServer(languageServer, dataProvider);
	});

	function getEditingLSPcommandCallback(command: string) {
		return async (editor: TextEditor) => {
			const languageClient = languageServer.languageClient;
			const parameters = {
				command,
				arguments: [editor.document.uri],
			};
			const edits = (await languageClient.sendRequest(
				"workspace/executeCommand",
				parameters
			)) as LSP.TextEdit[];
			if (edits?.length > 0) {
				// This 'if' statement is not to make an unneeded edit,
				// which supposedly adds to the undo stack.
				applyLSPedits(editor, edits);
			}
		};
	}
	nova.commands.register(
		"orderImports",
		getEditingLSPcommandCallback("pyright.organizeimports")
	);
	nova.commands.register(
		"addMissingOptionalParam",
		getEditingLSPcommandCallback("pyright.addoptionalforparam")
	);

	let isDownloading = false;
	console.log(isDownloading);
	nova.commands.register("updateLanguageServer", async () => {
		if (isDownloading) {
			//@ts-expect-error: NotificationRequest's parameter is optional.
			const alreadyStartedNotificationRequest = new NotificationRequest();
			alreadyStartedNotificationRequest.title = nova.localize(
				"Cannot Download Right Now"
			);
			alreadyStartedNotificationRequest.body = nova.localize(
				"Pyright is already being downloaded."
			);
			nova.notifications.add(alreadyStartedNotificationRequest);
			return;
		}

		isDownloading = true;

		// provide an immediate reaction

		//@ts-expect-error: NotificationRequest's parameter is optional.
		const initialNotificationRequest = new NotificationRequest();
		initialNotificationRequest.title = nova.localize("Downloading");
		initialNotificationRequest.body = nova.localize(
			"The latest version of Pyright is being downloaded."
		);
		nova.notifications.add(initialNotificationRequest);

		// actually download
		try {
			await downloadLanguageServer("updated");
		} catch (e) {
			// This code runs if the script quits with a non-zero
			// exit code.

			//@ts-expect-error: NotificationRequest's parameter is optional.
			const errorNotificationRequest = new NotificationRequest();
			errorNotificationRequest.title = nova.localize(
				"Could Not Update Pyright"
			);

			// (?) I'm not confident of that this is a good
			// message :)
			errorNotificationRequest.body = nova.localize(
				`An unknown error occurred. (${e})`
			);

			nova.notifications.add(errorNotificationRequest);
			return;
		}

		isDownloading = false;

		// notify of completion

		//@ts-expect-error: NotificationRequest's parameter is optional.
		const completionNotificationRequest = new NotificationRequest();
		completionNotificationRequest.title = nova.localize("Download Completed");
		completionNotificationRequest.body = nova.localize(
			"The latest version of Pyright was downloaded."
		);
		nova.notifications.add(completionNotificationRequest);

		// restart Language Server
		restartServer(dataProvider);
	});
	nova.commands.register(
		"renameSymbol",
		async (workspaceOrEditor: Workspace | TextEditor) => {
			const editor: TextEditor =
				// @ts-expect-error: I HATE TYPESCRIPT!!!
				workspaceOrEditor.activeTextEditor ?? workspaceOrEditor;

			editor.selectWordsContainingCursors();

			const selectedRange = editor.selectedRange;
			const selectedPosition = rangeToLSPrange(
				editor.document,
				selectedRange
			)?.start;
			if (!selectedPosition) {
				const failureNotificationRequest = new NotificationRequest(
					"I certainly regret switching to this language."
				);
				failureNotificationRequest.title = "Can Not Rename Symbol";
				failureNotificationRequest.body = "Try changing your selection.";
				nova.notifications.add(failureNotificationRequest);
				return;
			}

			const newName = await new Promise<string | null>((resolve) =>
				nova.workspace.showInputPalette(
					"Type a new name for this symbol.",
					{ placeholder: editor.selectedText, value: editor.selectedText },
					resolve
				)
			);
			if (!newName || newName == editor.selectedText) {
				return;
			}

			const params = {
				textDocument: { uri: editor.document.uri },
				position: selectedPosition,
				newName,
			};
			const response = (await languageServer.languageClient.sendRequest(
				"textDocument/rename",
				params
			)) as LSP.WorkspaceEdit | null;
			if (response == null) {
				// @ts-expect-error: The Nova types are outdated.
				const failureNotificationRequest = new NotificationRequest();
				failureNotificationRequest.title = "Can Not Rename Symbol";
				failureNotificationRequest.body =
					"The cause of this problem is unknown.";
				nova.notifications.add(failureNotificationRequest);
				return;
			}

			await applyWorkspaceEdit(response);

			// show the original document
			await nova.workspace.openFile(editor.document.uri);
			editor.scrollToCursorPosition;
		}
	);
	nova.commands.register("useBundledServer", async () => {
		if (nova.config.get(USER_PATH_CONFIG_KEY)) {
			// For a user who has downloaded an updated version of
			// the server, switching to the bundled version will
			// unfortunately involve invoking this command twice.

			//@ts-expect-error: NotificationRequest's parameter is optional.
			const errorNotificationRequest = new NotificationRequest();
			errorNotificationRequest.title = nova.localize(
				"Configuration Change Needed"
			);
			errorNotificationRequest.body = nova.localize(
				"To use the built-in server, empty the text box labelled 'Server Location'."
			);
			nova.notifications.add(errorNotificationRequest);
		} else {
			const updatedPath = serverFolders().updated;
			// I'm very anxious of that this deletes everything.
			// If it does, I'm sorry. I didn't mean to.

			//@ts-expect-error: NotificationRequest's parameter is optional.
			const actionNotificationRequest = new NotificationRequest();
			actionNotificationRequest.title = nova.localize(
				"Provide Permission to Delete a Directory"
			);
			actionNotificationRequest.body = `To use the bundled server, the extension needs to remove ${updatedPath}. This is where the updated version of Pyright was downloaded.`;
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
