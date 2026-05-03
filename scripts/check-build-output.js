const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const requiredFiles = [
  'manifest.json',
  'background.bundle.js',
  'content.bundle.js',
  'popup.bundle.js',
  'json-window.bundle.js',
  'json-compare.bundle.js',
  'popup.html',
  'json-window.html',
  'json-compare.html',
];

const missingFiles = requiredFiles.filter((file) => {
  const fullPath = path.join(publicDir, file);
  return !fs.existsSync(fullPath);
});

if (missingFiles.length > 0) {
  console.error('Missing build output files:');
  for (const file of missingFiles) {
    console.error(`- public/${file}`);
  }
  process.exit(1);
}

console.log('Build output smoke check passed.');
