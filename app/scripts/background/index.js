import { isEmpty } from '@scripts/content/utils.js';
import { updateBadge } from '@scripts/content/badge.js';

chrome.storage.onChanged.addListener(async (changes, areaName) => {
	if (areaName !== 'local' && areaName !== 'sync') return;

	// Only query storage for what actually changed
	let currentFontValue = null;
	let enabledValue = null;

	// Update badge if enabled changed
	if (changes.enabled) {
		const newMode = !!changes.enabled.newValue;
		updateBadge({ state: newMode });

		const storedFont = await getStorage('font');
		currentFontValue = storedFont.found ? storedFont.item : 'regular';

		sendToAllTabs({
			type: 'openDyslexicIsOn',
			enabled: newMode,
			font: currentFontValue
		});
	}

	if (changes.font) {
		const newFont = changes.font.newValue;

		const storedEnabled = await getStorage('enabled');
		enabledValue = storedEnabled.found ? storedEnabled.item : false;

		sendToAllTabs({
			type: 'updateFont',
			font: newFont,
			enabled: !!enabledValue
		});
	}
});

function sendToAllTabs(message) {
	try {
		chrome.tabs.query({}, (tabs) => {
			for (const tab of tabs) {
				if (tab && tab.id != null) {
					chrome.tabs.sendMessage(tab.id, message);
				}
			}
		});
	} catch (error) {}
}

async function getStorage(key) {
	const data = {
		found: false,
		item: ''
	};

	if (isEmpty(key)) {
		return data;
	}

	try {
		const result = await chrome.storage.local.get(key);
		if (!isEmpty(result[key])) {
			data.found = true;
			data.item = result[key];
		}
	} catch (err) {
		return data;
	}

	return data;
}

/**
 * Load initial settings from storage.
 */
chrome.storage.local.get(['enabled'], (data) => {
	updateBadge({ state: data.enabled || false });
});
