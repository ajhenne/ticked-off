import * as chrono from 'chrono-node';
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	appendCompletionDate: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	appendCompletionDate: true
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// Task completion command.
		this.addCommand({
			id: 'toggle-task-complete',
			name: 'Toggle task completion',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);

				const isTodo = /^\s*-\s\[\s\]/.test(line);
				const isDone = /^\s*-\s\[x\]/i.test(line);

				if (!isTodo && !isDone) {
					new Notice("Not a task line.");
					return;
				}

				let newLine = line;
				const today = window.moment().format("YYYY-MM-DD");

				if (isTodo) {
					newLine = newLine.replace("[ ]", "[x]");
					if (this.settings.appendCompletionDate) {
						newLine = newLine.replace(/\s*\[completed:: \[\[[^\]]*\]\]\]/, "");
						newLine += ` [completed:: [[${today}]]]`;
					}
				} else {
					newLine = newLine.replace("[x]", "[ ]");
					if (this.settings.appendCompletionDate) {
						newLine = newLine.replace(/\s*\[completed:: \[\[[^\]]*\]\]\]/, "");
					}					
				}

				editor.setLine(cursor.line, newLine);
					}
				});

				
		// Add task menu.
		this.addCommand({
			id: 'new-task',
			name: 'New task',
			editorCallback: (editor: Editor, view: MarkdownView) => {

				const cursor = editor.getCursor();
				const prefillText = editor.getLine(cursor.line).trim()

				new CreateTaskModal(this.app, prefillText).open();

				}
			});

		// Add settings.
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class CreateTaskModal extends Modal {
	descriptionInput: HTMLInputElement;
	selectedPriority: string;
	tagInput: HTMLInputElement;
	dueInput: HTMLInputElement;
	tagsInput: HTMLInputElement;
	scheduledInput: HTMLInputElement;
	private prefillText: string;
	private hadCheckbox: boolean = false;

	constructor(app: App, prefillText: string = "") {
		super(app);
		this.prefillText = prefillText;
		this.selectedPriority = 'normal';
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Task name.
		const taskRow = contentEl.createDiv({ cls: 'ticked-off-row' });

		const descLabel = taskRow.createEl('label', { text: 'Task label:' });
		descLabel.addClass("ticked-off-label");
		
		this.descriptionInput = taskRow.createEl('input', { type: 'text', placeholder: 'Enter task name' });
		this.descriptionInput.addClass('ticked-off-text');

		let filteredPrefillText = this.prefillText;

		if (filteredPrefillText.includes("- [ ]")) {
			this.hadCheckbox = true;
			filteredPrefillText = filteredPrefillText.replace("- [ ]", "").trim();
		}
		this.descriptionInput.value = filteredPrefillText


		// Priority buttons row.
		const priorityRow = contentEl.createDiv({ cls: 'ticked-off-row' });

		const priorityLabel = priorityRow.createEl('label', { text: 'Priority:' });
		priorityLabel.addClass("ticked-off-label");

		const buttonContainer = priorityRow.createDiv({ cls: 'ticked-off-priority-buttons' });

		const priorities = ['low', 'normal', 'high', 'urgent'];
		priorities.forEach(priority => {
			const button = buttonContainer.createEl('button', { text: priority });
			button.addClass('ticked-off-button');
			if (priority === this.selectedPriority) {
				button.addClass('selected');
			}

			button.addEventListener('click', () => {
				this.selectedPriority = priority;
				buttonContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
				button.addClass('selected');
			});
		});


		// Due input
		const dueRow = contentEl.createDiv({ cls: 'ticked-off-row' });

		const dueLabel = dueRow.createEl('label', { text: 'Due date:' });
		dueLabel.addClass("ticked-off-label");

		this.dueInput = dueRow.createEl('input', { type: 'text', placeholder: "e.g. 'friday', 'tomorrow', '24/04'" });
		// this.dueInput.addClass("ticked-off-text");	

		this.dueInput.addEventListener('blur', () => {
			const dueRaw = this.dueInput.value.trim();
			const parsedDate = chrono.parseDate(dueRaw, new Date(), { forwardDate: true });
			if (dueRaw == "") {
				this.dueInput.removeClass('ticked-off-invalid-date');
			}
			else if (parsedDate) {
				this.dueInput.removeClass('ticked-off-invalid-date');
				this.dueInput.value = window.moment(parsedDate).format("YYYY-MM-DD");
			} else {
				this.dueInput.addClass('ticked-off-invalid-date');
			}
		});
		
		// Due input
		const scheduleRow = contentEl.createDiv({ cls: 'ticked-off-row' });

		const scheduleLabel = scheduleRow.createEl('label', { text: 'Scheduled:' });
		scheduleLabel.addClass("ticked-off-label");

		this.scheduledInput = scheduleRow.createEl('input', { type: 'text', placeholder: "e.g. 'friday', 'tomorrow', '24/04'" });

		this.scheduledInput.addEventListener('blur', () => {
			const scheduleRaw = this.scheduledInput.value.trim();
			const parsedDate = chrono.parseDate(scheduleRaw, new Date(), { forwardDate: true });
			if (scheduleRaw == "") {
				this.scheduledInput.removeClass('ticked-off-invalid-date');
			}
			else if (parsedDate) {
				this.scheduledInput.removeClass('ticked-off-invalid-date');
				this.scheduledInput.value = window.moment(parsedDate).format("YYYY-MM-DD");
			} else {
				this.scheduledInput.addClass('ticked-off-invalid-date');
			}
		});


		// Task name.
		const tagsRow = contentEl.createDiv({ cls: 'ticked-off-row' });

		const tagsLabel = tagsRow.createEl('label', { text: 'Tags:' });
		tagsLabel.addClass("ticked-off-label");
		
		this.tagsInput = tagsRow.createEl('input', { type: 'text', placeholder: "space or comma separated tags, e.g.: 'work, home'" });
		this.tagsInput.addClass('ticked-off-text');


		// Submit button
		const submitRow = contentEl.createDiv({ cls: 'ticked-off-row'})

		const submitBtn = submitRow.createEl('button', { text: 'Create Task' });
		submitBtn.addClass("ticked-off-submit");
		submitBtn.addEventListener('click', (e) => {
			e.preventDefault();
			const desc = this.descriptionInput.value.trim();
			const priority = this.selectedPriority;
			const due = this.dueInput.value;
			const schedule = this.scheduledInput.value;
			const tags = this.tagsInput.value.replace(" ", "#").replace(",", "");

			const editor = this.app.workspace.activeEditor?.editor;

			if (editor) {

				let taskLine = `- [ ] ${desc}`;
				
				if (priority) taskLine += ` [priority:: ${priority}]`;
				if (due) taskLine += ` [due:: [[${due}]]]`;
				if (schedule) taskLine += ` [schedule:: [[${schedule}]]]`;
				if (tags) taskLine += ` [tags::#${tags}]`

				const cursor = editor.getCursor();
				editor.setLine(cursor.line, taskLine);

				editor.setCursor({ line: cursor.line, ch: taskLine.length });
			}
			this.close();
		});



	}
}


class SettingsTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Task complete creation date')
			.setDesc('Toggle whether the task completion command will append/remove a \'compeleted\' field.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.appendCompletionDate)
				.onChange(async (value) => {
					this.plugin.settings.appendCompletionDate = value;
					await this.plugin.saveSettings();
				}));
	}
}
