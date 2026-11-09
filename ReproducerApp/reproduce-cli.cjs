/* Reproductions for react/react-native#59871 and #59873. */
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const assert = require('node:assert/strict');

const root = __dirname;
const mode = process.argv[2];
if (!['catalog', 'options'].includes(mode)) {
  throw new Error('Usage: node reproduce-cli.cjs catalog|options');
}
// Every run gets a fresh directory; existing app files are never overwritten.
const buildRoot = path.join(root, 'build');
fs.mkdirSync(buildRoot, {recursive: true});
const fixture = fs.mkdtempSync(path.join(buildRoot, `repro-${mode}-`));
fs.writeFileSync(path.join(fixture, 'entry.js'), "console.log('CLI reproduction', require('./sample.gif'));\n");
fs.writeFileSync(path.join(fixture, 'sample.gif'), Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'));
const cli = path.join(path.dirname(require.resolve('react-native/package.json')), 'cli.js');
const config = path.join(root, 'repro-metro.config.cjs');
const sourcePaths = map => map.sections
  ? map.sections.flatMap(section => sourcePaths(section.map))
  : map.sources;

function bundle(name, additionalArgs) {
  const dest = path.join(fixture, name);
  fs.mkdirSync(dest);
  const args = [cli, 'bundle', '--config', config, '--platform', 'ios',
    '--entry-file', path.join(fixture, 'entry.js'), '--dev', 'false', '--minify', 'false',
    '--max-workers', '1', '--bundle-output', path.join(dest, 'main.jsbundle'),
    '--assets-dest', path.join(dest, 'assets'), ...additionalArgs(dest)];
  console.log('\nRunning:', process.execPath, args.join(' '));
  const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8'});
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'CLI failed before reproducing the target bug');
  return dest;
}

if (mode === 'catalog') {
  const control = bundle('control', () => []);
  const output = bundle('missing-catalog', () => [
    '--asset-catalog-dest', path.join(fixture, 'not-created')]);
  function gifs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(item => {
      const file = path.join(dir, item.name);
      return item.isDirectory() ? gifs(file) : file.endsWith('.gif') ? [file] : [];
    });
  }
  assert(gifs(control).length > 0, 'Control did not copy the required GIF');
  assert.equal(gifs(output).length, 0, 'Target behavior changed: asset was copied');
  console.log('REPRODUCED #59871: control copied the GIF; missing catalog logged an error but CLI exited 0 and copied no GIF.');
} else {
  const control = bundle('default', dest => ['--sourcemap-output', path.join(dest, 'main.map')]);
  const requested = bundle('requested-options', dest => [
    '--bundle-encoding', 'utf16le', '--sourcemap-output', path.join(dest, 'main.map'),
    '--sourcemap-sources-root', root]);
  const first = fs.readFileSync(path.join(control, 'main.jsbundle'));
  const second = fs.readFileSync(path.join(requested, 'main.jsbundle'));
  assert.deepEqual(first, second, 'Encoding option affected bytes; investigate before claiming this bug');
  const map = JSON.parse(fs.readFileSync(path.join(requested, 'main.map'), 'utf8'));
  const paths = sourcePaths(map);
  assert(paths.includes(path.join(fixture, 'entry.js')), 'Expected absolute fixture source was absent');
  assert.equal(second.filter(byte => byte === 0).length, 0);
  console.log('REPRODUCED #59873: default and requested UTF-16LE bundles are byte-identical UTF-8; source-map entry is still absolute.');
  console.log('Absolute entry source:', path.join(fixture, 'entry.js'));
}
console.log('Verified on Node', process.version, process.platform, process.arch);
console.log('react-native:', require('react-native/package.json').version);
console.log('Fixture:', fixture);
