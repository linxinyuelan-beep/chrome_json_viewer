// background.ts

interface Rule {
    pattern: string;
    template: string;
}

// 存储当前的规则列表
let rules: Rule[] = [];

// 从 storage 加载规则
chrome.storage.sync.get(['urlRules'], (result) => {
    rules = result.urlRules || [];
    console.log('Loaded rules:', rules);
});

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes) => {
    if (changes.urlRules) {
        rules = changes.urlRules.newValue || [];
        console.log('Rules updated:', rules);
    }
});

// 当标签页更新时检查 URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', { tabId, url: tab.url });
        applyUrlRules(tab);
    }
});

// 应用 URL 规则
async function applyUrlRules(tab: chrome.tabs.Tab) {
    if (!tab.url || !tab.id) return;

    // 跳过扩展页面和特殊页面
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return;
    }

    console.log('Applying rules for tab debug:', { tabId: tab.id, url: tab.url });

    for (const rule of rules) {
        try {
            if (tab.url === rule.pattern && tab.id) {  // 确保 tab.id 存在
                console.log('URL matched:', rule);
                const tabId = tab.id;  // 将 tab.id 存储在一个常量中
                // 修改标题
                await chrome.scripting.executeScript({
                    target: { tabId },  // 使用常量
                    func: (title) => { document.title = title; },
                    args: [rule.template]
                });
                
                setTimeout(async () => {
                    await chrome.scripting.executeScript({
                        target: { tabId },  // 使用常量
                        func: (title) => { document.title = title; },
                        args: [rule.template]
                    });
                    console.log('Title updated for tab:', tabId);
                }, 2000); // 延迟 2 秒执行
                return;
            }
        } catch (error) {
            console.error('Error applying rule:', error);
        }
    }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Chrome extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setTabName') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (title: string) => { 
                        document.title = title;
                    },
                    args: [request.tabName]
                });
            }
        });
    } else if (request.action === 'getData') {
        sendResponse({ data: 'Sample data' });
    } else if (request.action === 'moveTabToOtherWindow') {
        // Get all Chrome windows
        chrome.windows.getAll({ populate: true }, (windows) => {
            // Get the current window
            chrome.windows.getCurrent((currentWindow) => {
                // Find another window that is not the current one
                const otherWindow = windows.find(w => w.id !== currentWindow.id);
                
                if (otherWindow?.id) {
                    // Get the active tab in the current window
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0].id) {
                            // Move the active tab to the other window
                            chrome.tabs.move(tabs[0].id, { windowId: otherWindow.id, index: -1 });
                        }
                    });
                } else {
                    console.log('No other window found');
                }
            });
        });
    }
});