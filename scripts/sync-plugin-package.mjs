import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(repositoryRoot, 'plugins', 'vibebox');

const fileMappings = [
  ['.codex-plugin/plugin.json', '.codex-plugin/plugin.json'],
  ['.claude-plugin/plugin.json', '.claude-plugin/plugin.json'],
  ['.claude-plugin/marketplace.json', '.claude-plugin/marketplace.json'],
  ['hooks/hooks.json', 'hooks/hooks.json'],
  ['scripts/claude-vibebox-hook.mjs', 'scripts/claude-vibebox-hook.mjs'],
  ['bin/vibebox.mjs', 'bin/vibebox.mjs'],
  ['src/cli.mjs', 'src/cli.mjs'],
  ['src/core.mjs', 'src/core.mjs'],
  ['README.md', 'README.md'],
  ['LICENSE', 'LICENSE']
];

for (const [sourceRelative, targetRelative] of fileMappings) {
  const source = path.join(repositoryRoot, sourceRelative);
  const target = path.join(packageRoot, targetRelative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { force: true });
}

for (const directory of ['assets', 'skills']) {
  await cp(path.join(repositoryRoot, directory), path.join(packageRoot, directory), {
    recursive: true,
    force: true
  });
}

const rootPackage = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
const runtimePackage = {
  name: rootPackage.name,
  version: rootPackage.version,
  description: rootPackage.description,
  type: rootPackage.type,
  bin: rootPackage.bin,
  engines: rootPackage.engines,
  license: rootPackage.license
};
await writeFile(path.join(packageRoot, 'package.json'), `${JSON.stringify(runtimePackage, null, 2)}\n`, 'utf8');

process.stdout.write(`Synced self-contained plugin package at ${packageRoot}\n`);
