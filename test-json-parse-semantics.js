/**
 * Phase 5 JSON parse semantics checks.
 *
 * Run with: node test-json-parse-semantics.js
 */

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const ts = require('typescript');

const projectRoot = __dirname;

function loadTsModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  }).outputText;

  const testModule = new Module(absolutePath, module);
  testModule.filename = absolutePath;
  testModule.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  testModule._compile(output, absolutePath);
  return testModule.exports;
}

const {
  AUTO_DETECT_MIN_LENGTH,
  extractJsonCandidates,
  isAutoDetectCandidate,
  isDisplayableJson,
  isJsonSyntaxValid,
  parseJsonPreserveLargeNumbers,
} = loadTsModule('src/utils/jsonParse.ts');

const tests = [
  {
    name: 'syntax validation accepts arrays and primitives',
    run() {
      assert.strictEqual(isJsonSyntaxValid('[1,2,3]'), true);
      assert.strictEqual(isJsonSyntaxValid('"plain string"'), true);
      assert.strictEqual(isJsonSyntaxValid('42'), true);
      assert.strictEqual(isJsonSyntaxValid('{bad'), false);
    },
  },
  {
    name: 'displayable JSON defaults to objects and arrays only',
    run() {
      assert.strictEqual(isDisplayableJson({ id: 1 }), true);
      assert.strictEqual(isDisplayableJson([{ id: 1 }]), true);
      assert.strictEqual(isDisplayableJson([]), true);
      assert.strictEqual(isDisplayableJson('plain string'), false);
      assert.strictEqual(isDisplayableJson(42), false);
      assert.strictEqual(isDisplayableJson(null), false);
    },
  },
  {
    name: 'displayable JSON can opt in to primitives',
    run() {
      assert.strictEqual(isDisplayableJson('plain string', { allowPrimitives: true }), true);
      assert.strictEqual(isDisplayableJson(42, { allowPrimitives: true }), true);
      assert.strictEqual(isDisplayableJson(null, { allowPrimitives: true }), false);
    },
  },
  {
    name: 'large integers are preserved consistently in objects and arrays',
    run() {
      const data = parseJsonPreserveLargeNumbers(
        '{"id":16633992720384107,"safe":123,"items":[16633992720384108,{"nested":16633992720384109}]}'
      );
      assert.strictEqual(data.id, '16633992720384107');
      assert.strictEqual(data.safe, 123);
      assert.strictEqual(data.items[0], '16633992720384108');
      assert.strictEqual(data.items[1].nested, '16633992720384109');
    },
  },
  {
    name: 'auto detect keeps meaningful object and array restrictions',
    run() {
      assert.strictEqual(AUTO_DETECT_MIN_LENGTH, 10);
      assert.strictEqual(isAutoDetectCandidate('{"id":1,"name":"a"}'), true);
      assert.strictEqual(isAutoDetectCandidate('[{"id":1}]'), false);
      assert.strictEqual(isAutoDetectCandidate('[{"id":1,"name":"a"}]'), true);
      assert.strictEqual(isAutoDetectCandidate('[]'), false);
      assert.strictEqual(isAutoDetectCandidate('{"a":1}'), false);
      assert.strictEqual(isAutoDetectCandidate('[1,2,3,4,5]'), false);
      assert.strictEqual(isAutoDetectCandidate('"plain string"'), false);
    },
  },
  {
    name: 'candidate extraction handles embedded JSON without short fragments',
    run() {
      const candidates = extractJsonCandidates(
        'prefix req: {"id":16633992720384107,"name":"a"} and res: [{"ok":true,"id":16633992720384108}] suffix'
      );
      assert.deepStrictEqual(candidates, [
        '{"id":16633992720384107,"name":"a"}',
        '[{"ok":true,"id":16633992720384108}]',
      ]);
    },
  },
];

let passed = 0;
for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS ${test.name}`);
  } catch (error) {
    console.error(`FAIL ${test.name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`All ${passed} JSON parse semantics tests passed.`);
