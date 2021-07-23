let clickedEl: HTMLElement = null;
let identifier: string = null;
const inputTags = ['input', 'textarea', 'select'];

function getClickedElementIdentifier(event: Event) {
    clickedEl = event.target as HTMLElement;

    if (!inputTags.includes(clickedEl.nodeName.toLowerCase())) {
        identifier = null;
        return;
    }

    const name = clickedEl.getAttribute('name');
    const id = clickedEl.getAttribute('id');

    if (!isNullOrEmpty(name) && !isNullOrEmpty(id)) {
        identifier = document.getElementsByName(name)?.length === 1 ? name : id;
    } else {
        identifier = isNullOrEmpty(name) ? id : name;
    }
}

function isNullOrEmpty(s: string) {
    return s == null || s === '';
}

document.addEventListener('contextmenu', event => {
    getClickedElementIdentifier(event);
});

chrome.runtime.onMessage.addListener(event => {
    if (event.command === 'getClickedElement' && clickedEl != null) {
        chrome.runtime.sendMessage({
            command: 'getClickedElementResponse',
            sender: 'contextMenuHandler',
            identifier: identifier,
        });
    }
});
