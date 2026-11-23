const fs = require('fs');
const path = require('path');

const routesDir = path.resolve(__dirname, '../server/src/routes');
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

  const regex = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]([\s\S]*?)(?=\n\s*(?:router\.|module\.exports))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const sub = match[2];
    const rest = match[3];

    let fullPath = sub === '/' ? prefix : `${prefix}${sub.startsWith('/') ? sub : '/' + sub}`;

    const isAuth = rest.includes('requireAuth');
    const isAdmin = rest.includes('requireAdmin');
    const isOwner = rest.includes('requireOwnership');
    const hasActive = rest.includes('requireActiveAccount');
    const capMatch = rest.match(/requireCapability\(['"]([^'"]+)['"]\)/);
    const capability = capMatch ? capMatch[1] : (isAdmin ? 'admin' : (isAuth ? 'authenticated' : 'public'));

    routeList.push({
      file: f,
      method,
      path: fullPath,
      isAuth,
      isAdmin,
      isOwner,
      hasActive,
      capability,
      rest: rest.replace(/\s+/g, ' ').trim(),
    });
  }
});

console.log(`Found ${routeList.length} routes.`);

// Check test coverage in server/tests
const testDir = path.resolve(__dirname, '../server/tests');
const outFile = path.resolve(__dirname, '../route_audit.json');
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
const allTestContent = testFiles.map(tf => fs.readFileSync(path.join(testDir, tf), 'utf8')).join('\n');

const results = routeList.map(r => {
  // Normalize path for test regex search: e.g. /api/listings/:id -> \/api\/listings\/
  const pathPrefix = r.path.split('/:')[0];
  const hasPathInTests = allTestContent.includes(pathPrefix);
  
  // Look for 401 or 403 checks for this endpoint
  const hasAuth = r.isAuth || r.isAdmin;
  return {
    ...r,
    hasPathInTests,
  };
});

fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log('Saved route_audit.json');
