const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200) return true;
    } catch (e) {
      // wait
    }
    await sleep(500);
  }
  return false;
}

async function runLighthouse() {
  console.log('[Lighthouse Runner] Starting server & client...');

  const serverProc = spawn('node', ['src/server.js'], {
    cwd: path.resolve(__dirname, '..', 'server'),
    stdio: 'ignore',
    shell: true,
  });

  const clientProc = spawn('npm.cmd', ['run', 'dev'], {
    cwd: path.resolve(__dirname),
    stdio: 'ignore',
    shell: true,
  });

  try {
    console.log('[Lighthouse Runner] Waiting for servers to be ready...');
    const serverReady = await waitForUrl('http://localhost:5000/api/health', 15000);
    const clientReady = await waitForUrl('http://localhost:5173', 15000);

    if (!serverReady || !clientReady) {
      throw new Error(`Servers failed to start: serverReady=${serverReady}, clientReady=${clientReady}`);
    }
    console.log('[Lighthouse Runner] Servers are live! Fetching sample listing ID...');

    const res = await fetch('http://localhost:5000/api/listings?limit=1');
    const json = await res.json();
    const sampleId = json.data?.items?.[0]?.id || json.data?.items?.[0]?._id;
    console.log(`[Lighthouse Runner] Using sample listing ID: ${sampleId}`);

    const pages = [
      { name: 'Home', url: 'http://localhost:5173/' },
      { name: 'Browse', url: 'http://localhost:5173/browse' },
      { name: 'Vehicle Detail', url: `http://localhost:5173/listings/${sampleId}` },
    ];

    const results = {};
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    for (const page of pages) {
      console.log(`[Lighthouse] Auditing accessibility for ${page.name} (${page.url})...`);
      const outputPath = path.resolve(__dirname, `lighthouse-${page.name.toLowerCase().replace(/\s+/g, '-')}.json`);
      
      const cmd = `npx.cmd --yes lighthouse "${page.url}" --only-categories=accessibility --output=json --output-path="${outputPath}" --chrome-flags="--headless --no-sandbox --disable-gpu"`;
      
      execSync(cmd, {
        cwd: __dirname,
        env: { ...process.env, CHROME_PATH: chromePath },
        stdio: 'ignore',
      });

      if (fs.existsSync(outputPath)) {
        const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        const score = Math.round((report.categories?.accessibility?.score || 0) * 100);
        results[page.name] = score;
        fs.unlinkSync(outputPath);
      }
    }

    console.log('\n========================================');
    console.log('LIGHTHOUSE ACCESSIBILITY SCORES:');
    for (const [name, score] of Object.entries(results)) {
      console.log(`- ${name}: ${score} / 100 ${score >= 90 ? '✓ (Target >= 90 Achieved)' : '✗'}`);
    }
    console.log('========================================\n');
  } catch (err) {
    console.error('[Lighthouse Error]', err);
  } finally {
    try {
      serverProc.kill();
      clientProc.kill();
    } catch (e) {}
  }
}

runLighthouse();