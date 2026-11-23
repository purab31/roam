const fs = require('fs');
const path = require('path');

const routesDir = path.resolve(__dirname, '../../server/src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

const prefixes = {
  health: '/api',
  auth: '/api/auth',
  user: '/api/users',
  vehicle: '/api/vehicles',
  listing: '/api/listings',
  enquiry: '/api/enquiries',
  offer: '/api/offers',
  transaction: '/api/transactions',
  notification: '/api/notifications',
  dealer: '/api/dealers',
  admin: '/api/admin',
  booking: '/api/bookings',
  report: '/api/reports',
  settings: '/api/settings',
  favourite: '/api/favourites',
  recentlyViewed: '/api/recently-viewed',
  compare: '/api/compare',
  inspection: '/api/inspections',
};

const routeList = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(routesDir, f), 'utf8');
  const base = f.replace('.routes.js', '');
  const prefix = prefixes[base] || `/api/${base}`;

  // Check top-level router.use middlewares
  const routerUseLines = content.split('\n').filter(l => l.trim().startsWith('router.use('));
  const routerHasAuth = routerUseLines.some(l => l.includes('requireAuth'));
  const routerHasAdmin = routerUseLines.some(l => l.includes("requireCapability('admin')") || l.includes('requireAdmin'));
  const routerHasActive = routerUseLines.some(l => l.includes('requireActiveAccount'));

  // Match: router.METHOD(PATH, ...
  const regex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]([\s\S]*?)(?=\n\s*(?:router\.|module\.exports))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const sub = match[2];
    const rest = match[3];

    let fullPath = sub === '/' ? prefix : `${prefix}${sub.startsWith('/') ? sub : '/' + sub}`;

    const isAuth = routerHasAuth || rest.includes('requireAuth');
    const isAdmin = routerHasAdmin || rest.includes('requireAdmin') || rest.includes("requireCapability('admin')");
    const isOwner = rest.includes('requireOwnership');
    const hasActive = routerHasActive || rest.includes('requireActiveAccount');
    const capMatch = rest.match(/requireCapability\(['"]([^'"]+)['"]\)/);
    const capability = capMatch ? capMatch[1] : (isAdmin ? 'admin' : null);

    let category = 'public';
    if (isAdmin) {
      category = 'admin';
    } else if (isOwner) {
      category = 'ownership-checked';
    } else if (capability) {
      category = `capability:${capability}`;
    } else if (isAuth) {
      category = 'auth';
    }

    routeList.push({
      file: f,
      method,
      path: fullPath,
      category,
      isAuth: isAuth || isAdmin,
      isOwner,
      isAdmin,
      hasActive,
      capability,
      middlewareText: rest.replace(/\s+/g, ' ').trim(),
    });
  }
});

// Load all test files with full text and individual test blocks
const testDir = path.resolve(__dirname, '../../server/tests');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

const testBlocks = [];
testFiles.forEach(tf => {
  const content = fs.readFileSync(path.join(testDir, tf), 'utf8');
  // Match describe or it blocks
  const itRegex = /(?:it|test)\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\}\);/g;
  let m;
  while ((m = itRegex.exec(content)) !== null) {
    testBlocks.push({
      file: tf,
      title: m[1],
      code: m[2],
    });
  }
});

console.log(`Extracted ${routeList.length} route definitions across ${files.length} route files.`);
console.log(`Extracted ${testBlocks.length} test cases across ${testFiles.length} test files.`);

// Categorize and match tests
const classified = routeList.map(r => {
  let cleanPattern = r.path.replace(/\/:[a-zA-Z0-9_]+/g, '');
  
  // Find test blocks that specifically test unauthorized or forbidden for this route
  const negativeTests = testBlocks.filter(tb => {
    // Check if the test mentions the path (or its endpoint root) AND tests 401 or 403
    const mentionsPath = tb.code.includes(cleanPattern) || (r.path.includes('/admin/') && tb.file === 'admin.test.js' && (tb.title.includes('401') || tb.title.includes('403')));
    const testsAuth = (
      tb.code.includes('.toBe(401)') || 
      tb.code.includes('.toBe(403)') || 
      tb.code.includes('AUTH_ERROR') || 
      tb.code.includes('FORBIDDEN') ||
      tb.title.includes('401') ||
      tb.title.includes('403') ||
      tb.title.includes('unauthenticated') ||
      tb.title.includes('forbidden') ||
      tb.title.includes('reject')
    );
    return mentionsPath && testsAuth;
  });

  return {
    ...r,
    covered: r.category === 'public' || negativeTests.length > 0,
    negativeTests: negativeTests.map(t => `${t.file} -> "${t.title}"`),
  };
});

const counts = {
  total: classified.length,
  public: classified.filter(r => r.category === 'public').length,
  auth: classified.filter(r => r.category === 'auth' || r.category.startsWith('capability:')).length,
  ownership: classified.filter(r => r.category === 'ownership-checked').length,
  admin: classified.filter(r => r.category === 'admin').length,
  covered: classified.filter(r => r.covered).length,
  missing: classified.filter(r => !r.covered).length,
};

console.log('Route counts:', counts);

fs.writeFileSync(path.resolve(__dirname, 'classified_routes.json'), JSON.stringify({ counts, routes: classified }, null, 2));
console.log('Saved classified_routes.json');
