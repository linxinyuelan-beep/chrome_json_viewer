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
    
    // 创建右键菜单项
    chrome.contextMenus.create({
        id: 'formatSelectedJson',
        title: '格式化 JSON (Ctrl+Shift+J)',
        contexts: ['selection'], // 仅在文本选中时显示
    });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'formatSelectedJson' && tab?.id) {
        // 向内容脚本发送消息，格式化选中的JSON
        chrome.tabs.sendMessage(tab.id, { 
            action: 'formatSelectedJson', 
            selectedText: info.selectionText 
        });
    }
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
        (async () => {
            try {
                const windows = await chrome.windows.getAll();
                const currentWindow = await chrome.windows.getCurrent();
                const otherWindow = windows.find(w => w.id !== currentWindow.id);

                if (otherWindow?.id) {
                    const otherWindowId = otherWindow.id;
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

                    if (activeTab?.id) {
                        // Move the tab
                        await chrome.tabs.move(activeTab.id, { windowId: otherWindowId, index: -1 });
                        
                        // Ensure the window is not minimized before focusing
                        if (otherWindow.state === 'minimized') {
                            await chrome.windows.update(otherWindowId, { state: 'normal' });
                        }
                        
                        // Focus the window and activate the tab
                        await chrome.windows.update(otherWindowId, { focused: true });
                        await chrome.tabs.update(activeTab.id, { active: true });
                    }
                } else {
                    console.log('No other window found');
                }
            } catch (error) {
                console.error('Error moving tab:', error);
            }
        })();
        return true; // Indicates an asynchronous response
    }
});