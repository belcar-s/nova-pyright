// I think using a class is pretty.
class Element {
	constructor(name, value, { parent }) {
		this.name = name;
		this.value = value;
		this.parent = parent;
	}
}

class StatusDataProvider {
	constructor() {
		// set a default status element
		this.status = new Element(
			nova.localize("Status"),
			nova.localize("Stopped"),
			{ parent: null } // parent: top level
		);

		// set a default version element
		this.version = new Element(
			nova.localize("Version"),
			nova.localize("Unavailable"),
			{ parent: null }
		);

		// assigned in `main.js`
		this.treeView = null;
	}

	/*
	Updaters */
	updateStatus(newStatus) {
		this.status.value = newStatus;
		this.treeView.reload(this.status);
	}

	updateVersion(newVersion) {
		this.version.value = newVersion;
		this.treeView.reload(this.version);
	}

	/*
	TreeDataProvider Interface Methods */
	// These methods are run by Nova.
	getChildren(element) {
		if (element == null) {
			// `element == null` if this function's
			// outcome determines the content of the
			// section's top level.

			return [
				this.status,
				this.version,
			];
		}
	}

	getParent(element) {
		// This is optional.

		// (?) I'm not sure this is effective.
		return element.parent;
	}

	getTreeItem({name, value}) {
		let item = new TreeItem(name);
		item.descriptiveText = value;
		return item;
	}
}
exports.StatusDataProvider = StatusDataProvider;