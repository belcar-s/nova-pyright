const { downloadPath } = require("./paths.js");
const { downloadLanguageServer } = require("./download.js");

const LOCK_INTERVAL = 500; // (ms)
const LOCK_LOCATION = nova.path.join(downloadPath, "LOCK!");
const FINISH_MARKER_LOCATION = nova.path.join(downloadPath, "MARKER");

function exists (path) {
	return !!nova.fs.stat(path);
}

/**
 * Lock initialization. This function throws if initialization
 * is already locked.
 */
function lock () {
	nova.fs.open(LOCK_LOCATION, "x");
}
function unlock () {
	nova.fs.remove(LOCK_LOCATION);
}
function markAsFinished () {
	nova.fs.open(FINISH_MARKER_LOCATION, "x");
}
function isFinished () {
	return exists(FINISH_MARKER_LOCATION);
}
function getRandomSequenceOfEmoji (limit) {
	const emoji = ["🌏", "🔦", "🦕", "📒", "🥳", "🐍", "🥓", "🦞", "🪰", "🐞", "🦎"];
	function getRandomEmoji () {
		const index = Math.floor(Math.random() * emoji.length);
		return emoji[index];
	}

	let output = "";
	for (let n = 0; n <= limit; n++) {
		output += getRandomEmoji();
	}
	return output;
}

exports.ensureLanguageServer = async function ensureLanguageServer() {
	if (isFinished()) {
		return;
	}

	let announcementRequest = new NotificationRequest;
	announcementRequest.title =
		nova.localize("Pyright Is Being Downloaded");
	announcementRequest.body =
		nova.localize("Please wait until this process finishes. Language features will be enabled in a moment.");
	nova.notifications.add(announcementRequest);

	try {
		lock();
	} catch {
		// is locked
		console.log("Initialization is locked.");
		return new Promise(resolve => {
			function awaitUnlock () {
				if (exists(LOCK_LOCATION)) {
					// try in at least 500ms
					setTimeout(awaitUnlock, LOCK_INTERVAL);
				} else {
					console.log("Unlocked!!!");
					resolve();
				}
			}
			setTimeout(awaitUnlock, LOCK_INTERVAL);
		});
	}

	// is unlocked
	await downloadLanguageServer("primary");
	markAsFinished();

	let completionRequest = new NotificationRequest;
	completionRequest.title =
		nova.localize("Pyright Was Downloaded");
	completionRequest.body =
		nova.localize(
			"Language features should now be enabled. If you find that this isn't the case, please file an issue on GitHub. Include the following sequence of Emoji: "
			+ getRandomSequenceOfEmoji(5)
		);
	completionRequest.actions = [
		nova.localize("OK"),
	];
	nova.notifications.add(completionRequest);
};

exports.forcefullyUnlock = unlock;