const app = require('../../server/src/app');
const fs = require('fs');
const path = require('path');

const routes = [];

function print(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(print.bind(null, path + layer.route.path));
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source
      .replace('^\\', '')
      .replace('\\/?(?=\\/|$)', '')
      .replace(/\\\//g, '/')
      .replace('(?=\\/|$)', '')
      .replace('^', '')
      .replace('$', '')
    )));
  } else if (layer.method) {
    routes.push({
      method: layer.method.toUpperCase(),
      path: path.replace(/\/+/g, '/').replace(/\/$/, '') || '/',
      handler: layer.name
    });
  }
}

app._router.stack.forEach(print.bind(null, ''));

// Deduplicate method + path
const unique = [];
const seen = new Set();
routes.forEach(r => {
  const key = `${r.method} ${r.path}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(r);
  }
});

console.log(`Total exact mounted endpoints: ${unique.length}`);

// Load all test files to accurately match test names
const testDir = path.resolve(__dirname, '../../server/tests');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
const tests = [];

testFiles.forEach(tf => {
  const content = fs.readFileSync(path.join(testDir, tf), 'utf8');
  // Match it('...', or test('...',
  const regex = /(?:it|test)\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tests.push({ file: tf, title: match[1] });
  }
});

console.log(`Total test cases across ${testFiles.length} suites: ${tests.length}`);

fs.writeFileSync(path.resolve(__dirname, 'all_routes.json'), JSON.stringify({ routes: unique, tests }, null, 2));
