import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const REQUIRED_FILES = [
  'reports/respect_price_report.html',
  'reports/respect_price_report.md',
  'data/respect_products_raw.json',
  'data/respect_products.csv',
  'screenshots/promo_page.png',
  'screenshots/main_page.png',
  'screenshots/pypharma_page.png',
];

function toPosix(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

async function copyFile(relativePath) {
  const source = path.join(ROOT_DIR, relativePath);
  const destination = path.join(PUBLIC_DIR, relativePath);

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
  return toPosix(path.relative(ROOT_DIR, destination));
}

async function writeIndex() {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=./reports/respect_price_report.html">
  <title>Respect Pharma Dashboard</title>
</head>
<body>
  <p>Redirecionando para <a href="./reports/respect_price_report.html">reports/respect_price_report.html</a>.</p>
</body>
</html>
`;

  await fs.writeFile(path.join(PUBLIC_DIR, 'index.html'), html, 'utf8');
  await fs.writeFile(path.join(PUBLIC_DIR, '.nojekyll'), '', 'utf8');
}

async function assertRequiredFiles() {
  const missing = [];

  for (const relativePath of REQUIRED_FILES) {
    try {
      await fs.access(path.join(ROOT_DIR, relativePath));
    } catch {
      missing.push(relativePath);
    }
  }

  if (missing.length) {
    throw new Error(
      [
        'Arquivos obrigatorios ausentes para publicar o site:',
        ...missing.map((file) => `- ${file}`),
        'Rode npm run scrape:respect antes de npm run publish:site.',
      ].join('\n'),
    );
  }
}

async function main() {
  await assertRequiredFiles();
  await fs.rm(PUBLIC_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const copiedFiles = [];
  for (const relativePath of REQUIRED_FILES) {
    copiedFiles.push(await copyFile(relativePath));
  }

  await writeIndex();

  console.log('Site estatico pronto em public/.');
  console.log('Arquivos publicados:');
  for (const file of ['public/index.html', 'public/.nojekyll', ...copiedFiles]) {
    console.log(`- ${file}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
