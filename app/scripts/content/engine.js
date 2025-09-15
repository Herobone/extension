import opendyslexic from '!!raw-loader!@styles/core/opendyslexic.css';

// Centralised state (helps future extension and avoids multiple loose globals)
const state = {
	enabled: false,
	currentFont: 'regular',
	cssInjected: false,
	pendingFontClass: null
};

const FONT_ID = 'helperbird-font-styles';
const BODY_CLASS_PREFIX = 'helperbird-font-opendyslexic-';

/**
 * Inject or update a style tag with our CSS.
 */
function injectCssInline(id, cssString) {
	let styleTag = document.getElementById(id);
	if (!styleTag) {
		styleTag = document.createElement('style');
		styleTag.id = id;
		document.head.appendChild(styleTag);
	}
	// Only update if different to reduce style / layout work
	if (styleTag.textContent !== cssString) {
		styleTag.textContent = cssString;
	}
}

/**
 * Remove a style tag by ID.
 */
function removeStyleTag(id) {
	const elem = document.getElementById(id);
	if (elem && elem.parentNode) {
		elem.parentNode.removeChild(elem);
	}
}

/**
 * Put font styles on the page.
 */
function applyFont(fontName) {
	const targetFont = (fontName || 'regular').toLowerCase();

	if (!state.cssInjected || !document.getElementById(FONT_ID)) {
		const protocol = chrome.runtime.getURL('');
		let cssString = opendyslexic
			.toString()
			.replace(/{{\$browser_extension_protocol}}/g, protocol);
		injectCssInline(FONT_ID, cssString);
		state.cssInjected = true;
	}

	if (!document.body) {
		state.pendingFontClass = targetFont;
		return;
	}

	const desiredClass = BODY_CLASS_PREFIX + targetFont;
	const { classList } = document.body;
	if (classList.contains(desiredClass)) return; // No-op

	for (const cls of Array.from(classList)) {
		if (cls.startsWith(BODY_CLASS_PREFIX) && cls !== desiredClass) {
			classList.remove(cls);
		}
	}
	classList.add(desiredClass);
}

/**
 * Remove all font classes and styles.
 */
function removeFont() {
	if (!document.body) return;
	const { classList } = document.body;
	for (const cls of Array.from(classList)) {
		if (cls.startsWith(BODY_CLASS_PREFIX)) {
			classList.remove(cls);
		}
	}
	pendingFontClass = null;
}

/**
 * Control whether the font is on or off.
 */
function updateFontMode(mode, font) {
	state.enabled = !!mode;
	state.currentFont = font || 'regular';
	if (state.enabled) {
		applyFont(state.currentFont);
		if (!observerActive) startObserver();
	} else {
		removeFont();
		stopObserver();
	}
}

/**
 * Listen for changes in the page so we can react to new elements if needed.
 */
let observer = null;
let observerActive = false;

function startObserver() {
	if (observerActive) return;
	observer = new MutationObserver(() => {
		if (!state.enabled) return;
		if (state.pendingFontClass && document.body) {
			const fontToApply = state.pendingFontClass;
			state.pendingFontClass = null;
			applyFont(fontToApply);
		}
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true
	});
	observerActive = true;
}

function stopObserver() {
	if (observer && observerActive) {
		observer.disconnect();
		observerActive = false;
	}
}

// Start early to capture body insertion events
startObserver();

// If DOM already ready when script runs (e.g., re-injection), fulfill pending font
function flushPendingIfReady() {
	if (state.enabled && state.pendingFontClass && document.body) {
		const fontToApply = state.pendingFontClass;
		state.pendingFontClass = null;
		applyFont(fontToApply);
	}
}
if (document.readyState === 'interactive' || document.readyState === 'complete') {
	flushPendingIfReady();
} else {
	document.addEventListener('DOMContentLoaded', flushPendingIfReady, { once: true });
}

/**
 * Load initial settings from storage.
 */
chrome.storage.local.get(['enabled', 'font'], (data) => {
	updateFontMode(data.enabled || false, data.font || 'regular');
});

/**
 * Listen for messages from the background script.
 */
chrome.runtime.onMessage.addListener((message) => {
	if (
		message &&
		(message.type === 'openDyslexicIsOn' || message.type === 'updateFont')
	) {
		updateFontMode(message.enabled || false, message.font || 'regular');
	}
});
