export function updateBadge(payload) {
	const isOn = !!(payload && payload.state);
	isOn ? on() : off();
	return isOn;
}

function off() {
	setColor('#ff3c2f');
	setText('off');
}

function on() {
	setColor('#34c759');
	setText('on');
}

function setColor(color) {
	chrome.action.setBadgeBackgroundColor({ color: color }, () => {});
}

function setText(text) {
	chrome.action.setBadgeText({ text: text }, () => {});
}
