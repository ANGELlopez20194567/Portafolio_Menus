import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

const publicDirectories = ['apps', 'assets', 'packages'];
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

// El favicon compartido vive en la raíz y debe estar disponible tanto para la
// landing publicada en / como para las demos bajo /apps.
await cp(resolve(repositoryDirectory, 'favicon.svg'), resolve(outputDirectory, 'favicon.svg'));

// GitHub Pages serves this directory as the custom domain's root. Keep the
// complete portfolio under /apps, but expose the landing page at / as well.
await cp(resolve(repositoryDirectory, 'apps/landing'), outputDirectory, {
  recursive: true,
  filter: shouldPublish
});

const landingIndex = resolve(outputDirectory, 'index.html');
const rootLanding = (await readFile(landingIndex, 'utf8'))
  .replace('../../packages/portfolio-shell/portfolio-shell.css', 'packages/portfolio-shell/portfolio-shell.css')
  .replaceAll('href="../landing/"', 'href="./"')
  .replaceAll('href="../classic/', 'href="apps/classic/')
  .replaceAll('href="../menu-informativo/', 'href="apps/menu-informativo/')
  .replaceAll('href="../menu-interactivo/', 'href="apps/menu-interactivo/')
  .replaceAll('href="../contacto-rayeltech/', 'href="apps/contacto-rayeltech/')
  .replaceAll('href="../reservas-estatico/', 'href="apps/reservas-estatico/');

await writeFile(landingIndex, rootLanding, 'utf8');

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

await writeFile(
  resolve(outputDirectory, 'apps/contacto-rayeltech/config.local.js'),
  `window.CONTACT_FORM_CONFIG = ${JSON.stringify({
    url: publicConfig.url,
    publishableKey: publicConfig.publishableKey,
  }, null, 2)};\n`,
  'utf8'
);

console.log(`Portafolio con reservas preparado en ${outputDirectory}`);
