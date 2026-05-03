# JSON Formatter & Viewer 渐进式重构设计

## 背景

当前扩展已经具备 JSON 检测、抽屉查看、新窗口查看、历史、对比、多语言和站点过滤等功能。整体方向合理，但核心文件开始承担过多职责：

- `src/content.ts` 同时负责设置读取、站点过滤、JSON 检测、DOM 高亮、通知、抽屉 fallback、消息处理和生命周期控制。
- `src/utils/reactJsonDrawer.tsx` 与 `src/content.ts` 都包含抽屉创建、拖拽宽度、外部点击关闭和宽度持久化逻辑。
- `src/background.ts` 使用 `(chrome as any).action.sJson` 暂存 JSON 数据，不适合作为 Manifest V3 service worker 生命周期下的稳定数据通道。
- 存储 key、runtime message action、菜单 id、窗口尺寸、节流时间、历史数量和 UI 尺寸等 hard coding 分散在多个文件中。
- JSON “语法有效”“可展示”“适合自动检测”几个概念混在一起，导致不同入口可能采用不同解析和校验策略。

本设计采用 C 方案：渐进综合。每个阶段只处理一条主链路，同时修复该链路旁边的稳定性问题。每阶段都应可独立构建、手测和回滚。

## 目标

1. 降低修改风险，避免一次性大搬家。
2. 先建立构建和行为安全网，再迁移核心边界。
3. 集中协议和配置，减少散落字符串和 magic number。
4. 替换 background 内存暂存 JSON 的方式，让新窗口数据传递更稳定。
5. 统一抽屉宿主实现，减少 DOM 事件和 resize 逻辑重复。
6. 拆分 content script，让 JSON 检测、高亮、消息处理和生命周期各自独立。
7. 统一 JSON 解析语义，让 popup、hover、新窗口和 compare 使用清晰的策略。

## 非目标

- 不重写 UI 视觉风格。
- 不替换 React 或 Webpack 技术栈。
- 不一次性重写 popup、compare、history 等完整页面。
- 不改变用户可见功能和默认行为，除非当前行为明显是 bug。
- 不引入复杂状态管理库。

## 推荐实施顺序

### Phase 0：建立安全网

目的：先确认改动不会悄悄破坏扩展产物和关键入口。

改动范围：

- 修正 `webpack.config.js` 的 `mode`、`devtool` 和 `optimization.minimize` 行为，使 `npm run build` 与 `npm run dev` 行为可预期。
- 增加轻量构建 smoke check，确认 `public/manifest.json`、各 bundle、popup/json-window/json-compare HTML 被正确生成。
- 为纯函数补最小测试覆盖：JSON parser、JSON extractor、site filter。

验证：

- `npm run build` 通过。
- manifest 被复制到 `public/manifest.json`。
- `background.bundle.js`、`content.bundle.js`、`popup.bundle.js`、`json-window.bundle.js`、`json-compare.bundle.js` 存在。
- parser 覆盖大整数、普通数组、空数组、嵌套对象、无效 JSON。
- site filter 覆盖 exact、subdomain、wildcard、blacklist、whitelist。

### Phase 1：集中协议和配置

目的：先消除最容易引入拼写错误和行为分叉的 hard coding。

新增模块：

- `src/config/storageKeys.ts`
- `src/config/messageActions.ts`
- `src/config/uiConstants.ts`
- `src/config/contextMenus.ts`

迁移内容：

- storage keys：`hoverDetectionEnabled`、`jsonDisplayMode`、`defaultViewerMode`、`preferredViewMode`、`siteFilterConfig`、`jsonHistory`。
- message actions：`formatSelectedJson`、`setHoverDetection`、`toggleHoverDetection`、`getHoverDetectionState`、`showJsonFromPopup`、`showJsonInDrawer`、`toggleAutoDetectionTemporarily`、`openJsonWindow`、`openJsonCompare`、`setJsonData`、`openJsonInTab`、`getJson`。
- UI constants：drawer min width、drawer max viewport ratio、drawer max px、notification duration、fade duration、hover throttle delay、load init delay、new window width/height、history size、preview length。
- context menu ids 和 command ids。

约束：

- 本阶段只替换引用，不改变行为。
- 每个常量名表达用途，不把所有东西塞进一个巨大对象。

验证：

- build 通过。
- popup 设置保存和读取正常。
- 右键菜单、快捷键和 runtime message 仍能工作。

### Phase 2：修 JSON 数据传递

目的：替换 background service worker 内存暂存 JSON 的方式。

新增模块：

- `src/utils/jsonPayloadStore.ts`

接口：

- `saveJsonPayload(jsonString: string): Promise<string>`
- `loadJsonPayload(payloadId: string): Promise<string | null>`
- `consumeJsonPayload(payloadId: string): Promise<string | null>`
- `deleteJsonPayload(payloadId: string): Promise<void>`

设计：

- 默认使用 `chrome.storage.session`。
- 如果环境不支持 `chrome.storage.session`，回退到 `chrome.storage.local`。
- payload id 使用时间戳加随机后缀或 `crypto.randomUUID()` 可用时使用 UUID。
- 打开 `json-window.html` 时 URL 只携带 `payloadId`，窗口页面再通过 store 读取 JSON。
- 消费型读取用于一次性打开窗口；非消费型读取可用于刷新容错，具体由窗口入口决定。

迁移：

- `background.ts` 不再写 `(chrome as any).action.sJson`。
- `JsonViewer` 打开新窗口时先保存 payload，再发消息或直接请求 background 打开窗口。
- `json-window.tsx` 从 URL query 中读取 payload id，然后通过 `jsonPayloadStore` 加载数据。
- 保留旧 message action 的兼容处理一个阶段，内部转到新 store，后续再删除。

验证：

- 从右键菜单打开新窗口能显示 JSON。
- 从 drawer 点击新窗口能显示 JSON。
- popup 输入 JSON 后按偏好显示能正常打开。
- 新窗口 URL 不暴露完整 JSON。
- background 不再依赖内存字段保存 JSON。

### Phase 3：统一 Drawer Host

目的：只保留一套抽屉 DOM 宿主、resize、宽度持久化、外部点击关闭和 React mount/unmount 逻辑。

新增模块：

- `src/drawer/drawerHost.ts`
- `src/drawer/renderJsonDrawer.tsx`
- `src/drawer/notification.ts`

职责：

- `drawerHost.ts` 创建和复用 `.json-drawer`，管理 resize、保存宽度、恢复宽度、关闭和清理 document 事件。
- `renderJsonDrawer.tsx` 只负责将 React viewer 渲染到 drawer content 中，并提供 unmount。
- `notification.ts` 只负责页面内通知。

迁移：

- 删除 `content.ts` 中 fallback drawer 的重复 resize 逻辑。
- 删除 `reactJsonDrawer.tsx` 中重复的 drawer 创建和 document listener 管理。
- React viewer 不再依赖 `window.showJsonInDrawerWithReact`，改为 props 注入 `onOpenJson`、`onClose`、`onNavigate` 等回调。

约束：

- document 级事件监听器必须可清理。
- 同一页面重复打开 drawer 不应重复绑定 resize 和 click outside 监听。
- drawer host 不直接关心 JSON 解析细节。

验证：

- hover 双击 JSON 打开 drawer。
- popup 输入 JSON 打开 drawer。
- drawer resize 后重新打开仍恢复宽度。
- 点击 drawer 外部关闭，点击 JSON tree 内部不误关闭。
- 多次打开和关闭后没有重复 document listener 造成的多次触发。

### Phase 4：拆分 Content Script

目的：让内容脚本成为薄 bootstrap，而不是所有页面逻辑的集中点。

新增目录：

- `src/content/index.ts`
- `src/content/settings.ts`
- `src/content/jsonDetection.ts`
- `src/content/highlight.ts`
- `src/content/messages.ts`
- `src/content/lifecycle.ts`

职责：

- `index.ts`：导入样式和 public path，启动生命周期。
- `settings.ts`：读取 hover、site filter、display mode 等设置。
- `jsonDetection.ts`：查找候选 JSON、平衡括号扫描、预筛选。
- `highlight.ts`：文本节点拆分、高亮 span、mouseleave 恢复。
- `messages.ts`：runtime message handler。
- `lifecycle.ts`：DOMContentLoaded、window load、延迟启动 hover 检测。

迁移策略：

- 先搬纯函数，再搬有副作用的 DOM 逻辑。
- 每次搬迁保持原有函数签名或增加小型 adapter。
- 搬完后 `content.ts` 或新的 entry 只保留启动代码。

验证：

- hover detection 开关仍有效。
- 站点 blacklist/whitelist 仍生效。
- 选中 JSON 快捷键仍能显示 drawer。
- popup 到当前 tab 的 message 仍能显示 drawer。

### Phase 5：统一 JSON 解析语义

目的：明确不同调用场景下的 JSON 判定规则。

新增或重构模块：

- `src/utils/jsonParse.ts`
- `src/utils/jsonValidation.ts`
- `src/utils/jsonDetectionRules.ts`

接口：

- `isJsonSyntaxValid(text: string): boolean`
- `parseJsonPreserveLargeNumbers(text: string): unknown`
- `isDisplayableJson(value: unknown): boolean`
- `isAutoDetectCandidate(text: string): boolean`
- `extractJsonCandidates(text: string): string[]`

语义：

- 语法有效只代表 `JSON.parse` 或增强 parser 可解析。
- 可展示 JSON 由 viewer 决定，允许对象和数组；primitive 是否展示需要显式配置，默认保持当前行为。
- 自动检测候选可以继续使用长度、对象/数组、有意义结构等限制，避免页面误报。
- 大整数规则集中在一个 parser 中，阈值保持一致。

验证：

- popup 输入合法数组不被错误拒绝，除非产品明确要求拒绝。
- hover 检测仍避免短文本和空结构误报。
- bigint 示例不丢精度。
- compare 页面解析策略不被 hover 检测策略污染。

### Phase 6：瘦身 React 页面组件

目的：降低 UI 组件复杂度，复用 drawer 和新窗口 viewer 的公共能力。

拆分候选：

- `useJsonClipboard`
- `useJsonPath`
- `useJsonViewerMode`
- `useJsonHistoryDropdown`
- `useJsonNavigation`
- `JsonViewerToolbar`
- `JsonViewerPathBar`
- `JsonViewerShell`

迁移：

- `JsonViewer` 先拆 hooks，再拆小组件。
- `json-window.tsx` 复用路径生成、复制、viewer mode 等逻辑。
- `popup.tsx` 后续再拆成 JSON input、settings、site filter 三块。

约束：

- 不在本阶段重做样式。
- 不改变按钮文案和布局，除非是明显 bug。

验证：

- drawer viewer 和新窗口 viewer 行为一致。
- 复制 JSON、复制 path、展开折叠、切换 editor/tree、历史和 compare 入口仍正常。

## 数据流设计

### Drawer 数据流

1. content/popup/background 得到 JSON string。
2. 调用统一 `showJsonInDrawer(jsonString)`。
3. drawer renderer 使用统一 parser 得到 JSON data。
4. React viewer 通过 props 接收数据和回调。
5. 关闭时 drawer host unmount React，并清理宿主状态。

### New Window 数据流

1. 调用方将 JSON string 保存到 `jsonPayloadStore`。
2. 得到 `payloadId`。
3. background 打开 `json-window.html?payloadId=<id>`。
4. `json-window.tsx` 从 query 读取 payload id。
5. `jsonPayloadStore` 加载或消费 JSON string。
6. 窗口 parser 解析并渲染。

### Message 数据流

所有 runtime message action 使用 `messageActions.ts` 中的常量。消息 payload 应在 TypeScript 中定义最小 discriminated union，至少覆盖 content/background/popup 之间的核心 action。

## 错误处理

- JSON parse 错误应展示用户可理解的错误，不只写 console。
- 打开新窗口失败时，优先 fallback 到 drawer。
- payload 不存在或过期时，`json-window` 展示空状态和错误说明。
- storage 操作失败时返回结构化错误，调用方决定通知用户或 fallback。
- site filter URL 解析失败时继续保持当前保守行为：默认启用。

## 测试策略

自动化优先覆盖纯函数和构建产物：

- parser：大整数、普通数字、字符串中的数字、数组大整数、嵌套对象、非法 JSON。
- extractor/detection：完整 JSON、日志中嵌入 JSON、括号在字符串中、多个候选 JSON。
- site filter：exact、subdomain、wildcard、blacklist、whitelist、非法 URL。
- payload store：save/load/consume/delete，session 不可用时 fallback。

手动 smoke checklist：

- `npm run build`。
- 加载 `public` 目录为 Chrome extension。
- popup 输入 JSON 并显示 drawer。
- 当前页面选中文本右键格式化。
- hover JSON 双击打开 drawer。
- drawer resize、关闭、再次打开。
- drawer 打开新窗口。
- compare 页面从 viewer 带入左侧 JSON。
- 站点 blacklist/whitelist 生效。

## 风险和缓解

- 风险：拆 content script 时 hover 行为回归。缓解：先搬纯函数，保留原事件绑定行为，再迁移副作用。
- 风险：payload store 改动影响新窗口。缓解：短期保留旧 message action 兼容层，内部转新 store。
- 风险：drawer 事件清理不完整。缓解：drawer host 拥有事件生命周期，并在测试清单中重复打开关闭。
- 风险：JSON 校验语义改变导致用户原来能打开的内容被拒绝。缓解：Phase 5 明确语义前不改变现有行为。
- 风险：构建配置修正后产物差异变大。缓解：Phase 0 单独提交，先验证扩展加载和主要入口。

## 完成标准

整个重构完成后，应满足：

- 核心入口行为保持不变。
- `content.ts` 或新的 content entry 只负责启动和组装，不再包含大量 DOM/检测细节。
- drawer 创建和全局事件只存在一套实现。
- background 不再使用内存全局变量暂存 JSON。
- storage keys、message actions、菜单 id 和 UI magic number 都从配置模块引用。
- JSON 解析和检测语义清晰分层。
- 每个 phase 都有可运行 build 和 smoke 验证记录。
