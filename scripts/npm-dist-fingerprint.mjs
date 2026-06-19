/**
 * Fingerprint published package output (typically dist/) for CI auto-bump checks.
 */
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/** Directories included in `npm publish` (from package.json `files`, default dist). */
export function publishDirs(packageRoot) {
  const pkgPath = join(packageRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const files = Array.isArray(pkg.files) && pkg.files.length > 0 ? pkg.files : ['dist'];
  return files.filter((entry) => typeof entry === 'string' && !entry.includes('*'));
}

function walkFiles(rootDir) {
  const entries = [];

  function walk(currentDir, prefix) {
    if (!fs.existsSync(currentDir)) {
      return;
    }
    for (const name of fs.readdirSync(currentDir).sort()) {
      const fullPath = join(currentDir, name);
      const relPath = prefix ? `${prefix}/${name}` : name;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, relPath);
        continue;
      }
      const hash = createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
      entries.push([relPath, hash]);
    }
  }

  for (const dir of publishDirs(rootDir)) {
    walk(join(rootDir, dir), dir);
  }

  return entries;
}

/** Stable hash of all publishable files under packageRoot. */
export function fingerprintPackage(packageRoot) {
  const entries = walkFiles(packageRoot);
  if (entries.length === 0) {
    return null;
  }
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

/** Download name@version from npm and fingerprint its published files. */
export function fingerprintPublishedPackage(name, version) {
  const tmpRoot = fs.mkdtempSync(join(tmpdir(), 'npm-pack-'));
  try {
    execSync(`npm pack "${name}@${version}" --pack-destination "${tmpRoot}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const archive = fs.readdirSync(tmpRoot).find((file) => file.endsWith('.tgz'));
    if (!archive) {
      throw new Error(`npm pack ${name}@${version} produced no tarball`);
    }
    execSync(`tar -xzf "${join(tmpRoot, archive)}" -C "${tmpRoot}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return fingerprintPackage(join(tmpRoot, 'package'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}
