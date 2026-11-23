const fs = require('fs');
const path = require('path');

const data = require('./classified_routes.json');
const routes = data.routes;

const testDir = path.resolve(__dirname, '../../server/tests');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

const tests = [];
testFiles.forEach(tf => {
  const content = fs.readFileSync(path.join(testDir, tf), 'utf8');
  // Match it('...', async () => { ... })
  const itRegex = /(?:it|test)\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/g;
  let m;
  while ((m = itRegex.exec(content)) !== null) {
    tests.push({
      file: tf,
      title: m[1],
      code: m[2],
    });
  }
});

// For each route, find:
// 1. A success / functional test naming the route
// 2. A 401 unauthenticated test naming or hitting the route
// 3. A 403 forbidden / wrong ownership / capability test
// 4. Blocked / deactivated / suspended dealer test if applicable

const table = routes.map((r, index) => {
  const sub = r.path.replace(/\/:[a-zA-Z0-9_]+/g, '');

  const matchingTests = tests.filter(t => t.code.includes(sub) || t.code.includes(r.path));
  
  const auth401 = matchingTests.find(t => 
    (t.code.includes('.toBe(401)') || t.title.includes('401') || t.title.toLowerCase().includes('unauthenticated'))
  );

  const auth403 = matchingTests.find(t => 
    (t.code.includes('.toBe(403)') || t.title.includes('403') || t.title.toLowerCase().includes('forbidden') || t.title.toLowerCase().includes('deny') || t.title.toLowerCase().includes('denied') || t.title.toLowerCase().includes('reject'))
  );

  const blocked = matchingTests.find(t => 
    t.code.includes('blocked') || t.title.toLowerCase().includes('blocked')
  );

  const deactivated = matchingTests.find(t => 
    t.code.includes('deactivated') || t.title.toLowerCase().includes('deactivated')
  );

  const suspendedDealer = matchingTests.find(t => 
    t.code.includes('suspended') || t.code.includes('revoked') || t.title.toLowerCase().includes('suspended')
  );

  // Is covered?
  // If public: covered if functional test exists
  // If protected: COVERED only if we have an explicit test denying unauthorized access
  const isProtected = r.category !== 'public';
  const covered = isProtected ? Boolean(auth401 || auth403) : Boolean(matchingTests.length > 0);

  let namedTest = null;
  if (auth403) {
    namedTest = `${auth403.file} -> "${auth403.title}"`;
  } else if (auth401) {
    namedTest = `${auth401.file} -> "${auth401.title}"`;
  } else if (!isProtected && matchingTests.length > 0) {
    namedTest = `${matchingTests[0].file} -> "${matchingTests[0].title}"`;
  }

  return {
    num: index + 1,
    method: r.method,
    path: r.path,
    category: r.category,
    covered,
    namedTest,
    has401: Boolean(auth401),
    has403: Boolean(auth403),
    hasBlocked: Boolean(blocked),
    hasDeactivated: Boolean(deactivated),
    hasSuspendedDealer: Boolean(suspendedDealer),
    middleware: r.middlewareText,
  };
});

fs.writeFileSync(path.resolve(__dirname, 'table2_detailed.json'), JSON.stringify(table, null, 2));

console.log('Total routes processed:', table.length);
console.log('Covered:', table.filter(t => t.covered).length);
console.log('Missing explicit denial test:', table.filter(t => !t.covered).length);
