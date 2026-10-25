import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const outputs = ['web-user', 'web-admin', 'operations'];
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
for (const name of outputs) {
  const dir = path.resolve('dist-pages', name);
  if (!existsSync(path.join(dir, 'index.html'))) throw new Error('Missing built entrypoint: ' + dir + '/index.html');
  execFileSync(npx, ['--yes', 'wrangler@4', 'pages', 'functions', 'build', 'functions', '--outfile=' + path.join(dir, '_worker.js'), '--output-routes-path=' + path.join(dir, '_routes.json')], { stdio: 'inherit' });
  for (const file of ['_worker.js', '_routes.json']) {
    const target = path.join(dir, file);
    if (!existsSync(target) || statSync(target).size === 0) throw new Error('Pages Functions build did not emit ' + target);
  }
  console.log('Pages Functions gateway built for ' + name);
}
