#!/usr/bin/env node
/**
 * Remplace __JLF_BUILD_ID__ dans sw.js par l'ID de build Vercel / git / timestamp.
 * Appelé avant et après `expo export` pour que dist/sw.js soit stampé.
 */
const fs = require('fs');
const path = require('path');

const buildId = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  `t${Date.now()}`
).slice(0, 12);

const targets = [
  path.join(__dirname, '..', 'public', 'sw.js'),
  path.join(__dirname, '..', 'dist', 'sw.js'),
];

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');
  // Remplace le placeholder OU un ancien ID déjà stampé (rebuild)
  src = src.replace(
    /const BUILD_ID = '[^']*';/,
    `const BUILD_ID = '${buildId}';`
  );
  fs.writeFileSync(file, src);
  console.log(`[stamp-sw] ${path.relative(process.cwd(), file)} → ${buildId}`);
}

// Expose aussi un fichier lisible par le client pour forcer ?v= sur le register
const metaDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');
const meta = JSON.stringify({ buildId, stampedAt: new Date().toISOString() });
fs.writeFileSync(path.join(metaDir, 'build-id.json'), meta);
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'build-id.json'), meta);
}
console.log(`[stamp-sw] build-id.json → ${buildId}`);
