/**
 * 测试有问题的 JSON
 */

const problematicJson = '{"messageId":"251229.165728.10.121.120.17.165.27","subject":"train.global.rail.gds.ticketing.sub.x.refund.result","durable":true,"storeAtFailed":false,"tags":["gds"],"attrs":{"qmq_expireTime":"1766998648302","qmq_maxRetryNum":"32","subXRefundResult":"{\\"success\\":true,\\"code\\":200,\\"message\\":\\"success\\",\\"timestamp\\":\\"1766998648296\\",\\"orderId\\":1766998618097,\\"orderItemId\\":70076810381,\\"masterRefundId\\":13523914917721380,\\"subRefundId\\":262471174747525,\\"productTypeList\\":[\\"Pass\\"],\\"supplierTotalAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":100.000},\\"supplierRefundableAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":95.000},\\"supplierRefundFee\\":{\\"currency\\":\\"CNY\\",\\"price\\":5.000},\\"supplierNoRefundableAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":0.000},\\"agencyRefundFee\\":{\\"currency\\":\\"CNY\\",\\"price\\":5.000},\\"agencyRefundableAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":95.000},\\"agencyTotalAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":100.000},\\"agencyNoRefundableAmount\\":{\\"currency\\":\\"CNY\\",\\"price\\":0.000},\\"refundProcessType\\":\\"system_normal\\",\\"responseResult\\":true}","qmq_appCode":"100051894","qmq_env":"FAT","qmq_createTIme":"1766998648673","qmq_subEnv":"FAT72","qmq_trace_subenv":"fat72","qmq_reliabilityLevel":"High","qmq_trace_span-id":"100051894-0a797811-490832-5602280","qmq_trace_trace-id":"","qmq_sourceRegion":"NTG","qmq_consumerGroupName":"trn.gds.xproduct.system.consumer","qmq_times":"2","qmq_pullOffset":0},"consumerGroup":"trn.gds.xproduct.system.consumer","autoAck":false,"partitionName":"%RETRY%train.global.rail.gds.ticketing.sub.x.refund.result%trn.gds.xproduct.system.consumer","maxRetryNum":32,"compensation":false,"sourceRegion":"NTG","newqmq":true}';

console.log('测试原始 JSON（未处理前）:');
console.log('JSON 长度:', problematicJson.length);
console.log('Position 412 附近的内容:');
console.log(problematicJson.substring(400, 430));
console.log('Position 412 的字符:', problematicJson[412]);

// 测试原始 JSON.parse
try {
  const result = JSON.parse(problematicJson);
  console.log('\n✅ 原始 JSON.parse 成功');
} catch (e) {
  console.log('\n❌ 原始 JSON.parse 失败:', e.message);
}

// 模拟 parseJsonSafely 的处理过程
console.log('\n\n=== 模拟 parseJsonSafely 处理过程 ===\n');

let processedJson = problematicJson;

console.log('步骤 1: 应用 keyValuePattern');
const keyValuePattern = /("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g;
const keyValueMatches = [...problematicJson.matchAll(keyValuePattern)];
console.log(`找到 ${keyValueMatches.length} 个键值对匹配:`);
keyValueMatches.forEach((match, i) => {
  console.log(`  ${i + 1}. ${match[0]} (位置: ${match.index})`);
});
processedJson = processedJson.replace(keyValuePattern, '$1"$2"');

console.log('\n步骤 2: 应用 arrayPattern');
const arrayPattern = /([\[,])(\d{17,})\b(?=[\s,\]\}]|$)/g;
const arrayMatches = [...processedJson.matchAll(arrayPattern)];
console.log(`找到 ${arrayMatches.length} 个数组匹配:`);
arrayMatches.forEach((match, i) => {
  console.log(`  ${i + 1}. 前缀:'${match[1]}' 数字:${match[2]} (位置: ${match.index})`);
  console.log(`      上下文: ${processedJson.substring(match.index - 10, match.index + 30)}`);
});
processedJson = processedJson.replace(arrayPattern, '$1"$2"');

console.log('\n处理后的 JSON 长度:', processedJson.length);
console.log('Position 412 附近的内容（处理后）:');
console.log(processedJson.substring(400, 430));

// 测试处理后的 JSON
console.log('\n\n=== 测试处理后的 JSON ===\n');
try {
  const result = JSON.parse(processedJson);
  console.log('✅ 处理后的 JSON.parse 成功');
  
  // 检查嵌套的 JSON 字符串
  if (result.attrs && result.attrs.subXRefundResult) {
    console.log('\n检查嵌套的 JSON 字符串:');
    try {
      const nested = JSON.parse(result.attrs.subXRefundResult);
      console.log('✅ 嵌套 JSON 解析成功');
      console.log('masterRefundId:', nested.masterRefundId, '(类型:', typeof nested.masterRefundId, ')');
    } catch (e) {
      console.log('❌ 嵌套 JSON 解析失败:', e.message);
    }
  }
} catch (e) {
  console.log('❌ 处理后的 JSON.parse 失败:', e.message);
  console.log('错误位置:', e.message.match(/position (\d+)/)?.[1]);
  
  const errorPos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  if (errorPos > 0) {
    console.log('\n错误位置附近的内容:');
    console.log(processedJson.substring(Math.max(0, errorPos - 50), errorPos + 50));
    console.log(' '.repeat(50) + '^ 错误位置');
  }
}
