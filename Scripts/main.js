let langserver = null;

exports.activate = async function () {
    /*
    Language Server */
    const containingFolder = nova.path.normalize(
        nova.path.join(__dirname, "..", "Pyright Language Server")
    );
    const defaultPath = nova.path.join(containingFolder, "primary", "built", "nodeMain.js");
    // The user can choose to download a more recent version of
    // Pyright through the extension's UI. It is downloaded here.
    const alternativePath = nova.path.join(containingFolder, "updated", "built", "nodeMain.js");

    const runnerPath = nova.path.join(containingFolder, "run.js");

    langserver = new PyrightLanguageServer();

    langserver.runnerPath = runnerPath;
    nova.config.observe("pyright.user_path", (userPath) => {
        langserver.setPath(
            getAppropriatePath({
                userPath,
                alternativePath,
                defaultPath,
            })
        )
    });
    nova.workspace.config.observe("pyright.validation_enabled", (isEnabled) => {
        langserver.validationEnabled = isEnabled;
    });

    langserver.safelyStart();

    /*
    Commands */
    // These might not be registered after the Language Server
    // starts despite the efficacy of most of them relying on
    // that it does so.
    nova.commands.register("restartLanguageServer", () => {
        if (!langserver.stopped) {
            langserver.deactivate();
        }

        langserver.safelyStart();
    });

    function getEditingLSPcommandCallback(command) {
        return async (editor) => {
            const languageClient = langserver.languageClient;
            const parameters = {
                command,
                arguments: [editor.document.uri]
            }
            let edits = await languageClient.sendRequest("workspace/executeCommand", parameters)
            console.log(edits) // removethis; I don't quite have much knowledge about what this value looks like
            if (edits?.length > 0) {
                // This 'if' statement is not to make an unneeded edit,
                // which supposedly adds to the undo stack.
                editor.edit((textEditorEdit) => {
                    for (let edit of edits) {
                        // I know that 'edit' has
                        //  edit.range.start.line
                        //  edit.range.start.character
                        //  edit.range.end.line
                        //  edit.range.end.character

                        const range = new Range(start, end);
                        textEditorEdit.replace(range, edit.newText);
                    }
                })
            }
        }
    }
    nova.commands.register(
        "orderImports",
        getEditingLSPcommandCallback("pyright.organizeimports")
    );

    nova.commands.register(
        "addMissingOptionalParam",
        getEditingLSPcommandCallback("pyright.addoptionalforparam")
    );

    /*
    Sidebar */
    let treeView = new TreeView("pyright.status-details", {
        dataProvider: new StatusDataProvider()
    });

    nova.subscriptions.add(treeView); // (?) The use of this isn't obvious to me
}

exports.deactivate = function () {
    // If 'langserver.deactivate' is called before the server
    // starts, an error is sent to Extension Console.

    // `langserver.stopped == false` means that the server
    // was started.
    if (langserver && !langserver.stopped) {
        langserver.deactivate();
    }
}

function getAppropriatePath({ userPath, alternativePath, defaultPath }) {
    function exists(path) {
        return !!nova.fs.stat(path);
    }

    if (userPath) {
        return userPath;
    } else if (exists(alternativePath)) {
        return alternativePath;
    } else {
        return defaultPath;
    }
}

function which(command) {
    return new Promise((resolve) => {
        const options = {
            args: [command]
        };
        let process = new Process("/usr/bin/which", options);
        process.onStdout((line) =>
            // The value ends with a newline,
            // which we need to remove.
            resolve(line.trim())
        );
        process.start();
    })
}

class PyrightLanguageServer {
    constructor() {
        // The server is stopped initially.
        this.stopped = true;
    }

    async safelyStart() {
        function handleStartupError(error) {
            if (error instanceof AlreadyStartedError) {
                let request = new NotificationRequest;
                request.title = nova.localize("Could not start the Pyright Language Server")
                request.body = nova.localize(error.message)
                nova.notifications.add(request);
            }
        }

        try {
            await this.start()
        } catch (e) {
            handleStartupError(e)
        }
    }

    async start() {
        if (this.languageClient && !this.languageClient.stopped) {
            throw new AlreadyStartedError(
                "Cannot start the Language Server; it is already running, and hasn't been stopped."
            )
        }
        this.stopped = false

        const nodePath = await which("node");

        const serverOptions = {
            path: nodePath,
            args: [this.runnerPath, this.path, "--stdio"],
            type: "stdio"
        }
        const clientOptions = {
            syntaxes: ["python"]
        }
        this.languageClient = new LanguageClient(
            "pyright",
            "Pyright",
            serverOptions,
            clientOptions,
        )

        const onStop = new Promise((_resolve, reject) => this.languageClient.onDidStop(reject));

        this.languageClient.start();
        return onStop;
    }

    deactivate() {
        this.languageClient.stop();
        this.languageClient.stopped = true;
    }

    setPath(path) {
        this.path = path
        if (!this.stopped) {
            this.deactivate();
            this.safelyStart();
        }
    }
}

class AlreadyStartedError extends Error { }

/*
More sidebar */
class StatusDataProvider {
    getChildren(element) {
        if (element == null) {
            return [
                {
                    name: "Status",
                    value: langserver.stopped ? "Stopped" : "Running",
                },
                {
                    name: "Version",
                    value: "Unknown"
                }
            ];
        }
    }

    // getParent(element) {
        // Optional
    // }

    getTreeItem({name, value}) {
        let item = new TreeItem(name);
        item.descriptiveText = value;
        return item;
    }
}