let langserver = null;

exports.activate = async function () {
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
        validationEnabled = nova.workspace.config.get("pyright.validation_enabled"),
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

        try {
            await langserver.start()
        } catch (e) {
            handleStartupError(e)
        }
    })
    nova.workspace.config.observe("pyright.validation_enabled",
        (isEnabled) => {
            langserver.validationEnabled = isEnabled;
        }
    );

    try {
        await langserver.start()
    } catch (e) {
        handleStartupError(e)
    }
}

exports.deactivate = function () {
    if (langserver) {
        langserver.deactivate();
        langserver = null;
    }
}

function handleStartupError(error) {

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

    async start() {
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

        this.languageClient.start()
    }

    deactivate() {
        // To-do
    }

    changePath(newPath) {
        return new PyrightLanguageServer({
            path: newPath,
            validationEnabled: this.validationEnabled
        })
    }
}

class AlreadyStartedError extends Error { }