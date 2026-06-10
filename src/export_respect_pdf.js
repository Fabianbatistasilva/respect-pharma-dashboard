import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = process.cwd();
const DEFAULT_HTML = path.join(ROOT_DIR, 'reports', 'respect_price_report.html');
const DEFAULT_OUTPUT = path.join(ROOT_DIR, 'reports', 'respect_price_report_filtered.pdf');

const FILTER_ARGS = {
  '--search': 'search',
  '--busca': 'search',
  '--brand': 'brand',
  '--marca': 'brand',
  '--category': 'category',
  '--categoria': 'category',
  '--section': 'section',
  '--secao': 'section',
  '--status': 'status',
  '--family': 'family',
  '--produto': 'family',
  '--produto-alvo': 'family',
  '--source': 'source',
  '--origem': 'source',
  '--min-price': 'minPrice',
  '--preco-min': 'minPrice',
  '--max-price': 'maxPrice',
  '--preco-max': 'maxPrice',
  '--sort': 'sortMode',
  '--ordenar': 'sortMode',
};

const TAB_ALIASES = {
  brands: 'brands',
  marcas: 'brands',
  marca: 'brands',
  comparisons: 'comparisons',
  comparativos: 'comparisons',
  products: 'products',
  produtos: 'products',
  alerts: 'alerts',
  fontes: 'alerts',
  alertas: 'alerts',
};

function parseArgs(argv) {
  const result = {
    html: DEFAULT_HTML,
    output: DEFAULT_OUTPUT,
    tab: 'brands',
    filters: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const rawArg = argv[index];
    const [arg, inlineValue] = rawArg.includes('=') ? rawArg.split(/=(.*)/s).filter(Boolean) : [rawArg, null];
    const nextValue = inlineValue ?? argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--html') {
      result.html = path.resolve(ROOT_DIR, nextValue);
      if (inlineValue === null) index += 1;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      result.output = path.resolve(ROOT_DIR, nextValue);
      if (inlineValue === null) index += 1;
      continue;
    }

    if (arg === '--tab' || arg === '--aba') {
      result.tab = TAB_ALIASES[String(nextValue || '').toLowerCase()] || nextValue || 'brands';
      if (inlineValue === null) index += 1;
      continue;
    }

    if (FILTER_ARGS[arg]) {
      result.filters[FILTER_ARGS[arg]] = nextValue ?? '';
      if (inlineValue === null) index += 1;
      continue;
    }

    throw new Error(`Argumento desconhecido: ${rawArg}`);
  }

  return result;
}

function usage() {
  return `
Uso:
  npm run pdf:respect -- [filtros]

Exemplos:
  npm run pdf:respect -- --family Retatrutida --status disponivel --tab marcas
  npm run pdf:respect -- --brand "Cooper Pharma" --family Enantato --output reports/cooper_enantato.pdf
  npm run pdf:respect -- --search Masteron --min-price 100 --max-price 300 --tab comparativos

Filtros:
  --search / --busca
  --brand / --marca
  --category / --categoria
  --section / --secao
  --status
  --family / --produto-alvo
  --source / --origem
  --min-price / --preco-min
  --max-price / --preco-max
  --sort / --ordenar ranking|priceAsc|priceDesc|costAsc
  --tab marcas|comparativos|produtos|alertas
  --output caminho/do/arquivo.pdf
`.trim();
}

async function assertFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Arquivo HTML nao encontrado: ${filePath}. Rode npm run scrape:respect antes.`);
  }
}

async function exportPdf(options) {
  await assertFileExists(options.html);
  await fs.mkdir(path.dirname(options.output), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1400 },
    deviceScaleFactor: 1,
  });

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto(`file:///${options.html.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.RespectDashboard && document.querySelector('#brandGrid'), null, {
    timeout: 15000,
  });

  await page.evaluate(({ filters, tab }) => {
    window.RespectDashboard.applyFilters(filters);
    const tabButton = document.querySelector(`[data-tab="${tab}"]`);
    if (tabButton) tabButton.click();
  }, options);

  await page.waitForTimeout(350);
  const filteredCount = await page.evaluate(() => window.RespectDashboard.getFilteredCount());
  await page.evaluate(() => window.RespectDashboard.preparePrint());
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: options.output,
    format: 'A4',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
  });

  await browser.close();

  if (pageErrors.length) {
    throw new Error(`Erros no HTML durante exportacao: ${pageErrors.join(' | ')}`);
  }

  return {
    output: options.output,
    filteredCount,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  const result = await exportPdf(options);
  console.log('PDF gerado com sucesso');
  console.log(`Produtos no filtro: ${result.filteredCount}`);
  console.log(`Arquivo: ${path.relative(ROOT_DIR, result.output).replace(/\\/g, '/')}`);
}

export { exportPdf, parseArgs, usage };

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error('\nFalha ao gerar PDF.');
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
