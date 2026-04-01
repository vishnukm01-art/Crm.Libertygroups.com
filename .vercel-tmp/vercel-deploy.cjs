#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
const ALLOWED_COMMANDS = new Set(['vercel', 'npm', 'pnpm', 'yarn']);
function log(msg) { console.error(msg); }
function commandExists(cmd) {
if (!ALLOWED_COMMANDS.has(cmd)) throw new Error(`Command not in whitelist: ${cmd}`);
try {
if (isWindows) return spawnSync('where', [cmd], { stdio: 'ignore' }).status === 0;
else return spawnSync('sh', ['-c', 'command -v "$1"', '--', cmd], { stdio: 'ignore' }).status === 0;
} catch { return false; }
}
function getCommandOutput(cmd, args) {
try {
const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], shell: isWindows });
return result.status === 0 ? (result.stdout || '').trim() : null;
} catch { return null; }
}
function parseArgs(args) {
const result = { projectPath: '.', prod: true, yes: false, skipBuild: false };
for (const arg of args) {
if (arg === '--prod') result.prod = true;
else if (arg === '--yes' || arg === '-y') result.yes = true;
else if (arg === '--skip-build') result.skipBuild = true;
else if (!arg.startsWith('-')) result.projectPath = arg;
}
return result;
}
function checkVercelInstalled() {
if (!commandExists('vercel')) { log('Error: Vercel CLI not installed'); process.exit(1); }
log(`Vercel CLI version: ${getCommandOutput('vercel', ['--version']) || 'unknown'}`);
}
function checkLoginStatus() {
log('Checking login status...');
try {
const result = spawnSync('vercel', ['whoami'], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: isWindows });
const output = (result.stdout || '').trim();
if (result.status === 0 && output && !output.includes('Error') && !output.includes('not logged in')) {
log(`Logged in as: ${output}`); return true;
}
} catch {} return false;
}
function checkProject(projectPath) {
const absPath = path.resolve(projectPath);
if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
log(`Error: Project directory does not exist: ${absPath}`); process.exit(1);
}
log(`Project path: ${absPath}`);
return absPath;
}
function detectPackageManager(projectPath) {
if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
if (commandExists('pnpm')) return 'pnpm';
if (commandExists('yarn')) return 'yarn';
if (commandExists('npm')) return 'npm';
return null;
}
function runBuildIfNeeded(projectPath) {
const packageJsonPath = path.join(projectPath, 'package.json');
if (!fs.existsSync(packageJsonPath)) { log('No package.json, skipping build'); return true; }
let packageJson;
try { packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')); } catch { return true; }
if (!packageJson.scripts || !packageJson.scripts.build) { log('No build script, skipping'); return true; }
log(''); log('========================================'); log('Running pre-deployment build...'); log('========================================'); log('');
const pkgManager = detectPackageManager(projectPath);
if (!pkgManager) { log('Error: No package manager found'); process.exit(1); }
log(`Using: ${pkgManager}`);
const nodeModulesPath = path.join(projectPath, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
log('Installing dependencies...');
const installArgs = pkgManager === 'yarn' ? [] : ['install'];
const result = spawnSync(pkgManager, installArgs, { cwd: projectPath, stdio: 'inherit', shell: isWindows });
if (result.status !== 0) { log('Install failed'); process.exit(1); }
}
const buildArgs = pkgManager === 'npm' ? ['run', 'build'] : ['build'];
log(`Executing: ${pkgManager} ${buildArgs.join(' ')}`); log('');
const result = spawnSync(pkgManager, buildArgs, { cwd: projectPath, stdio: 'inherit', shell: isWindows });
if (result.status !== 0) { log('Build FAILED!'); process.exit(1); }
log(''); log('Build completed successfully!');
return true;
}
function doDeploy(projectPath, options) {
log(''); log('Starting deployment...'); log('');
const args = [];
if (options.yes) args.push('--yes');
if (options.prod) { args.push('--prod'); log('Environment: Production'); }
else log('Environment: Preview');
log(`Executing: vercel ${args.join(' ')}`); log(''); log('========================================');
const result = spawnSync('vercel', args, {
cwd: projectPath, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], timeout: 300000, shell: isWindows
});
const output = (result.stdout || '') + (result.stderr || '');
log(output);
if (result.status !== 0) { log('Deployment failed'); process.exit(1); }
const aliasedMatch = output.match(/Aliased:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
const deploymentMatch = output.match(/Production:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
const urlMatch = output.match(/(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/);
const finalUrl = (aliasedMatch && aliasedMatch[1]) || (deploymentMatch && deploymentMatch[1]) || (urlMatch && urlMatch[1]);
log(''); log('========================================'); log('Deployment successful!'); log('========================================'); log('');
if (finalUrl) {
log(`Your site is live: ${finalUrl}`);
console.log(JSON.stringify({ status: 'success', url: finalUrl }));
} else {
console.log(JSON.stringify({ status: 'success', message: 'Deployment successful' }));
}
}
function main() {
log('========================================'); log('Vercel CLI Project Deployment'); log('========================================'); log('');
const args = process.argv.slice(2);
const options = parseArgs(args);
checkVercelInstalled(); log('');
if (!checkLoginStatus()) { log('Error: Not logged in'); process.exit(1); }
log('');
const projectPath = checkProject(options.projectPath);
if (!options.skipBuild) runBuildIfNeeded(projectPath);
else log('Build step skipped');
doDeploy(projectPath, options);
}
main();
