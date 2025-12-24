# 黑白名单功能更新说明

## 更新内容 (v1.0.24+)

### ✅ 已实现的改进

#### 1. 右键菜单智能控制
右键菜单现在会根据黑白名单设置自动显示或隐藏：

**黑名单模式：**
- ✅ 在黑名单中的网站：右键菜单不显示
- ✅ 不在黑名单中的网站：右键菜单正常显示

**白名单模式：**
- ✅ 在白名单中的网站：右键菜单正常显示
- ✅ 不在白名单中的网站：右键菜单不显示

**禁用模式：**
- ✅ 所有网站：右键菜单正常显示

**实现细节：**
- 自动检测当前标签页 URL
- 标签页切换时自动更新菜单状态
- URL 改变时自动更新菜单状态
- 黑白名单设置改变时自动更新菜单状态

#### 2. 优化的用户体验

**添加/删除网站时不再自动刷新页面：**
- ✅ 添加网站到列表 → 无需刷新
- ✅ 删除网站从列表 → 无需刷新
- ✅ 添加当前网站 → 无需刷新

**仅在切换模式时建议刷新：**
- ⚠️ 切换过滤模式（禁用/黑名单/白名单）→ 建议刷新页面以应用更改

**用户界面改进：**
- 添加了醒目的提示框，提醒用户需要刷新页面才能应用过滤设置的更改
- 提示框使用黄色背景，更容易被注意到
- 中英文都有对应的提示文本

### 🔧 技术实现

#### 右键菜单控制
```typescript
// background.ts
async function setupContextMenu(tabUrl?: string) {
    // 获取网站过滤配置
    const filterConfig = await getSiteFilterConfig();
    
    // 检查当前网站是否应该启用扩展
    let shouldShowMenu = true;
    if (tabUrl) {
        shouldShowMenu = shouldEnableOnSite(tabUrl, filterConfig);
    }
    
    // 根据 shouldShowMenu 决定是否创建右键菜单
    if (shouldShowMenu) {
        chrome.contextMenus.create({...});
    }
}
```

#### 监听器设置
```typescript
// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
        setupContextMenu(tab.url);
    }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        setupContextMenu(tab.url);
    });
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.siteFilterConfig) {
        setupContextMenu(currentTabUrl);
    }
});
```

#### 移除自动刷新
```typescript
// popup.tsx - 之前的实现
const handleAddSite = async () => {
    await addSiteToFilter(site);
    // 🚫 移除了这部分
    // chrome.tabs.query({}, (tabs) => {
    //     tabs.forEach(tab => chrome.tabs.reload(tab.id));
    // });
};

// popup.tsx - 新的实现
const handleAddSite = async () => {
    await addSiteToFilter(site);
    setSiteList(newList);
    // ✅ 不再自动刷新
};
```

### 📋 使用说明

#### 工作流程

1. **添加/删除网站**
   ```
   用户操作 → 列表更新 → 设置保存
   （不刷新页面）
   ```

2. **切换到已配置的网站**
   ```
   切换标签页/导航到新URL → 检测黑白名单 → 更新右键菜单
   ```

3. **刷新页面**
   ```
   用户手动刷新 → Content Script 重新初始化 → 应用过滤设置
   ```

#### 最佳实践

**添加多个网站：**
1. 在 Site Filter 界面连续添加多个网站
2. 无需每次都刷新
3. 全部添加完后，刷新需要应用设置的页面

**测试配置：**
1. 添加测试网站到列表
2. 切换到该网站的标签页
3. 检查右键菜单是否正确显示/隐藏
4. 刷新页面测试 JSON 检测功能

**快速调整：**
1. 发现某个网站需要加入黑白名单
2. 打开 popup，添加当前网站
3. 刷新页面即可生效（不影响其他标签页）

### 🎯 行为对照表

| 操作 | 右键菜单 | JSON检测 | 是否刷新 |
|------|---------|---------|---------|
| 添加网站到列表 | 立即更新 | 需刷新 | ❌ |
| 删除网站从列表 | 立即更新 | 需刷新 | ❌ |
| 切换过滤模式 | 立即更新 | 需刷新 | ❌ |
| 切换标签页 | 自动更新 | - | - |
| URL 改变 | 自动更新 | - | - |
| 刷新页面 | - | 自动应用 | ✅ |

### 💡 为什么这样设计？

**右键菜单立即生效的原因：**
- 右键菜单由 background script 控制，是全局的
- 可以即时检测当前标签页 URL 并做出响应
- 不需要重新加载页面就能更新

**JSON检测需要刷新的原因：**
- JSON 检测功能在 content script 中运行
- Content script 在页面加载时注入
- 需要重新加载页面才能重新初始化 content script

**不自动刷新的好处：**
- 不会打断用户当前的操作
- 避免丢失未保存的表单数据
- 让用户自主控制何时刷新
- 可以一次性配置多个网站后统一刷新

### 🐛 已知限制

1. **Content Script 限制**
   - JSON 检测功能需要刷新页面才能生效
   - 这是 Chrome 扩展的架构限制

2. **特殊页面**
   - chrome:// 页面无法注入 content script
   - 扩展自身页面不受黑白名单控制

3. **页面状态**
   - 刷新页面会丢失页面的运行时状态
   - 建议在适当的时机手动刷新

### 📝 更新日志

**v1.0.24+**
- ✅ 实现右键菜单根据黑白名单智能显示/隐藏
- ✅ 移除添加/删除网站时的自动刷新
- ✅ 添加页面提示，说明需要刷新才能应用更改
- ✅ 优化用户体验，减少不必要的页面重载

### 🔮 未来改进方向

可能的改进方向（暂不实现）：
- 使用 Service Worker 动态注入/移除 content script（技术复杂）
- 提供"刷新所有受影响标签页"的按钮（可选功能）
- 记录需要刷新的标签页，在用户切换时提示（体验改进）

---

**更新日期**: 2024年12月24日  
**版本**: v1.0.24+
