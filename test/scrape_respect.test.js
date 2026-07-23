import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardData,
  buildMedicalBrasilSeedProducts,
  canonicalizeBrand,
  compareProductValue,
  deriveBrandParts,
  detectProductFamily,
  enrichProduct,
  estimateTotalMg,
  normalizePyPharmaProduct,
  parsePriceNumber,
  parsePyPharmaProductPayload,
  renderInteractiveHtmlReport,
} from '../src/scrape_respect.js';

const BRAND_SECTION_KEY = 'marca/seção';

function productFixture(overrides = {}) {
  return {
    source_url: 'https://example.test/murilo',
    source_type: 'principal',
    categoria: 'MARCAS PREMIUM',
    [BRAND_SECTION_KEY]: 'Cooper Pharma / INJETÁVEIS',
    nome_produto: 'Enantato',
    dosagem_texto: '250mg',
    quantidade_texto: '10ml',
    preco_atual: 'R$ 100,00',
    preco_antigo_riscado: '',
    percentual_desconto: '',
    economia_texto: '',
    status: 'disponivel',
    texto_card_completo: 'Enantato Cooper Pharma 250mg 10ml disponivel',
    data_hora_coleta: '2026-06-07T12:00:00.000Z',
    ...overrides,
  };
}

test('deriveBrandParts separates base brand from section and handles empty brand', () => {
  assert.deepEqual(deriveBrandParts('Cooper Pharma / INJETÁVEIS'), {
    marca_base: 'Cooper Pharma',
    secao_marca: 'INJETÁVEIS',
  });

  assert.deepEqual(deriveBrandParts(''), {
    marca_base: 'Sem marca',
    secao_marca: '',
  });
});

test('canonicalizeBrand groups duplicate spellings while preserving original and line', () => {
  assert.deepEqual(canonicalizeBrand('LANDERGOLD'), {
    original: 'LANDERGOLD',
    canonical: 'Landerlan Gold',
    family: 'Landerlan',
    line: 'Landerlan Gold',
  });
  assert.deepEqual(canonicalizeBrand('Landerlan Gold'), {
    original: 'Landerlan Gold',
    canonical: 'Landerlan Gold',
    family: 'Landerlan',
    line: 'Landerlan Gold',
  });
  assert.equal(canonicalizeBrand('BRATVA LABS').canonical, 'Bratva Labs');
  assert.equal(canonicalizeBrand('Bratva Labs').family, 'Bratva Labs');
  assert.equal(canonicalizeBrand('SPECTRUM PHARMA').canonical, 'Spectrum Pharma');
  assert.equal(canonicalizeBrand('IDN PHARMATECH').canonical, 'IDN Pharmatech');
  assert.equal(canonicalizeBrand('GENIQSPHARMA').canonical, 'Geniqs Pharma');
  assert.equal(canonicalizeBrand('OxygenKW').canonical, 'Oxygen KW');
  assert.equal(canonicalizeBrand('PHARMACOM').canonical, 'Pharmacom Labs');
  assert.equal(canonicalizeBrand('Royal Pharmaceutical').canonical, 'Royal Pharmaceuticals');
  assert.deepEqual(canonicalizeBrand('ZPHCD'), {
    original: 'ZPHCD',
    canonical: 'ZPHC',
    family: 'ZPHC',
    line: 'ZPHCD',
  });
});

test('detectProductFamily identifies monitored families without confusing Masteron Enantato', () => {
  assert.equal(detectProductFamily('Enantato 250mg 10ml'), 'Enantato');
  assert.equal(detectProductFamily('Masteron Enantato 200mg 10ml'), 'Masteron');
  assert.equal(detectProductFamily('Retatrutida 40mg peptideo'), 'Retatrutida');
  assert.equal(detectProductFamily('Tirzec 15mg'), 'Tirzepatida');
  assert.equal(detectProductFamily('Clembuterol 40mcg'), 'Clenbuterol');
});

test('estimateTotalMg follows oil, peptide and oral rules', () => {
  assert.equal(estimateTotalMg('Oleo 250mg 10ml'), 2500);
  assert.equal(estimateTotalMg('Masteron 100mg 10ml'), 1000);
  assert.equal(estimateTotalMg('Enantato de Testosterona 250mg/ml - 10 ampolas de 1ml'), 2500);
  assert.equal(estimateTotalMg('Cipionato de Testosterona 250mg/ml / 10 ampolas de 10ml'), 2500);
  assert.equal(estimateTotalMg('Retatrutida peptideo 40mg'), 40);
  assert.equal(estimateTotalMg('Proviron 25mg 100 comprimidos'), 2500);
});

test('parsePriceNumber accepts Brazilian currency and Guarani formats', () => {
  assert.equal(parsePriceNumber('R$ 1.250,50'), 1250.5);
  assert.equal(parsePriceNumber('R$ 80,00'), 80);
  assert.equal(parsePriceNumber('Gs. 120.000'), 120000);
  assert.equal(parsePriceNumber(''), null);
});

test('parsePyPharmaProductPayload extracts modal JSON and keeps insured price as main price', () => {
  const onclick =
    'openProductModal({"id":86140,"nome":"Enantato de Testosterona Spectrum Pharma","preco":230,"preco_com_seguro":230,"preco_sem_seguro":195.5,"precoAntigo":null,"desconto":"","descricao":"TESTO E - Enantato de Testosterona 250mg/ml - 10 ampolas de 1ml","emEstoque":true,"permalink":"https://paraguaypharmaceuticals.com/produto/enantato-de-testosterona-spectrum-pharma/"})';
  const payload = parsePyPharmaProductPayload(onclick);
  const product = normalizePyPharmaProduct(
    {
      onclick,
      text: 'Enantato de Testosterona Spectrum Pharma\nTESTO E - Enantato de Testosterona 250mg/ml - 10 ampolas de 1ml\nR$ 230,00',
      className: 'loja-mob-product-item',
      category: 'Enantato de Testosterona',
    },
    'https://paraguaypharmaceuticals.com/',
  );
  const enriched = enrichProduct({ source_type: 'pypharma', data_hora_coleta: '2026-06-07T12:00:00.000Z', ...product });

  assert.equal(payload.nome, 'Enantato de Testosterona Spectrum Pharma');
  assert.equal(payload.preco_com_seguro, 230);
  assert.equal(payload.preco_sem_seguro, 195.5);
  assert.equal(product.preco_atual, 'R$ 230,00');
  assert.equal(product.preco_com_seguro, 'R$ 230,00');
  assert.equal(product.preco_sem_seguro, 'R$ 195,50');
  assert.equal(product.source_url, 'https://paraguaypharmaceuticals.com/produto/enantato-de-testosterona-spectrum-pharma/');
  assert.equal(enriched.preco_atual_numero, 230);
  assert.equal(enriched.preco_sem_seguro_numero, 195.5);
  assert.equal(enriched.marca_base, 'Spectrum Pharma');
  assert.equal(enriched.marca_original_site, 'Spectrum Pharma');
  assert.equal(enriched.marca_canonica, 'Spectrum Pharma');
  assert.equal(enriched.marca_familia, 'Spectrum Pharma');
  assert.equal(enriched.status, 'disponivel');

  const fallbackProduct = normalizePyPharmaProduct({
    onclick:
      'openProductModal({"nome":"Produto PyPharma","preco":100,"descricao":"Produto teste","emEstoque":true})',
    text: 'Produto PyPharma\nR$ 100,00',
    className: 'loja-mob-product-item',
    category: 'PYPHARMA',
  });

  assert.equal(fallbackProduct.source_url, 'https://pypharma.li/');
});

test('enrichProduct derives brand fields, family, mg total, cost and ranking', () => {
  const product = enrichProduct(productFixture());

  assert.equal(product.marca_base, 'Cooper Pharma');
  assert.equal(product.marca_original_site, 'Cooper Pharma');
  assert.equal(product.marca_canonica, 'Cooper Pharma');
  assert.equal(product.marca_familia, 'Cooper Pharma');
  assert.equal(product.secao_marca, 'INJETÁVEIS');
  assert.equal(product.familia_produto, 'Enantato');
  assert.equal(product.marca_nota_documental, 9);
  assert.equal(product.preco_atual_numero, 100);
  assert.equal(product.total_mg_estimado, 2500);
  assert.equal(product.custo_por_mg, 0.04);
  assert.ok(product.ranking_marca_preco > 90_000_000);
});

test('buildDashboardData creates metrics, options and family comparisons', () => {
  const products = [
    enrichProduct(productFixture()),
    enrichProduct(
      productFixture({
        [BRAND_SECTION_KEY]: '',
        nome_produto: 'Retatrutida',
        dosagem_texto: '40mg',
        quantidade_texto: '',
        preco_atual: 'R$ 600,00',
        texto_card_completo: 'Retatrutida 40mg peptideo',
      }),
    ),
    enrichProduct(
      productFixture({
        source_type: 'promo',
        [BRAND_SECTION_KEY]: 'Landerlan / INJETÁVEIS',
        nome_produto: 'Durateston',
        dosagem_texto: '250mg',
        quantidade_texto: '10ml',
        preco_atual: 'R$ 145,00',
        percentual_desconto: '10%',
        texto_card_completo: 'Durateston Landerlan 250mg 10ml com desconto',
      }),
    ),
    enrichProduct(
      productFixture({
        source_url: 'https://paraguaypharmaceuticals.com/produto/enantato-de-testosterona-spectrum-pharma/',
        source_type: 'pypharma',
        categoria: 'Enantato de Testosterona',
        [BRAND_SECTION_KEY]: 'Spectrum Pharma',
        nome_produto: 'Enantato de Testosterona Spectrum Pharma',
        dosagem_texto: '250mg/ml',
        quantidade_texto: '10 ampolas de 1ml',
        preco_atual: 'R$ 230,00',
        preco_com_seguro: 'R$ 230,00',
        preco_sem_seguro: 'R$ 195,50',
        texto_card_completo: 'PYPHARMA Spectrum 250mg/ml 10 ampolas R$ 230,00',
      }),
    ),
  ];

  const dashboard = buildDashboardData(products, [], {
    'https://example.test/murilo': 2,
    'https://example.test/promo/murilo': 1,
    'https://paraguaypharmaceuticals.com/': 1,
  });

  assert.equal(dashboard.metrics.totalProducts, 4);
  assert.equal(dashboard.metrics.available, 4);
  assert.equal(dashboard.metrics.promo, 1);
  assert.equal(dashboard.metrics.pypharma, 1);
  assert.equal(dashboard.metrics.withDiscount, 1);
  assert.deepEqual(dashboard.options.families, [
    'Enantato',
    'Masteron',
    'Retatrutida',
    'Tirzepatida',
    'Clenbuterol',
    'Proviron',
    'Durateston',
  ]);
  assert.ok(dashboard.options.brands.includes('Cooper Pharma'));
  assert.ok(dashboard.options.sources.includes('pypharma'));
  assert.ok(dashboard.options.brands.includes('Sem marca'));
  assert.equal(dashboard.familyComparisons.find((item) => item.family === 'Enantato').total, 2);
  assert.equal(dashboard.brandCards.at(-1).brand, 'Sem marca');
});

test('buildDashboardData groups Landerlan duplicates by canonical family and keeps variations', () => {
  const products = [
    enrichProduct(
      productFixture({
        source_type: 'principal',
        [BRAND_SECTION_KEY]: 'LANDERGOLD / INJETÃVEIS',
        nome_produto: 'Testenat 250mg',
        texto_card_completo: 'Testenat LANDERGOLD 250mg 10ml',
      }),
    ),
    enrichProduct(
      productFixture({
        source_type: 'medical_brasil',
        [BRAND_SECTION_KEY]: 'Landerlan Gold',
        nome_produto: 'Durateston Plus Landerlan Gold',
        texto_card_completo: 'Durateston Plus Landerlan Gold 250mg 10ml',
      }),
    ),
    enrichProduct(
      productFixture({
        source_type: 'pypharma',
        [BRAND_SECTION_KEY]: 'Landerlan',
        nome_produto: 'Nandrolona Landerlan',
        texto_card_completo: 'Nandrolona Landerlan 250mg 10ml',
      }),
    ),
  ];

  const dashboard = buildDashboardData(products, [], {});
  const landerlan = dashboard.brandCards.find((card) => card.brand === 'Landerlan');

  assert.deepEqual(dashboard.options.brands, ['Landerlan']);
  assert.ok(landerlan);
  assert.equal(landerlan.total, 3);
  assert.deepEqual(landerlan.lines, ['Landerlan', 'Landerlan Gold']);
  assert.deepEqual(landerlan.originals, ['LANDERGOLD', 'Landerlan', 'Landerlan Gold']);
  assert.equal(landerlan.variantsBySource.find((variant) => variant.sourceType === 'principal').originals[0], 'LANDERGOLD');
  assert.equal(landerlan.variantsBySource.find((variant) => variant.sourceType === 'medical_brasil').originals[0], 'Landerlan Gold');
  assert.equal(landerlan.variantsBySource.find((variant) => variant.sourceType === 'pypharma').originals[0], 'Landerlan');
  assert.ok(!dashboard.options.brands.includes('LANDERGOLD'));
  assert.ok(!dashboard.options.brands.includes('Landerlan Gold'));
});

test('buildMedicalBrasilSeedProducts provides Kyte products with category page links', () => {
  const products = buildMedicalBrasilSeedProducts();
  const halobol = products.find((product) => product.nome_produto.includes('Halobol'));

  assert.ok(products.length >= 120);
  assert.ok(halobol);
  assert.equal(halobol.categoria, 'Alpha Pharma');
  assert.equal(halobol['marca/seção'], 'Alpha Pharma');
  assert.equal(halobol.preco_atual, 'R$900.00');
  assert.equal(halobol.source_url, 'https://medical-brasil.catalog.kyte.site/alpha-pharma');
});

test('compareProductValue prioritizes documented brand score before cost and price', () => {
  const highScoreExpensive = {
    brandBase: 'Cooper Pharma',
    brandScore: 9,
    costPerMg: 0.2,
    price: 200,
    productName: 'A',
  };
  const lowScoreCheap = {
    brandBase: 'Marca Barata',
    brandScore: 5,
    costPerMg: 0.01,
    price: 20,
    productName: 'B',
  };
  const noBrand = {
    brandBase: 'Sem marca',
    brandScore: 0,
    costPerMg: 0.001,
    price: 1,
    productName: 'C',
  };

  assert.equal([lowScoreCheap, noBrand, highScoreExpensive].sort(compareProductValue)[0], highScoreExpensive);
  assert.equal([lowScoreCheap, noBrand, highScoreExpensive].sort(compareProductValue).at(-1), noBrand);
});

test('renderInteractiveHtmlReport exposes shareable filters and print-friendly PDF guidance', () => {
  const products = [enrichProduct(productFixture())];
  const html = renderInteractiveHtmlReport({
    generatedAt: '2026-06-07T12:00:00.000Z',
    products,
    brandResearch: [],
    totalsByUrl: {
      'https://example.test/murilo': 1,
    },
  });

  assert.match(html, /Copiar link dos filtros/);
  assert.match(html, /Exportar PDF filtrado/);
  assert.match(html, /liveRefreshOverlay/);
  assert.match(html, /Atualizando valores agora/);
  assert.match(html, /api\/refresh/);
  assert.match(html, /api\/status/);
  assert.match(html, /Atualizacao automatica exige npm run dashboard/);
  assert.match(html, /PYPHARMA/);
  assert.match(html, /Ordenar por/);
  assert.match(html, /Menor preco/);
  assert.match(html, /Maior preco/);
  assert.match(html, /Menor custo\/mg/);
  assert.match(html, /<select id="brandFilter" multiple/);
  assert.match(html, /brandOptionList/);
  assert.match(html, /brandSearch/);
  assert.match(html, /brand-option/);
  assert.match(html, /selectedBrandChips/);
  assert.match(html, /Selecionar premium/);
  assert.match(html, /premiumBrandTargets/);
  assert.match(html, /selectPremiumBrands/);
  assert.match(html, /source-card-pill/);
  assert.match(html, /page-btn/);
  assert.match(html, /price-note/);
  assert.match(html, /product-list/);
  assert.match(html, /product-row/);
  assert.match(html, /Ver pagina/);
  assert.match(html, /brandFamily/);
  assert.match(html, /brandLine/);
  assert.match(html, /brand-variants/);
  assert.match(html, /Variacoes encontradas/);
  assert.match(html, /overflow-x: hidden/);
  assert.match(html, /table-layout: fixed/);
  assert.doesNotMatch(html, /min-width:\s*980px/);
  assert.match(html, /brand-source-chip/);
  assert.match(html, /data-brand-source/);
  assert.match(html, /Aparece em/);
  assert.match(html, /data-family="Retatrutida"/);
  assert.match(html, /Este PDF e um snapshot filtrado/);
  assert.match(html, /window\.RespectDashboard/);
  assert.match(html, /buildFilterUrl/);
  assert.match(html, /state = \{\s+search: '',\s+brands: \[\]/);
  assert.match(html, /sortMode: 'ranking'/);
});
