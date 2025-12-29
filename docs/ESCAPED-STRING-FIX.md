# 转义字符串中的大整数问题修复

## 问题描述

用户发现一个包含**转义 JSON 字符串**的正常 JSON 在处理后出现语法错误：

```json
{
  "attrs": {
    "subXRefundResult": "{\"masterRefundId\":13523914917721380,...}"
  }
}
```

错误信息：
```
SyntaxError: Expected ',' or '}' after property value in JSON at position 412
```

## 根本原因

之前的 `arrayPattern` 正则表达式包含了 `:` 匹配：

```typescript
// 问题代码
const arrayPattern = /([\[,:\s])(\d{17,})\b(?=[\s,\]\}]|$)/g;
```

这导致它会匹配**转义字符串内部**的内容：
- 原始：`\"masterRefundId\":13523914917721380`
- 错误匹配：`\":13523914917721380` (因为包含 `:`)
- 错误替换：`\":"13523914917721380"` ❌ 破坏了 JSON 结构

## 修复方案

### 修改正则表达式

移除 `arrayPattern` 中的 `:` 匹配，因为：
1. 键值对中 `:` 后的数字应该由 `keyValuePattern` 处理
2. `:` 可能出现在转义字符串中，导致错误匹配

```typescript
// 修复后的代码
const arrayPattern = /([\[,]\s*)(\d{17,})\b(?=[\s,\]\}]|$)/g;
```

**关键改进**：
- 只匹配 `[` 或 `,` 后面的大整数
- 添加 `\s*` 支持逗号后的空格：`, 16633992720384107`
- 不再匹配 `:` 后面的内容，避免破坏转义字符串

## 测试验证

### 测试用例 1：问题 JSON（转义字符串）

```json
{"attrs":{"subXRefundResult":"{\"masterRefundId\":13523914917721380}"}}
```

✅ **结果**：正确解析，不会破坏转义字符串内部的内容

### 测试用例 2：原始问题（数组中的大整数）

```json
[{"ticketingVoucherIds":[16633992720384107]}]
```

✅ **结果**：正确转换为 `["16633992720384107"]`

### 测试用例 3：多个数组元素

```json
[16633992720384107, 16633992720384108, 16633992720384109]
```

✅ **结果**：所有元素都正确转换为字符串

### 完整测试结果

```
总测试数: 6
✅ 通过: 6
❌ 失败: 0
成功率: 100.0%
```

## 技术说明

### 为什么不处理转义字符串内部的大整数？

1. **复杂性**：正确解析转义字符串需要完整的 JSON 解析器
2. **风险**：尝试处理可能破坏 JSON 结构
3. **场景**：转义字符串通常是为了传输，接收方会再次解析

如果需要处理转义字符串内的大整数，应该：
1. 先解析外层 JSON
2. 提取转义的字符串值
3. 对内层字符串单独使用 `parseJsonSafely()`

### 正则表达式详解

```typescript
// 键值对匹配
/("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g
// ↑ 匹配 "key": 或 "key" : 格式

// 数组匹配
/([\[,]\s*)(\d{17,})\b(?=[\s,\]\}]|$)/g
// ↑ 匹配 [ 或 , 后面（可能有空格）
//   ↑ 17位及以上的数字
//              ↑ 后面是空格、逗号、]、} 或结尾
```

## 最佳实践

对于包含嵌套 JSON 字符串的数据：

```javascript
// 1. 先解析外层 JSON
const outer = parseJsonSafely(jsonString);

// 2. 如果有嵌套的 JSON 字符串，再次解析
if (outer.attrs && outer.attrs.subXRefundResult) {
  const inner = parseJsonSafely(outer.attrs.subXRefundResult);
  // 现在内层的大整数也被正确处理了
}
```

## 相关文件

- 主要修复：[src/utils/jsonParser.ts](../src/utils/jsonParser.ts)
- 测试脚本：[test-problematic-json.js](../test-problematic-json.js)
- 完整测试：[test-bigint-parser.js](../test-bigint-parser.js)

## 版本信息

- 修复版本：1.0.25
- 修复日期：2024-12-29
- 相关问题：转义字符串导致的语法错误
