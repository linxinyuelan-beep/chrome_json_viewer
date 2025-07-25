// This file is the content script that interacts with web pages.
// It can manipulate the DOM of the pages the extension is active on.

console.log("Content script loaded.");

// Listen for the 'W' key press
document.addEventListener('keydown', (event) => {
    if (event.key === 'W') {
        console.log('W key pressed, sending message to background script');
        chrome.runtime.sendMessage({ action: 'moveTabToOtherWindow' });
    }
});

interface Rule {
    pattern: string;
    template: string;
}

function updateTitle(rules: Rule[]) {
    const url = window.location.href;

    for (const rule of rules) {
        try {
            if (url === rule.pattern) {
                document.title = rule.template;
                return;
            }
        } catch (error) {
            console.error('Error processing rule:', rule, error);
        }
    }
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes) => {
    if (changes.urlRules) {
        updateTitle(changes.urlRules.newValue);
    }
});

// 初始化
chrome.storage.sync.get(['urlRules'], (result) => {
    if (result.urlRules) {
        updateTitle(result.urlRules);
    }
});

// 页面加载完成后执行，确保 DOM 已经准备好
window.addEventListener('load', () => {
    chrome.storage.sync.get(['urlRules'], (result) => {
        if (result.urlRules) {
            updateTitle(result.urlRules);
        }
    });
});