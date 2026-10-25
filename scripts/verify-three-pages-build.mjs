import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = 'dist-pages';
const projects = ['web-user', 'web-admin', 'operations'];
for (const name of projects) {
  const dir = path.join(root, name);
  assert.ok(existsSync(path.join(dir, 'index.html')), name + ' must have its own index.html');
  const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /\/assets\/[^" ]+\.js/, name + ' must emit an independent JavaScript entrypoint');
  assert.ok(existsSync(path.join(dir, '_worker.js')), name + ' must include its Pages API gateway');
  assert.ok(existsSync(path.join(dir, '_routes.json')), name + ' must include route metadata');
  assert.ok(statSync(path.join(dir, '_worker.js')).size > 0, name + ' Pages gateway must not be empty');
}
const userFiles = readdirSync(path.join(root, 'web-user', 'assets'));
const adminFiles = readdirSync(path.join(root, 'web-admin', 'assets'));
const opsFiles = readdirSync(path.join(root, 'operations', 'assets'));
assert.ok(userFiles.length > 0 && adminFiles.length > 0 && opsFiles.length > 0, 'Each Pages project must have its own asset bundle');
assert.notDeepEqual(userFiles, adminFiles, 'User and Admin bundles must be independently emitted');
assert.ok(readFileSync(path.join(root, 'web-admin', 'index.html'), 'utf8').includes('/assets/'), 'Admin entry must reference its own bundle');
assert.ok(readFileSync(path.join(root, 'operations', 'index.html'), 'utf8').includes('/assets/'), 'Operations entry must reference its own bundle');
console.log('Verified three independent Pages bundles: web-user, web-admin, operations; each includes a Pages Functions gateway.');
