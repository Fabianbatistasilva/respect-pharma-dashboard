import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { parseArgs } from '../src/export_respect_pdf.js';

test('parseArgs maps Portuguese and English filter flags to dashboard state', () => {
  const options = parseArgs([
    '--family',
    'Retatrutida',
    '--status=disponivel',
    '--marca',
    'Cooper Pharma',
    '--preco-min',
    '100',
    '--max-price=500',
    '--sort',
    'priceAsc',
    '--tab',
    'comparativos',
  ]);

  assert.deepEqual(options.filters, {
    family: 'Retatrutida',
    status: 'disponivel',
    brand: 'Cooper Pharma',
    minPrice: '100',
    maxPrice: '500',
    sortMode: 'priceAsc',
  });
  assert.equal(options.tab, 'comparisons');
});

test('parseArgs keeps comma-separated brands for multi-brand dashboard filtering', () => {
  const options = parseArgs(['--brand', 'Cooper Pharma,Landerlan', '--sort=priceDesc']);

  assert.deepEqual(options.filters, {
    brand: 'Cooper Pharma,Landerlan',
    sortMode: 'priceDesc',
  });
});

test('parseArgs accepts custom html and output paths', () => {
  const options = parseArgs([
    '--html',
    'reports/respect_price_report.html',
    '--output',
    'reports/cooper_enantato.pdf',
  ]);

  assert.equal(options.html, path.resolve(process.cwd(), 'reports/respect_price_report.html'));
  assert.equal(options.output, path.resolve(process.cwd(), 'reports/cooper_enantato.pdf'));
});

test('parseArgs rejects unknown flags to avoid silent wrong PDFs', () => {
  assert.throws(() => parseArgs(['--familia', 'Enantato']), /Argumento desconhecido/);
});
