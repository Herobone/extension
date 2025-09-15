import opendyslexic from '!!raw-loader!@styles/core/opendyslexic.css';

let enabled = false;
let currentFont = 'regular';
let cssInjected = false; // Track if we've already injected the stylesheet
let pendingFontClass = null; // Store desired class if body not yet available

// Unique ID for our <style> tag
const FONT_ID = 'helperbird-font-styles';
// Body class prefix
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
	styleTag.textContent = cssString;
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
	const targetFont = fontName.toLowerCase();

	// Inject CSS only once (unless removed externally)
	if (!cssInjected || !document.getElementById(FONT_ID)) {
		const protocol = chrome.runtime.getURL('');
		let cssString = opendyslexic.toString();
		cssString = cssString.replace(/{{\$browser_extension_protocol}}/g, protocol);
		injectCssInline(FONT_ID, cssString);
		cssInjected = true;
	}

	// Body may not yet exist (document_start)
	if (!document.body) {
		pendingFontClass = targetFont;
		return;
	}

	const desiredClass = BODY_CLASS_PREFIX + targetFont;
	// If already applied, skip work
	if (document.body.classList.contains(desiredClass)) return;

	// Remove previous font variant classes except the one we want
	document.body.classList.forEach((className) => {
		if (className.startsWith(BODY_CLASS_PREFIX) && className !== desiredClass) {
			document.body.classList.remove(className);
		}
	});
	document.body.classList.add(desiredClass);
}

/**
 * Remove all font classes and styles.
 */
function removeFont() {
	// Keep injected CSS for fast re-enable, just remove class markers
	if (document.body) {
		document.body.classList.forEach((className) => {
			if (className.startsWith(BODY_CLASS_PREFIX)) {
				document.body.classList.remove(className);
			}
		});
	}
}

/**
 * Control whether the font is on or off.
 */
function updateFontMode(mode, font) {
	enabled = mode;
	currentFont = font || 'regular';

	if (enabled) {
		applyFont(currentFont);
	} else {
		removeFont();
	}
}

/**
 * Listen for changes in the page so we can react to new elements if needed.
 */
const observer = new MutationObserver(() => {
	if (!enabled) return;
	if (pendingFontClass && document.body) {
		const fontToApply = pendingFontClass;
		pendingFontClass = null;
		applyFont(fontToApply);
	}
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// If DOM already ready when script runs (e.g., re-injection), fulfill pending font
if (document.readyState === 'interactive' || document.readyState === 'complete') {
	if (enabled && pendingFontClass && document.body) {
		const fontToApply = pendingFontClass;
		pendingFontClass = null;
		applyFont(fontToApply);
	}
} else {
	document.addEventListener('DOMContentLoaded', () => {
		if (enabled && pendingFontClass && document.body) {
			const fontToApply = pendingFontClass;
			pendingFontClass = null;
			applyFont(fontToApply);
		}
	});
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
	if (message.type === 'openDyslexicIsOn' || message.type === 'updateFont') {
		updateFontMode(message.enabled || false, message.font || 'regular');
	}
});
