const fs = require('fs');
const path = require('path');

const routes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../route_audit.json'), 'utf8'));
const testDir = path.resolve(__dirname, '../server/tests');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

const fileContents = {};
testFiles.forEach(f => {
  fileContents[f] = fs.readFileSync(path.join(testDir, f), 'utf8');
});

const audited = routes.map(r => {
  // Check if route is protected (requires auth, admin, capability, or ownership)
  const isProtected = r.isAuth || r.isAdmin || r.isOwner || r.capability !== 'public';
  
  // Find which test files mention this endpoint
  const relevantTests = [];
  const cleanPath = r.path.replace(/\/:[a-zA-Z0-9_]+/g, '');
  
  for (const [tf, content] of Object.entries(fileContents)) {
    if (content.includes(cleanPath)) {
      relevantTests.push(tf);
    }
  }

  // Check if there is an unauthorized/forbidden test for this endpoint
  let has401or403Test = false;
  if (!isProtected) {
    has401or403Test = true; // Public routes don't require 401/403
  } else {
    for (const tf of relevantTests) {
      const content = fileContents[tf];
      // Search for blocks testing 401 or 403 near the path
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(cleanPath)) {
          // Check surrounding 20 lines for 401 or 403 or 'unauthenticated' or 'forbidden'
          const windowText = lines.slice(Math.max(0, i - 15), Math.min(lines.length, i + 20)).join(' ');
          if (
            windowText.includes('401') ||
            windowText.includes('403') ||
            windowText.includes('unauthenticated') ||
            windowText.includes('forbidden') ||
            windowText.includes('reject')
          ) {
            has401or403Test = true;
            break;
          }
        }
      }
      if (has401or403Test) break;
    }
  }

  return {
    method: r.method,
    path: r.path,
    role: r.isAdmin ? 'Admin' : r.capability,
    ownership: r.isOwner ? 'Resource Owner' : (r.isAuth ? 'Authenticated User' : 'Public'),
    isProtected,
    has401or403Test,
    testFiles: relevantTests,
  };
});

const missingTests = audited.filter(a => a.isProtected && !a.has401or403Test);
console.log(`Protected routes: ${audited.filter(a => a.isProtected).length}`);
console.log(`Routes with 401/403 test confirmed: ${audited.filter(a => a.isProtected && a.has401or403Test).length}`);
console.log(`Routes needing an unauthorized/forbidden test: ${missingTests.length}`);
console.log('Missing tests on:');
missingTests.forEach(m => console.log(`- ${m.method} ${m.path} (${m.role}, ${m.ownership})`));

fs.writeFileSync(path.resolve(__dirname, '../authorisation_matrix.json'), JSON.stringify(audited, null, 2));
