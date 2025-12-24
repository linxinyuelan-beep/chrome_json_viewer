# Site Filter (Blacklist/Whitelist) 功能说明

## 功能概述

Site Filter（网站过滤）功能允许用户控制 JSON Formatter & Viewer 扩展在哪些网站上生效。支持三种模式：

1. **禁用模式 (Disabled)** - 扩展在所有网站上启用
2. **黑名单模式 (Blacklist)** - 扩展在列表中的网站上禁用，在其他网站上启用
3. **白名单模式 (Whitelist)** - 扩展仅在列表中的网站上启用，在其他网站上禁用

## 使用方法

### 1. 打开设置界面

1. 点击浏览器工具栏中的扩展图标
2. 在弹出窗口中点击"网站过滤"（Site Filter）标签页

### 2. 选择过滤模式

在"过滤模式"下拉菜单中选择以下之一：

- **已禁用** - 默认模式，扩展在所有网站上工作
- **黑名单模式** - 在列表中的网站上禁用扩展
- **白名单模式** - 仅在列表中的网站上启用扩展

### 3. 添加网站

有两种方式添加网站：

#### 方式 1：手动输入
1. 在输入框中输入网站域名或模式
2. 点击"添加网站"按钮
3. 支持的格式示例：
   - `example.com` - 精确匹配 example.com 及其子域名（如 www.example.com）
   - `*.example.com` - 仅匹配 example.com 的子域名（不包括 example.com 本身）
   - `*example*` - 匹配任何包含 "example" 的域名

#### 方式 2：添加当前网站
1. 在需要添加的网站页面上打开扩展弹窗
2. 点击"添加当前网站"按钮
3. 当前网站的域名会自动添加到列表中

### 4. 管理网站列表

- 查看已添加的网站列表
- 点击每个网站旁边的"移除"按钮可以从列表中删除该网站
- 列表会实时保存到浏览器存储中

## 模式匹配规则

### 精确匹配
```
example.com
```
- 匹配：`example.com`、`www.example.com`、`sub.example.com`
- 不匹配：`notexample.com`、`example.org`

### 子域名通配符
```
*.example.com
```
- 匹配：`www.example.com`、`sub.example.com`、`any.sub.example.com`
- 不匹配：`example.com`（主域名）

### 全局通配符
```
*example*
```
- 匹配：`example.com`、`myexample.com`、`example-site.org`、`notexamplehere.net`

## 使用场景

### 黑名单模式使用场景

适用于你希望在大多数网站上使用扩展，但需要在某些特定网站上禁用的情况：

**示例 1：在内部网站禁用**
```
内网环境可能有特殊的 JSON 显示需求，不希望被扩展影响：
- intranet.company.com
- *.internal.company.com
```

**示例 2：在特定开发工具网站禁用**
```
某些开发工具已有自己的 JSON 查看器：
- postman.com
- insomnia.rest
```

### 白名单模式使用场景

适用于你只希望在少数特定网站上使用扩展的情况：

**示例 1：仅在 API 文档网站启用**
```
只在查看 API 文档时使用：
- api.example.com
- docs.example.com
- *.swagger.io
```

**示例 2：仅在开发环境启用**
```
只在开发测试环境使用：
- localhost
- *.dev.company.com
- *.test.company.com
```

## 常见问题

### Q: 更改设置后需要刷新页面吗？
A: 是的，更改过滤设置后，扩展会自动重新加载所有标签页以应用新设置。

### Q: 可以同时使用黑名单和白名单吗？
A: 不可以，你只能选择一种模式。建议根据你的使用习惯选择：
- 如果大部分网站都需要使用，选择黑名单模式
- 如果只在少数网站使用，选择白名单模式

### Q: 通配符 * 可以放在域名的任何位置吗？
A: 是的，通配符可以放在域名的任何位置。例如：
- `*.example.com` - 开头
- `example.*` - 结尾
- `*example*` - 中间

### Q: 如何临时禁用所有过滤规则？
A: 将过滤模式设置为"已禁用"即可。

### Q: 网站列表保存在哪里？
A: 列表保存在 Chrome 的本地存储中（chrome.storage.local），不会上传到云端，仅在当前浏览器中生效。

## 技术实现

### 文件结构
```
src/utils/siteFilter.ts        # 黑白名单逻辑实现
src/popup.tsx                   # UI 界面实现
src/content.ts                  # 内容脚本中的过滤检查
src/utils/i18n.ts              # 国际化文本
```

### 核心函数
- `getSiteFilterConfig()` - 获取过滤配置
- `saveSiteFilterConfig()` - 保存过滤配置
- `shouldEnableOnSite()` - 判断扩展是否应在当前网站启用
- `addSiteToFilter()` - 添加网站到列表
- `removeSiteFromFilter()` - 从列表中移除网站

## 版本历史

- v1.0.24 - 初始实现黑白名单功能

## 反馈

如有问题或建议，请访问：
https://github.com/linxinyuelan-beep/chrome_json_viewer
