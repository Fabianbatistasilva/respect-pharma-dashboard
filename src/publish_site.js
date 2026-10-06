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
];

// Painel gerado por comparador/comparador.py (comparacao de precos entre as lojas).
const COMPARADOR_SOURCE = 'comparador/data/painel.html';
const COMPARADOR_PAGE = 'comparador.html';
const BOT_DATA_SOURCE = 'comparador/data/bot.json';
const BOT_DATA_FILE = 'bot.json';

const OPTIONAL_FILES = [
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

async function copyOptionalFile(relativePath) {
  try {
    await fs.access(path.join(ROOT_DIR, relativePath));
  } catch {
    console.warn(`Arquivo opcional ausente, publicacao continua: ${relativePath}`);
    return null;
  }

  return copyFile(relativePath);
}

async function copyComparador() {
  try {
    await fs.copyFile(path.join(ROOT_DIR, COMPARADOR_SOURCE), path.join(PUBLIC_DIR, COMPARADOR_PAGE));
  } catch {
    console.warn(`Painel do comparador ausente, publicacao continua: ${COMPARADOR_SOURCE}`);
    return null;
  }

  return `public/${COMPARADOR_PAGE}`;
}

// Dados do chat de busca (site separado), gerados por comparador/exportar_bot.py.
async function copyBotData() {
  try {
    await fs.copyFile(path.join(ROOT_DIR, BOT_DATA_SOURCE), path.join(PUBLIC_DIR, BOT_DATA_FILE));
  } catch {
    console.warn(`Dados do chat de busca ausentes, publicacao continua: ${BOT_DATA_SOURCE}`);
    return null;
  }

  return `public/${BOT_DATA_FILE}`;
}

async function writeIndex(hasComparador) {
  const comparadorLink = hasComparador
    ? `<li><a href="./${COMPARADOR_PAGE}">Comparador de preços: Shape Total, ByPharmacon, Atacado Paraguai e Atacado Brasil</a></li>`
    : '';
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Painéis de preços</title>
  <style>
    body { font: 16px/1.5 system-ui, "Segoe UI", sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>Painéis de preços</h1>
  <ul>
    ${comparadorLink}
    <li><a href="./reports/respect_price_report.html">Respect Pharma: relatório de preços</a></li>
  </ul>
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
  for (const relativePath of OPTIONAL_FILES) {
    const copiedFile = await copyOptionalFile(relativePath);
    if (copiedFile) copiedFiles.push(copiedFile);
  }

  const comparadorFile = await copyComparador();
  if (comparadorFile) copiedFiles.push(comparadorFile);
  const botDataFile = await copyBotData();
  if (botDataFile) copiedFiles.push(botDataFile);

  await writeIndex(Boolean(comparadorFile));

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
