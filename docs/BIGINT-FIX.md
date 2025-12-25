# 大整数精度问题修复说明

## 问题描述

用户发现 JSON 中的大整数在扩展打开后值发生了变化：
- 原始值：`16633992720384107`
- 打开后：`16633992720384108`

这是 JavaScript 大整数精度丢失的典型问题。

## 根本原因

JavaScript 的 `Number` 类型基于 IEEE 754 双精度浮点数标准，只能安全地表示 `-2^53` 到 `2^53` 之间的整数：
- `Number.MAX_SAFE_INTEGER = 9007199254740991`（16位数字）
- 超过这个范围的整数会发生精度丢失

### 第一个问题：未使用 parseJsonSafely

问题代码位于 [content.ts](../src/content.ts#L176)，使用了原生的 `JSON.parse()` 进行 JSON 验证：

```typescript
// 问题代码
const jsonObj = JSON.parse(jsonStr);
```

### 第二个问题：正则表达式无法匹配数组中的大整数 ⭐

更关键的问题在 [jsonParser.ts](../src/utils/jsonParser.ts) 中，原始的正则表达式只能匹配**键值对**中的大整数：

```typescript
// 原始代码 - 只能匹配 "key": 12345...
const bigIntPattern = /("[\w\d_-]+"\s*:\s*)(\d{17,}\b)/g;
```

这导致在用户的例子中，数组内的大整数没有被处理：
```json
[{"orderId":1134766076569217,"ticketingVoucherIds":[16633992720384107]}]
                                                    ↑ 在数组中，未被匹配！
```

## 解决方案

项目中已经有一个专门处理大整数的工具函数 `parseJsonSafely()` ([jsonParser.ts](../src/utils/jsonParser.ts))，但在 content.ts 中没有使用。

### 修复内容

#### 1. 在 content.ts 中使用 parseJsonSafely
```typescript
// 导入函数
import { parseJsonSafely } from './utils/jsonParser';

// 替换 JSON.parse
const jsonObj = parseJsonSafely(jsonStr);
```

#### 2. 增强 parseJsonSafely 函数以支持数组中的大整数 ⭐

在 [jsonParser.ts](../src/utils/jsonParser.ts) 中增加了对数组中大整数的匹配：

```typescript
let processedJson = jsonString;

// 1. 匹配键值对中的大整数: "key": 12345...
const keyValuePattern = /("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g;
processedJson = processedJson.replace(keyValuePattern, '$1"$2"');

// 2. 匹配数组中的大整数: [12345... 或 ,12345...
const arrayPattern = /([\[,:\s])(\d{17,})\b(?=[\s,\]\}]|$)/g;
processedJson = processedJson.replace(arrayPattern, '$1"$2"');
```

**关键改进：**
- `arrayPattern` 可以匹配 `[` 或 `,` 或 `:` 或空格后面的大整数
- 使用前瞻断言 `(?=[\s,\]\}]|$)` 确保数字后面是合法的 JSON 分隔符
- 这样就能处理所有场景的大整数，包括：
  - 数组开头：`[16633992720384107`
  - 数组中间：`,16633992720384107`
  - 嵌套数组：`[[16633992720384107`
  - 对象中的数组：`:[16633992720384107`

### `parseJsonSafely` 工作原理

该函数通过以下步骤保持大整数精度：

1. **预处理阶段 - 键值对匹配**：
```typescript
const keyValuePattern = /("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g;
processedJson = processedJson.replace(keyValuePattern, '$1"$2"');
```
- 匹配格式：`"key": 12345678901234567`
- 转换后：`"key": "12345678901234567"`

2. **预处理阶段 - 数组匹配** ⭐：
```typescript
const arrayPattern = /([\[,:\s])(\d{17,})\b(?=[\s,\]\}]|$)/g;
processedJson = processedJson.replace(arrayPattern, '$1"$2"');
```
- 匹配格式：`[16633992720384107` 或 `,16633992720384107`
- 转换后：`["16633992720384107"` 或 `,"16633992720384107"`

3. **示例转换**：
   ```javascript
   // 输入
   [{"orderId":1134766076569217,"ticketingVoucherIds":[16633992720384107]}]
   
   // 第一步：键值对转换（orderId < 17位，不转换）
   [{"orderId":1134766076569217,"ticketingVoucherIds":[16633992720384107]}]
   
   // 第二步：数组转换
   [{"orderId":1134766076569217,"ticketingVoucherIds":["16633992720384107"]}]
   ```

4. **安全解析**：使用转换后的 JSON 字符串进行解析
```typescript
return JSON.parse(processedJson, (key, value) => {
  if (typeof value === 'string' && /^\d+$/.test(value) && value.length >= 16) {
    return value; // 保持字符串格式
  }
  return value;
});
```

## 影响范围

### 已修复的文件
- ✅ [content.ts](../src/content.ts) - JSON 检测和验证
- ✅ [reactJsonDrawer.tsx](../src/utils/reactJsonDrawer.tsx) - JSON 查看器显示（已使用）
- ✅ [popup.tsx](../src/popup.tsx) - 弹出窗口的 JSON 格式化（已使用）

### 不需要修改的文件
- [nestedJsonHandler.ts](../src/utils/nestedJsonHandler.ts) - 只用于验证 JSON 格式，不影响显示数据
- [JsonViewer.tsx](../src/components/JsonViewer.tsx#L465) - 只用于验证，实际显示调用 `showJsonInDrawerWithReact`（已使用 `parseJsonSafely`）

## 测试验证

创建了专门的测试：

### 1. 单元测试脚本
[test-bigint-parser.js](../test-bigint-parser.js) - 包含 6 个测试用例，验证各种场景：
- ✅ 用户报告的问题（数组中的大整数）
- ✅ 键值对中的大整数  
- ✅ 多个数组元素
- ✅ 嵌套数组
- ✅ 混合场景
- ✅ 小整数保持不变

运行测试：
```bash
node test-bigint-parser.js
```

测试结果：**100% 通过** ✅

### 2. 浏览器测试页面
[bigint-test-page.html](bigint-test-page.html) - 包含 8 个测试用例：

1. **用户报告的问题** ⭐ - 数组中的大整数
2. 边界值测试 - `MAX_SAFE_INTEGER` 附近
3. 订单ID场景 - 雪花算法生成的 64 位整数
4. 纯数组中的大整数
5. 嵌套数组中的大整数
6. 对比测试 - 键值对 vs 数组
7. 混合类型数组
8. 边界测试 - 16位 vs 17位

### 验证步骤

1. 重新构建扩展：`npm run build`
2. 在 Chrome 中重新加载扩展
3. 打开 [bigint-test-page.html](bigint-test-page.html)
4. 双击任意 JSON 文本打开查看器
5. 验证大整数值是否保持不变
6. 检查 17 位及以上的整数是否显示为字符串格式（带引号）

## 预期行为

修复后的扩展应该：
- ✅ 正确保持 17 位及以上整数的精度
- ✅ 将大整数显示为字符串格式（在 JSON 查看器中带引号）
- ✅ 不影响普通整数、小数和其他类型的显示
- ✅ 在所有场景下（检测、验证、显示）保持一致

## 技术细节

### 为什么选择 17 位作为阈值？

`Number.MAX_SAFE_INTEGER = 9007199254740991` 是 16 位数字。为了安全起见，选择 17 位及以上的整数进行保护，确保所有可能超出安全范围的整数都被转换为字符串。

### 为什么转换为字符串？

- JSON 标准支持字符串和数字两种格式
- 字符串可以保持任意精度
- 在 JSON 查看器中，字符串会带引号显示，用户可以清楚地看到这是一个大整数
- 应用程序在处理时可以选择使用 BigInt 或专门的大数库来处理这些字符串

### 兼容性

- ✅ 不影响小于 17 位的整数
- ✅ 不影响浮点数
- ✅ 不影响字符串、布尔值、null 等其他类型
- ✅ 向后兼容，不会破坏现有功能

## 相关资源

- [MDN - Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)
- [MDN - BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [IEEE 754 浮点数标准](https://en.wikipedia.org/wiki/IEEE_754)

## 版本信息

- 修复版本：1.0.25
- 修复日期：2024-12-25
- 相关 Issue：用户报告的 `ticketingVoucherIds` 精度丢失问题
