/**
 * CI publish: build, auto patch-bump when dist changes, publish to npm, push version commit.
 *
 * Requires NODE_AUTH_TOKEN and GITHUB_TOKEN in the environment.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  fingerprintPackage,
  fingerprintPublishedPackage,
} from './npm-dist-fingerprint.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const maxAutoBumps = 10;

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function runCapture(cmd, cwd = root) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function readPackage() {
  const pkg = JSON.parse(fs.readFileSync(join(root, 'package.json'), 'utf8'));
  if (!pkg.name || !pkg.version) {
    throw new Error('package.json must include name and version');
  }
  return pkg;
}

function isPublished(name, version) {
  try {
    const published = runCapture(`npm view ${name}@${version} version`);
    return published === version;
  } catch {
    return false;
  }
}

function bumpPatchVersion() {
  const before = readPackage().version;
  run('npm version patch --no-git-tag-version');
  const after = readPackage().version;
  console.log(`publish-ci: bumped ${before} → ${after}`);
  return after;
}

function distMatchesPublished(name, version) {
  const localFingerprint = fingerprintPackage(root);
  if (!localFingerprint) {
    throw new Error(`${name}: no publishable files after build`);
  }

  try {
    const publishedFingerprint = fingerprintPublishedPackage(name, version);
    return localFingerprint === publishedFingerprint;
  } catch (error) {
    console.warn(
      `publish-ci: could not fingerprint ${name}@${version} on npm (${error.message}); will publish`,
    );
    return false;
  }
}

function pushVersionCommit(name, version) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required to push version commit');
  }

  const paths = ['package.json'];
  if (fs.existsSync(join(root, 'package-lock.json'))) {
    paths.push('package-lock.json');
  }

  run('git config user.name "github-actions[bot]"');
  run('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');

  const status = runCapture(`git status --porcelain ${paths.join(' ')}`);
  if (!status) {
    console.log('publish-ci: no version files changed; skipping git push');
    return;
  }

  run(`git add ${paths.join(' ')}`);
  run(`git commit -m "CI: publish ${name}@${version}"`);

  const remoteUrl = runCapture('git remote get-url origin');
  const match = remoteUrl.match(/github\.com[/:](.+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Unsupported git remote URL: ${remoteUrl}`);
  }

  const authedUrl = `https://x-access-token:${token}@github.com/${match[1]}.git`;
  run(`git -c credential.helper= push "${authedUrl}" HEAD:main`);
}

const pkg = readPackage();
const lockPath = join(root, 'package-lock.json');

function lockHasLocalDeps(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return false;
  }
  const lock = fs.readFileSync(lockPath, 'utf8');
  return (
    lock.includes('file:../') ||
    lock.includes('"resolved": "../') ||
    /"\.\.\/[^"]+": \{/.test(lock)
  );
}

function installDependencies() {
  if (lockHasLocalDeps(lockPath)) {
    console.log(
      'publish-ci: package-lock.json links local sibling packages; reinstalling from npm',
    );
    fs.unlinkSync(lockPath);
    run('npm install --ignore-scripts --no-audit --no-fund');
    return;
  }

  if (fs.existsSync(lockPath)) {
    run('npm ci --ignore-scripts');
    return;
  }

  run('npm install --ignore-scripts --no-audit --no-fund');
}

installDependencies();

if (pkg.scripts?.test) {
  run('npm test');
}

run('npm run build');

let { name, version } = readPackage();

if (isPublished(name, version)) {
  if (distMatchesPublished(name, version)) {
    console.log(`publish-ci: ${name}@${version} already on npm with matching dist; skipping`);
    process.exit(0);
  }

  let autoBumps = 0;
  while (isPublished(name, version)) {
    if (autoBumps >= maxAutoBumps) {
      throw new Error(
        `${name}@${version} is still published after ${maxAutoBumps} auto-bumps; bump manually in package.json`,
      );
    }
    version = bumpPatchVersion();
    autoBumps += 1;
  }
}

console.log(`publish-ci: publishing ${name}@${version}`);
run('npm publish --access public');
pushVersionCommit(name, version);
