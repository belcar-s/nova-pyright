// I think using a class is pretty.
export class Element {
	name: string;
	value: string;
	parent: Element | null;

	constructor(
		name: string,
		value: string,
		{ parent }: { parent: Element | null }
	) {
		this.name = name;
		this.value = value;
		this.parent = parent;
	}
}

export class StatusDataProvider implements TreeDataProvider<Element> {
	status: Element;
	version: Element;
	treeView: TreeView<Element> | null;

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

		// assigned in `main.ts`
		this.treeView = null;
	}

	/*
	Updaters */
	updateStatus(newStatus: string) {
		this.status.value = newStatus;
		this.treeView.reload(this.status);
	}

	updateVersion(newVersion: string) {
		this.version.value = newVersion;
		this.treeView.reload(this.version);
	}

	/*
	TreeDataProvider Interface Methods */
	// These methods are run by Nova.
	getChildren(element: Element | null) {
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

	getParent(element: Element | null) {
		// This is optional.

		// (?) I'm not sure this is effective.
		return element.parent;
	}

	getTreeItem({name, value}: {name: string, value: string}) {
		let item = new TreeItem(name);
		item.descriptiveText = value;
		return item;
	}
}
