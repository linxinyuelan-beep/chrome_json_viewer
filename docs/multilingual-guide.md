# 多语言支持指南

## 当前支持的语言

- 🇨🇳 中文 (`index.html`)
- 🇺🇸 English (`index-en.html`)

## 添加新语言

语言切换器现在使用下拉菜单设计，方便扩展更多语言。要添加新语言：

### 1. 创建新的语言文件

复制现有文件并翻译内容：
```bash
# 例如添加日语支持
cp index-en.html index-ja.html
cp index.html index-ko.html  # 韩语
```

### 2. 更新语言下拉菜单

在每个语言文件中，找到 `.language-options` 部分并添加新选项：

```html
<div class="language-options" id="languageOptions">
    <a href="./index.html" class="language-option">🇨🇳 中文</a>
    <a href="./index-en.html" class="language-option">🇺🇸 English</a>
    <a href="./index-ja.html" class="language-option">🇯🇵 日本語</a>
    <a href="./index-ko.html" class="language-option">🇰🇷 한국어</a>
    <!-- 添加更多语言... -->
</div>
```

### 3. 更新当前语言显示

在新的语言文件中，更新 `.language-current` 部分：

```html
<!-- 日语版本 -->
<div class="language-current" onclick="toggleLanguageDropdown()">
    <span>🇯🇵 日本語</span>
    <span class="language-dropdown-icon">▼</span>
</div>

<!-- 韩语版本 -->
<div class="language-current" onclick="toggleLanguageDropdown()">
    <span>🇰🇷 한국어</span>
    <span class="language-dropdown-icon">▼</span>
</div>
```

### 4. 设置活跃状态

在对应的语言选项上添加 `active` 类：

```html
<!-- 在日语版本中 -->
<a href="./index-ja.html" class="language-option active">🇯🇵 日本語</a>

<!-- 在韩语版本中 -->
<a href="./index-ko.html" class="language-option active">🇰🇷 한국어</a>
```

## 建议的语言代码

| 语言 | 文件名 | 国旗 | 显示名称 |
|------|--------|------|----------|
| 中文 | `index.html` | 🇨🇳 | 中文 |
| English | `index-en.html` | 🇺🇸 | English |
| 日本語 | `index-ja.html` | 🇯🇵 | 日本語 |
| 한국어 | `index-ko.html` | 🇰🇷 | 한국어 |
| Français | `index-fr.html` | 🇫🇷 | Français |
| Deutsch | `index-de.html` | 🇩🇪 | Deutsch |
| Español | `index-es.html` | 🇪🇸 | Español |
| Русский | `index-ru.html` | 🇷🇺 | Русский |

## 下拉菜单特性

### ✨ 功能特点

1. **美观设计**: 圆角边框、阴影效果、平滑动画
2. **响应式**: 自适应移动端和桌面端
3. **交互友好**: 
   - 点击展开/收起
   - 点击外部区域自动关闭
   - 悬停高亮效果
   - 当前语言高亮显示

### 🎨 视觉效果

- **展开动画**: 下拉菜单有淡入和位移动画
- **箭头旋转**: 展开时箭头旋转180度
- **状态变化**: 展开时按钮背景变为主题色
- **选项悬停**: 鼠标悬停时背景高亮

### 📱 移动端优化

- 减小字体大小和内边距
- 调整最小宽度适应小屏幕
- 保持所有交互功能

## 使用示例

用户体验流程：
1. 点击语言按钮展开下拉菜单
2. 看到所有可用语言选项
3. 点击目标语言切换页面
4. 当前语言在按钮中显示并在下拉菜单中高亮

这个设计让多语言切换变得直观且易于扩展！
