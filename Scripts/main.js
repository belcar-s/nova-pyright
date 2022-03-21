let langserver = null;

exports.activate = async function () {
    /*
    Language Server */
    const containingFolder = nova.path.join(__dirname, "Pyright Language Server");
    const defaultPath = nova.path.join(containingFolder, "primary", "nodeMain.js");
    // The user can choose to download a more recent version of
    // Pyright through the extension's UI. It is downloaded here. 
    const alternativePath = nova.path.join(containingFolder, "updated", "nodeMain.js");
    const userPath = nova.config.get("pyright.user_path");

    langserver = new PyrightLanguageServer({
        path: getAppropriatePath({
            userPath,
            alternativePath,
            defaultPath,
        }),
        validationEnabled: nova.workspace.config.get("pyright.validation_enabled"),
    });

    nova.config.observe("pyright.user_path", (userPath) => {
        let newLangserver =
            langserver.changePath(
                getAppropriatePath({
                    userPath,
                    alternativePath,
                    defaultPath,
                })
            )
        langserver.deactivate()
        langserver = newLangserver
        safelyStartServer(langserver)
    })
    nova.workspace.config.observe("pyright.validation_enabled",
        (isEnabled) => {
            langserver.validationEnabled = isEnabled;
        }
    );

    safelyStartServer(langserver);

    /*
    Commands */
    // These might not be registered after the Language Server
    // starts despite the efficacy of most of them relying on 
    // that it does so.
    nova.commands.register("restartLanguageServer", (editor) => {
        langserver.deactivate();
        safelyStartServer(langserver); // Potential error if langserver takes too long to stop
    })

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
    )

    nova.commands.register(
        "addMissingOptionalParam",
        getEditingLSPcommandCallback("pyright.addoptionalforparam")
    )
}

exports.deactivate = function () {
    // 'langserver' supposedly might be null if the 'activate' function
    // hasn't been completely run. In that case, of course, calls to
    // 'langserver' methods will fail. The consequence is supposedly
    // a bothersome error message.
    if (langserver) {
        langserver.deactivate();
    }
}

async function safelyStartServer(langserver) {
    try {
        await langserver.start()
    } catch (e) {
        handleStartupError(e)
    }
}

function handleStartupError(error) {
    if (error instanceof AlreadyStartedError) {
        let request = new NotificationRequest;

        nova.notifications.add(NotificationRequest);
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

function which(command, shouldNotify = false) {
    return new Promise((resolve, reject) => {
        const options = {
            args: [command],
            stdio: "pipe"
        }
        let process = new Process("/usr/bin/which", options)
        process.onStdout(resolve)
    })
}

class PyrightLanguageServer {
    constructor({ path, validationEnabled }) {
        // This value is altered by the 'activate' function, as well
        // as configuration changes. 
        this.validationEnabled = validationEnabled;
        this.path = path;
    }

    start() {
        return new Promise((resolve, reject) => {
            if (this.languageClient?.running) {
                throw new AlreadyStartedError(
                    "Cannot start the Language Server; it is already running."
                )
            }

            const nodePath = await which("node");
            const serverOptions = {
                path: nodePath,
                args: [this.path],
                env: {
                },
                type: "pipe" // I think???
            }
            const clientOptions = {
                initializationOptions: {

                },
                syntaxes: ["python"]
            }
            this.languageClient = new LanguageClient(
                "pyright",
                "Python+",
                serverOptions,
                clientOptions,
            )

            this.languageClient.onDidStop(reject)
            
            this.languageClient.start();
        })
    }

    deactivate() {
        this.languageClient.stop();
    }

    changePath(newPath) {
        return new PyrightLanguageServer({
            path: newPath,
            validationEnabled: this.validationEnabled
        })
    }
}

class AlreadyStartedError extends Error { }