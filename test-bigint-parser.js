/**
 * 测试脚本：验证 parseJsonSafely 函数对数组中大整数的处理
 * 
 * 运行方式：node test-bigint-parser.js
 */

// 模拟 parseJsonSafely 函数
function parseJsonSafely(jsonString) {
  if (!jsonString) return null;
  
  let processedJson = jsonString;
  
  // 匹配键值对中的大整数
  const keyValuePattern = /("[\w\d_-]+"\s*:\s*)(\d{17,})\b/g;
  processedJson = processedJson.replace(keyValuePattern, '$1"$2"');
  
  // 匹配数组中的大整数
  const arrayPattern = /([\[,]\s*)(\d{17,})\b(?=[\s,\]\}]|$)/g;
  processedJson = processedJson.replace(arrayPattern, '$1"$2"');
  
  console.log('\n原始 JSON:');
  console.log(jsonString);
  console.log('\n处理后的 JSON:');
  console.log(processedJson);
  
  try {
    return JSON.parse(processedJson, (key, value) => {
      if (typeof value === 'string' && /^\d+$/.test(value) && value.length >= 16) {
        return value;
      }
      return value;
    });
  } catch (e) {
    console.error('Error parsing JSON:', e);
    throw e;
  }
}

// 测试用例
const testCases = [
  {
    name: '用户报告的问题 - 数组中的大整数',
    json: '[{"orderId":1134766076569217,"ticketingVoucherIds":[16633992720384107]}]',
    expectedValue: '16633992720384107'
  },
  {
    name: '键值对中的大整数',
    json: '{"id":16633992720384107}',
    expectedValue: '16633992720384107'
  },
  {
    name: '多个数组元素',
    json: '[16633992720384107, 16633992720384108, 16633992720384109]',
    expectedValues: ['16633992720384107', '16633992720384108', '16633992720384109']
  },
  {
    name: '嵌套数组',
    json: '{"data":[[16633992720384107,16633992720384108],[16633992720384109]]}',
    expectedValue: '16633992720384107'
  },
  {
    name: '混合场景',
    json: '{"id":12345678901234567,"items":[98765432109876543,{"subId":11111111111111111}]}',
    expectedValue: '12345678901234567'
  },
  {
    name: '小整数（不应该被转换）',
    json: '{"id":123456,"items":[789,456]}',
    expectedType: 'number'
  }
];

console.log('🧪 开始测试 parseJsonSafely 函数\n');
console.log('='.repeat(80));

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 测试 ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(80));
  
  try {
    const result = parseJsonSafely(testCase.json);
    console.log('\n解析结果:');
    console.log(JSON.stringify(result, null, 2));
    
    // 验证结果
    let passed = false;
    
    if (testCase.expectedValue) {
      // 检查特定值
      const jsonStr = JSON.stringify(result);
      if (jsonStr.includes(`"${testCase.expectedValue}"`)) {
        console.log(`\n✅ 通过: 找到期望的字符串值 "${testCase.expectedValue}"`);
        passed = true;
      } else {
        console.log(`\n❌ 失败: 未找到期望的字符串值 "${testCase.expectedValue}"`);
        console.log(`实际 JSON: ${jsonStr}`);
      }
    } else if (testCase.expectedValues) {
      // 检查多个值
      const allFound = testCase.expectedValues.every(val => {
        return Array.isArray(result) && result.includes(val);
      });
      if (allFound) {
        console.log(`\n✅ 通过: 所有期望的字符串值都存在`);
        passed = true;
      } else {
        console.log(`\n❌ 失败: 缺少某些期望的值`);
        console.log(`期望: ${testCase.expectedValues.join(', ')}`);
        console.log(`实际: ${result.join(', ')}`);
      }
    } else if (testCase.expectedType === 'number') {
      // 检查小整数是否保持为数字类型
      const hasNumbers = typeof result.id === 'number' && 
                         Array.isArray(result.items) && 
                         typeof result.items[0] === 'number';
      if (hasNumbers) {
        console.log(`\n✅ 通过: 小整数保持为 number 类型`);
        passed = true;
      } else {
        console.log(`\n❌ 失败: 小整数应该保持为 number 类型`);
      }
    }
    
    if (passed) {
      passedTests++;
    } else {
      failedTests++;
    }
    
  } catch (error) {
    console.log(`\n❌ 错误: ${error.message}`);
    failedTests++;
  }
  
  console.log('\n' + '='.repeat(80));
});

// 输出测试总结
console.log(`\n\n📊 测试总结`);
console.log('='.repeat(80));
console.log(`总测试数: ${testCases.length}`);
console.log(`✅ 通过: ${passedTests}`);
console.log(`❌ 失败: ${failedTests}`);
console.log(`成功率: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n🎉 所有测试通过！');
} else {
  console.log('\n⚠️  有测试失败，请检查实现。');
  process.exit(1);
}
