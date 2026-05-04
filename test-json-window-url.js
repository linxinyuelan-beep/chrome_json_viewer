/**
 * JSON window URL helper checks.
 *
 * Run with: node test-json-window-url.js
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
  createJsonWindowPath,
  createPopupWindowFeatures,
} = loadTsModule('src/utils/jsonWindowUrl.ts');

assert.strictEqual(createJsonWindowPath(), 'json-window.html');
assert.strictEqual(
  createJsonWindowPath('payload id/with spaces'),
  'json-window.html?payloadId=payload%20id%2Fwith%20spaces'
);
assert.strictEqual(
  createPopupWindowFeatures(1000, 700),
  'width=1000,height=700,scrollbars=yes,resizable=yes'
);

console.log('JSON window URL helper tests passed.');
