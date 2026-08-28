import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const repositoryDirectory = resolve('.');
const outputDirectory = resolve(process.env.RESERVAS_OUTPUT_DIR || '_site');
const requiredVariables = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'RESTAURANT_ID'
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
  throw new Error(`Faltan variables requeridas: ${missingVariables.join(', ')}`);
}

if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(process.env.SUPABASE_URL)) {
  throw new Error('SUPABASE_URL no tiene el formato esperado.');
}

if (!/^(sb_publishable_|eyJ)/.test(process.env.SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error('SUPABASE_PUBLISHABLE_KEY debe ser una publishable key o una anon key heredada.');
}

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(process.env.RESTAURANT_ID)) {
  throw new Error('RESTAURANT_ID debe ser un UUID válido.');
}

const publicDirectories = ['apps', 'assets'];
const excludedPaths = new Set([
  'apps/reservas-estatico/.gitignore',
  'apps/reservas-estatico/ACCESO_ADMIN.md',
  'apps/reservas-estatico/config.example.js',
  'apps/reservas-estatico/config.local.js'
]);

function shouldPublish(sourcePath) {
  const projectPath = relative(repositoryDirectory, sourcePath).split(sep).join('/');
  const segments = projectPath.split('/');
  return !excludedPaths.has(projectPath)
    && !segments.includes('.vite')
    && !segments.includes('node_modules');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const directory of publicDirectories) {
  await cp(resolve(repositoryDirectory, directory), resolve(outputDirectory, directory), {
    recursive: true,
    filter: shouldPublish
  });
}

const publicConfig = {
  url: process.env.SUPABASE_URL.replace(/\/$/, ''),
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  restaurantId: process.env.RESTAURANT_ID
};

await writeFile(
  resolve(outputDirectory, 'apps/reservas-estatico/config.local.js'),
  `window.SUPABASE_CONFIG = ${JSON.stringify(publicConfig, null, 2)};\n`,
  'utf8'
);

console.log(`Portafolio con reservas preparado en ${outputDirectory}`);
