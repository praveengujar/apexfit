#!/usr/bin/env node
/**
 * Pre-commit route verification script.
 * Ensures all frontend API calls have matching backend routes.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SERVER_FILE = path.join(__dirname, '..', 'server', 'index.js');

function extractFrontendApiCalls(dir) {
  const calls = new Set();
  const files = walkDir(dir, ['.js', '.jsx']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const patterns = [
      /fetch\(['"`]\/api\/([\w\-\/\:]+)/g,
      /fetch\(`\/api\/([\w\-\/\$\{\}]+)/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const route = match[1]
          .replace(/\$\{[^}]+\}/g, ':param')
          .replace(/\/+$/, '');
        calls.add('/api/' + route);
      }
    }
  }
  return calls;
}

function extractBackendRoutes(serverFile) {
  const routes = new Set();
  if (!fs.existsSync(serverFile)) {
    console.warn('  Warning: server/index.js not found, skipping route verification');
    return routes;
  }

  const content = fs.readFileSync(serverFile, 'utf-8');
  const pattern = /app\.(get|post|put|patch|delete)\(['"`]\/api\/([\w\-\/\:]+)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const route = '/api/' + match[2].replace(/\/+$/, '');
    routes.add(route);
  }
  return routes;
}

function walkDir(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        results.push(...walkDir(fullPath, extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('Verifying frontend API routes have backend handlers...\n');

const frontendCalls = extractFrontendApiCalls(SRC_DIR);
const backendRoutes = extractBackendRoutes(SERVER_FILE);

function normalizeRoute(route) {
  return route.replace(/:[^/]+/g, ':param');
}

const backendNormalized = new Set([...backendRoutes].map(normalizeRoute));

const missing = [];
for (const call of frontendCalls) {
  const normalized = normalizeRoute(call);
  if (!backendNormalized.has(normalized)) {
    missing.push(call);
  }
}

if (missing.length > 0) {
  console.error('FAIL: Frontend API calls with no matching backend route:\n');
  for (const route of missing.sort()) {
    console.error(`  ${route}`);
  }
  console.error(`\nRegister missing routes in server/index.js`);
  process.exit(1);
} else {
  console.log(`OK: All ${frontendCalls.size} frontend API calls have backend routes.`);
  console.log(`    Backend has ${backendRoutes.size} registered routes.`);
  process.exit(0);
}
