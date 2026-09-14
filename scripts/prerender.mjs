import http from 'http';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

// ── All routes to prerender ───────────────────────────────────────────────────
const STATIC_ROUTES = [
  '/',
  '/free-moving-calculator-no-sign-up',
  '/bin-rentals',
  '/hourly-moving',
  '/rent-a-truck',
  '/blog',
  '/privacy-policy',
  '/terms-of-use',
  '/long-distance-moving-cost',
  '/movers-vs-truck-rental',
  '/moving-cost-by-home-size',
  '/cheap-moving-truck-rentals',
  '/state-to-state-moving-cost',
  '/moving-cost-by-city',
  '/moving-cost/map',
  '/inventory-calculator',
  '/get-quotes',
  '/how-move-price-calculates-long-distance-moving-costs',
  '/how-moving-companies-calculate-long-distance-moving-costs',
  '/apartment-check-nyc',
];

const STATE_SLUGS = [
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut',
  'delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa',
  'kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan',
  'minnesota','mississippi','missouri','montana','nebraska','nevada',
  'new-hampshire','new-jersey','new-mexico','new-york','north-carolina',
  'north-dakota','ohio','oklahoma','oregon','pennsylvania','rhode-island',
  'south-carolina','south-dakota','tennessee','texas','utah','vermont',
  'virginia','washington','west-virginia','wisconsin','wyoming',
];

async function fetchBlogSlugs() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('  WARN: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set, skipping blog prerender');
    return [];
  }
  const res = await fetch(`${supabaseUrl}/rest/v1/blog_posts?select=slug&published=eq.true&order=published_at.desc`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    console.warn(`  WARN: Supabase returned ${res.status}, skipping blog prerender`);
    return [];
  }
  const posts = await res.json();
  return posts.map(p => p.slug);
}

const STATE_ROUTES = STATE_SLUGS.map(s => `/moving-cost/state/${s}`);

// ── Minimal static file server (SPA fallback) ─────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url?.split('?')[0] || '/';
      // Try to serve a static file first
      let filePath = path.join(dist, urlPath);
      if (urlPath !== '/' && existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(readFileSync(filePath));
        return;
      }
      // SPA fallback: always serve index.html
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(readFileSync(path.join(dist, 'index.html')));
    });
    server.listen(port, () => resolve(server));
  });
}

// ── Build step ────────────────────────────────────────────────────────────────
function runBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build:spa'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`build exited ${code}`)));
  });
}

// ── Prerender ─────────────────────────────────────────────────────────────────
async function prerender(port, routes) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });

  const base = `http://localhost:${port}`;
  let succeeded = 0;
  let failed = 0;

  for (const route of routes) {
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    try {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const type = req.resourceType();
        if (type === 'image' || type === 'font' || type === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(`${base}${route}`, { waitUntil: 'networkidle0', timeout: 20000 });

      await page.waitForFunction(() => {
        return document.querySelector('#root')?.children.length > 0
          && document.title.length > 0;
      }, { timeout: 15000 });

      await new Promise(r => setTimeout(r, 2000));

      const html = await page.content();

      let filePath;
      if (route === '/') {
        filePath = path.join(dist, 'index.html');
      } else {
        const dir = path.join(dist, route);
        mkdirSync(dir, { recursive: true });
        filePath = path.join(dir, 'index.html');
      }
      writeFileSync(filePath, html);
      succeeded++;
      console.log(`  OK  ${route}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  return { succeeded, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Prerendering Move-Price.com ===\n');

  console.log('Step 1: Building SPA...');
  await runBuild();
  console.log('Build complete.\n');

  const port = 4817;
  console.log(`Step 2: Starting static server on port ${port}...`);
  const server = await startServer(port);
  console.log('Server started.\n');

  const blogSlugs = await fetchBlogSlugs();
  const blogRoutes = blogSlugs.map(s => `/blog/${s}`);
  const allRoutes = [...STATIC_ROUTES, ...STATE_ROUTES, ...blogRoutes];

  console.log(`Step 3: Prerendering ${allRoutes.length} routes...`);
  let result;
  try {
    result = await prerender(port, allRoutes);
  } finally {
    server.close();
  }

  console.log(`\nDone! ${result.succeeded} succeeded, ${result.failed} failed out of ${allRoutes.length} routes.`);
  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
