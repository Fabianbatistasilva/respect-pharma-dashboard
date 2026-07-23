import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots');
const MEDICAL_BRASIL_URL = 'https://medical-brasil.catalog.kyte.site';
const PY_PHARMA_URL = 'https://pypharma.li/';

const TARGETS = [
  {
    url: 'https://app.respectpharma.com.py/promo/murilo',
    sourceType: 'promo',
    screenshot: path.join(SCREENSHOTS_DIR, 'promo_page.png'),
    debugHtml: path.join(DATA_DIR, 'promo_page_debug.html'),
  },
  {
    url: 'https://app.respectpharma.com.py/murilo',
    sourceType: 'principal',
    screenshot: path.join(SCREENSHOTS_DIR, 'main_page.png'),
    debugHtml: path.join(DATA_DIR, 'main_page_debug.html'),
  },
  {
    url: MEDICAL_BRASIL_URL,
    sourceType: 'medical_brasil',
    screenshot: path.join(SCREENSHOTS_DIR, 'medical_brasil_page.png'),
    debugHtml: path.join(DATA_DIR, 'medical_brasil_page_debug.html'),
  },
  {
    url: PY_PHARMA_URL,
    sourceType: 'pypharma',
    screenshot: path.join(SCREENSHOTS_DIR, 'pypharma_page.png'),
    debugHtml: path.join(DATA_DIR, 'pypharma_page_debug.html'),
  },
];

const OUTPUTS = {
  json: path.join(DATA_DIR, 'respect_products_raw.json'),
  csv: path.join(DATA_DIR, 'respect_products.csv'),
  markdown: path.join(REPORTS_DIR, 'respect_price_report.md'),
  html: path.join(REPORTS_DIR, 'respect_price_report.html'),
};

const CSV_HEADERS = [
  'source_url',
  'source_type',
  'categoria',
  'marca/seção',
  'nome_produto',
  'dosagem_texto',
  'quantidade_texto',
  'preco_atual',
  'preco_com_seguro',
  'preco_sem_seguro',
  'preco_sem_seguro_numero',
  'preco_antigo_riscado',
  'percentual_desconto',
  'economia_texto',
  'status',
  'texto_card_completo',
  'data_hora_coleta',
  'preco_atual_numero',
  'preco_antigo_numero',
  'total_mg_estimado',
  'custo_por_mg',
  'marca_base',
  'secao_marca',
  'marca_original_site',
  'marca_canonica',
  'marca_familia',
  'marca_linha',
  'familia_produto',
  'marca_nota_documental',
  'ranking_marca_preco',
];

const TARGET_TERMS = [
  'Enantato',
  'Masteron',
  'Retatrutida',
  'Tirzepatida',
  'Clenbuterol',
  'Proviron',
  'Durateston',
];

const BRAND_SECTION_KEYS = ['marca/seção', 'marca/se\u00c3\u00a7\u00c3\u00a3o', 'marca/secao', 'marca_secao'];
const BRAND_CANONICAL_RULES = [
  {
    canonical: 'Landerlan Gold',
    family: 'Landerlan',
    line: 'Landerlan Gold',
    aliases: ['landergold', 'lander gold', 'landerlan gold'],
  },
  {
    canonical: 'Landerlan',
    family: 'Landerlan',
    line: 'Landerlan',
    aliases: ['landerlan'],
  },
  {
    canonical: 'Bratva Labs',
    family: 'Bratva Labs',
    line: '',
    aliases: ['bratva labs', 'bratva'],
  },
  {
    canonical: 'Spectrum Pharma',
    family: 'Spectrum Pharma',
    line: '',
    aliases: ['spectrum pharma', 'spectrum'],
  },
  {
    canonical: 'Canada Bio Labs',
    family: 'Canada Bio Labs',
    line: '',
    aliases: ['canada bio labs', 'canadabiolabs', 'canada labs'],
  },
  {
    canonical: 'ZPHC',
    family: 'ZPHC',
    line: 'ZPHCD',
    aliases: ['zphcd'],
  },
  {
    canonical: 'ZPHC',
    family: 'ZPHC',
    line: 'ZPHC',
    aliases: ['zphc'],
  },
  {
    canonical: 'Eminence Labs',
    family: 'Eminence Labs',
    line: '',
    aliases: ['eminence labs', 'eminence'],
  },
  {
    canonical: 'Muscle Labs',
    family: 'Muscle Labs',
    line: '',
    aliases: ['muscle labs', 'muscle pharma'],
  },
  {
    canonical: 'Alpha Pharma',
    family: 'Alpha Pharma',
    line: '',
    aliases: ['alpha pharma'],
  },
  {
    canonical: 'Cooper Pharma',
    family: 'Cooper Pharma',
    line: '',
    aliases: ['cooper pharma'],
  },
  {
    canonical: 'IDN Pharmatech',
    family: 'IDN Pharmatech',
    line: '',
    aliases: ['idn pharmatech'],
  },
  {
    canonical: 'Geniqs Pharma',
    family: 'Geniqs Pharma',
    line: '',
    aliases: ['geniqs pharma', 'geniqspharma'],
  },
  {
    canonical: 'Oxygen KW',
    family: 'Oxygen KW',
    line: '',
    aliases: ['oxygen kw', 'oxygenkw'],
  },
  {
    canonical: 'Pharmacom Labs',
    family: 'Pharmacom Labs',
    line: '',
    aliases: ['pharmacom labs', 'pharmacom'],
  },
  {
    canonical: 'NeoPeptides',
    family: 'NeoPeptides',
    line: '',
    aliases: ['neo peptides', 'neopeptides'],
  },
  {
    canonical: 'Royal Pharmaceuticals',
    family: 'Royal Pharmaceuticals',
    line: '',
    aliases: ['royal pharmaceuticals', 'royal pharmaceutical'],
  },
  {
    canonical: 'Eticos',
    family: 'Eticos',
    line: '',
    aliases: ['eticos'],
  },
  {
    canonical: 'Farmacia',
    family: 'Farmacia',
    line: '',
    aliases: ['farmacia'],
  },
  {
    canonical: 'Manipulados',
    family: 'Manipulados',
    line: '',
    aliases: ['manipulado', 'manipulados'],
  },
  {
    canonical: 'Aureon',
    family: 'Aureon',
    line: '',
    aliases: ['aureon'],
  },
  {
    canonical: 'Purity',
    family: 'Purity',
    line: '',
    aliases: ['purity'],
  },
  {
    canonical: 'Health Peptideos',
    family: 'Health Peptideos',
    line: '',
    aliases: ['health peptideos'],
  },
];

const PY_PHARMA_BRANDS = [
  'Black Muscle Labs',
  'Royal Pharmaceuticals',
  'IDN PHARMATECH',
  'Spectrum Pharma',
  'GENIQSPHARMA',
  'Eminence Labs',
  'Canada Bio Labs',
  'CANADABIOLABS',
  'Cooper Pharma',
  'Alpha Pharma',
  'Muscle Labs',
  'Landerlan Gold',
  'LanderGold',
  'Landerlan',
  'PHARMACOM',
  'OxygenKW',
  'King Pharma',
  'Bratva Labs',
  'Dragon Elite',
  'ZPHC',
  'Novax Pharmaceuticals',
  'NeoPeptides',
  'Synedica',
  'Eticos',
  'Farmacia',
];

const BRAND_RESEARCH = [
  {
    displayName: 'Landerlan',
    aliases: ['landerlan'],
    excludes: ['landergold', 'landerlan gold'],
    score: 9.4,
    tier: 'Muito forte',
    sourceLabel: 'Landerlan Paraguai',
    sourceUrl: 'https://www.landerlan.com.py/la_empresa.php',
    history:
      'Laboratorio paraguaio com site institucional, endereco em Lambare e catalogo proprio. A pagina informa missao de qualidade farmaceutica e conformidade com MSP y BS, normas internacionais e MERCOSUR.',
    evidence:
      'Fonte oficial com produtos, contato, autenticidade e linha Landerlan Gold listada no proprio site.',
    caution:
      'Ainda assim, produto de marketplace deve ser validado por lote/codigo; marca forte nao substitui prescricao nem controle sanitario local.',
  },
  {
    displayName: 'Cooper Pharma',
    aliases: ['cooper pharma'],
    score: 9.0,
    tier: 'Muito forte',
    sourceLabel: 'Cooper Pharma',
    sourceUrl: 'https://cooperpharma.com/about/overview',
    history:
      'Empresa farmaceutica indiana de origem familiar, iniciada nos anos 1950 por Dr. O.S. Bhargava. Declara presenca global em mais de 30 paises e fabrica em Dehradun.',
    evidence:
      'Site oficial detalha WHO-GMP, rede de distribuidores, exportacao, autenticidade e portfolio com comprimidos, capsulas e injetaveis.',
    caution:
      'A existencia da empresa nao confirma automaticamente a origem de cada item vendido por terceiros; conferir autenticidade quando houver codigo.',
  },
  {
    displayName: 'Muscle Labs',
    aliases: ['muscle labs', 'muscle pharma'],
    score: 8.2,
    tier: 'Forte',
    sourceLabel: 'Muscle Labs India',
    sourceUrl: 'https://www.musclelabsindia.com/about-us',
    history:
      'Site oficial declara operacao desde 1998, com mais de 25 anos de experiencia, foco em formulacoes testadas e linhas de injecoes, comprimidos e peptideos.',
    evidence:
      'Pagina publica informa GMP, ISO 9001, scratch validation, authentic app e supplier check.',
    caution:
      'As declaracoes sao majoritariamente auto-reportadas; ideal validar embalagem/codigo e lote.',
  },
  {
    displayName: 'ZPHC / ZPHCD',
    aliases: ['zphc', 'zphcd'],
    score: 8.0,
    tier: 'Forte',
    sourceLabel: 'ZPHC',
    sourceUrl: 'https://zphc.cm/',
    history:
      'A pagina se apresenta como Zhengzhou Pharmaceutical Co. Ltd e afirma atuacao desde 1972, com foco em antibioticos semi-sinteticos, hormonais e terapias androgenicas-anabolicas.',
    evidence:
      'Fonte publica oferece validacao por codigo, menciona protecao anti-falsificacao e controle multi-etapas.',
    caution:
      'Ha dominios e representacoes paralelas no mercado; usar apenas verificacao do fabricante e desconfiar de embalagem sem codigo valido.',
  },
  {
    displayName: 'Eminence Labs',
    aliases: ['eminence labs', 'eminence'],
    score: 7.7,
    tier: 'Boa',
    sourceLabel: 'Eminence Labs',
    sourceUrl: 'https://www.eminencelabs.com/about-us/',
    history:
      'Empresa farmaceutica que se apresenta como especializada em formulacoes inovadoras, com operacoes comerciais globais/regionais e oferta de dossies, GMP certificate e manufacturing license.',
    evidence:
      'Site oficial tem secoes de qualidade, P&D, produtos e autenticacao.',
    caution:
      'Parte das credenciais e declaracoes dependem de documento/lote; confirmar autenticidade do item recebido.',
  },
  {
    displayName: 'LanderGold',
    aliases: ['landergold', 'landerlan gold'],
    score: 7.2,
    tier: 'Boa',
    sourceLabel: 'Landerlan Paraguai',
    sourceUrl: 'https://www.landerlan.com.py/la_empresa.php',
    history:
      'Aparece no catalogo como linha/presenca ligada a Landerlan Gold. O site oficial da Landerlan lista produtos com essa linha, incluindo gonadotropina e produtos depot.',
    evidence:
      'A melhor fonte encontrada e o proprio site Landerlan, nao uma empresa separada chamada Landergold.',
    caution:
      'Tratar como linha/rotulo da familia Landerlan, nao como laboratorio independente, salvo comprovacao por lote.',
  },
  {
    displayName: 'Alpha Pharma',
    aliases: ['alpha pharma'],
    score: 6.0,
    tier: 'Media',
    sourceLabel: 'Alpha-Pharm Healthcare',
    sourceUrl: 'https://alpha-pharm.healthcare/about/',
    history:
      'Ha fonte publica com marca Alpha-Pharma/Alpha-Pharm dizendo atuar com genericos, restaurativos e medicina de performance.',
    evidence:
      'O site oferece validacao de produto e paginas de produtos, mas ha varios homonimos globais com nomes parecidos.',
    caution:
      'Correspondencia com a marca do catalogo e menos segura; a pagina contem sinais fracos de acabamento institucional, entao validar embalagem/codigo e fornecedor.',
  },
  {
    displayName: 'Spectrum Pharma',
    aliases: ['spectrum pharma', 'spectrum'],
    score: 5.5,
    tier: 'Media',
    sourceLabel: 'Spectrum Pharma Canada',
    sourceUrl: 'https://spectrumpharma.ca/en/about-us/',
    history:
      'Fonte oficial canadense encontrada descreve uma empresa fundada em Montreal em 1987, especializada em embalagem primaria/secundaria, gestao de estudos clinicos e distribuicao medica.',
    evidence:
      'A pagina informa instalacoes, clean rooms, licencas Health Canada/FDA e foco em embalagem farmaceutica.',
    caution:
      'A fonte encontrada pode ser homonima e nao confirma que os itens SPECTRUM PHARMA do catalogo Respect sejam da mesma entidade.',
  },
  {
    displayName: 'BRATVA LABS',
    aliases: ['bratva labs'],
    score: 4.8,
    tier: 'Fraca',
    sourceLabel: 'Validador Bratva + relatorio PF',
    sourceUrl: 'https://validator.bratvalabs.com.py/',
    secondarySourceUrl:
      'https://www.gov.br/pf/pt-br/acesso-a-informacao/estatisticas/diretoria-tecnico-cientifica-ditec/relatorio-de-quimica-forense-2021/relatorio-2021-produtos-farmaceuticos-farmonitor.pdf',
    history:
      'Ha um validador publico de codigo BratvaOriginals e referencias a app de verificacao; nao encontrei uma pagina institucional robusta de historia/fabrica.',
    evidence:
      'Existe ferramenta de autenticidade, mas a documentacao corporativa publica e limitada.',
    caution:
      'Relatorio de quimica forense da Policia Federal brasileira cita Bratva Labs em tabela de marcas supostamente clandestinas identificadas em 2021; tratar com cautela elevada.',
  },
  {
    displayName: 'Canada Labs',
    aliases: ['canada labs', 'canada bio labs'],
    score: 3.5,
    tier: 'Muito fraca',
    sourceLabel: 'Sem fonte oficial confiavel encontrada',
    sourceUrl: '',
    history:
      'Marca aparece no catalogo, mas nao encontrei uma fonte institucional confiavel e especifica que confirme historico, fabrica, licencas ou sistema de autenticidade.',
    evidence:
      'Presenca no catalogo Respect, porem baixa verificabilidade publica.',
    caution:
      'Sem site oficial claro, sem validacao de lote localizada e com alto risco de homonimos; nao ranquear como confiavel apenas pelo nome.',
  },
];

const MEDICAL_BRASIL_CATEGORIES = [
  {
    name: 'Peptídeos',
    slug: 'peptideos',
    products: [
      ['GHK-Cu (100mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$600.00'],
      ['Humanin (10mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$750.00'],
      ['IGF-1 LR3 Dual-Chamber Pen (Caneta 1,4mg) Spectrum Pharma', 'Spectrum Pharma', 'R$2,300.00'],
      ['Ipamorelin (10mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$480.00'],
      ['KLOW-4 (80mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$1,100.00'],
      ['Melanotan II (1 vial x 10mg + Bac Water) ZPHC', 'ZPHC', 'R$600.00'],
      ['PT-141 (10mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$480.00'],
      ['SLU-PP-332 (5mg/2ml + Água Bac) Novax Pharmaceuticals', 'Novax Pharmaceuticals', 'R$580.00'],
      ['SLU-PP-332 (5mg/2ml) NeoPeptides', 'NeoPeptides', 'R$500.00'],
    ],
  },
  {
    name: 'Emagrecedores',
    slug: 'emagrecedores',
    products: [
      ['Lipoless 60mg Tizerpatida (1 vial x 60mg) Eticos', 'Eticos', 'R$1,300.00', 'Preço antigo: R$2,000.00'],
      ['Retatrutida (40mg) Synedica', 'Synedica', 'R$2,500.00', 'Preço antigo: R$3,500.00'],
      ['Retatrutide AQ Pen Premixed (30mg x 300 cliques) ZPHC', 'ZPHC', 'R$2,100.00'],
      ['Tirzepatide 15mg (1 vial x 15mg) ZPHC', 'ZPHC', 'R$400.00', 'Preço antigo: R$500.00'],
      ['Tirzepatide AQ Pen Premixed (30mg x 60 cliques) ZPHC', 'ZPHC', 'R$1,500.00'],
    ],
  },
  {
    name: 'IDN Pharmatech',
    slug: 'idn-pharmatech',
    products: [
      ['Cypiobol (Cipionato 250mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$250.00'],
      ['Decabol (Deca 250mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$280.00'],
      ['Decabol Rapid (NPP 100mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$280.00'],
      ['Gonatestin (Propionato 100mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$250.00'],
      ['Mastebol Rapid (Master Prop 100mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$450.00'],
      ['Mesterolic (Proviron 25mg/50cmp) IDN Pharmatech', 'IDN Pharmatech', 'R$150.00'],
      ['Oxidrobol (Hemogenin 50mg/50cmp) IDN Pharmatech', 'IDN Pharmatech', 'R$200.00'],
      ['Sostenon (Dura 250mg/10ml) IDN Pharmatech', 'IDN Pharmatech', 'R$280.00'],
      ['Stanobolin oral (Stano 25mg/50cmp) IDN Pharmatech', 'IDN Pharmatech', 'R$130.00'],
    ],
  },
  {
    name: 'Cooper Pharma',
    slug: 'cooper-pharma',
    products: [
      ['Bolbolic (Boldenona 250mg/10ml) Cooper Pharma', 'Cooper Pharma', 'R$500.00'],
      ['Clenbolic (Clembuterol 50cmp/40mcg) Cooper Pharma', 'Cooper Pharma', 'R$160.00'],
      ['Decabolic (Deca 250mg/10ml) Cooper Pharma', 'Cooper Pharma', 'R$460.00'],
      ['Dianabolic (Dianabol 50cmp/10mg) Cooper Pharma', 'Cooper Pharma', 'R$160.00'],
      ['Flubolic (Halotestin 50cmp/5mg) Cooper Pharma', 'Cooper Pharma', 'R$420.00'],
      ['Nanbolic-PH (NPP 100mg/10ml) Cooper Pharma', 'Cooper Pharma', 'R$450.00'],
      ['Oxanbolic (Oxandrolona 50cmp/10mg) Cooper Pharma', 'Cooper Pharma', 'R$320.00'],
      ['Oxybolic (Hemogenin 50cmp/50mg) Cooper Pharma', 'Cooper Pharma', 'R$320.00'],
      ['Probolic (Propionato 100mg/10ml) Cooper Pharma', 'Cooper Pharma', 'R$320.00'],
    ],
  },
  {
    name: 'ZPHC',
    slug: 'zphc',
    products: [
      ['Clembuterol (100cmp/40mcg) ZPHC', 'ZPHC', 'R$260.00'],
      ['Methandienone (Dianabol 100cmp/10mg) ZPHC', 'ZPHC', 'R$220.00'],
      ['Methasterone (Superdrol 50mg/10ml) ZPHC', 'ZPHC', 'R$330.00'],
      ['Nandrolone Mix (300mg/10ml) ZPHC', 'ZPHC', 'R$500.00', 'Nandrolone Propionate 50mg/ml; Nandrolone Phenylpropionate 50mg/ml; Nandrolone Decanoate 100mg/ml; Nandrolone Laurate 100mg/ml'],
      ['Oxandrolone 50mg (100cmp/50mg) ZPHC', 'ZPHC', 'R$850.00'],
      ['Oxymetholone (Hemogenin 100cmp/25mg) ZPHC', 'ZPHC', 'R$380.00'],
      ['Stanozolol (100cmp/10mg) ZPHC', 'ZPHC', 'R$200.00'],
      ['Testosterone Mix (Durateston 250mg/10ml) ZPHC', 'ZPHC', 'R$380.00'],
      ['Trestolone Acetate (25mg/10ml) ZPHC', 'ZPHC', 'R$350.00'],
    ],
  },
  {
    name: 'Spectrum Pharma',
    slug: 'spectrum-pharma',
    products: [
      ['Decalon (Deca 250mg/10ml) Spectrum Pharma', 'Spectrum Pharma', 'R$420.00'],
      ['Testen (Enantato 300mg/10ml) Spectrum Pharma', 'Spectrum Pharma', 'R$330.00'],
      ['Testo C (Cipionato 200mg/10ml) Spectrum Pharma', 'Spectrum Pharma', 'R$280.00'],
    ],
  },
  {
    name: 'Canada Bio Labs',
    slug: 'canada-bio-labs',
    products: [
      ['Decabolan 250 (Deca 250mg/10ml) Canada', 'Canada Bio Labs', 'R$420.00'],
      ['Equipoise 300 (Boldenona 300mg/10ml) Canada', 'Canada Bio Labs', 'R$350.00'],
      ['Finaplix 100 (Trembo Acetato 100mg/10ml) Canada', 'Canada Bio Labs', 'R$420.00'],
      ['Ment 50 (Trestolona Acetato 50mg/10ml) Canada', 'Canada Bio Labs', 'R$680.00'],
      ['Parabol 200 (Trembo Enantato 200mg/10ml) Canada', 'Canada Bio Labs', 'R$550.00'],
      ['Testopin 100 (Propionato 100mg/10ml) Canada', 'Canada Bio Labs', 'R$220.00'],
      ['Winstrol 50 (Stanozolol 50mg/10ml) Canada', 'Canada Bio Labs', 'R$220.00'],
    ],
  },
  {
    name: 'Pharmacom',
    slug: 'pharmacom',
    products: [
      ['Dianabolos (Diana oral 100cmp/10mg) Pharmacom', 'Pharmacom', 'R$190.00'],
      ['Halotestos (Halotestin 100cmp/10mg) Pharmacom', 'Pharmacom', 'R$1,000.00'],
      ['Oxandrolonos (Oxandrolona 100cmp/10mg) Pharmacom', 'Pharmacom', 'R$570.00'],
      ['Oxymetos (Hemogenin oral 100cmp/25mg) Pharmacom', 'Pharmacom', 'R$400.00'],
      ['Pharma Bol 100 (Diana injet. 100mg/10ml) Pharmacom', 'Pharmacom', 'R$200.00'],
      ['Pharma Bold 300 (Boldenona 300mg/10ml) Pharmacom', 'Pharmacom', 'R$500.00'],
      ['Pharma Mix 2 (250mg/10ml) Pharmacom', 'Pharmacom', 'R$700.00', '75mg Trembolona Acetato; 100mg Propionato de Drostanolona (Masteron); 75mg Fenilpropionato de Testosterona'],
      ['Pharma Nan D600 (Deca 600mg/10ml) Pharmacom', 'Pharmacom', 'R$780.00'],
      ['Pharma Sust 250 (Durateston 250mg/10ml) Pharmacom', 'Pharmacom', 'R$400.00'],
    ],
  },
  {
    name: 'Landerlan Gold',
    slug: 'landerlan-gold',
    products: [
      ['Boldenona Undecilenato (250mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$220.00'],
      ['Clembuterol Clorhidrato (50cmp/40mcg) Landerlan Gold', 'Landerlan Gold', 'R$130.00'],
      ['Decaland Depot 10ml (200mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$220.00'],
      ['Drostanolona Propionato (Masteron 100mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$250.00'],
      ['Durateston Plus (250mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$220.00'],
      ['Gonadotropina Corionica Humana (HCG 1 vial x 5000ui) Landerlan', 'Landerlan Gold', 'R$360.00'],
      ['Nandrolona Fenilpropionato (NPP 100mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$220.00'],
      ['Sales de Trembolona (Tritrembo 200mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$390.00'],
      ['Testenat 10ml (250mg/10ml) Landerlan Gold', 'Landerlan Gold', 'R$220.00'],
    ],
  },
  {
    name: 'Landerlan',
    slug: 'landerlan',
    products: [
      ['Androlic (Proviron 20cmp/25mg) Landerlan', 'Landerlan', 'R$130.00'],
      ['Drostenoland (Masteron oral 50cmp/10mg) Landerlan', 'Landerlan', 'R$240.00'],
      ['Metenolona Acetato (Primobolan oral 30cmp/25mg) Landerlan', 'Landerlan', 'R$500.00'],
      ['Oxandroland 10 (Oxandrolona 50cmp/10mg) Landerlan', 'Landerlan', 'R$300.00'],
      ['Oxandroland (Oxandrolona 100cmp/5mg) Landerlan', 'Landerlan', 'R$300.00'],
      ['Oxitoland (Hemogenin 20cmp/50mg) Landerlan', 'Landerlan', 'R$95.00'],
      ['Stanozoland Depot 30 (Stano injet. 50mg/30ml) Landerlan', 'Landerlan', 'R$190.00'],
      ['Stanozoland Depot (Stano injet. 50mg/15ml) Landerlan', 'Landerlan', 'R$95.00'],
      ['Stanozoland (Stano oral 100cmp/10mg) Landerlan', 'Landerlan', 'R$95.00'],
    ],
  },
  {
    name: 'Alpha Pharma',
    slug: 'alpha-pharma',
    products: [
      ['Alphabol (Dianabol 50cmp/10mg) Alpha Pharma', 'Alpha Pharma', 'R$240.00'],
      ['Astralean (Clembuterol 50cmp/40mcg) Alpha Pharma', 'Alpha Pharma', 'R$200.00'],
      ['Boldebolin (Boldenona 250mg/10ml) Alpha Pharma', 'Alpha Pharma', 'R$570.00'],
      ['Halobol (Halotestin 50cmp/5mg) Alpha Pharma', 'Alpha Pharma', 'R$900.00'],
      ['Nandrobolin (Deca 250mg/10ml) Alpha Pharma', 'Alpha Pharma', 'R$600.00'],
      ['NandroRapid (NPP 100mg/10ml) Alpha Pharma', 'Alpha Pharma', 'R$600.00'],
      ['Oxanabol (Oxandrolona 50cmp/10mg) Alpha Pharma', 'Alpha Pharma', 'R$750.00'],
      ['Oxydrolone (Hemogenin 50cmp/50mg) Alpha Pharma', 'Alpha Pharma', 'R$750.00'],
      ['Parabolin (Trembo Hexa 76,5mg/10ml) Alpha Pharma', 'Alpha Pharma', 'R$1,050.00'],
    ],
  },
  {
    name: 'King Pharma',
    slug: 'king-pharma',
    products: [
      ['Anadrol (Hemogenin 50cmp/50mg) King Pharma', 'King Pharma', 'R$200.00'],
      ['Anavar (Oxandrolona 50cmp/10mg) King Pharma', 'King Pharma', 'R$180.00'],
      ['Boldabolic (Boldenona 300mg/10ml) King Pharma', 'King Pharma', 'R$180.00'],
      ['Cutstack (150mg/10ml) King Pharma', 'King Pharma', 'R$180.00'],
      ['Deca Durabolin (Deca 300mg/10ml) King Pharma', 'King Pharma', 'R$180.00'],
      ['Estano (Stano oral 100cmp/10mg) King Pharma', 'King Pharma', 'R$90.00'],
      ['Estanozolol 15 (50mg/15ml) King Pharma', 'King Pharma', 'R$90.00'],
      ['Estanozolol 30 (50mg/30ml) King Pharma', 'King Pharma', 'R$170.00'],
      ['Finaplix (Trembo Enantato 100mg/10ml) King Pharma', 'King Pharma', 'R$190.00'],
    ],
  },
  {
    name: 'Bratva Labs',
    slug: 'bratva-labs',
    products: [
      ['Acetato de Trembolona (100mg/10ml) Bratva Labs', 'Bratva Labs', 'R$170.00'],
      ['B-Blend (CutStack 150mg/10ml) Bratva Labs', 'Bratva Labs', 'R$190.00'],
      ['Decanoato de Nandrolona (200mg/10ml) Bratva Labs', 'Bratva Labs', 'R$160.00'],
      ['Enantato de Testosterona (250mg/10ml) Bratva Labs', 'Bratva Labs', 'R$140.00'],
      ['Fenilpropionato de Nandrolona (NPP 100mg/10ml) Bratva', 'Bratva Labs', 'R$170.00'],
      ['Hemogenin (25cmp/50mg) Bratva Labs', 'Bratva Labs', 'R$110.00'],
      ['Mesterolona (Proviron 25cmp/25mg) Bratva Labs', 'Bratva Labs', 'R$120.00'],
      ['Oxandrolona (50cmp/10mg) Bratva Labs', 'Bratva Labs', 'R$250.00'],
      ['Propionato de Drostanolona (100mg/10ml) Bratva Labs', 'Bratva Labs', 'R$170.00'],
    ],
  },
  {
    name: 'Muscle Pharma',
    slug: 'muscle-pharma',
    products: [
      ['Anavar 10mg (Oxandrolona 50cmp/10mg) Muscle Pharma', 'Muscle Pharma', 'R$250.00'],
      ['Anavar 25mg (Oxandrolona 50cmp/25mg) Muscle Pharma', 'Muscle Pharma', 'R$380.00'],
      ['Anavar 5mg (Oxandrolona 100cmp/5mg) Muscle Pharma', 'Muscle Pharma', 'R$250.00'],
      ['Cut Stack XT (200mg/10ml) Muscle Pharma', 'Muscle Pharma', 'R$220.00'],
      ['D-Bol (Dianabol Injet. 50mg/10ml) Muscle Pharma', 'Muscle Pharma', 'R$220.00'],
      ['Deca Durabolin XT (300mg/10ml) Muscle Pharma', 'Muscle Pharma', 'R$220.00'],
      ['Dynabolon (NPP 100mg/10ml) Muscle Pharma', 'Muscle Pharma', 'R$220.00'],
      ['Halotestin (30cmp/10mg) Muscle Pharma', 'Muscle Pharma', 'R$320.00'],
      ['HCG-Rx² (HCG 1 vial x 5.000ui) Muscle Pharma', 'Muscle Pharma', 'R$200.00'],
    ],
  },
  {
    name: 'Farmácia',
    slug: 'farmacia',
    products: [
      ['Alprazolam (30cmp/2mg ) Legrand', 'Farmácia', 'R$50.00'],
      ['Anastrozol (30cmp/1mg) Eurofarma', 'Farmácia', 'R$80.00'],
      ['Cialis diário (Tadalafila 30cmp/5mg) Nova Química', 'Farmácia', 'R$50.00', 'IMAGEM ILUSTRATIVA'],
      ['Citrato de Tamoxifeno (30cmp/20mg) Sandoz', 'Farmácia', 'R$70.00'],
      ['Clonazepam 2mg (Rivotril Genérico 30cmp/2mg) Medley', 'Farmácia', 'R$50.00'],
      ['Clonazepam Gotas (Rivotril Gotas 2,5mg/20ml) Medley', 'Farmácia', 'R$50.00'],
      ['Deca-Durabolin (50mg/1ml) Aspen', 'Farmácia', 'R$70.00', 'IMAGEM ILUSTRATIVA'],
      ['Durateston (250mg/1ml) Aspen', 'Farmácia', 'R$70.00', 'IMAGEM ILUSTRATIVA'],
      ['Fluoxetina Cloridrato (30cmp/20mg) Legrand', 'Farmácia', 'R$50.00'],
    ],
  },
  {
    name: 'Eminence',
    slug: 'eminence',
    products: [
      ['DecaPrime (Deca 200mg/10ml) Eminence', 'Eminence', 'R$340.00'],
      ['Testomix (Durateston 250mg/10ml) Eminence', 'Eminence', 'R$350.00'],
      ['TrenoPrime (Trembo Acetato 100mg/10ml) Eminence', 'Eminence', 'R$440.00'],
    ],
  },
  {
    name: 'Manipulado',
    slug: 'manipulado',
    products: [
      ['Ioimbina (30cáps/10mg) Manipulado', 'Manipulado', 'R$50.00'],
      ['Oxandrolona (100cáps/10mg) Manipulado', 'Manipulado', 'R$180.00'],
      ['Oxandrolona (100cáps/5mg) Manipulado', 'Manipulado', 'R$120.00'],
      ['Testosterona Gel 10% (30ml) Manipulado', 'Manipulado', 'R$180.00'],
    ],
  },
  {
    name: 'Dragon Elite',
    slug: 'dragon-elite',
    products: [
      ['Aicar (50 cápsulas) Dragon Elite', 'Dragon Elite', 'R$220.00'],
      ['Andarine (60cáps/25mg) Dragon Elite', 'Dragon Elite', 'R$220.00'],
      ['DHEA (100cáps/25mg) Dragon Elite', 'Dragon Elite', 'R$100.00'],
      ['DHEA (100cáps/100mg) Dragon Elite', 'Dragon Elite', 'R$150.00'],
      ['DHEA (100cáps/50mg) Dragon Elite', 'Dragon Elite', 'R$120.00'],
      ['Ligandrol (90 cápsulas) Dragon Elite', 'Dragon Elite', 'R$220.00'],
      ['MK 677 (60cáps/12,5mg) Dragon Elite', 'Dragon Elite', 'R$220.00'],
      ['Ostarine (60 cápsulas) Dragon Elite', 'Dragon Elite', 'R$220.00'],
      ['RAD 140 (60 cápsulas) Dragon Elite', 'Dragon Elite', 'R$220.00'],
    ],
  },
];

async function main() {
  await runScrape({ printSummary: true });
}

async function runScrape(options = {}) {
  const { printSummary = true } = options;
  await ensureDirectories();

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== '0',
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const allProducts = [];
  const totalsByUrl = {};

  try {
    for (const target of TARGETS) {
      const page = await context.newPage();
      try {
        const products = await scrapeTarget(page, target);
        totalsByUrl[target.url] = products.length;
        allProducts.push(...products);
      } catch (error) {
        totalsByUrl[target.url] = 0;
        await handleTargetScrapeFailure(target, error);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const enrichedProducts = allProducts.map(enrichProduct);
  const reportData = buildReportData(enrichedProducts, totalsByUrl);

  await fs.writeFile(OUTPUTS.json, JSON.stringify(enrichedProducts, null, 2), 'utf8');
  await fs.writeFile(OUTPUTS.csv, toCsv(enrichedProducts), 'utf8');
  await fs.writeFile(OUTPUTS.markdown, renderMarkdownReport(reportData), 'utf8');
  await fs.writeFile(OUTPUTS.html, renderHtmlReport(reportData), 'utf8');

  if (printSummary) {
    printTerminalSummary(reportData);
  }

  return reportData;
}

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(DATA_DIR, { recursive: true }),
    fs.mkdir(REPORTS_DIR, { recursive: true }),
    fs.mkdir(SCREENSHOTS_DIR, { recursive: true }),
  ]);
}

async function scrapeTarget(page, target) {
  console.log(`\n[${target.sourceType}] Abrindo ${target.url}`);

  const response = await page.goto(target.url, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  });
  const status = response?.status();
  if (status && status >= 400) {
    console.warn(`[${target.sourceType}] HTTP ${status} ao abrir ${target.url}; tentando continuar.`);
  }

  await waitForPageToSettle(page);
  await closeSafePopups(page);

  const collectedAt = new Date().toISOString();
  let products = [];

  if (target.sourceType === 'pypharma') {
    products = await scrapePyPharmaCatalog(page, target);
  } else if (target.sourceType === 'medical_brasil') {
    products = await scrapeMedicalBrasilCatalog(page, target);
  } else if (target.sourceType === 'principal') {
    products = await scrapeSequentialCatalog(page, target);
  } else {
    await expandAllCategories(page);
    await scrollToLoadEverything(page);
    await expandAllCategories(page);
    await scrollToLoadEverything(page);
    products = await page.evaluate(extractProductsFromDom);
  }

  await page.screenshot({ path: target.screenshot, fullPage: true });

  if (products.length === 0) {
    await fs.writeFile(target.debugHtml, await page.content(), 'utf8');
    console.warn(
      `[${target.sourceType}] Nenhum produto encontrado. Debug salvo em ${target.debugHtml}`,
    );
  } else {
    await fs.rm(target.debugHtml, { force: true }).catch(() => {});
  }

  const normalized = products.map((product, index) => ({
    source_url: product.source_url || target.url,
    source_type: target.sourceType,
    categoria: product.categoria || '',
    'marca/seção': product['marca/seção'] || '',
    nome_produto: product.nome_produto || '',
    dosagem_texto: product.dosagem_texto || '',
    quantidade_texto: product.quantidade_texto || '',
    preco_atual: product.preco_atual || '',
    preco_com_seguro: product.preco_com_seguro || '',
    preco_sem_seguro: product.preco_sem_seguro || '',
    preco_sem_seguro_numero:
      typeof product.preco_sem_seguro_numero === 'number'
        ? product.preco_sem_seguro_numero
        : parsePriceNumber(product.preco_sem_seguro),
    preco_antigo_riscado: product.preco_antigo_riscado || '',
    percentual_desconto: product.percentual_desconto || '',
    economia_texto: product.economia_texto || '',
    status: product.status || 'disponivel',
    texto_card_completo: product.texto_card_completo || '',
    data_hora_coleta: collectedAt,
    ordem_card: index + 1,
  }));

  console.log(`[${target.sourceType}] Produtos capturados: ${normalized.length}`);
  return normalized;
}

async function handleTargetScrapeFailure(target, error) {
  console.warn(
    `[${target.sourceType}] Falha na coleta de ${target.url}; seguindo com 0 produtos. ` +
      formatErrorMessage(error),
  );

  await fs.writeFile(target.debugHtml, renderTargetFailureDebugHtml(target, error), 'utf8').catch(() => {});
  await fs.rm(target.screenshot, { force: true }).catch(() => {});
}

function renderTargetFailureDebugHtml(target, error) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Falha de coleta - ${escapeHtml(target.sourceType)}</title>
</head>
<body>
  <h1>Falha de coleta recuperavel</h1>
  <p>Fonte: ${escapeHtml(target.sourceType)}</p>
  <p>URL: ${escapeHtml(target.url)}</p>
  <pre>${escapeHtml(formatErrorMessage(error))}</pre>
</body>
</html>
`;
}

function formatErrorMessage(error) {
  return error?.stack || error?.message || String(error || 'Erro desconhecido');
}

async function scrapeMedicalBrasilCatalog(page, target) {
  const products = [];
  const seen = new Set();
  let blocked = false;

  for (const category of MEDICAL_BRASIL_CATEGORIES) {
    const categoryUrl = `${MEDICAL_BRASIL_URL}/${category.slug}`;

    try {
      await page.goto(categoryUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
      await page.waitForTimeout(900);

      const bodyText = normalizeText(await page.locator('body').innerText({ timeout: 5000 }).catch(() => ''));
      if (/just a moment|security verification|cloudflare|nao e um bot|not a bot/.test(bodyText)) {
        blocked = true;
        break;
      }

      const categoryProducts = await page.evaluate(extractProductsFromDom).catch(() => []);

      for (const product of categoryProducts) {
        const normalizedProduct = normalizeMedicalBrasilProduct(product, category, categoryUrl);
        const key = normalizeText([normalizedProduct.nome_produto, normalizedProduct['marca/seção'], normalizedProduct.preco_atual].join('|'));
        if (!normalizedProduct.nome_produto || seen.has(key)) continue;
        seen.add(key);
        products.push(normalizedProduct);
      }
    } catch (error) {
      console.warn(`[${target.sourceType}] Falha ao abrir categoria ${category.name}: ${error.message}`);
    }
  }

  if (products.length) {
    return products;
  }

  if (blocked) {
    console.warn('[medical_brasil] Cloudflare bloqueou a coleta ao vivo; usando snapshot indexado do catalogo.');
  } else {
    console.warn('[medical_brasil] Nenhum produto ao vivo capturado; usando snapshot indexado do catalogo.');
  }

  return buildMedicalBrasilSeedProducts();
}

function buildMedicalBrasilSeedProducts() {
  const products = [];
  const seen = new Set();

  for (const category of MEDICAL_BRASIL_CATEGORIES) {
    const categoryUrl = `${MEDICAL_BRASIL_URL}/${category.slug}`;

    for (const [name, brand, price, extraText = ''] of category.products) {
      const product = normalizeMedicalBrasilProduct(
        {
          categoria: category.name,
          'marca/seção': brand,
          nome_produto: name,
          preco_atual: price,
          texto_card_completo: [name, brand, category.name, price, extraText].filter(Boolean).join('\n'),
          source_url: categoryUrl,
        },
        category,
        categoryUrl,
      );
      const key = normalizeText([product.nome_produto, product['marca/seção'], product.preco_atual].join('|'));
      if (seen.has(key)) continue;
      seen.add(key);
      products.push(product);
    }
  }

  return products;
}

function normalizeMedicalBrasilProduct(product, category, categoryUrl) {
  const name = product.nome_produto || product.name || '';
  const brand = product['marca/seção'] || product.marca || inferMedicalBrasilBrand(name, category.name);
  const fullText = product.texto_card_completo || [name, brand, category.name, product.preco_atual].filter(Boolean).join('\n');

  return {
    source_url: product.source_url || categoryUrl,
    categoria: product.categoria || category.name,
    'marca/seção': brand,
    nome_produto: name,
    dosagem_texto: product.dosagem_texto || extractDosageFromText(`${name}\n${fullText}`),
    quantidade_texto: product.quantidade_texto || extractQuantityFromText(`${name}\n${fullText}`),
    preco_atual: product.preco_atual || '',
    preco_antigo_riscado: product.preco_antigo_riscado || extractMedicalOldPrice(fullText),
    percentual_desconto: product.percentual_desconto || '',
    economia_texto: product.economia_texto || '',
    status: product.status || 'disponivel',
    texto_card_completo: fullText,
  };
}

async function scrapePyPharmaCatalog(page, target) {
  await closePyPharmaNotice(page);
  await scrollPyPharmaCatalog(page);

  const rawCards = await page.evaluate(extractPyPharmaCardsFromDom);
  const products = [];
  const seen = new Set();

  for (const rawCard of rawCards) {
    const product = normalizePyPharmaProduct(rawCard, target.url);
    const key = normalizeText(
      [
        product.source_url,
        product.categoria,
        product['marca/seção'],
        product.nome_produto,
        product.preco_atual,
        product.status,
      ].join('|'),
    );

    if (!product.nome_produto || seen.has(key)) continue;
    seen.add(key);
    products.push(product);
  }

  return products;
}

async function closePyPharmaNotice(page) {
  const button = page.getByText('Entendi', { exact: true }).first();
  if (await button.count().catch(() => 0)) {
    await button.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function scrollPyPharmaCatalog(page) {
  let previousCount = 0;
  let previousHeight = 0;
  let stableRounds = 0;

  for (let round = 0; round < 80; round += 1) {
    const before = await page.evaluate(() => ({
      count: document.querySelectorAll('.loja-mob-product-item').length,
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      viewport: window.innerHeight || 900,
      y: window.scrollY || 0,
    }));

    await page.evaluate((distance) => window.scrollBy(0, distance), Math.max(700, before.viewport * 0.9));
    await page.waitForTimeout(250);

    const after = await page.evaluate(() => ({
      count: document.querySelectorAll('.loja-mob-product-item').length,
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      viewport: window.innerHeight || 900,
      y: window.scrollY || 0,
    }));

    const reachedBottom = Math.ceil(after.y + after.viewport + 20) >= after.height;
    const noGrowth = after.count === previousCount && after.height === previousHeight;

    if (reachedBottom && noGrowth) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }

    previousCount = after.count;
    previousHeight = after.height;

    if (stableRounds >= 3) break;
  }
}

function extractPyPharmaCardsFromDom() {
  const clean = (value) =>
    String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 8 && rect.height > 8;
  };
  const categoryTextRe =
    /(enantato|durateston|cipionato|propionato|tirzepatida|retatrutida|pept[ií]deos?|deca|masteron|trembolona|primobolan|boldenona|stanozolol|clembuterol|oxandrolona|proviron|farm[aá]cia|sarms|variados)/i;
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]'))
    .filter((element) => {
      const text = clean(element.innerText || element.textContent || '');
      return isVisible(element) && text.length >= 2 && text.length <= 120 && categoryTextRe.test(text);
    })
    .map((element) => ({ element, text: clean(element.innerText || element.textContent || '') }));

  const inferCategory = (card) => {
    const previous = headings
      .filter(({ element }) => element.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)
      .at(-1);
    return previous?.text || '';
  };

  return Array.from(document.querySelectorAll('.loja-mob-product-item')).map((card) => ({
    onclick: card.getAttribute('onclick') || '',
    text: clean(card.innerText || card.textContent || ''),
    className: card.getAttribute('class') || '',
    category: inferCategory(card),
  }));
}

function parsePyPharmaProductPayload(onclick) {
  const text = String(onclick || '').trim();
  const match = text.match(/openProductModal\((\{.*\})\)\s*;?$/s);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function normalizePyPharmaProduct(rawCard, fallbackUrl = PY_PHARMA_URL) {
  const payload = parsePyPharmaProductPayload(rawCard.onclick) || {};
  const name = payload.nome || '';
  const description = payload.descricao || '';
  const category = rawCard.category || detectProductFamily(`${name}\n${description}`) || 'PYPHARMA';
  const brand = inferPyPharmaBrand(`${name}\n${description}`) || '';
  const priceWithInsurance =
    typeof payload.preco_com_seguro === 'number' ? payload.preco_com_seguro : payload.preco;
  const priceWithoutInsurance =
    typeof payload.preco_sem_seguro === 'number' ? payload.preco_sem_seguro : null;
  const status =
    payload.emEstoque === false || /sem estoque/i.test(`${rawCard.className || ''}\n${rawCard.text || ''}`)
      ? 'esgotado'
      : 'disponivel';
  const fullText = [
    rawCard.text,
    name,
    description,
    priceWithoutInsurance !== null ? `Preco sem seguro: ${formatCurrency(priceWithoutInsurance)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    source_url: payload.permalink || fallbackUrl,
    categoria: category,
    'marca/seção': brand,
    nome_produto: name,
    dosagem_texto: extractDosageFromText(`${name}\n${description}`),
    quantidade_texto: extractQuantityFromText(`${name}\n${description}`),
    preco_atual: formatCurrency(priceWithInsurance),
    preco_com_seguro: formatCurrency(priceWithInsurance),
    preco_sem_seguro: priceWithoutInsurance === null ? '' : formatCurrency(priceWithoutInsurance),
    preco_sem_seguro_numero: priceWithoutInsurance,
    preco_antigo_riscado: payload.precoAntigo ? formatCurrency(payload.precoAntigo) : '',
    percentual_desconto: payload.desconto || '',
    economia_texto: '',
    status,
    texto_card_completo: fullText,
  };
}

function inferPyPharmaBrand(text) {
  const normalized = normalizeText(text);
  const brandsByLength = PY_PHARMA_BRANDS.slice().sort((a, b) => b.length - a.length);
  const brand = brandsByLength.find((item) => normalized.includes(normalizeText(item)));

  if (!brand) return '';
  if (brand === 'CANADABIOLABS') return 'Canada Bio Labs';
  if (brand === 'LanderGold') return 'Landerlan Gold';
  if (brand === 'Farmacia') return 'Farmacia';
  return brand;
}

function inferMedicalBrasilBrand(productName, categoryName) {
  const brandCategories = new Set(
    MEDICAL_BRASIL_CATEGORIES
      .map((category) => category.name)
      .filter((name) => !['Peptídeos', 'Emagrecedores', 'Farmácia', 'Manipulado'].includes(name)),
  );

  if (brandCategories.has(categoryName)) return categoryName;

  const normalizedName = normalizeText(productName);
  const knownBrands = [
    'Novax Pharmaceuticals',
    'Spectrum Pharma',
    'ZPHC',
    'Eticos',
    'Synedica',
    'NeoPeptides',
    'Farmácia',
    'Manipulado',
  ];

  return knownBrands.find((brand) => normalizedName.includes(normalizeText(brand))) || categoryName;
}

function extractMedicalOldPrice(text) {
  const match = String(text || '').match(/pre[cç]o antigo:\s*(R\$\s?[\d,.]+)/i);
  return match?.[1] || '';
}

function extractDosageFromText(text) {
  return Array.from(
    new Set(
      String(text || '')
        .match(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g|ui|iu)(?:\s*\/\s*(?:ml|dose|comp|caps?))?\b/gi) || [],
    ),
  ).join(' | ');
}

function extractQuantityFromText(text) {
  return Array.from(
    new Set(
      String(text || '')
        .match(/\b(?:\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(?:ml|comprimidos?|cmp|c[aá]psulas?|caps?|ampolas?|vials?|frascos?|unidades?|tabs?|tabletes?)\b/gi) || [],
    ),
  ).join(' | ');
}

async function scrapeSequentialCatalog(page, target) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  const categories = await collectCatalogCategories(page);
  console.log(`[${target.sourceType}] Categorias detectadas: ${categories.length}`);

  const products = [];
  const seen = new Set();

  for (const [categoryIndex, category] of categories.entries()) {
    const categoryOpened = await clickCatalogCategory(page, category.name);

    if (!categoryOpened) {
      console.warn(`[${target.sourceType}] Não consegui abrir categoria: ${category.name}`);
      continue;
    }

    await page.waitForTimeout(800);
    await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});

    const brands = await collectOpenCatalogBrands(page, category.name);
    console.log(
      `[${target.sourceType}] ${categoryIndex + 1}/${categories.length} ${category.name}: ${brands.length} marcas`,
    );

    for (const brand of brands) {
      const brandOpened = await clickCatalogBrand(page, category.name, brand.name);

      if (!brandOpened) {
        console.warn(`[${target.sourceType}] Não consegui abrir marca: ${category.name} > ${brand.name}`);
        continue;
      }

      await page.waitForTimeout(700);
      await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});

      const groups = await collectOpenCatalogGroups(page, category.name, brand.name);

      if (groups.length > 0) {
        for (const group of groups) {
          const groupOpened = await clickCatalogGroup(page, category.name, brand.name, group.name);

          if (!groupOpened) {
            console.warn(
              `[${target.sourceType}] Não consegui abrir grupo: ${category.name} > ${brand.name} > ${group.name}`,
            );
            continue;
          }

          await page.waitForTimeout(650);
          await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
          await collectCurrentCatalogProducts(page, {
            target,
            products,
            seen,
            categoryName: category.name,
            brandName: `${brand.name} / ${group.name}`,
            dedupeBrandName: brand.name,
          });
        }
      } else {
        await collectCurrentCatalogProducts(page, {
          target,
          products,
          seen,
          categoryName: category.name,
          brandName: brand.name,
          dedupeBrandName: brand.name,
        });
      }
    }
  }

  return products;
}

async function collectCurrentCatalogProducts(
  page,
  { target, products, seen, categoryName, brandName, dedupeBrandName },
) {
  const batch = await page.evaluate(extractProductsFromDom);

  for (const product of batch) {
    const normalizedProduct = {
      ...product,
      categoria: categoryName,
      'marca/seção': brandName,
    };
    const key = normalizeText(
      [
        target.sourceType,
        categoryName,
        dedupeBrandName || brandName,
        normalizedProduct.nome_produto,
        normalizedProduct.dosagem_texto,
        normalizedProduct.quantidade_texto,
        normalizedProduct.preco_atual,
        normalizedProduct.status,
        normalizedProduct.texto_card_completo,
      ].join('|'),
    );

    if (!normalizedProduct.nome_produto || seen.has(key)) continue;

    seen.add(key);
    products.push(normalizedProduct);
  }
}

async function collectCatalogCategories(page) {
  return page.evaluate(() => {
    const categoryCountRe = /\b\d+\s+marcas?\s*[•-]\s*\d+\s+produtos?\b/i;
    const dangerousText =
      /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats|or[cç]amento|remover|deletar|copiar|pdf|fretes?|rastreie|regras|envio|promo[cç][oõ]es|ofertas?)/i;

    const clean = (value) =>
      String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalize = (value) =>
      clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 4 &&
        rect.height > 4
      );
    };
    const extractCatalogName = (text) => {
      const lines = String(text || '')
        .split(/\n/)
        .map(clean)
        .filter(Boolean);
      const countIndex = lines.findIndex((line) => categoryCountRe.test(line));
      const labelLines = (countIndex >= 0 ? lines.slice(0, countIndex) : lines).filter(
        (line) => !/^[A-ZÀ-Ÿ]{1,3}$/i.test(line) && !categoryCountRe.test(line),
      );
      return labelLines.at(-1) || '';
    };

    const seen = new Set();
    const categories = [];

    for (const button of document.querySelectorAll('button,[role="button"]')) {
      const text = clean(button.innerText || button.textContent || button.getAttribute('aria-label'));
      const name = extractCatalogName(button.innerText || button.textContent || '');
      const key = normalize(name);

      if (!isVisible(button)) continue;
      if (!categoryCountRe.test(text)) continue;
      if (dangerousText.test(text)) continue;
      if (!key || seen.has(key)) continue;

      seen.add(key);
      categories.push({ name, text });
    }

    return categories;
  });
}

async function collectOpenCatalogBrands(page, categoryName) {
  return page.evaluate((activeCategoryName) => {
    const categoryCountRe = /\b\d+\s+marcas?\s*[•-]\s*\d+\s+produtos?\b/i;
    const brandCountRe = /\b\d+\s+produtos?(?:\s*\(\d+\s+indispon[ií]ve(?:l|is)\))?\b|\b\d+\s+produto\b/i;
    const dangerousText =
      /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats|or[cç]amento|remover|deletar|copiar|pdf|fretes?|rastreie|regras|envio|promo[cç][oõ]es|ofertas?)/i;

    const clean = (value) =>
      String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalize = (value) =>
      clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 4 &&
        rect.height > 4
      );
    };
    const extractBrandName = (text) => {
      const lines = String(text || '')
        .split(/\n/)
        .map(clean)
        .filter(Boolean);
      const countIndex = lines.findIndex((line) => brandCountRe.test(line));
      const labelLines = (countIndex >= 0 ? lines.slice(0, countIndex) : lines).filter(
        (line) => !/^[A-ZÀ-Ÿ]{1,3}$/i.test(line) && !brandCountRe.test(line),
      );
      return labelLines.at(-1) || '';
    };

    const categoryKey = normalize(activeCategoryName);
    const categoryButton = Array.from(document.querySelectorAll('button,[role="button"]')).find((button) => {
      const text = clean(button.innerText || button.textContent || '');
      return isVisible(button) && categoryCountRe.test(text) && normalize(text).includes(categoryKey);
    });

    const section = categoryButton?.parentElement;
    if (!section) return [];

    const seen = new Set();
    const brands = [];

    for (const button of section.querySelectorAll('button,[role="button"]')) {
      if (button === categoryButton) continue;

      const text = clean(button.innerText || button.textContent || button.getAttribute('aria-label'));
      const name = extractBrandName(button.innerText || button.textContent || '');
      const key = normalize(name);

      if (!isVisible(button)) continue;
      if (!brandCountRe.test(text) || categoryCountRe.test(text)) continue;
      if (dangerousText.test(text)) continue;
      if (!key || seen.has(key)) continue;

      seen.add(key);
      brands.push({ name, text });
    }

    return brands;
  }, categoryName);
}

async function collectOpenCatalogGroups(page, categoryName, brandName) {
  return page.evaluate(({ activeCategoryName, activeBrandName }) => {
    const categoryCountRe = /\b\d+\s+marcas?\s*[•-]\s*\d+\s+produtos?\b/i;
    const productCountRe = /\b\d+\s+produtos?(?:\s*\(\d+\s+indispon[ií]ve(?:l|is)\))?\b|\b\d+\s+produto\b/i;
    const dangerousText =
      /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats|or[cç]amento|remover|deletar|copiar|pdf|fretes?|rastreie|regras|envio|promo[cç][oõ]es|ofertas?)/i;

    const clean = (value) =>
      String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalize = (value) =>
      clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 4 &&
        rect.height > 4
      );
    };
    const extractGroupName = (text) => {
      const lines = String(text || '')
        .split(/\n/)
        .map(clean)
        .filter(Boolean);
      const countIndex = lines.findIndex((line) => productCountRe.test(line));
      const labelLines = (countIndex >= 0 ? lines.slice(0, countIndex) : lines).filter(
        (line) => !/^[^\p{L}\p{N}]+$/u.test(line) && !productCountRe.test(line),
      );
      return labelLines.at(-1) || '';
    };

    const categoryKey = normalize(activeCategoryName);
    const brandKey = normalize(activeBrandName);
    const allButtons = Array.from(document.querySelectorAll('button,[role="button"]'));
    const categoryButton = allButtons.find((button) => {
      const text = clean(button.innerText || button.textContent || '');
      return isVisible(button) && categoryCountRe.test(text) && normalize(text).includes(categoryKey);
    });
    const categorySection = categoryButton?.parentElement;
    const brandButton = categorySection
      ? Array.from(categorySection.querySelectorAll('button,[role="button"]')).find((button) => {
          const text = clean(button.innerText || button.textContent || '');
          return (
            isVisible(button) &&
            !categoryCountRe.test(text) &&
            productCountRe.test(text) &&
            normalize(text).includes(brandKey)
          );
        })
      : null;
    const brandSection = brandButton?.parentElement;

    if (!brandSection) return [];

    const seen = new Set();
    const groups = [];

    for (const button of brandSection.querySelectorAll('button,[role="button"]')) {
      if (button === brandButton) continue;

      const text = clean(button.innerText || button.textContent || button.getAttribute('aria-label'));
      const name = extractGroupName(button.innerText || button.textContent || '');
      const key = normalize(name);

      if (!isVisible(button)) continue;
      if (!productCountRe.test(text) || categoryCountRe.test(text)) continue;
      if (dangerousText.test(text)) continue;
      if (!key || seen.has(key)) continue;

      seen.add(key);
      groups.push({ name, text });
    }

    return groups;
  }, { activeCategoryName: categoryName, activeBrandName: brandName });
}

async function clickCatalogCategory(page, categoryName) {
  return clickCatalogButton(page, { categoryName, brandName: null, kind: 'category' });
}

async function clickCatalogBrand(page, categoryName, brandName) {
  return clickCatalogButton(page, { categoryName, brandName, kind: 'brand' });
}

async function clickCatalogGroup(page, categoryName, brandName, groupName) {
  return clickCatalogButton(page, { categoryName, brandName, groupName, kind: 'group' });
}

async function clickCatalogButton(page, options) {
  const clicked = await page.evaluate(({ categoryName, brandName, groupName, kind }) => {
    const categoryCountRe = /\b\d+\s+marcas?\s*[•-]\s*\d+\s+produtos?\b/i;
    const brandCountRe = /\b\d+\s+produtos?(?:\s*\(\d+\s+indispon[ií]ve(?:l|is)\))?\b|\b\d+\s+produto\b/i;
    const dangerousText =
      /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats|or[cç]amento|remover|deletar|copiar|pdf|fretes?|rastreie|regras|envio|promo[cç][oõ]es|ofertas?)/i;

    const clean = (value) =>
      String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalize = (value) =>
      clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 4 &&
        rect.height > 4
      );
    };

    const categoryKey = normalize(categoryName);
    const brandKey = normalize(brandName);
    const groupKey = normalize(groupName);
    let candidates = Array.from(document.querySelectorAll('button,[role="button"]'));

    if (kind === 'brand' || kind === 'group') {
      const categoryButton = candidates.find((button) => {
        const text = clean(button.innerText || button.textContent || '');
        return isVisible(button) && categoryCountRe.test(text) && normalize(text).includes(categoryKey);
      });
      candidates = categoryButton?.parentElement
        ? Array.from(categoryButton.parentElement.querySelectorAll('button,[role="button"]'))
        : [];

      if (kind === 'group') {
        const brandButton = candidates.find((button) => {
          const text = clean(button.innerText || button.textContent || '');
          return (
            isVisible(button) &&
            !categoryCountRe.test(text) &&
            brandCountRe.test(text) &&
            normalize(text).includes(brandKey)
          );
        });
        candidates = brandButton?.parentElement
          ? Array.from(brandButton.parentElement.querySelectorAll('button,[role="button"]'))
          : [];
      }
    }

    const button = candidates.find((candidate) => {
      const text = clean(candidate.innerText || candidate.textContent || candidate.getAttribute('aria-label'));
      const textKey = normalize(text);

      if (!isVisible(candidate)) return false;
      if (dangerousText.test(text)) return false;

      if (kind === 'category') {
        return categoryCountRe.test(text) && textKey.includes(categoryKey);
      }

      if (kind === 'brand') {
        return !categoryCountRe.test(text) && brandCountRe.test(text) && textKey.includes(brandKey);
      }

      return !categoryCountRe.test(text) && brandCountRe.test(text) && textKey.includes(groupKey);
    });

    if (!button) return false;

    try {
      button.scrollIntoView({ block: 'center', inline: 'center' });
      button.click();
      return true;
    } catch {
      return false;
    }
  }, options);

  return Boolean(clicked);
}

async function waitForPageToSettle(page) {
  await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function closeSafePopups(page) {
  const safeTexts = [
    'Aceitar',
    'Aceito',
    'Entendi',
    'Continuar',
    'OK',
    'Fechar',
    'Close',
  ];

  for (const text of safeTexts) {
    const locator = page.getByRole('button', { name: new RegExp(`^\\s*${escapeRegExp(text)}\\s*$`, 'i') });
    const count = await locator.count().catch(() => 0);

    for (let index = 0; index < Math.min(count, 3); index += 1) {
      await locator.nth(index).click({ timeout: 1200 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function expandAllCategories(page) {
  for (let pass = 0; pass < 10; pass += 1) {
    const clicked = await page.evaluate(() => {
      const dangerousText =
        /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats|or[cç]amento|remover|deletar|copiar|pdf|fretes?|rastreie|regras|envio|promo[cç][oõ]es|ofertas?)/i;
      const usefulText =
        /(categoria|se[cç][aã]o|marca|produtos?|todos|promo|promo[cç][aã]o|mais|mostrar|ver|abrir|expandir|labs?|linha|oral|injet[aá]vel|pept[ií]deo)/i;
      const catalogCountText =
        /\b\d+\s+marcas?\s*[•-]\s*\d+\s+produtos?\b|\b\d+\s+produtos?(?:\s*\(\d+\s+indispon[ií]ve(?:l|is)\))?\b|\b\d+\s+produto\b/i;

      const clean = (value) =>
        String(value || '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 4 &&
          rect.height > 4
        );
      };

      const candidates = Array.from(
        document.querySelectorAll(
          'button,[role="button"],summary,[aria-expanded],[data-state],[data-headlessui-state]',
        ),
      );

      let clicks = 0;

      for (const element of candidates) {
        if (!isVisible(element)) continue;

        const text = clean(element.innerText || element.textContent || element.getAttribute('aria-label'));
        const parentText = clean(element.parentElement?.innerText || '');
        const ariaExpanded = element.getAttribute('aria-expanded');
        const dataState = clean(
          element.getAttribute('data-state') || element.getAttribute('data-headlessui-state'),
        ).toLowerCase();
        const className = clean(element.getAttribute('class')).toLowerCase();
        const isClosedSummary = element.tagName === 'SUMMARY' && !element.parentElement?.open;
        const alreadyHasExpandedContent =
          parentText &&
          parentText.includes(text) &&
          parentText.length > text.length + 45;
        const looksClosed =
          ariaExpanded === 'false' ||
          dataState.includes('closed') ||
          dataState.includes('inactive') ||
          className.includes('closed') ||
          className.includes('collapsed') ||
          isClosedSummary;
        const looksLikeCatalogToggle = catalogCountText.test(text) && !alreadyHasExpandedContent;

        if (!looksClosed && !looksLikeCatalogToggle) continue;
        if (dangerousText.test(text)) continue;
        if (text.length > 160) continue;
        if (!usefulText.test(text) && !looksLikeCatalogToggle && ariaExpanded !== 'false' && !isClosedSummary) continue;

        try {
          element.scrollIntoView({ block: 'center', inline: 'center' });
          element.click();
          clicks += 1;
        } catch {
          // Ignore elements intercepted by overlays; the next passes handle what remains.
        }
      }

      return clicks;
    });

    if (clicked === 0 && pass > 1) break;

    await page.waitForTimeout(700);
    await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
  }
}

async function scrollToLoadEverything(page) {
  let previousHeight = 0;
  let previousTextLength = 0;
  let stableRounds = 0;

  for (let round = 0; round < 70; round += 1) {
    await clickLoadMoreButtons(page);

    const before = await page.evaluate(() => ({
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      textLength: document.body?.innerText?.length || 0,
      viewport: window.innerHeight || 900,
      y: window.scrollY || 0,
    }));

    await page.evaluate((distance) => window.scrollBy(0, distance), Math.max(650, before.viewport * 0.85));
    await page.waitForTimeout(450);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const after = await page.evaluate(() => ({
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
      textLength: document.body?.innerText?.length || 0,
      y: window.scrollY || 0,
    }));

    const reachedBottom = Math.ceil(after.y + before.viewport + 20) >= after.height;
    const noGrowth = after.height === previousHeight && after.textLength === previousTextLength;

    if (reachedBottom && noGrowth) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }

    previousHeight = after.height;
    previousTextLength = after.textLength;

    if (stableRounds >= 4) break;
  }
}

async function clickLoadMoreButtons(page) {
  await page.evaluate(() => {
    const safeLoadMore = /(ver mais|mostrar mais|carregar mais|mais produtos|load more|show more)/i;
    const dangerousText =
      /(finalizar|checkout|comprar|adicionar|carrinho|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|whats)/i;

    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 4 &&
        rect.height > 4
      );
    };

    for (const element of document.querySelectorAll('button,[role="button"]')) {
      const text = String(element.innerText || element.textContent || element.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!isVisible(element)) continue;
      if (!safeLoadMore.test(text)) continue;
      if (dangerousText.test(text)) continue;

      try {
        element.scrollIntoView({ block: 'center', inline: 'center' });
        element.click();
      } catch {
        // Safe best-effort click.
      }
    }
  });
}

function extractProductsFromDom() {
  const PRICE_RE_SOURCE =
    '(?:(?:R\\$|US\\$|\\$)\\s*\\d{1,3}(?:[.\\s]\\d{3})*(?:,\\d{2}|\\.\\d{2})?|\\d{1,3}(?:\\.\\d{3})*,\\d{2}|(?:Gs\\.?|G\\$|PYG|₲)\\s*\\d{1,3}(?:[.\\s]\\d{3})+)';
  const statusRe = /(esgotado|sem estoque|indispon[ií]vel|dispon[ií]vel)/i;
  const discountRe = /(?:-?\s*\d{1,3}\s*%|\boff\b|desconto|economia|economize|poupe)/i;
  const actionRe =
    /^(comprar|adicionar|carrinho|finalizar|checkout|pedido|cpf|login|entrar|cadastro|enviar|pagar|pix|remover|\+|-|ok)$/i;
  const dangerousText =
    /(finalizar compra|checkout|inserir cpf|digite seu cpf|entrar na conta|login|enviar pedido|pagar pedido)/i;

  const makePriceRe = (flags = 'gi') => new RegExp(PRICE_RE_SOURCE, flags);
  const clean = (value) =>
    String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();

  const normalize = (value) =>
    clean(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const isVisible = (element) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      rect.width > 8 &&
      rect.height > 8
    );
  };

  const getText = (element) => clean(element?.innerText || element?.textContent || '');
  const splitLines = (text) =>
    clean(text)
      .split(/\n| {2,}/)
      .map((line) => clean(line))
      .filter(Boolean);

  const priceMatches = (text) => {
    const matches = clean(text).match(makePriceRe()) || [];
    return Array.from(new Set(matches.map((match) => clean(match))));
  };

  const parsePrice = (value) => {
    const original = clean(value);
    if (!original) return null;

    const hasGuarani = /(Gs\.?|G\$|PYG|₲)/i.test(original);
    let numeric = original.replace(/[^\d,.-]/g, '');
    if (!numeric) return null;

    if (hasGuarani) {
      const guarani = Number(numeric.replace(/[^\d]/g, ''));
      return Number.isFinite(guarani) ? guarani : null;
    }

    const lastComma = numeric.lastIndexOf(',');
    const lastDot = numeric.lastIndexOf('.');

    if (lastComma > lastDot) {
      numeric = numeric.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      const decimals = numeric.slice(lastDot + 1);
      if (decimals.length === 3 && numeric.includes(',')) {
        numeric = numeric.replace(/,/g, '');
      } else if (decimals.length === 3 && !original.includes('$') && !original.includes('US$')) {
        numeric = numeric.replace(/\./g, '');
      } else {
        numeric = numeric.replace(/,/g, '');
      }
    }

    const parsed = Number(numeric);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const countPrices = (elementOrText) => {
    const text = typeof elementOrText === 'string' ? elementOrText : getText(elementOrText);
    return priceMatches(text).length;
  };

  const extractPriceTokens = (card) => {
    const tokens = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      const parent = node.parentElement;
      const value = clean(node.nodeValue);

      if (parent && isVisible(parent) && makePriceRe().test(value)) {
        const re = makePriceRe();
        let match = re.exec(value);

        while (match) {
          const style = window.getComputedStyle(parent);
          const struck =
            style.textDecorationLine.includes('line-through') ||
            Boolean(parent.closest('s,del,[style*="line-through"],[class*="line-through"],[class*="lineThrough"]'));

          tokens.push({
            raw: clean(match[0]),
            numeric: parsePrice(match[0]),
            struck,
          });

          match = re.exec(value);
        }
      }

      node = walker.nextNode();
    }

    const seen = new Set();
    return tokens.filter((token) => {
      const key = `${token.raw}|${token.struck}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const cardScore = (element) => {
    if (!isVisible(element)) return -Infinity;

    const text = getText(element);
    if (text.length < 25 || text.length > 1400) return -Infinity;
    if (dangerousText.test(text)) return -Infinity;

    const prices = countPrices(text);
    const hasStatus = statusRe.test(text);
    const hasDiscount = discountRe.test(text);
    if (prices === 0 && !hasStatus && !hasDiscount) return -Infinity;

    const rect = element.getBoundingClientRect();
    const lines = splitLines(text);
    let score = 0;

    if (['ARTICLE', 'LI'].includes(element.tagName)) score += 4;
    if (element.getAttribute('role') === 'listitem') score += 3;
    if (element.querySelector('img,picture,svg')) score += 2;
    if (element.querySelector('button,[role="button"],a')) score += 1;
    if (prices >= 1 && prices <= 3) score += 5;
    if (prices > 3) score -= (prices - 3) * 6;
    if (hasStatus) score += 1;
    if (hasDiscount) score += 1;
    if (lines.length >= 2) score += 2;
    if (text.length >= 45 && text.length <= 650) score += 3;
    if (rect.width >= 140 && rect.height >= 70) score += 2;
    if (text.length > 850) score -= 5;

    return score;
  };

  const closestProductCard = (seedElement) => {
    let current = seedElement?.nodeType === Node.ELEMENT_NODE ? seedElement : seedElement?.parentElement;
    let best = null;
    let bestScore = -Infinity;

    for (let depth = 0; current && current !== document.body && depth < 12; depth += 1) {
      const score = cardScore(current);

      if (score > bestScore) {
        best = current;
        bestScore = score;
      }

      const currentPrices = countPrices(current);
      const parent = current.parentElement;
      const parentText = parent ? getText(parent) : '';
      const parentPrices = countPrices(parentText);

      if (
        best &&
        currentPrices > 0 &&
        (parentPrices > currentPrices + 3 || parentText.length > getText(current).length * 3)
      ) {
        break;
      }

      current = current.parentElement;
    }

    return best;
  };

  const seedElements = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const value = clean(node.nodeValue);
    if (value && (makePriceRe().test(value) || statusRe.test(value) || discountRe.test(value))) {
      seedElements.push(node.parentElement);
    }
    node = walker.nextNode();
  }

  const candidateCards = [];

  for (const seed of seedElements) {
    const card = closestProductCard(seed);
    if (!card || cardScore(card) === -Infinity) continue;

    const overlapIndex = candidateCards.findIndex(
      (existing) => existing === card || existing.contains(card) || card.contains(existing),
    );

    if (overlapIndex === -1) {
      candidateCards.push(card);
      continue;
    }

    if (cardScore(card) > cardScore(candidateCards[overlapIndex])) {
      candidateCards[overlapIndex] = card;
    }
  }

  const contextElements = Array.from(
    document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,[role="heading"],summary,button[aria-expanded],[data-category],[data-section]',
    ),
  ).filter((element) => {
    const text = getText(element);
    return (
      isVisible(element) &&
      text.length >= 2 &&
      text.length <= 120 &&
      !makePriceRe().test(text) &&
      !statusRe.test(text) &&
      !actionRe.test(text) &&
      !dangerousText.test(text)
    );
  });

  const inferContext = (card) => {
    const labels = [];

    for (let current = card.parentElement; current && current !== document.body; current = current.parentElement) {
      const directLabels = Array.from(
        current.querySelectorAll(':scope > h1,:scope > h2,:scope > h3,:scope > h4,:scope > h5,:scope > h6,:scope > [role="heading"],:scope > summary,:scope > button[aria-expanded]'),
      )
        .filter((element) => !element.contains(card))
        .map(getText)
        .filter(Boolean);

      labels.unshift(...directLabels);
    }

    const beforeLabels = contextElements
      .filter((element) => element.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING)
      .slice(-5)
      .map(getText);

    const uniqueLabels = [];

    for (const label of [...labels, ...beforeLabels]) {
      const key = normalize(label);
      if (!key || uniqueLabels.some((existing) => normalize(existing) === key)) continue;
      if (/^(murilo|respect pharma|produtos?)$/i.test(label)) continue;
      uniqueLabels.push(label);
    }

    return {
      categoria: uniqueLabels.at(-2) || uniqueLabels.at(-1) || '',
      marcaSecao: uniqueLabels.at(-1) || '',
    };
  };

  const inferName = (text, context) => {
    const contextKeys = new Set([normalize(context.categoria), normalize(context.marcaSecao)].filter(Boolean));
    const meaningfulLines = splitLines(text).filter((line) => {
      const normalized = normalize(line);
      if (!normalized || contextKeys.has(normalized)) return false;
      if (makePriceRe().test(line)) return false;
      if (statusRe.test(line)) return false;
      if (discountRe.test(line)) return false;
      if (actionRe.test(line)) return false;
      if (line.length > 140) return false;
      return /[a-zA-ZÀ-ÿ]{3,}/.test(line);
    });

    const preferred = meaningfulLines.find((line) =>
      /(mg|mcg|ui|iu|ml|enantato|masteron|retatrutida|tirzepatida|clenbuterol|proviron|durateston|testosterona|trembolona|oxandrolona|stanozolol|nandrolona)/i.test(
        line,
      ),
    );

    return preferred || meaningfulLines[0] || splitLines(text)[0] || '';
  };

  const extractDosage = (text) => {
    const matches = clean(text).match(
      /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|g|ui|iu)(?:\s*\/\s*(?:ml|dose|comp|caps?))?\b/gi,
    );
    return matches ? Array.from(new Set(matches.map(clean))).join(' | ') : '';
  };

  const extractQuantity = (text) => {
    const matches = clean(text).match(
      /\b(?:\d+\s*x\s*)?\d+(?:[.,]\d+)?\s*(?:ml|mL|comprimidos?|c[aá]psulas?|caps?|ampolas?|vials?|frascos?|unidades?|tabs?|tabletes?)\b/gi,
    );
    return matches ? Array.from(new Set(matches.map(clean))).join(' | ') : '';
  };

  const extractDiscountPercent = (text) => {
    const match = clean(text).match(/-?\s*\d{1,3}\s*%/);
    return match ? clean(match[0]) : '';
  };

  const extractSavingsText = (text) =>
    splitLines(text).find((line) => /(economia|economize|poupe|desconto|off)/i.test(line)) || '';

  const inferStatus = (text) => {
    if (/(esgotado|sem estoque)/i.test(text)) return 'esgotado';
    if (/indispon[ií]vel/i.test(text)) return 'indisponivel';
    return 'disponivel';
  };

  const products = [];
  const seen = new Set();

  for (const card of candidateCards) {
    const text = getText(card);
    if (!text || dangerousText.test(text)) continue;

    const context = inferContext(card);
    const prices = extractPriceTokens(card);
    const oldPrice = prices.find((price) => price.struck) || null;
    const nonStruckPrices = prices.filter((price) => !price.struck);
    let currentPrice = nonStruckPrices[0] || prices[0] || null;

    if (oldPrice && nonStruckPrices.length > 0) {
      currentPrice =
        nonStruckPrices
          .filter((price) => price.numeric === null || oldPrice.numeric === null || price.numeric <= oldPrice.numeric)
          .sort((a, b) => (a.numeric ?? Infinity) - (b.numeric ?? Infinity))[0] || nonStruckPrices.at(-1);
    }

    const name = inferName(text, context);
    const key = normalize(`${name}|${currentPrice?.raw || ''}|${context.categoria}|${context.marcaSecao}`);

    if (!name || seen.has(key)) continue;
    seen.add(key);

    products.push({
      categoria: context.categoria,
      'marca/seção': context.marcaSecao,
      nome_produto: name,
      dosagem_texto: extractDosage(`${name}\n${text}`),
      quantidade_texto: extractQuantity(`${name}\n${text}`),
      preco_atual: currentPrice?.raw || '',
      preco_antigo_riscado: oldPrice?.raw || '',
      percentual_desconto: extractDiscountPercent(text),
      economia_texto: extractSavingsText(text),
      status: inferStatus(text),
      texto_card_completo: text,
    });
  }

  return products;
}

function enrichProduct(product) {
  const joinedText = [
    product.nome_produto,
    product.dosagem_texto,
    product.quantidade_texto,
    product.texto_card_completo,
  ].join('\n');

  const currentPrice = parsePriceNumber(product.preco_atual);
  const oldPrice = parsePriceNumber(product.preco_antigo_riscado);
  const uninsuredPrice =
    typeof product.preco_sem_seguro_numero === 'number'
      ? product.preco_sem_seguro_numero
      : parsePriceNumber(product.preco_sem_seguro);
  const totalMg = estimateTotalMg(joinedText);
  const costPerMg = currentPrice !== null && totalMg ? currentPrice / totalMg : null;
  const rawBrandSection = getBrandSection(product);
  const brandParts = deriveBrandParts(rawBrandSection);
  const canonicalBrand = canonicalizeBrand(brandParts.marca_base);
  const family = detectProductFamily(joinedText);
  const brandMeta = findBrandResearchForText(
    [canonicalBrand.family, canonicalBrand.canonical, brandParts.marca_base, rawBrandSection, product.nome_produto].filter(Boolean).join(' '),
  );
  const brandScore = canonicalBrand.family === 'Sem marca' ? 0 : brandMeta?.score || 5;
  const rankingValue = costPerMg ?? currentPrice ?? null;
  const rankingTieBreaker = typeof rankingValue === 'number' ? Math.max(0, 1_000_000 - rankingValue) : 0;

  return {
    ...product,
    preco_atual_numero: currentPrice,
    preco_antigo_numero: oldPrice,
    preco_sem_seguro_numero: uninsuredPrice,
    total_mg_estimado: totalMg || '',
    custo_por_mg: costPerMg === null ? '' : roundNumber(costPerMg, 6),
    marca_base: brandParts.marca_base,
    secao_marca: brandParts.secao_marca,
    marca_original_site: canonicalBrand.original,
    marca_canonica: canonicalBrand.canonical,
    marca_familia: canonicalBrand.family,
    marca_linha: canonicalBrand.line,
    familia_produto: family,
    marca_nota_documental: brandScore,
    ranking_marca_preco: roundNumber(brandScore * 10_000_000 + rankingTieBreaker, 6),
  };
}

function deriveBrandParts(rawBrand) {
  const raw = String(rawBrand || '').replace(/\s+/g, ' ').trim();

  if (!raw) {
    return {
      marca_base: 'Sem marca',
      secao_marca: '',
    };
  }

  const parts = raw.split('/').map((part) => part.trim()).filter(Boolean);

  return {
    marca_base: parts[0] || 'Sem marca',
    secao_marca: parts.slice(1).join(' / '),
  };
}

function canonicalizeBrand(rawBrand) {
  const original = String(rawBrand || '').replace(/\s+/g, ' ').trim();

  if (!original || original === 'Sem marca') {
    return {
      original: original || 'Sem marca',
      canonical: 'Sem marca',
      family: 'Sem marca',
      line: '',
    };
  }

  const normalized = normalizeText(original);
  const compact = normalized.replace(/\s+/g, '');
  const rule = BRAND_CANONICAL_RULES.find((candidate) =>
    candidate.aliases.some((alias) => {
      const aliasNormalized = normalizeText(alias);
      return normalized === aliasNormalized || compact === aliasNormalized.replace(/\s+/g, '');
    }),
  );

  if (!rule) {
    return {
      original,
      canonical: original,
      family: original,
      line: '',
    };
  }

  return {
    original,
    canonical: rule.canonical,
    family: rule.family,
    line: rule.line,
  };
}

function getBrandSection(product) {
  if (!product || typeof product !== 'object') return '';

  for (const key of BRAND_SECTION_KEYS) {
    if (product[key]) return product[key];
  }

  return '';
}

function detectProductFamily(text) {
  const normalized = normalizeText(text);

  if (/\bretatrutida\b/.test(normalized)) return 'Retatrutida';
  if (/\btirzepatida\b|\btirzec\b|\bmounjaro\b/.test(normalized)) return 'Tirzepatida';
  if (/\bclenbuterol\b|\bclembuterol\b/.test(normalized)) return 'Clenbuterol';
  if (/\bproviron\b/.test(normalized)) return 'Proviron';
  if (/\bdurateston\b|\bdura\b/.test(normalized)) return 'Durateston';
  if (/\bmasteron\b|\bdrostanolona\b/.test(normalized)) return 'Masteron';
  if (/\benantato\b/.test(normalized) && !/\bmasteron\b|\btrembo\b/.test(normalized)) return 'Enantato';

  return '';
}

function findBrandResearchForText(text) {
  const normalized = normalizeText(text);

  return BRAND_RESEARCH.find((brand) => {
    const matchesAlias = brand.aliases.some((alias) => normalized.includes(normalizeText(alias)));
    const matchesExclude = (brand.excludes || []).some((alias) => normalized.includes(normalizeText(alias)));
    return matchesAlias && !matchesExclude;
  });
}

function estimateTotalMg(text) {
  const normalized = normalizeText(text);
  const number = '(\\d+(?:[,.]\\d+)?)';
  const isPeptide =
    /\b(peptideo|peptide|retatrutida|tirzepatida|semaglutida|bpc|tb-?500|hgh|gh|ipamorelin|cjc|tesamorelin|melanotan)\b/i.test(
      normalized,
    );
  const peptideMgMatch = normalized.match(/\b(15|20|40|60)\s*mg\b/i);

  if (isPeptide && peptideMgMatch) {
    return toNumber(peptideMgMatch[1]);
  }

  const mgPerMlMatch =
    normalized.match(new RegExp(`\\b${number}\\s*mg\\s*/\\s*ml\\b`, 'i')) ||
    normalized.match(new RegExp(`\\b${number}\\s*mg\\s*ml\\b`, 'i'));
  const plainMgMatch = normalized.match(new RegExp(`\\b${number}\\s*mg\\b`, 'i'));
  const unitVolumeMatch = normalized.match(
    new RegExp(`\\b(\\d+)\\s*(ampolas?|frascos?|vials?)\\s*(?:de|x)?\\s*${number}\\s*ml\\b`, 'i'),
  );
  const mlMatch = normalized.match(new RegExp(`\\b${number}\\s*ml\\b`, 'i'));
  const unitCountMatch = normalized.match(
    /\b(\d+)\s*(?:comprimidos?|capsulas?|caps?|tabletes?|tabs?|ampolas?|unidades?)\b/i,
  );

  if ((mgPerMlMatch || plainMgMatch) && unitVolumeMatch && !isPeptide) {
    const mg = toNumber((mgPerMlMatch || plainMgMatch)[1]);
    const units = toNumber(unitVolumeMatch[1]);
    const unitType = unitVolumeMatch[2] || '';
    const mlPerUnit = toNumber(unitVolumeMatch[3]);
    const totalMl =
      /ampolas?/.test(unitType) && units === mlPerUnit && mlPerUnit > 2
        ? mlPerUnit
        : units * mlPerUnit;
    return mg && units && mlPerUnit ? roundNumber(mg * totalMl, 4) : null;
  }

  if ((mgPerMlMatch || plainMgMatch) && mlMatch && !isPeptide) {
    const mg = toNumber((mgPerMlMatch || plainMgMatch)[1]);
    const ml = toNumber(mlMatch[1]);
    return mg && ml ? roundNumber(mg * ml, 4) : null;
  }

  if (plainMgMatch && unitCountMatch) {
    const mg = toNumber(plainMgMatch[1]);
    const units = toNumber(unitCountMatch[1]);
    return mg && units ? roundNumber(mg * units, 4) : null;
  }

  if (plainMgMatch && (isPeptide || !mlMatch)) {
    return toNumber(plainMgMatch[1]);
  }

  return null;
}

function buildReportData(products, totalsByUrl) {
  const productsWithDiscount = products.filter(
    (product) =>
      Boolean(product.percentual_desconto || product.economia_texto || product.preco_antigo_riscado),
  );
  const soldOutProducts = products.filter((product) => product.status === 'esgotado');
  const unavailableProducts = products.filter((product) => product.status === 'indisponivel');
  const totalsByCategory = countBy(products, (product) => product.categoria || 'Sem categoria');
  const comparisons = comparePromoAndMain(products);
  const targetProducts = products.filter((product) =>
    TARGET_TERMS.some(
      (term) =>
        product.familia_produto === term ||
        normalizeText([product.nome_produto, product.dosagem_texto, product.texto_card_completo].join(' ')).includes(
          normalizeText(term),
        ),
    ),
  );
  const topCostPerMg = products
    .filter((product) => typeof product.custo_por_mg === 'number' && product.custo_por_mg > 0)
    .sort((a, b) => a.custo_por_mg - b.custo_por_mg)
    .slice(0, 20);
  const brandResearch = buildBrandResearch(products);
  const dashboardData = buildDashboardData(products, brandResearch, totalsByUrl);

  return {
    generatedAt: new Date().toISOString(),
    products,
    totalsByUrl,
    totalsByCategory,
    productsWithDiscount,
    soldOutProducts,
    unavailableProducts,
    comparisons,
    targetProducts,
    topCostPerMg,
    brandResearch,
    dashboardData,
    files: OUTPUTS,
  };
}

function buildBrandResearch(products) {
  return BRAND_RESEARCH.map((brand) => {
    const matchedProducts = products.filter((product) => matchesBrand(product, brand));
    const prices = matchedProducts
      .map((product) => product.preco_atual_numero)
      .filter((price) => typeof price === 'number' && Number.isFinite(price));
    const bestCostProduct = matchedProducts
      .filter((product) => typeof product.custo_por_mg === 'number' && product.custo_por_mg > 0)
      .sort((a, b) => a.custo_por_mg - b.custo_por_mg)[0];

    return {
      ...brand,
      products_count: matchedProducts.length,
      available_count: matchedProducts.filter((product) => product.status === 'disponivel').length,
      sold_out_count: matchedProducts.filter((product) => product.status === 'esgotado').length,
      unavailable_count: matchedProducts.filter((product) => product.status === 'indisponivel').length,
      categories: Array.from(new Set(matchedProducts.map((product) => product.categoria || 'Sem categoria'))).sort(),
      price_min: prices.length ? Math.min(...prices) : '',
      price_max: prices.length ? Math.max(...prices) : '',
      best_cost_product: bestCostProduct?.nome_produto || '',
      best_cost_per_mg: bestCostProduct?.custo_por_mg || '',
      matched_products: matchedProducts,
    };
  }).sort((a, b) => b.score - a.score || b.products_count - a.products_count);
}

function matchesBrand(product, brand) {
  const brandText = normalizeText([getBrandSection(product), product.nome_produto].filter(Boolean).join(' '));
  const matchesAlias = brand.aliases.some((alias) => brandText.includes(normalizeText(alias)));
  const matchesExclude = (brand.excludes || []).some((alias) => brandText.includes(normalizeText(alias)));

  return matchesAlias && !matchesExclude;
}

function buildDashboardData(products, brandResearch, totalsByUrl) {
  const compactProducts = products.map(toDashboardProduct);
  const brandCards = buildDashboardBrandCards(compactProducts);
  const familyComparisons = buildFamilyComparisons(compactProducts);

  return {
    generatedAt: new Date().toISOString(),
    totalsByUrl,
    metrics: {
      totalProducts: compactProducts.length,
      totalBrands: new Set(compactProducts.map((product) => product.brandFamily)).size,
      available: compactProducts.filter((product) => product.status === 'disponivel').length,
      unavailable: compactProducts.filter((product) => product.status === 'indisponivel').length,
      soldOut: compactProducts.filter((product) => product.status === 'esgotado').length,
      promo: compactProducts.filter((product) => product.sourceType === 'promo').length,
      principal: compactProducts.filter((product) => product.sourceType === 'principal').length,
      medicalBrasil: compactProducts.filter((product) => product.sourceType === 'medical_brasil').length,
      pypharma: compactProducts.filter((product) => product.sourceType === 'pypharma').length,
      withDiscount: compactProducts.filter((product) => product.hasDiscount).length,
      monitored: compactProducts.filter((product) => product.family).length,
    },
    options: {
      brands: uniqueSorted(compactProducts.map((product) => product.brandFamily)),
      categories: uniqueSorted(compactProducts.map((product) => product.category || 'Sem categoria')),
      sections: uniqueSorted(compactProducts.map((product) => product.brandSection || 'Sem secao')),
      statuses: uniqueSorted(compactProducts.map((product) => product.status)),
      families: TARGET_TERMS,
      sources: uniqueSorted(compactProducts.map((product) => product.sourceType)),
    },
    products: compactProducts,
    brandCards,
    familyComparisons,
    brandResearch: brandResearch.map((brand) => ({
      name: brand.displayName,
      score: brand.score,
      tier: brand.tier,
      productsCount: brand.products_count,
      availableCount: brand.available_count,
      unavailableCount: brand.unavailable_count,
      categories: brand.categories,
      priceMin: brand.price_min,
      priceMax: brand.price_max,
      bestCostProduct: brand.best_cost_product,
      bestCostPerMg: brand.best_cost_per_mg,
      history: brand.history,
      evidence: brand.evidence,
      caution: brand.caution,
      sources: formatBrandSources(brand),
    })),
  };
}

function toDashboardProduct(product, index) {
  const price = typeof product.preco_atual_numero === 'number' ? product.preco_atual_numero : null;
  const oldPrice = typeof product.preco_antigo_numero === 'number' ? product.preco_antigo_numero : null;
  const uninsuredPrice =
    typeof product.preco_sem_seguro_numero === 'number' ? product.preco_sem_seguro_numero : null;
  const costPerMg = typeof product.custo_por_mg === 'number' ? product.custo_por_mg : null;
  const totalMg = typeof product.total_mg_estimado === 'number' ? product.total_mg_estimado : null;
  const hasDiscount = Boolean(product.percentual_desconto || product.economia_texto || product.preco_antigo_riscado);
  const rawBrandSection = getBrandSection(product);

  return {
    id: index + 1,
    sourceUrl: product.source_url,
    sourceType: product.source_type,
    category: product.categoria || 'Sem categoria',
    brandRaw: rawBrandSection,
    brandBase: product.marca_base || 'Sem marca',
    brandOriginal: product.marca_original_site || product.marca_base || 'Sem marca',
    brandCanonical: product.marca_canonica || product.marca_base || 'Sem marca',
    brandFamily: product.marca_familia || product.marca_canonica || product.marca_base || 'Sem marca',
    brandLine: product.marca_linha || '',
    brandSection: product.secao_marca || '',
    brandScore: product.marca_nota_documental || 0,
    family: product.familia_produto || '',
    productName: product.nome_produto || '',
    dosage: product.dosagem_texto || '',
    quantity: product.quantidade_texto || '',
    currentPrice: product.preco_atual || '',
    insuredPriceText: product.preco_com_seguro || '',
    uninsuredPriceText: product.preco_sem_seguro || '',
    oldPriceText: product.preco_antigo_riscado || '',
    discount: product.percentual_desconto || product.economia_texto || '',
    status: product.status || '',
    totalMg,
    costPerMg,
    price,
    oldPrice,
    uninsuredPrice,
    hasDiscount,
    ranking: product.ranking_marca_preco || 0,
    collectedAt: product.data_hora_coleta || '',
    searchText: normalizeText(
      [
        product.nome_produto,
        product.dosagem_texto,
        product.quantidade_texto,
        product.categoria,
        rawBrandSection,
        product.marca_base,
        product.marca_original_site,
        product.marca_canonica,
        product.marca_familia,
        product.marca_linha,
        product.secao_marca,
        product.familia_produto,
        product.status,
        product.source_type,
        product.preco_sem_seguro,
      ].join(' '),
    ),
  };
}

function buildDashboardBrandCards(products) {
  const groups = new Map();

  for (const product of products) {
    const brandGroup = product.brandFamily || product.brandCanonical || product.brandBase || 'Sem marca';
    if (!groups.has(brandGroup)) {
      groups.set(brandGroup, []);
    }

    groups.get(brandGroup).push(product);
  }

  return Array.from(groups.entries())
    .map(([brand, brandProducts]) => {
      const prices = brandProducts.map((product) => product.price).filter((price) => typeof price === 'number');
      const bestCostProduct = brandProducts
        .filter((product) => typeof product.costPerMg === 'number')
        .sort(compareProductValue)[0];
      const brandMeta = findBrandResearchForText(brand);
      const score = brand === 'Sem marca' ? 0 : brandMeta?.score || Math.max(...brandProducts.map((p) => p.brandScore || 0), 5);

      return {
        brand,
        score,
        tier: brandMeta?.tier || (brand === 'Sem marca' ? 'Sem marca' : 'Nao pesquisada'),
        total: brandProducts.length,
        available: brandProducts.filter((product) => product.status === 'disponivel').length,
        unavailable: brandProducts.filter((product) => product.status === 'indisponivel').length,
        soldOut: brandProducts.filter((product) => product.status === 'esgotado').length,
        withDiscount: brandProducts.filter((product) => product.hasDiscount).length,
        categories: uniqueSorted(brandProducts.map((product) => product.category)),
        originals: uniqueSorted(brandProducts.map((product) => product.brandOriginal).filter(Boolean)),
        canonicalNames: uniqueSorted(brandProducts.map((product) => product.brandCanonical).filter(Boolean)),
        lines: uniqueSorted(brandProducts.map((product) => product.brandLine).filter(Boolean)),
        variantsBySource: buildBrandVariantsBySource(brandProducts),
        sections: uniqueSorted(brandProducts.map((product) => product.brandSection || 'Sem secao')),
        families: uniqueSorted(brandProducts.map((product) => product.family).filter(Boolean)),
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
        bestCostProduct: bestCostProduct?.productName || '',
        bestCostPerMg: bestCostProduct?.costPerMg ?? null,
        products: brandProducts.sort(compareProductValue),
      };
    })
    .sort((a, b) => {
      if (a.brand === 'Sem marca') return 1;
      if (b.brand === 'Sem marca') return -1;
      return b.score - a.score || b.total - a.total || a.brand.localeCompare(b.brand, 'pt-BR');
    });
}

function buildBrandVariantsBySource(products) {
  const groups = new Map();

  for (const product of products) {
    const sourceType = product.sourceType || 'unknown';
    if (!groups.has(sourceType)) groups.set(sourceType, new Set());
    if (product.brandOriginal) groups.get(sourceType).add(product.brandOriginal);
  }

  return Array.from(groups.entries())
    .map(([sourceType, originals]) => ({
      sourceType,
      originals: Array.from(originals).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }))
    .sort((a, b) => a.sourceType.localeCompare(b.sourceType, 'pt-BR'));
}

function buildFamilyComparisons(products) {
  return TARGET_TERMS.map((family) => {
    const familyProducts = products.filter((product) => product.family === family);
    const bestByBrand = new Map();

    for (const product of familyProducts) {
      const brandKey = product.brandFamily || product.brandCanonical || product.brandBase || 'Sem marca';
      const existing = bestByBrand.get(brandKey);

      if (!existing || compareProductValue(product, existing) < 0) {
        bestByBrand.set(brandKey, product);
      }
    }

    return {
      family,
      total: familyProducts.length,
      bestByBrand: Array.from(bestByBrand.values()).sort(compareProductValue),
      allProducts: familyProducts.sort(compareProductValue),
    };
  });
}

function compareProductValue(a, b) {
  const scoreA = (a.brandFamily || a.brandBase) === 'Sem marca' ? -1 : a.brandScore || 0;
  const scoreB = (b.brandFamily || b.brandBase) === 'Sem marca' ? -1 : b.brandScore || 0;
  const costA = typeof a.costPerMg === 'number' ? a.costPerMg : Infinity;
  const costB = typeof b.costPerMg === 'number' ? b.costPerMg : Infinity;
  const priceA = typeof a.price === 'number' ? a.price : Infinity;
  const priceB = typeof b.price === 'number' ? b.price : Infinity;

  return scoreB - scoreA || costA - costB || priceA - priceB || a.productName.localeCompare(b.productName, 'pt-BR');
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim())))
    .sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function comparePromoAndMain(products) {
  const grouped = new Map();

  for (const product of products) {
    const key = productIdentity(product);
    if (!key) continue;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(product);
  }

  const rows = [];

  for (const groupProducts of grouped.values()) {
    const promo = bestPricedProduct(groupProducts.filter((product) => product.source_type === 'promo'));
    const principal = bestPricedProduct(groupProducts.filter((product) => product.source_type === 'principal'));

    if (!promo || !principal) continue;

    const promoPrice = promo.preco_atual_numero;
    const mainPrice = principal.preco_atual_numero;
    const difference =
      typeof promoPrice === 'number' && typeof mainPrice === 'number'
        ? roundNumber(promoPrice - mainPrice, 2)
        : '';

    rows.push({
      produto: promo.nome_produto || principal.nome_produto,
      categoria: promo.categoria || principal.categoria || '',
      promo_preco: promo.preco_atual || '',
      principal_preco: principal.preco_atual || '',
      diferenca_promo_menos_principal: difference,
      melhor_fonte:
        typeof difference === 'number'
          ? difference < 0
            ? 'promo'
            : difference > 0
              ? 'principal'
              : 'igual'
          : '',
      promo_status: promo.status,
      principal_status: principal.status,
    });
  }

  return rows.sort((a, b) => String(a.produto).localeCompare(String(b.produto), 'pt-BR'));
}

function bestPricedProduct(products) {
  if (products.length === 0) return null;

  return [...products].sort((a, b) => {
    const priceA = typeof a.preco_atual_numero === 'number' ? a.preco_atual_numero : Infinity;
    const priceB = typeof b.preco_atual_numero === 'number' ? b.preco_atual_numero : Infinity;
    return priceA - priceB;
  })[0];
}

function productIdentity(product) {
  return normalizeText(
    [
      product.nome_produto,
      product.dosagem_texto,
      product.quantidade_texto,
    ]
      .filter(Boolean)
      .join(' '),
  )
    .replace(/\b(disponivel|esgotado|indisponivel|comprar|adicionar)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderMarkdownReport(data) {
  const totalByUrlRows = Object.entries(data.totalsByUrl).map(([url, total]) => [url, total]);
  const categoryRows = Object.entries(data.totalsByCategory).sort((a, b) => b[1] - a[1]);
  const discountRows = data.productsWithDiscount.map(productRow);
  const soldOutRows = data.soldOutProducts.map(productRow);
  const comparisonRows = data.comparisons.map((row) => [
    row.produto,
    row.categoria,
    row.promo_preco,
    row.principal_preco,
    row.diferenca_promo_menos_principal,
    row.melhor_fonte,
    row.promo_status,
    row.principal_status,
  ]);
  const targetRows = data.targetProducts.map((product) => [
    product.nome_produto,
    product.categoria,
    product.source_type,
    product.preco_atual,
    product.preco_antigo_riscado,
    product.percentual_desconto,
    product.status,
    product.total_mg_estimado,
    formatNumber(product.custo_por_mg),
  ]);
  const topCostRows = data.topCostPerMg.map((product, index) => [
    index + 1,
    product.nome_produto,
    product.source_type,
    product.preco_atual,
    product.total_mg_estimado,
    formatNumber(product.custo_por_mg),
    product.status,
  ]);
  const brandRankingRows = data.brandResearch.map((brand, index) => [
    index + 1,
    brand.displayName,
    formatNumber(brand.score),
    brand.tier,
    brand.products_count,
    brand.available_count,
    brand.categories.join(', '),
    formatCurrencyRange(brand.price_min, brand.price_max),
    brand.best_cost_product
      ? `${brand.best_cost_product} (${formatNumber(brand.best_cost_per_mg)} por mg)`
      : '',
  ]);
  const brandHistoryRows = data.brandResearch.map((brand) => [
    brand.displayName,
    brand.history,
    brand.evidence,
    brand.caution,
    formatBrandSources(brand),
  ]);

  return [
    '# Respect Pharma - Relatório de preços',
    '',
    `Gerado em: ${data.generatedAt}`,
    '',
    `Total geral de produtos: **${data.products.length}**`,
    '',
    '## Total por URL',
    '',
    markdownTable(['URL', 'Produtos'], totalByUrlRows),
    '',
    '## Total por categoria',
    '',
    markdownTable(['Categoria', 'Produtos'], categoryRows),
    '',
    '## Melhores marcas por documentacao',
    '',
    'Ranking baseado em sinais publicos: fonte institucional, historico, autenticidade, certificacoes declaradas e consistencia com o catalogo. Nao mede pureza de lote e nao e recomendacao de uso.',
    '',
    markdownTable(
      [
        '#',
        'Marca',
        'Nota documental',
        'Nivel',
        'Produtos no catalogo',
        'Disponiveis',
        'Categorias',
        'Faixa de preco',
        'Melhor custo/mg encontrado',
      ],
      brandRankingRows,
    ),
    '',
    '## Historico e alertas das marcas pesquisadas',
    '',
    markdownTable(['Marca', 'Historico', 'Sinais verificaveis', 'Alertas', 'Fonte'], brandHistoryRows),
    '',
    '## Produtos com desconto',
    '',
    data.productsWithDiscount.length
      ? markdownTable(['Produto', 'Categoria', 'Fonte', 'Preço atual', 'Preço antigo', 'Desconto', 'Status'], discountRows)
      : 'Nenhum produto com desconto foi identificado.',
    '',
    '## Produtos esgotados',
    '',
    data.soldOutProducts.length
      ? markdownTable(['Produto', 'Categoria', 'Fonte', 'Preço atual', 'Preço antigo', 'Desconto', 'Status'], soldOutRows)
      : 'Nenhum produto esgotado foi identificado.',
    '',
    '## Produtos indisponíveis',
    '',
    data.unavailableProducts.length
      ? markdownTable(
          ['Produto', 'Categoria', 'Fonte', 'Preço atual', 'Preço antigo', 'Desconto', 'Status'],
          data.unavailableProducts.map(productRow),
        )
      : 'Nenhum produto indisponível foi identificado.',
    '',
    '## Comparação entre promo e principal',
    '',
    data.comparisons.length
      ? markdownTable(
          [
            'Produto',
            'Categoria',
            'Preço promo',
            'Preço principal',
            'Diferença promo-principal',
            'Melhor fonte',
            'Status promo',
            'Status principal',
          ],
          comparisonRows,
        )
      : 'Nenhum produto igual foi encontrado nas duas páginas pela chave normalizada nome + dosagem + quantidade.',
    '',
    '## Produtos monitorados',
    '',
    `Termos: ${TARGET_TERMS.join(', ')}`,
    '',
    data.targetProducts.length
      ? markdownTable(
          [
            'Produto',
            'Categoria',
            'Fonte',
            'Preço atual',
            'Preço antigo',
            'Desconto',
            'Status',
            'Total mg estimado',
            'Custo por mg',
          ],
          targetRows,
        )
      : 'Nenhum produto com os termos monitorados foi identificado.',
    '',
    '## Top 20 melhores custo por mg',
    '',
    data.topCostPerMg.length
      ? markdownTable(['#', 'Produto', 'Fonte', 'Preço atual', 'Total mg estimado', 'Custo por mg', 'Status'], topCostRows)
      : 'Nenhum produto tinha preço e mg/ml suficientes para calcular custo por mg.',
    '',
    '## Arquivos gerados',
    '',
    markdownTable(
      ['Arquivo', 'Caminho'],
      [
        ['JSON bruto', relativePath(data.files.json)],
        ['CSV', relativePath(data.files.csv)],
        ['Relatório Markdown', relativePath(data.files.markdown)],
        ['Relatório HTML', relativePath(data.files.html)],
        ['Screenshot promo', 'screenshots/promo_page.png'],
        ['Screenshot principal', 'screenshots/main_page.png'],
        ['Screenshot PYPHARMA', 'screenshots/pypharma_page.png'],
      ],
    ),
    '',
  ].join('\n');
}

function renderHtmlReport(data) {
  return renderInteractiveHtmlReport(data);

  const totalByUrlRows = Object.entries(data.totalsByUrl).map(([url, total]) => ({
    URL: url,
    Produtos: total,
  }));
  const categoryRows = Object.entries(data.totalsByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([categoria, total]) => ({ Categoria: categoria, Produtos: total }));
  const comparisonRows = data.comparisons.map((row) => ({
    Produto: row.produto,
    Categoria: row.categoria,
    'Preço promo': row.promo_preco,
    'Preço principal': row.principal_preco,
    Diferença: row.diferenca_promo_menos_principal,
    'Melhor fonte': row.melhor_fonte,
    'Status promo': row.promo_status,
    'Status principal': row.principal_status,
  }));
  const targetRows = data.targetProducts.map((product) => ({
    Produto: product.nome_produto,
    Categoria: product.categoria,
    Fonte: product.source_type,
    'Preço atual': product.preco_atual,
    'Preço antigo': product.preco_antigo_riscado,
    Desconto: product.percentual_desconto,
    Status: product.status,
    'Total mg estimado': product.total_mg_estimado,
    'Custo por mg': formatNumber(product.custo_por_mg),
  }));
  const topCostRows = data.topCostPerMg.map((product, index) => ({
    '#': index + 1,
    Produto: product.nome_produto,
    Fonte: product.source_type,
    'Preço atual': product.preco_atual,
    'Total mg estimado': product.total_mg_estimado,
    'Custo por mg': formatNumber(product.custo_por_mg),
    Status: product.status,
  }));
  const brandRankingRows = data.brandResearch.map((brand, index) => ({
    '#': index + 1,
    Marca: brand.displayName,
    'Nota documental': formatNumber(brand.score),
    Nivel: brand.tier,
    'Produtos no catalogo': brand.products_count,
    Disponiveis: brand.available_count,
    Categorias: brand.categories.join(', '),
    'Faixa de preco': formatCurrencyRange(brand.price_min, brand.price_max),
    'Melhor custo/mg': brand.best_cost_product
      ? `${brand.best_cost_product} (${formatNumber(brand.best_cost_per_mg)} por mg)`
      : '',
  }));
  const brandHistoryRows = data.brandResearch.map((brand) => ({
    Marca: brand.displayName,
    Historico: brand.history,
    'Sinais verificaveis': brand.evidence,
    Alertas: brand.caution,
    Fonte: formatBrandSources(brand),
  }));

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Respect Pharma - Relatório de preços</title>
  <style>
    :root {
      --ink: #162019;
      --muted: #5e6b62;
      --paper: #f7f2e8;
      --panel: rgba(255, 252, 244, 0.86);
      --line: rgba(22, 32, 25, 0.16);
      --moss: #57765c;
      --amber: #c47a2c;
      --mint: #dbe9d5;
      --danger: #a44335;
      --shadow: 0 18px 60px rgba(49, 57, 45, 0.16);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      font-family: "Aptos", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 12% 5%, rgba(196, 122, 44, 0.22), transparent 28rem),
        radial-gradient(circle at 90% 8%, rgba(87, 118, 92, 0.22), transparent 26rem),
        linear-gradient(135deg, #fbf4e7 0%, #eef1df 55%, #f8f1e3 100%);
      min-height: 100vh;
    }

    header {
      padding: 56px min(7vw, 92px) 28px;
    }

    .eyebrow {
      color: var(--moss);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 12px 0 10px;
      max-width: 980px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2.4rem, 5vw, 5.9rem);
      line-height: 0.94;
      letter-spacing: -0.055em;
    }

    .subhead {
      max-width: 760px;
      color: var(--muted);
      font-size: 1.05rem;
      line-height: 1.65;
    }

    main {
      padding: 0 min(7vw, 92px) 64px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      margin: 26px 0 28px;
    }

    .metric, section {
      border: 1px solid var(--line);
      background: var(--panel);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    .metric {
      border-radius: 28px;
      padding: 22px;
      position: relative;
      overflow: hidden;
    }

    .metric::after {
      content: "";
      position: absolute;
      right: -34px;
      top: -34px;
      width: 92px;
      height: 92px;
      border-radius: 999px;
      background: var(--mint);
      opacity: 0.65;
    }

    .metric strong {
      display: block;
      font-size: 2.2rem;
      line-height: 1;
      margin-bottom: 8px;
    }

    .metric span {
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    section {
      border-radius: 30px;
      margin: 22px 0;
      overflow: hidden;
    }

    section h2 {
      margin: 0;
      padding: 22px 24px;
      border-bottom: 1px solid var(--line);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(1.45rem, 2vw, 2rem);
      letter-spacing: -0.03em;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
      font-size: 0.92rem;
    }

    th, td {
      padding: 13px 16px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }

    th {
      color: #314436;
      background: rgba(219, 233, 213, 0.58);
      font-size: 0.76rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.45);
    }

    .empty {
      color: var(--muted);
      padding: 22px 24px 28px;
    }

    .screenshots {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
      padding: 22px;
    }

    figure {
      margin: 0;
    }

    figure img {
      width: 100%;
      max-height: 520px;
      object-fit: cover;
      object-position: top;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: white;
    }

    figcaption {
      color: var(--muted);
      font-size: 0.86rem;
      margin-top: 10px;
    }

    footer {
      color: var(--muted);
      padding: 10px min(7vw, 92px) 42px;
      font-size: 0.88rem;
    }

    @media (max-width: 720px) {
      header, main, footer {
        padding-left: 18px;
        padding-right: 18px;
      }

      .metric {
        border-radius: 22px;
      }

      section {
        border-radius: 24px;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">Respect Pharma / Murilo</div>
    <h1>Relatório de preços e custo por mg</h1>
    <p class="subhead">
      Gerado em ${escapeHtml(data.generatedAt)}. Este relatório usa os produtos visíveis após expansão de categorias e scroll lazy-load.
    </p>
  </header>
  <main>
    <div class="cards">
      <div class="metric"><strong>${data.products.length}</strong><span>produtos totais</span></div>
      <div class="metric"><strong>${data.productsWithDiscount.length}</strong><span>com desconto</span></div>
      <div class="metric"><strong>${data.soldOutProducts.length}</strong><span>esgotados</span></div>
      <div class="metric"><strong>${data.topCostPerMg.length}</strong><span>com custo por mg</span></div>
    </div>

    ${htmlSection('Total por URL', htmlTable(totalByUrlRows))}
    ${htmlSection('Total por categoria', htmlTable(categoryRows))}
    ${htmlSection(
      'Melhores marcas por documentacao',
      `<p class="empty">Ranking baseado em sinais publicos: fonte institucional, historico, autenticidade, certificacoes declaradas e consistencia com o catalogo. Nao mede pureza de lote e nao e recomendacao de uso.</p>${htmlTable(brandRankingRows)}`,
    )}
    ${htmlSection('Historico e alertas das marcas pesquisadas', htmlTable(brandHistoryRows))}
    ${htmlSection(
      'Produtos monitorados',
      targetRows.length ? htmlTable(targetRows) : htmlEmpty(`Nenhum produto encontrado para: ${TARGET_TERMS.join(', ')}`),
    )}
    ${htmlSection(
      'Comparação entre promo e principal',
      comparisonRows.length
        ? htmlTable(comparisonRows)
        : htmlEmpty('Nenhum produto igual foi encontrado nas duas páginas pela chave normalizada nome + dosagem + quantidade.'),
    )}
    ${htmlSection('Top 20 melhores custo por mg', topCostRows.length ? htmlTable(topCostRows) : htmlEmpty('Sem dados suficientes para calcular custo por mg.'))}
    ${htmlSection(
      'Produtos com desconto',
      data.productsWithDiscount.length ? htmlTable(data.productsWithDiscount.map(productObjectRow)) : htmlEmpty('Nenhum desconto identificado.'),
    )}
    ${htmlSection(
      'Produtos esgotados',
      data.soldOutProducts.length ? htmlTable(data.soldOutProducts.map(productObjectRow)) : htmlEmpty('Nenhum esgotado identificado.'),
    )}

    <section>
      <h2>Screenshots</h2>
      <div class="screenshots">
        <figure>
          <img src="../screenshots/promo_page.png" alt="Screenshot da página promo">
          <figcaption>Página promo</figcaption>
        </figure>
        <figure>
          <img src="../screenshots/main_page.png" alt="Screenshot da página principal">
          <figcaption>Página principal</figcaption>
        </figure>
      </div>
    </section>
  </main>
  <footer>
    Arquivos: data/respect_products_raw.json, data/respect_products.csv, reports/respect_price_report.md e reports/respect_price_report.html.
  </footer>
</body>
</html>`;
}

function renderInteractiveHtmlReport(data) {
  const dashboard = data.dashboardData || buildDashboardData(data.products || [], data.brandResearch || [], data.totalsByUrl || {});
  const dashboardJson = toSafeJson(dashboard);
  const generatedAt = escapeHtml(
    new Date(dashboard.generatedAt || data.generatedAt || Date.now()).toLocaleString('pt-BR'),
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Respect Pharma - Dashboard por marca</title>
  <style>
    :root {
      --ink: #17201c;
      --muted: #617068;
      --paper: #fffaf0;
      --panel: rgba(255, 255, 255, 0.88);
      --line: rgba(23, 32, 28, 0.12);
      --forest: #174c3c;
      --leaf: #2d7a59;
      --lime: #cfe86a;
      --amber: #ffb347;
      --rust: #b6532c;
      --red: #c93333;
      --blue: #2c6fb6;
      --violet: #6f4bb8;
      --shadow: 0 22px 60px rgba(23, 32, 28, 0.14);
      --radius: 24px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      font-family: "Aptos", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 8% 12%, rgba(207, 232, 106, 0.34), transparent 28rem),
        radial-gradient(circle at 88% 0%, rgba(255, 179, 71, 0.24), transparent 26rem),
        linear-gradient(135deg, #f8f0db 0%, #edf4dc 48%, #f9f3e5 100%);
    }

    button, input, select {
      font: inherit;
    }

    .live-refresh {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #f8ffed;
      background:
        radial-gradient(circle at 20% 20%, rgba(207, 232, 106, 0.26), transparent 24rem),
        linear-gradient(135deg, rgba(23, 76, 60, 0.98), rgba(18, 43, 56, 0.96));
    }

    .live-refresh[hidden] {
      display: none;
    }

    .live-card {
      width: min(680px, 100%);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 30px;
      padding: 30px;
      background: rgba(255, 255, 255, 0.09);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.24);
      backdrop-filter: blur(18px);
    }

    .live-card h2 {
      margin: 0 0 10px;
      font-size: clamp(2rem, 4vw, 3.4rem);
      line-height: 0.95;
    }

    .live-card p {
      color: rgba(248, 255, 237, 0.78);
    }

    .live-progress {
      overflow: hidden;
      height: 12px;
      margin-top: 18px;
      border-radius: 999px;
      background: rgba(248, 255, 237, 0.16);
    }

    .live-progress span {
      display: block;
      width: 42%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--lime), var(--amber));
      animation: liveSlide 1.4s ease-in-out infinite alternate;
    }

    .live-note {
      margin-top: 12px;
      font-size: 0.86rem;
    }

    @keyframes liveSlide {
      from { transform: translateX(-22%); }
      to { transform: translateX(150%); }
    }

    .live-notice {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid rgba(255, 179, 71, 0.44);
      border-radius: 16px;
      color: #7b3a11;
      background: rgba(255, 179, 71, 0.18);
      font-weight: 800;
    }

    .live-notice[hidden] {
      display: none;
    }

    .shell {
      width: min(1440px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 56px;
    }

    .hero {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 34px;
      padding: 34px;
      color: #f8ffed;
      background:
        linear-gradient(135deg, rgba(23, 76, 60, 0.98), rgba(35, 103, 76, 0.94)),
        radial-gradient(circle at top right, rgba(207, 232, 106, 0.38), transparent 18rem);
      box-shadow: var(--shadow);
    }

    .hero:after {
      content: "";
      position: absolute;
      inset: auto -80px -120px auto;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      background: rgba(207, 232, 106, 0.22);
    }

    .eyebrow {
      margin: 0 0 10px;
      color: rgba(248, 255, 237, 0.72);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      max-width: 880px;
      font-size: clamp(2.2rem, 5vw, 5rem);
      line-height: 0.92;
      letter-spacing: -0.06em;
    }

    .hero-copy {
      margin: 18px 0 0;
      max-width: 900px;
      color: rgba(248, 255, 237, 0.82);
      font-size: 1.05rem;
    }

    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 24px;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      margin-top: 16px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.72);
      border-radius: 22px;
      background: rgba(255, 250, 240, 0.82);
      box-shadow: 0 14px 36px rgba(23, 32, 28, 0.10);
      backdrop-filter: blur(16px);
    }

    .summary-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }

    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nav-links a, .tab-btn, .ghost-btn {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 9px 13px;
      color: var(--forest);
      background: rgba(255, 255, 255, 0.72);
      text-decoration: none;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    .nav-links a:hover, .tab-btn:hover, .ghost-btn:hover {
      transform: translateY(-1px);
      border-color: rgba(45, 122, 89, 0.4);
      background: #fff;
    }

    .tab-btn.active {
      color: #f8ffed;
      background: var(--forest);
      border-color: var(--forest);
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }

    .metric {
      min-height: 92px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.78);
    }

    .metric span {
      display: block;
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: 1.8rem;
      line-height: 1;
    }

    section.panel {
      margin-top: 18px;
      padding: 22px;
      border: 1px solid rgba(255, 255, 255, 0.74);
      border-radius: var(--radius);
      background: var(--panel);
      box-shadow: 0 16px 46px rgba(23, 32, 28, 0.10);
    }

    .section-head {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
    }

    .share-status {
      flex-basis: 100%;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: right;
    }

    h2, h3 {
      margin: 0;
      letter-spacing: -0.03em;
    }

    h2 { font-size: clamp(1.5rem, 3vw, 2.35rem); }
    h3 { font-size: 1.2rem; }

    .muted {
      color: var(--muted);
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .print-summary {
      display: none;
      margin-top: 14px;
      padding: 14px;
      border: 1px dashed rgba(23, 76, 60, 0.34);
      border-radius: 18px;
      color: var(--forest);
      background: rgba(207, 232, 106, 0.16);
    }

    .preset-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .preset-btn {
      border: 1px solid rgba(23, 76, 60, 0.16);
      border-radius: 999px;
      padding: 8px 11px;
      color: var(--forest);
      background: rgba(207, 232, 106, 0.18);
      cursor: pointer;
      font-weight: 800;
      transition: transform 160ms ease, background 160ms ease;
    }

    .preset-btn:hover {
      transform: translateY(-1px);
      background: rgba(207, 232, 106, 0.32);
    }

    .print-cover {
      display: none;
    }

    .interactive-link {
      display: inline-block;
      max-width: 100%;
      padding: 10px 12px;
      border-radius: 14px;
      color: var(--forest);
      background: rgba(255, 255, 255, 0.72);
      word-break: break-all;
    }

    .field {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .field.wide {
      grid-column: span 3;
    }

    .field label {
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .field input, .field select {
      width: 100%;
      min-height: 42px;
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 9px 11px;
      color: var(--ink);
      background: #fffdf8;
      outline: none;
    }

    .field input:focus, .field select:focus {
      border-color: rgba(45, 122, 89, 0.55);
      box-shadow: 0 0 0 3px rgba(45, 122, 89, 0.12);
    }

    .field select[multiple] {
      min-height: 124px;
      padding: 8px;
    }

    .field select[hidden] {
      display: none;
    }

    .brand-picker {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 253, 248, 0.82));
    }

    .brand-picker-head {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .brand-picker-head input {
      min-height: 38px;
    }

    .brand-count-pill {
      border-radius: 999px;
      padding: 7px 10px;
      color: var(--forest);
      background: rgba(207, 232, 106, 0.22);
      font-size: 0.78rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .brand-option-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      max-height: 148px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .brand-option {
      border: 1px solid rgba(23, 76, 60, 0.14);
      border-radius: 999px;
      padding: 7px 10px;
      color: var(--forest);
      background: rgba(255, 255, 255, 0.78);
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 850;
    }

    .brand-option.active {
      color: #f8ffed;
      background: var(--forest);
      border-color: var(--forest);
    }

    .brand-option mark {
      color: inherit;
      background: rgba(207, 232, 106, 0.35);
      border-radius: 6px;
      padding: 0 2px;
    }

    .brand-tools {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .mini-btn {
      border: 1px solid rgba(23, 76, 60, 0.16);
      border-radius: 999px;
      padding: 6px 9px;
      color: var(--forest);
      background: rgba(255, 255, 255, 0.72);
      cursor: pointer;
      font-size: 0.76rem;
      font-weight: 800;
    }

    .selected-brands {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 28px;
      max-height: 86px;
      overflow-y: auto;
    }

    .selected-brands .chip button {
      border: 0;
      padding: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      font-weight: 900;
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .tab-panel {
      display: none;
    }

    .tab-panel.active {
      display: block;
    }

    .brand-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }

    details.brand-card {
      border: 1px solid var(--line);
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 253, 248, 0.88));
      overflow: hidden;
    }

    details.brand-card[open] {
      box-shadow: 0 16px 40px rgba(23, 32, 28, 0.10);
    }

    details.no-brand {
      border-style: dashed;
      background: rgba(255, 255, 255, 0.66);
    }

    summary.brand-summary {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 18px;
      cursor: pointer;
      list-style: none;
    }

    summary.brand-summary::-webkit-details-marker {
      display: none;
    }

    .brand-title {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }

    .brand-title strong {
      font-size: 1.3rem;
      letter-spacing: -0.03em;
    }

    .brand-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .brand-source-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .brand-source-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 30px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      color: var(--forest);
      background: rgba(255, 255, 255, 0.78);
      font-size: 0.78rem;
      font-weight: 900;
      text-decoration: none;
    }

    .brand-source-chip.medical_brasil {
      color: #164777;
      background: rgba(44, 111, 182, 0.14);
      border-color: rgba(44, 111, 182, 0.26);
    }

    .brand-source-chip.principal {
      color: #11653c;
      background: rgba(45, 122, 89, 0.13);
      border-color: rgba(45, 122, 89, 0.24);
    }

    .brand-source-chip.promo {
      color: #8b3d19;
      background: rgba(255, 179, 71, 0.22);
      border-color: rgba(255, 179, 71, 0.34);
    }

    .brand-source-chip.pypharma {
      color: #4c2d86;
      background: rgba(111, 75, 184, 0.14);
      border-color: rgba(111, 75, 184, 0.28);
    }

    .brand-source-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .brand-variants {
      display: grid;
      gap: 8px;
      margin: 10px 0 14px;
      padding: 12px;
      border: 1px dashed rgba(23, 76, 60, 0.22);
      border-radius: 18px;
      background: rgba(207, 232, 106, 0.10);
    }

    .brand-variants strong {
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .brand-kpis {
      display: grid;
      grid-template-columns: repeat(4, auto);
      gap: 8px;
      text-align: right;
    }

    .mini-kpi {
      min-width: 92px;
      padding: 10px;
      border-radius: 16px;
      background: rgba(23, 76, 60, 0.07);
    }

    .mini-kpi span {
      display: block;
      color: var(--muted);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .mini-kpi strong {
      display: block;
      margin-top: 4px;
      font-size: 1rem;
    }

    .brand-body {
      border-top: 1px solid var(--line);
      padding: 0 18px 18px;
    }

    .highlight-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }

    .comparison-grid {
      display: grid;
      gap: 16px;
    }

    .comparison-card {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      background: rgba(255, 255, 255, 0.78);
    }

    .comparison-head {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .table-wrap {
      max-height: 620px;
      overflow-y: auto;
      overflow-x: hidden;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      min-width: 0;
    }

    th, td {
      padding: 11px 10px;
      border-bottom: 1px solid rgba(23, 32, 28, 0.09);
      text-align: left;
      vertical-align: top;
      font-size: 0.84rem;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 2;
      color: #f8ffed;
      background: var(--forest);
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      user-select: none;
    }

    th[data-sort]:after {
      content: "";
      color: rgba(248, 255, 237, 0.58);
      font-size: 0.62rem;
      letter-spacing: 0.04em;
    }

    tbody tr:nth-child(even) {
      background: rgba(23, 76, 60, 0.035);
    }

    tbody tr:hover {
      background: rgba(207, 232, 106, 0.16);
    }

    tr.source-medical_brasil td:first-child {
      border-left: 5px solid var(--blue);
    }

    tr.source-promo td:first-child {
      border-left: 5px solid var(--amber);
    }

    tr.source-principal td:first-child {
      border-left: 5px solid var(--leaf);
    }

    tr.source-pypharma td:first-child {
      border-left: 5px solid var(--violet);
    }

    .product-name {
      max-width: 100%;
      font-weight: 800;
    }

    .product-list {
      display: grid;
      gap: 10px;
    }

    .product-row {
      display: grid;
      grid-template-columns: minmax(260px, 1.4fr) minmax(150px, 0.8fr) minmax(130px, 0.55fr) minmax(230px, 0.95fr);
      gap: 12px;
      align-items: center;
      border: 1px solid var(--line);
      border-left: 6px solid rgba(23, 76, 60, 0.2);
      border-radius: 18px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.78);
    }

    .product-row.source-medical_brasil { border-left-color: var(--blue); }
    .product-row.source-promo { border-left-color: var(--amber); }
    .product-row.source-principal { border-left-color: var(--leaf); }
    .product-row.source-pypharma { border-left-color: var(--violet); }

    .product-row-main {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    .product-row-main strong {
      font-size: 1rem;
      line-height: 1.22;
    }

    .product-row-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      color: var(--muted);
      font-size: 0.82rem;
    }

    .product-row-price {
      display: grid;
      gap: 3px;
      font-weight: 900;
    }

    .product-row-price strong {
      font-size: 1.08rem;
    }

    .product-row-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 25px;
      padding: 4px 9px;
      border-radius: 999px;
      color: var(--forest);
      background: rgba(23, 76, 60, 0.09);
      font-size: 0.78rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .chip.ok { color: #11653c; background: rgba(45, 122, 89, 0.13); }
    .chip.warn { color: #8b3d19; background: rgba(255, 179, 71, 0.22); }
    .chip.bad { color: #9f2424; background: rgba(201, 51, 51, 0.13); }
    .chip.info { color: #245a91; background: rgba(44, 111, 182, 0.13); }
    .chip.dark { color: #f8ffed; background: var(--forest); }

    .source-card-pill {
      display: inline-flex;
      gap: 7px;
      align-items: center;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(23, 76, 60, 0.08);
      font-size: 0.78rem;
      font-weight: 900;
      white-space: nowrap;
    }

    .source-card-pill small {
      color: var(--muted);
      font-weight: 800;
      font-size: 0.68rem;
    }

    .source-card-pill.medical_brasil {
      color: #164777;
      background: rgba(44, 111, 182, 0.14);
      border-color: rgba(44, 111, 182, 0.26);
    }

    .source-card-pill.promo {
      color: #8b3d19;
      background: rgba(255, 179, 71, 0.22);
      border-color: rgba(255, 179, 71, 0.34);
    }

    .source-card-pill.principal {
      color: #11653c;
      background: rgba(45, 122, 89, 0.13);
      border-color: rgba(45, 122, 89, 0.24);
    }

    .source-card-pill.pypharma {
      color: #4c2d86;
      background: rgba(111, 75, 184, 0.14);
      border-color: rgba(111, 75, 184, 0.28);
    }

    .price-note {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 0.74rem;
      font-weight: 800;
    }

    .page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(23, 76, 60, 0.2);
      border-radius: 999px;
      padding: 8px 11px;
      color: #f8ffed;
      background: var(--forest);
      font-size: 0.78rem;
      font-weight: 900;
      text-decoration: none;
      white-space: nowrap;
      text-align: center;
    }

    .empty {
      margin: 0;
      padding: 18px;
      border: 1px dashed var(--line);
      border-radius: 18px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.58);
    }

    .source-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .source-card {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      background: rgba(255, 255, 255, 0.74);
    }

    .source-card p {
      color: var(--muted);
    }

    .source-card a {
      color: var(--forest);
      font-weight: 800;
      word-break: break-word;
    }

    .screens {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    figure {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 22px;
      overflow: hidden;
      background: #fff;
    }

    figure img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption {
      padding: 10px 12px;
      color: var(--muted);
      font-size: 0.88rem;
    }

    @media (max-width: 1120px) {
      .metric-grid { grid-template-columns: repeat(3, 1fr); }
      .filters { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .brand-grid, .source-grid { grid-template-columns: 1fr; }
      .brand-kpis { grid-template-columns: repeat(2, auto); }
      .field.wide { grid-column: span 3; }
      .product-row { grid-template-columns: 1fr 0.75fr; }
      .product-row-actions { justify-content: flex-start; }
    }

    @media (max-width: 720px) {
      .shell { width: min(100% - 20px, 1440px); padding-top: 10px; }
      .hero { padding: 24px; border-radius: 26px; }
      .topbar { position: static; }
      .metric-grid, .filters, .screens { grid-template-columns: 1fr; }
      .field.wide { grid-column: span 1; }
      summary.brand-summary { grid-template-columns: 1fr; }
      .brand-kpis { grid-template-columns: repeat(2, 1fr); text-align: left; }
      .product-row { grid-template-columns: 1fr; }
      .product-row-actions { justify-content: flex-start; }
      section.panel { padding: 16px; }
    }

    @media print {
      @page {
        size: A4 landscape;
        margin: 10mm;
      }

      body {
        background: #fff;
      }

      .shell {
        width: 100%;
        padding: 0;
      }

      .hero, .topbar, section.panel, details.brand-card, .comparison-card, .source-card {
        box-shadow: none;
      }

      .hero {
        padding: 18px;
        border-radius: 18px;
      }

      .hero:after, .no-print, .tabs, .nav-links {
        display: none !important;
      }

      .topbar {
        position: static;
        margin-top: 8px;
      }

      section.panel {
        page-break-inside: avoid;
        break-inside: avoid;
        margin-top: 10px;
        padding: 14px;
      }

      .print-summary, body.printing .print-summary, .print-cover {
        display: block;
      }

      .print-cover {
        page-break-after: always;
        break-after: page;
      }

      .tab-panel {
        display: none !important;
      }

      .tab-panel.active {
        display: block !important;
      }

      .brand-grid, .source-grid, .screens {
        grid-template-columns: 1fr;
      }

      details.brand-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .table-wrap {
        max-height: none;
        overflow: visible;
      }

      table {
        min-width: 0;
        font-size: 8.5pt;
      }

      th, td {
        padding: 6px 7px;
      }

      th {
        position: static;
      }
    }
  </style>
</head>
<body>
  <div class="live-refresh" id="liveRefreshOverlay" hidden>
    <div class="live-card">
      <p class="eyebrow">Atualizacao live</p>
      <h2>Atualizando valores agora</h2>
      <p id="liveRefreshMessage">
        Coletando Respect, Medical Brasil e PYPHARMA com Playwright. Nao sera feito login, CPF, carrinho ou pedido.
      </p>
      <div class="live-progress" aria-hidden="true"><span></span></div>
      <p class="live-note" id="liveRefreshDetail">Isso pode levar alguns minutos quando todas as fontes estao online.</p>
    </div>
  </div>
  <div class="shell">
    <header class="hero" id="topo">
      <p class="eyebrow">Respect Pharma - vendedor Murilo</p>
      <h1>Dashboard por marca, preco e disponibilidade</h1>
      <p class="hero-copy">
        Relatorio gerado pelo scraper Playwright com dados da ultima coleta. Quando aberto pelo servidor local do dashboard,
        recarregar esta pagina atualiza Respect, Medical Brasil e PYPHARMA antes de mostrar os valores.
      </p>
      <div class="hero-meta">
        <span class="chip dark">Coleta: ${generatedAt}</span>
        <span class="chip info">Respect + Medical + PYPHARMA</span>
        <span class="chip info">Dados da ultima coleta</span>
        <span class="chip warn">Live exige npm run dashboard</span>
        <span class="chip warn">Sem login, sem CPF, sem pedido</span>
      </div>
      <div class="live-notice no-print" id="liveModeNotice" hidden>
        Atualizacao automatica exige npm run dashboard. Se abrir por file:// ou Live Server, voce vera somente a ultima coleta embutida.
      </div>
    </header>

    <div class="topbar">
      <div class="summary-nav">
        <div class="nav-links">
          <a href="#marcas">Marcas</a>
          <a href="#comparativos">Comparativos</a>
          <a href="#produtos">Produtos</a>
          <a href="#fontes">Alertas/Fontes</a>
        </div>
        <span class="muted" id="activeCount">Carregando produtos...</span>
      </div>
      <div class="metric-grid" id="metricGrid"></div>
    </div>

    <section class="panel" id="filtros">
      <div class="section-head">
        <div>
          <h2>Filtros</h2>
          <p class="muted">Combine marca, secao, familia, preco e busca livre para limpar a leitura.</p>
        </div>
        <div class="actions no-print">
          <button class="ghost-btn" id="resetFilters" type="button">Limpar filtros</button>
          <button class="ghost-btn" id="copyFilterLink" type="button">Copiar link dos filtros</button>
          <button class="ghost-btn" id="printPdf" type="button">Exportar PDF filtrado</button>
          <span class="share-status" id="shareStatus"></span>
        </div>
      </div>
      <div class="filters">
        <div class="field">
          <label for="searchFilter">Busca</label>
          <input id="searchFilter" type="search" placeholder="Ex: Enantato Cooper 250mg">
        </div>
        <div class="field wide">
          <label for="brandFilter">Marcas</label>
          <select id="brandFilter" multiple hidden aria-hidden="true"></select>
          <div class="brand-picker" aria-describedby="brandHelp">
            <div class="brand-picker-head">
              <input id="brandSearch" type="search" placeholder="Buscar marca: Landerlan, Cooper, Alpha">
              <span class="brand-count-pill" id="brandPickerCount">0 marcas</span>
            </div>
            <div class="brand-option-list" id="brandOptionList"></div>
          </div>
          <div class="brand-tools">
            <button class="mini-btn" id="clearBrands" type="button">Limpar marcas</button>
            <button class="mini-btn" id="selectPremiumBrands" type="button">Selecionar premium</button>
            <button class="mini-btn" id="selectVisibleBrands" type="button">Selecionar marcas visiveis</button>
          </div>
          <small class="muted" id="brandHelp">Clique nas marcas para selecionar varias. Use a busca para filtrar a lista.</small>
          <div class="selected-brands" id="selectedBrandChips"></div>
        </div>
        <div class="field">
          <label for="categoryFilter">Categoria</label>
          <select id="categoryFilter"></select>
        </div>
        <div class="field">
          <label for="sectionFilter">Secao</label>
          <select id="sectionFilter"></select>
        </div>
        <div class="field">
          <label for="statusFilter">Status</label>
          <select id="statusFilter"></select>
        </div>
        <div class="field">
          <label for="familyFilter">Produto-alvo</label>
          <select id="familyFilter"></select>
        </div>
        <div class="field">
          <label for="sourceFilter">Origem</label>
          <select id="sourceFilter"></select>
        </div>
        <div class="field">
          <label for="minPrice">Preco min</label>
          <input id="minPrice" type="number" min="0" step="1" placeholder="0">
        </div>
        <div class="field">
          <label for="maxPrice">Preco max</label>
          <input id="maxPrice" type="number" min="0" step="1" placeholder="999999">
        </div>
        <div class="field">
          <label for="sortFilter">Ordenar por</label>
          <select id="sortFilter">
            <option value="ranking">Ranking atual</option>
            <option value="priceAsc">Menor preco</option>
            <option value="priceDesc">Maior preco</option>
            <option value="costAsc">Menor custo/mg</option>
          </select>
        </div>
      </div>
      <div class="preset-row no-print" aria-label="Filtros rapidos">
        <button class="preset-btn" type="button" data-preset data-clear="true" data-status="disponivel">Disponiveis</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-source="promo">Promocoes</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Enantato" data-status="disponivel">Enantato disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Masteron" data-status="disponivel">Masteron disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Retatrutida" data-status="disponivel">Retatrutida disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Tirzepatida" data-status="disponivel">Tirzepatida disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Clenbuterol" data-status="disponivel">Clenbuterol disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Proviron" data-status="disponivel">Proviron disp.</button>
        <button class="preset-btn" type="button" data-preset data-clear="true" data-family="Durateston" data-status="disponivel">Durateston disp.</button>
      </div>
      <div class="print-summary" id="printSummary"></div>
      <div class="tabs" role="tablist" aria-label="Abas do relatorio">
        <button class="tab-btn active" type="button" data-tab="brands">Visao por Marca</button>
        <button class="tab-btn" type="button" data-tab="comparisons">Comparativos</button>
        <button class="tab-btn" type="button" data-tab="products">Todos os Produtos</button>
        <button class="tab-btn" type="button" data-tab="alerts">Alertas/Fontes</button>
      </div>
    </section>

    <section class="panel print-cover" id="printCover">
      <h2>Este PDF e um snapshot filtrado</h2>
      <p class="muted">
        PDF nao e o melhor formato para filtros interativos. Para mudar marca, familia, status ou preco,
        abra a versao HTML do dashboard.
      </p>
      <p><strong>Link da versao interativa com estes filtros:</strong></p>
      <p><a class="interactive-link" id="printInteractiveLink" href="#">Dashboard interativo</a></p>
      <div class="print-summary" id="printCoverSummary"></div>
    </section>

    <main>
      <section class="panel tab-panel active" id="tab-brands">
        <div class="section-head" id="marcas">
          <div>
            <h2>Visao por Marca</h2>
            <p class="muted">Cards expansivos com secao, categoria, status, preco, custo/mg e origem.</p>
          </div>
          <span class="chip info" id="brandCountChip"></span>
        </div>
        <div class="brand-grid" id="brandGrid"></div>
      </section>

      <section class="panel tab-panel" id="tab-comparisons">
        <div class="section-head" id="comparativos">
          <div>
            <h2>Comparativos rapidos</h2>
            <p class="muted">Melhores por familia, ordenados por nota documental da marca, custo/mg e preco.</p>
          </div>
        </div>
        <div class="comparison-grid" id="comparisonGrid"></div>
      </section>

      <section class="panel tab-panel" id="tab-products">
        <div class="section-head" id="produtos">
          <div>
            <h2>Todos os Produtos</h2>
            <p class="muted">Tabela unica filtravel e ordenavel.</p>
          </div>
          <span class="chip dark" id="productCountChip"></span>
        </div>
        <div id="productsTable"></div>
      </section>

      <section class="panel tab-panel" id="tab-alerts">
        <div class="section-head" id="fontes">
          <div>
            <h2>Alertas e fontes</h2>
            <p class="muted">Historico documental das marcas pesquisadas e screenshots da coleta.</p>
          </div>
        </div>
        <div id="sourceCards" class="source-grid"></div>
        <section class="panel" style="box-shadow:none;margin-top:16px">
          <div class="section-head">
            <div>
              <h3>Screenshots</h3>
              <p class="muted">Capturas salvas pelo Playwright durante a coleta.</p>
            </div>
          </div>
          <div class="screens">
            <figure>
              <img src="../screenshots/promo_page.png" alt="Screenshot da pagina promo">
              <figcaption>Pagina promo</figcaption>
            </figure>
            <figure>
              <img src="../screenshots/main_page.png" alt="Screenshot da pagina principal">
              <figcaption>Pagina principal</figcaption>
            </figure>
            <figure>
              <img src="../screenshots/pypharma_page.png" alt="Screenshot da pagina PYPHARMA">
              <figcaption>PYPHARMA</figcaption>
            </figure>
          </div>
        </section>
      </section>
    </main>
  </div>

  <script>
    const DASHBOARD = ${dashboardJson};

    const state = {
      search: '',
      brands: [],
      category: '',
      section: '',
      status: '',
      family: '',
      source: '',
      minPrice: '',
      maxPrice: '',
      sortMode: 'ranking',
    };

    const targetFamilies = ['Enantato', 'Masteron', 'Retatrutida', 'Tirzepatida', 'Clenbuterol', 'Proviron', 'Durateston'];
    const premiumBrandTargets = ['alpha', 'cooper', 'eminence', 'canada', 'zphc', 'zphcd', 'spectrum', 'landergold', 'landerlan gold', 'landerlan', 'muscle', 'bratva'];
    const $ = (id) => document.getElementById(id);
    const filterLabels = {
      search: 'Busca',
      brands: 'Marcas',
      category: 'Categoria',
      section: 'Secao',
      status: 'Status',
      family: 'Produto-alvo',
      source: 'Origem',
      minPrice: 'Preco min',
      maxPrice: 'Preco max',
      sortMode: 'Ordenar por',
    };
    const filterElements = {
      search: 'searchFilter',
      brands: 'brandFilter',
      category: 'categoryFilter',
      section: 'sectionFilter',
      status: 'statusFilter',
      family: 'familyFilter',
      source: 'sourceFilter',
      minPrice: 'minPrice',
      maxPrice: 'maxPrice',
      sortMode: 'sortFilter',
    };
    const filterQueryKeys = Object.keys(filterElements);
    const tabAliases = {
      marcas: 'brands',
      marca: 'brands',
      brands: 'brands',
      comparativos: 'comparisons',
      comparisons: 'comparisons',
      produtos: 'products',
      products: 'products',
      alertas: 'alerts',
      fontes: 'alerts',
      alerts: 'alerts',
    };
    let printOpenState = null;
    let brandSearchTerm = '';

    function normalize(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function escapeHtmlClient(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function fmtMoney(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function fmtNumber(value, digits = 4) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '';
      const maximumFractionDigits = Math.max(0, digits);
      const minimumFractionDigits = Math.min(2, maximumFractionDigits);
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits, maximumFractionDigits }).format(value);
    }

    function chip(label, type = '') {
      if (!label) return '';
      return '<span class="chip ' + type + '">' + escapeHtmlClient(label) + '</span>';
    }

    function optionList(select, values, label) {
      select.innerHTML = '<option value="">' + label + '</option>' +
        values.map((value) => '<option value="' + escapeHtmlClient(value) + '">' + escapeHtmlClient(value) + '</option>').join('');
    }

    function multiOptionList(select, values) {
      select.innerHTML = values.map((value) => '<option value="' + escapeHtmlClient(value) + '">' + escapeHtmlClient(value) + '</option>').join('');
    }

    function getFilterElementValue(element) {
      if (element?.multiple) {
        return Array.from(element.selectedOptions).map((option) => option.value).filter(Boolean);
      }

      return element?.value || '';
    }

    function setFilterElementValue(element, value) {
      if (!element) return;

      if (element.multiple) {
        const values = new Set(Array.isArray(value) ? value : String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
        Array.from(element.options).forEach((option) => {
          option.selected = values.has(option.value);
        });
        return;
      }

      element.value = String(value ?? '');
    }

    function getPremiumBrands() {
      const options = Array.from($('brandFilter')?.options || []);
      return options
        .map((option) => option.value)
        .filter((brand) => {
          const normalizedBrand = normalize(brand);
          return premiumBrandTargets.some((target) => normalizedBrand.includes(normalize(target)));
        })
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }

    function renderBrandOptionList() {
      const list = $('brandOptionList');
      const count = $('brandPickerCount');
      const select = $('brandFilter');
      if (!list || !select) return;

      const selected = new Set(getSelectedBrands());
      const query = normalize(brandSearchTerm);
      const brands = Array.from(select.options)
        .map((option) => option.value)
        .filter(Boolean)
        .filter((brand) => !query || normalize(brand).includes(query))
        .sort((a, b) => {
          const selectedDiff = Number(selected.has(b)) - Number(selected.has(a));
          return selectedDiff || a.localeCompare(b, 'pt-BR');
        });

      list.innerHTML = brands.length
        ? brands
            .map((brand) => {
              const active = selected.has(brand);
              return '<button class="brand-option ' + (active ? 'active' : '') + '" type="button" data-brand-option="' +
                escapeHtmlClient(brand) +
                '" aria-pressed="' +
                String(active) +
                '">' +
                escapeHtmlClient(brand) +
                '</button>';
            })
            .join('')
        : '<span class="muted">Nenhuma marca encontrada.</span>';

      if (count) count.textContent = selected.size ? selected.size + ' selecionadas' : brands.length + ' marcas';
    }

    function initFilters() {
      const options = DASHBOARD.options || {};
      multiOptionList($('brandFilter'), options.brands || []);
      optionList($('categoryFilter'), options.categories || [], 'Todas');
      optionList($('sectionFilter'), options.sections || [], 'Todas');
      optionList($('statusFilter'), options.statuses || [], 'Todos');
      optionList($('familyFilter'), targetFamilies, 'Todos');
      optionList($('sourceFilter'), options.sources || [], 'Todas');
      renderBrandOptionList();

      $('brandSearch').addEventListener('input', (event) => {
        brandSearchTerm = event.target.value || '';
        renderBrandOptionList();
      });

      $('brandOptionList').addEventListener('click', (event) => {
        const button = event.target.closest('[data-brand-option]');
        if (!button) return;
        const brand = button.dataset.brandOption;
        const selected = new Set(getSelectedBrands());
        if (selected.has(brand)) {
          selected.delete(brand);
        } else {
          selected.add(brand);
        }
        state.brands = Array.from(selected).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setFilterElementValue($('brandFilter'), state.brands);
        renderSelectedBrands();
        renderBrandOptionList();
        renderAll();
        updateShareStatus('');
      });

      [
        ['searchFilter', 'search'],
        ['brandFilter', 'brands'],
        ['categoryFilter', 'category'],
        ['sectionFilter', 'section'],
        ['statusFilter', 'status'],
        ['familyFilter', 'family'],
        ['sourceFilter', 'source'],
        ['minPrice', 'minPrice'],
        ['maxPrice', 'maxPrice'],
        ['sortFilter', 'sortMode'],
      ].forEach(([id, key]) => {
        $(id).addEventListener('input', (event) => {
          state[key] = getFilterElementValue(event.target);
          renderSelectedBrands();
          renderBrandOptionList();
          renderAll();
          updateShareStatus('');
        });
        $(id).addEventListener('change', (event) => {
          state[key] = getFilterElementValue(event.target);
          renderSelectedBrands();
          renderBrandOptionList();
          renderAll();
          updateShareStatus('');
        });
      });

      $('resetFilters').addEventListener('click', () => {
        applyFilterState({}, { clear: true });
        updateShareStatus('Filtros limpos.');
      });

      $('clearBrands').addEventListener('click', () => {
        state.brands = [];
        setFilterElementValue($('brandFilter'), []);
        renderSelectedBrands();
        renderBrandOptionList();
        renderAll();
        updateShareStatus('Marcas limpas.');
      });

      $('selectPremiumBrands').addEventListener('click', () => {
        const premiumBrands = getPremiumBrands();
        state.brands = premiumBrands;
        setFilterElementValue($('brandFilter'), premiumBrands);
        renderSelectedBrands();
        renderBrandOptionList();
        renderAll();
        updateShareStatus(premiumBrands.length + ' marcas premium selecionadas.');
      });

      $('selectVisibleBrands').addEventListener('click', () => {
        const visibleBrands = Array.from(
          new Set(getFilteredProducts({ ignoreBrands: true }).map((product) => product.brandFamily || 'Sem marca')),
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        state.brands = visibleBrands;
        setFilterElementValue($('brandFilter'), visibleBrands);
        renderSelectedBrands();
        renderBrandOptionList();
        renderAll();
        updateShareStatus(visibleBrands.length + ' marcas visiveis selecionadas.');
      });

      $('selectedBrandChips').addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-brand]');
        if (!button) return;
        state.brands = getSelectedBrands().filter((brand) => brand !== button.dataset.removeBrand);
        setFilterElementValue($('brandFilter'), state.brands);
        renderSelectedBrands();
        renderBrandOptionList();
        renderAll();
      });

      $('copyFilterLink').addEventListener('click', copyFilterLink);

      $('printPdf').addEventListener('click', () => {
        preparePrint();
        window.setTimeout(() => window.print(), 50);
      });

      document.querySelectorAll('[data-preset]').forEach((button) => {
        button.addEventListener('click', () => {
          const filters = {};
          for (const key of filterQueryKeys) {
            const attr = 'data-' + key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
            if (button.hasAttribute(attr)) {
              filters[key] = button.getAttribute(attr);
            }
          }
          applyFilterState(filters, { clear: button.dataset.clear === 'true' });
          updateShareStatus('Preset aplicado. Use "Copiar link" para enviar essa visao.');
        });
      });

      $('brandGrid').addEventListener('click', (event) => {
        const button = event.target.closest('[data-brand-source]');
        if (!button) return;
        event.preventDefault();
        applyFilterState(
          {
            brands: [button.dataset.brandName],
            source: button.dataset.brandSource,
          },
          { clear: true },
        );
        updateShareStatus('Filtro aplicado: ' + button.dataset.brandName + ' em ' + sourceLabel(button.dataset.brandSource) + '.');
      });
    }

    function applyFilterState(filters = {}, options = {}) {
      const normalizedFilters = { ...filters };
      if ('brand' in normalizedFilters && !('brands' in normalizedFilters)) {
        normalizedFilters.brands = normalizedFilters.brand;
      }
      if ('sort' in normalizedFilters && !('sortMode' in normalizedFilters)) {
        normalizedFilters.sortMode = normalizedFilters.sort;
      }

      if (options.clear) {
        Object.keys(state).forEach((key) => {
          state[key] = key === 'brands' ? [] : key === 'sortMode' ? 'ranking' : '';
        });
        Object.entries(filterElements).forEach(([key, id]) => {
          const element = $(id);
          setFilterElementValue(element, state[key]);
        });
      }

      Object.entries(filterElements).forEach(([key, id]) => {
        if (!(key in normalizedFilters)) return;
        const element = $(id);
        if (!element) return;
        const rawValue = normalizedFilters[key];
        const value = element.multiple
          ? (Array.isArray(rawValue) ? rawValue : String(rawValue ?? '').split(',').map((item) => item.trim()).filter(Boolean))
          : String(rawValue ?? '');

        if (element.tagName === 'SELECT') {
          const optionValues = new Set(Array.from(element.options).map((option) => option.value));
          if (element.multiple) {
            const validValues = value.filter((item) => optionValues.has(item));
            if (validValues.length !== value.length) {
              console.warn('Algumas marcas foram ignoradas por nao existirem no relatorio.');
            }
            setFilterElementValue(element, validValues);
            state[key] = validValues;
            return;
          }

          if (value && !optionValues.has(value)) {
            console.warn('Filtro ignorado sem opcao correspondente: ' + key + '=' + value);
            return;
          }
        }

        setFilterElementValue(element, value);
        state[key] = getFilterElementValue(element);
      });

      renderSelectedBrands();
      renderBrandOptionList();

      if (options.render !== false) {
        renderAll();
      }
    }

    function getSelectedBrands() {
      return Array.isArray(state.brands) ? state.brands.filter(Boolean) : String(state.brands || '').split(',').map((brand) => brand.trim()).filter(Boolean);
    }

    function renderSelectedBrands() {
      const selected = getSelectedBrands();
      const container = $('selectedBrandChips');
      if (!container) return;

      if (!selected.length) {
        container.innerHTML = '<span class="muted">Todas as marcas.</span>';
        return;
      }

      const visibleSelected = selected.slice(0, 10);
      const overflow = selected.length - visibleSelected.length;
      container.innerHTML = visibleSelected
        .map(
          (brand) =>
            '<span class="chip dark">' +
            escapeHtmlClient(brand) +
            ' <button type="button" aria-label="Remover ' +
            escapeHtmlClient(brand) +
            '" data-remove-brand="' +
            escapeHtmlClient(brand) +
            '">x</button></span>',
        )
        .join('') +
        (overflow > 0 ? chip('+' + overflow + ' marcas', 'info') : '');
    }

    function buildFilterUrl() {
      const url = new URL(window.location.href);
      for (const key of filterQueryKeys) {
        url.searchParams.delete(key);
      }
      url.searchParams.delete('brand');
      url.searchParams.delete('brands');
      url.searchParams.delete('sort');
      url.searchParams.delete('tab');

      for (const key of filterQueryKeys) {
        if (key === 'brands') {
          getSelectedBrands().forEach((brand) => url.searchParams.append('brand', brand));
          continue;
        }

        if (key === 'sortMode') {
          if (state.sortMode && state.sortMode !== 'ranking') {
            url.searchParams.set('sort', state.sortMode);
          }
          continue;
        }

        const value = String(state[key] || '').trim();
        if (value) url.searchParams.set(key, value);
      }

      const activeTab = document.querySelector('[data-tab].active')?.dataset.tab || 'brands';
      if (activeTab !== 'brands') url.searchParams.set('tab', activeTab);
      url.hash = '';
      return url.toString();
    }

    async function copyFilterLink() {
      const link = buildFilterUrl();
      try {
        await navigator.clipboard.writeText(link);
        updateShareStatus('Link copiado com os filtros atuais.');
      } catch {
        updateShareStatus('Link pronto: ' + link);
      }
    }

    function updateShareStatus(message) {
      const element = $('shareStatus');
      if (!element) return;
      element.textContent = message || '';
    }

    function applyQueryFilters() {
      const params = new URLSearchParams(window.location.search);
      const filters = {};

      for (const key of filterQueryKeys) {
        if (key === 'brands' || key === 'sortMode') continue;
        if (params.has(key)) filters[key] = params.get(key);
      }

      const repeatedBrands = params.getAll('brand').filter(Boolean);
      if (repeatedBrands.length) {
        filters.brands = repeatedBrands;
      } else if (params.has('brands')) {
        filters.brands = params.get('brands');
      }

      if (params.has('sort')) {
        filters.sortMode = params.get('sort');
      } else if (params.has('sortMode')) {
        filters.sortMode = params.get('sortMode');
      }

      applyFilterState(filters, { render: false });
      const tab = tabAliases[String(params.get('tab') || '').toLowerCase()];
      if (tab) activateTab(tab, { render: false });
    }

    function productMatches(product, options = {}) {
      const price = product.price;
      const min = Number(state.minPrice);
      const max = Number(state.maxPrice);
      const selectedBrands = getSelectedBrands();
      const haystack = product.searchText || normalize([
        product.productName,
        product.brandFamily,
        product.brandCanonical,
        product.brandOriginal,
        product.brandLine,
        product.brandSection,
        product.category,
        product.family,
        product.dosage,
        product.quantity,
        product.status,
      ].join(' '));

      if (state.search && !haystack.includes(normalize(state.search))) return false;
      if (!options.ignoreBrands && selectedBrands.length && !selectedBrands.includes(product.brandFamily || 'Sem marca')) return false;
      if (state.category && product.category !== state.category) return false;
      if (state.section && product.brandSection !== state.section) return false;
      if (state.status && product.status !== state.status) return false;
      if (state.family && product.family !== state.family) return false;
      if (state.source && product.sourceType !== state.source) return false;
      if (state.minPrice && (typeof price !== 'number' || price < min)) return false;
      if (state.maxPrice && (typeof price !== 'number' || price > max)) return false;
      return true;
    }

    function getFilteredProducts(options = {}) {
      return (DASHBOARD.products || []).filter((product) => productMatches(product, options));
    }

    function compareValue(a, b) {
      const aBrand = (a.brandFamily || a.brandBase) === 'Sem marca' ? -1 : (a.brandScore || 0);
      const bBrand = (b.brandFamily || b.brandBase) === 'Sem marca' ? -1 : (b.brandScore || 0);
      if (bBrand !== aBrand) return bBrand - aBrand;

      const aCost = typeof a.costPerMg === 'number' ? a.costPerMg : Number.POSITIVE_INFINITY;
      const bCost = typeof b.costPerMg === 'number' ? b.costPerMg : Number.POSITIVE_INFINITY;
      if (aCost !== bCost) return aCost - bCost;

      const aPrice = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
      const bPrice = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
      if (aPrice !== bPrice) return aPrice - bPrice;

      return String(a.productName).localeCompare(String(b.productName), 'pt-BR');
    }

    function compareNullableNumber(a, b, direction = 'asc') {
      const aIsNumber = typeof a === 'number' && Number.isFinite(a);
      const bIsNumber = typeof b === 'number' && Number.isFinite(b);
      if (!aIsNumber && !bIsNumber) return 0;
      if (!aIsNumber) return 1;
      if (!bIsNumber) return -1;
      return direction === 'desc' ? b - a : a - b;
    }

    function getProductComparator() {
      if (state.sortMode === 'priceAsc') {
        return (a, b) => compareNullableNumber(a.price, b.price, 'asc') || compareValue(a, b);
      }

      if (state.sortMode === 'priceDesc') {
        return (a, b) => compareNullableNumber(a.price, b.price, 'desc') || compareValue(a, b);
      }

      if (state.sortMode === 'costAsc') {
        return (a, b) => compareNullableNumber(a.costPerMg, b.costPerMg, 'asc') || compareValue(a, b);
      }

      return compareValue;
    }

    function sortProducts(products) {
      return products.slice().sort(getProductComparator());
    }

    function getSortLabel() {
      if (state.sortMode === 'priceAsc') return 'menor preco';
      if (state.sortMode === 'priceDesc') return 'maior preco';
      if (state.sortMode === 'costAsc') return 'menor custo/mg';
      return 'ranking atual';
    }

    function sortBrands(brands) {
      return brands.slice().sort((a, b) => {
        if (state.sortMode === 'priceAsc') {
          return compareNullableNumber(a.minPrice, b.minPrice, 'asc') || compareBrandRanking(a, b);
        }

        if (state.sortMode === 'priceDesc') {
          return compareNullableNumber(a.maxPrice, b.maxPrice, 'desc') || compareBrandRanking(a, b);
        }

        if (state.sortMode === 'costAsc') {
          return compareNullableNumber(a.bestCost, b.bestCost, 'asc') || compareBrandRanking(a, b);
        }

        return compareBrandRanking(a, b);
      });
    }

    function compareBrandRanking(a, b) {
      if (a.brand === 'Sem marca') return 1;
      if (b.brand === 'Sem marca') return -1;
      if (b.score !== a.score) return b.score - a.score;
      return b.total - a.total || a.brand.localeCompare(b.brand, 'pt-BR');
    }

    function groupBy(items, keyFn) {
      return items.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key).push(item);
        return acc;
      }, new Map());
    }

    function buildBrandStats(products) {
      const grouped = groupBy(products, (product) => product.brandFamily || 'Sem marca');
      return Array.from(grouped.entries()).map(([brand, items]) => {
        const prices = items.map((item) => item.price).filter((value) => typeof value === 'number');
        const costs = items.map((item) => item.costPerMg).filter((value) => typeof value === 'number');
        const monitored = Array.from(new Set(items.map((item) => item.family).filter(Boolean)));
        const score = items.find((item) => item.brandScore)?.brandScore || 0;
        const sourceGroups = Array.from(groupBy(items, (item) => item.sourceType || 'unknown').entries())
          .map(([sourceType, sourceProducts]) => ({
            sourceType,
            label: sourceLabel(sourceType),
            count: sourceProducts.length,
            urls: Array.from(new Set(sourceProducts.map((item) => item.sourceUrl).filter(Boolean))),
          }))
          .sort((a, b) => sourcePriority(a.sourceType) - sourcePriority(b.sourceType) || b.count - a.count);
        return {
          brand,
          products: sortProducts(items),
          total: items.length,
          available: items.filter((item) => item.status === 'disponivel').length,
          unavailable: items.filter((item) => item.status !== 'disponivel').length,
          promo: items.filter((item) => item.sourceType === 'promo').length,
          principal: items.filter((item) => item.sourceType === 'principal').length,
          pypharma: items.filter((item) => item.sourceType === 'pypharma').length,
          minPrice: prices.length ? Math.min(...prices) : null,
          maxPrice: prices.length ? Math.max(...prices) : null,
          bestCost: costs.length ? Math.min(...costs) : null,
          score,
          monitored,
          sources: sourceGroups,
          originals: Array.from(new Set(items.map((item) => item.brandOriginal).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
          canonicalNames: Array.from(new Set(items.map((item) => item.brandCanonical).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
          lines: Array.from(new Set(items.map((item) => item.brandLine).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
          variantsBySource: Array.from(groupBy(items, (item) => item.sourceType || 'unknown').entries())
            .map(([sourceType, sourceProducts]) => ({
              sourceType,
              label: sourceLabel(sourceType),
              originals: Array.from(new Set(sourceProducts.map((item) => item.brandOriginal).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
            }))
            .filter((variant) => variant.originals.length),
        };
      });
    }

    function renderMetrics(products) {
      const brands = new Set(products.map((product) => product.brandFamily || 'Sem marca'));
      const metrics = [
        ['Produtos filtrados', products.length],
        ['Marcas', brands.size],
        ['Disponiveis', products.filter((product) => product.status === 'disponivel').length],
        ['Indisponiveis', products.filter((product) => product.status !== 'disponivel').length],
        ['Respect Principal', products.filter((product) => product.sourceType === 'principal').length],
        ['Respect Promo', products.filter((product) => product.sourceType === 'promo').length],
        ['Medical Brasil', products.filter((product) => product.sourceType === 'medical_brasil').length],
        ['PYPHARMA', products.filter((product) => product.sourceType === 'pypharma').length],
        ['Monitorados', products.filter((product) => product.family).length],
      ];
      $('metricGrid').innerHTML = metrics.map(([label, value]) => '<div class="metric"><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
      $('activeCount').textContent = products.length + ' de ' + (DASHBOARD.metrics?.totalProducts || 0) + ' produtos visiveis';
    }

    function renderPrintSummary(products) {
      const activeFilters = Object.entries(state)
        .filter(([key, value]) => {
          if (key === 'brands') return getSelectedBrands().length > 0;
          if (key === 'sortMode') return value && value !== 'ranking';
          return String(value || '').trim();
        })
        .map(([key, value]) => {
          if (key === 'brands') return chip(filterLabels[key] + ': ' + getSelectedBrands().join(', '), 'info');
          if (key === 'sortMode') return chip(filterLabels[key] + ': ' + getSortLabel(), 'info');
          return chip(filterLabels[key] + ': ' + value, 'info');
        })
        .join('');
      const activeTab = document.querySelector('[data-tab].active')?.textContent.trim() || 'Visao por Marca';
      const brands = new Set(products.map((product) => product.brandFamily || 'Sem marca')).size;
      const summaryHtml =
        '<strong>PDF filtrado</strong> ' +
        chip(products.length + ' produtos') +
        chip(brands + ' marcas') +
        chip('Aba: ' + activeTab, 'dark') +
        (activeFilters || chip('Sem filtros aplicados', 'info'));
      $('printSummary').innerHTML = summaryHtml;

      const coverSummary = $('printCoverSummary');
      if (coverSummary) coverSummary.innerHTML = summaryHtml;

      const link = buildFilterUrl();
      const linkElement = $('printInteractiveLink');
      if (linkElement) {
        linkElement.href = link;
        linkElement.textContent = link;
      }
    }

    function preparePrint() {
      const products = getFilteredProducts();
      renderPrintSummary(products);

      if (!printOpenState) {
        printOpenState = Array.from(document.querySelectorAll('#brandGrid details.brand-card')).map((details) => ({
          details,
          open: details.open,
        }));
      }

      document.querySelectorAll('#brandGrid details.brand-card').forEach((details) => {
        details.open = true;
      });
      document.body.classList.add('printing');
    }

    function restorePrint() {
      if (printOpenState) {
        printOpenState.forEach(({ details, open }) => {
          details.open = open;
        });
      }
      printOpenState = null;
      document.body.classList.remove('printing');
    }

    function statusChip(product) {
      if (product.status === 'disponivel') return chip('disponivel', 'ok');
      if (product.status === 'esgotado') return chip('esgotado', 'bad');
      return chip(product.status || 'indisponivel', 'warn');
    }

    function sourceChip(product) {
      const sourceType = product.sourceType || '';
      return '<span class="source-card-pill ' + escapeHtmlClient(sourceType) + '"><strong>' +
        escapeHtmlClient(sourceLabel(sourceType)) +
        '</strong><small>' + escapeHtmlClient(sourceType) + '</small></span>';
    }

    function sourceLabel(sourceType) {
      if (sourceType === 'medical_brasil') return 'Medical Brasil';
      if (sourceType === 'pypharma') return 'PYPHARMA';
      if (sourceType === 'promo') return 'Respect Promo';
      if (sourceType === 'principal') return 'Respect Principal';
      return sourceType || 'Fonte';
    }

    function sourcePriority(sourceType) {
      if (sourceType === 'principal') return 1;
      if (sourceType === 'promo') return 2;
      if (sourceType === 'medical_brasil') return 3;
      if (sourceType === 'pypharma') return 4;
      return 9;
    }

    function pageButton(product) {
      if (!product.sourceUrl) return '';
      return '<a class="page-btn" href="' + escapeHtmlClient(product.sourceUrl) + '" target="_blank" rel="noreferrer">Ver pagina</a>';
    }

    function priceCell(product) {
      const price = product.currentPrice || fmtMoney(product.price);
      const uninsured = product.uninsuredPriceText
        ? '<small class="price-note">sem seguro: ' + escapeHtmlClient(product.uninsuredPriceText) + '</small>'
        : '';
      return '<strong>' + escapeHtmlClient(price || '') + '</strong>' + uninsured;
    }

    function renderBrandSourceStrip(brand) {
      if (!brand.sources?.length) return '';
      const multiSite = brand.sources.length > 1 ? chip('Aparece em ' + brand.sources.length + ' sites', 'dark') : '';
      const chips = brand.sources
        .map((source) => {
          const href = source.urls[0] || '';
          const inner = escapeHtmlClient(source.label + ': ' + source.count);
          if (href) {
            return '<a class="brand-source-chip ' + escapeHtmlClient(source.sourceType) + '" href="' + escapeHtmlClient(href) + '" target="_blank" rel="noreferrer">' + inner + '</a>';
          }
          return '<span class="brand-source-chip ' + escapeHtmlClient(source.sourceType) + '">' + inner + '</span>';
        })
        .join('');
      return '<div class="brand-source-strip">' + multiSite + chips + '</div>';
    }

    function renderBrandSourceActions(brand) {
      if (!brand.sources?.length) return '';
      const actions = brand.sources
        .map(
          (source) =>
            '<button class="mini-btn" type="button" data-brand-source="' +
            escapeHtmlClient(source.sourceType) +
            '" data-brand-name="' +
            escapeHtmlClient(brand.brand) +
            '">Ver ' +
            escapeHtmlClient(source.label.replace('Respect ', '')) +
            '</button>',
        )
        .join('');
      return '<div class="brand-source-actions">' + actions + '</div>';
    }

    function renderBrandVariants(brand) {
      const sourceVariants = (brand.variantsBySource || [])
        .filter((variant) => variant.originals?.length)
        .map((variant) => chip(sourceLabel(variant.sourceType) + ': ' + variant.originals.join(', '), 'info'))
        .join('');
      const lineVariants = (brand.lines || [])
        .map((line) => chip('Linha: ' + line, 'dark'))
        .join('');

      if (!sourceVariants && !lineVariants) return '';

      return '<div class="brand-variants">' +
        '<strong>Variacoes encontradas</strong>' +
        (sourceVariants ? '<div class="brand-source-strip">' + sourceVariants + '</div>' : '') +
        (lineVariants ? '<div class="highlight-strip">' + lineVariants + '</div>' : '') +
      '</div>';
    }

    function productList(products, id) {
      if (!products.length) return '<p class="empty">Nenhum produto encontrado com os filtros atuais.</p>';

      const rows = products.map((product) => {
        const lineLabel = product.brandLine || product.brandCanonical || product.brandFamily || '';
        const originalLabel =
          product.brandOriginal && product.brandOriginal !== lineLabel && product.brandOriginal !== product.brandFamily
            ? 'Original: ' + product.brandOriginal
            : '';
        const meta = [
          lineLabel ? 'Linha: ' + lineLabel : '',
          originalLabel,
          product.brandSection ? 'Secao: ' + product.brandSection : '',
          product.category ? 'Categoria: ' + product.category : '',
          [product.dosage, product.quantity].filter(Boolean).join(' / '),
        ].filter(Boolean);

        return '<article class="product-row source-' + escapeHtmlClient(product.sourceType || 'unknown') + '">' +
          '<div class="product-row-main">' +
            '<strong>' + escapeHtmlClient(product.productName || '') + '</strong>' +
            '<div class="product-row-meta">' + meta.map((item) => chip(item, 'info')).join('') + '</div>' +
            (product.family ? '<div>' + chip(product.family, 'dark') + '</div>' : '') +
          '</div>' +
          '<div class="product-row-price">' +
            priceCell(product) +
            (product.costPerMg ? '<small class="price-note">custo/mg: ' + escapeHtmlClient(fmtNumber(product.costPerMg, 6)) + '</small>' : '') +
          '</div>' +
          '<div>' + statusChip(product) + (product.hasDiscount ? ' ' + chip('com desconto', 'warn') : '') + '</div>' +
          '<div class="product-row-actions">' + sourceChip(product) + pageButton(product) + '</div>' +
        '</article>';
      }).join('');

      return '<div class="product-list" id="' + escapeHtmlClient(id) + '">' + rows + '</div>';
    }

    function productTable(products, id, includeBrand = true) {
      if (!products.length) return '<p class="empty">Nenhum produto encontrado com os filtros atuais.</p>';

      const headers = [
        ['Produto', 'text'],
        includeBrand ? ['Marca', 'text'] : null,
        ['Secao', 'text'],
        ['Categoria', 'text'],
        ['Preco', 'number'],
        ['R$/mg', 'number'],
        ['Nota', 'number'],
        ['Status', 'text'],
        ['Origem', 'text'],
        ['Link', 'text'],
        ['Dose', 'text'],
      ].filter(Boolean);
      const colWidths = includeBrand
        ? ['22%', '10%', '7%', '11%', '9%', '7%', '5%', '8%', '9%', '5%', '7%']
        : ['25%', '8%', '13%', '9%', '7%', '5%', '8%', '10%', '6%', '9%'];
      const colgroup = '<colgroup>' + headers.map((_, index) => '<col style="width:' + colWidths[index] + '">').join('') + '</colgroup>';

      const rows = products.map((product) => {
        const cells = [
          cell(product.productName, '<div class="product-name">' + escapeHtmlClient(product.productName || '') + '</div>' + (product.family ? chip(product.family, 'dark') : '')),
          includeBrand ? cell(product.brandFamily, escapeHtmlClient(product.brandFamily || 'Sem marca') + (product.brandLine ? '<small class="price-note">linha: ' + escapeHtmlClient(product.brandLine) + '</small>' : '')) : null,
          cell(product.brandSection, escapeHtmlClient(product.brandSection || '')),
          cell(product.category, escapeHtmlClient(product.category || '')),
          cell(product.price ?? '', priceCell(product)),
          cell(product.costPerMg ?? '', product.costPerMg ? fmtNumber(product.costPerMg, 6) : ''),
          cell(product.brandScore ?? 0, fmtNumber(product.brandScore || 0, 1)),
          cell(product.status, statusChip(product) + (product.hasDiscount ? ' ' + chip('com desconto', 'warn') : '')),
          cell(product.sourceType, sourceChip(product)),
          cell(product.sourceUrl || '', pageButton(product)),
          cell((product.dosage || '') + ' ' + (product.quantity || ''), escapeHtmlClient([product.dosage, product.quantity].filter(Boolean).join(' / '))),
        ].filter(Boolean);
        return '<tr class="source-' + escapeHtmlClient(product.sourceType || 'unknown') + '">' + cells.join('') + '</tr>';
      }).join('');

      return '<div class="table-wrap"><table class="sortable" id="' + id + '">' +
        colgroup +
        '<thead><tr>' + headers.map((header) => '<th data-sort="' + header[1] + '">' + header[0] + '</th>').join('') + '</tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
    }

    function cell(value, html) {
      return '<td data-value="' + escapeHtmlClient(value ?? '') + '">' + (html ?? escapeHtmlClient(value ?? '')) + '</td>';
    }

    function renderBrands(products) {
      const brands = sortBrands(buildBrandStats(products));
      $('brandCountChip').textContent = brands.length + ' marcas filtradas';

      if (!brands.length) {
        $('brandGrid').innerHTML = '<p class="empty">Nenhuma marca encontrada com os filtros atuais.</p>';
        return;
      }

      $('brandGrid').innerHTML = brands.map((brand, index) => {
        const priceRange = brand.minPrice === null ? '' : (brand.minPrice === brand.maxPrice ? fmtMoney(brand.minPrice) : fmtMoney(brand.minPrice) + ' a ' + fmtMoney(brand.maxPrice));
        const topFamilies = brand.monitored.length
          ? '<div class="highlight-strip">' + brand.monitored.map((family) => chip(family, 'dark')).join('') + '</div>'
          : '<div class="highlight-strip">' + chip('sem produto monitorado', 'info') + '</div>';
        return '<details class="brand-card ' + (brand.brand === 'Sem marca' ? 'no-brand' : '') + '" ' + (index < 2 ? 'open' : '') + '>' +
          '<summary class="brand-summary">' +
            '<div>' +
              '<div class="brand-title"><strong>' + escapeHtmlClient(brand.brand) + '</strong>' +
                chip('nota ' + fmtNumber(brand.score || 0, 1), brand.brand === 'Sem marca' ? 'warn' : 'ok') +
                (brand.brand === 'Sem marca' ? chip('separado para revisao', 'warn') : '') +
              '</div>' +
              '<div class="brand-stats">' +
                chip(brand.total + ' produtos') +
                chip(brand.available + ' disponiveis', 'ok') +
                chip(brand.unavailable + ' indisponiveis', brand.unavailable ? 'bad' : 'info') +
                chip(brand.promo + ' promo', 'warn') +
              '</div>' +
              renderBrandSourceStrip(brand) +
            '</div>' +
            '<div class="brand-kpis">' +
              '<div class="mini-kpi"><span>Faixa</span><strong>' + escapeHtmlClient(priceRange || '-') + '</strong></div>' +
              '<div class="mini-kpi"><span>Melhor mg</span><strong>' + escapeHtmlClient(brand.bestCost ? fmtNumber(brand.bestCost, 6) : '-') + '</strong></div>' +
              '<div class="mini-kpi"><span>Principal</span><strong>' + brand.principal + '</strong></div>' +
              '<div class="mini-kpi"><span>Promo</span><strong>' + brand.promo + '</strong></div>' +
            '</div>' +
          '</summary>' +
          '<div class="brand-body">' +
            topFamilies +
            renderBrandSourceActions(brand) +
            renderBrandVariants(brand) +
            productList(brand.products, 'brand-list-' + index) +
          '</div>' +
        '</details>';
      }).join('');
    }

    function renderComparisons(products) {
      const families = state.family ? [state.family] : targetFamilies;
      const html = families.map((family) => {
        const familyProducts = products
          .filter((product) => product.family === family)
          .slice();
        const bestByBrand = Array.from(groupBy(familyProducts, (product) => product.brandFamily || 'Sem marca').values())
          .map((items) => sortProducts(items)[0]);
        const sortedBestByBrand = sortProducts(bestByBrand);
        return '<article class="comparison-card">' +
          '<div class="comparison-head">' +
            '<div><h3>Melhores ' + escapeHtmlClient(family) + ' por marca e preco</h3>' +
            '<p class="muted">' + sortedBestByBrand.length + ' marcas com produto encontrado nos filtros atuais.</p></div>' +
            chip('ordenacao: ' + getSortLabel(), 'info') +
          '</div>' +
          productTable(sortedBestByBrand, 'comparison-' + normalize(family), true) +
        '</article>';
      }).join('');
      $('comparisonGrid').innerHTML = html || '<p class="empty">Nenhum comparativo disponivel.</p>';
    }

    function renderProducts(products) {
      const sorted = sortProducts(products);
      $('productCountChip').textContent = sorted.length + ' produtos';
      $('productsTable').innerHTML = productTable(sorted, 'all-products', true);
    }

    function renderAlerts() {
      const cards = (DASHBOARD.brandResearch || []).map((brand) => {
        const sources = [brand.sourceUrl, brand.secondarySourceUrl].filter(Boolean);
        return '<article class="source-card">' +
          '<div class="brand-title"><strong>' + escapeHtmlClient(brand.brand || '') + '</strong>' + chip('nota ' + fmtNumber(brand.score || 0, 1), 'ok') + '</div>' +
          '<p>' + escapeHtmlClient(brand.summary || '') + '</p>' +
          '<p><strong>Alertas:</strong> ' + escapeHtmlClient(brand.alerts || '') + '</p>' +
          sources.map((url) => '<p><a href="' + escapeHtmlClient(url) + '" target="_blank" rel="noreferrer">' + escapeHtmlClient(url) + '</a></p>').join('') +
        '</article>';
      }).join('');
      $('sourceCards').innerHTML = cards || '<p class="empty">Sem historico documental cadastrado.</p>';
    }

    function renderAll() {
      const products = getFilteredProducts();
      renderMetrics(products);
      renderPrintSummary(products);
      renderBrands(products);
      renderComparisons(products);
      renderProducts(products);
    }

    function activateTab(tab, options = {}) {
      const button = document.querySelector('[data-tab="' + tab + '"]');
      const panel = $('tab-' + tab);
      if (!button || !panel) return;

      document.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      panel.classList.add('active');

      if (options.render !== false) renderAll();
    }

    function initTabs() {
      document.querySelectorAll('[data-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          activateTab(button.dataset.tab);
          updateShareStatus('');
        });
      });
    }

    function initSorting() {
      document.addEventListener('click', (event) => {
        const header = event.target.closest('th[data-sort]');
        if (!header) return;
        const table = header.closest('table');
        const index = Array.from(header.parentElement.children).indexOf(header);
        const type = header.dataset.sort;
        const direction = table.dataset.sortIndex === String(index) && table.dataset.sortDir === 'asc' ? 'desc' : 'asc';
        table.dataset.sortIndex = String(index);
        table.dataset.sortDir = direction;
        const rows = Array.from(table.tBodies[0].rows);
        rows.sort((a, b) => {
          const av = a.cells[index]?.dataset.value || a.cells[index]?.textContent || '';
          const bv = b.cells[index]?.dataset.value || b.cells[index]?.textContent || '';
          const result = type === 'number'
            ? (Number(av) || Number.POSITIVE_INFINITY) - (Number(bv) || Number.POSITIVE_INFINITY)
            : av.localeCompare(bv, 'pt-BR', { numeric: true, sensitivity: 'base' });
          return direction === 'asc' ? result : -result;
        });
        rows.forEach((row) => table.tBodies[0].appendChild(row));
      });
    }

    function showLiveNotice(message) {
      const notice = $('liveModeNotice');
      if (!notice) return;
      notice.hidden = false;
      if (message) notice.textContent = message;
    }

    function setLiveMessage(message, detail = '') {
      const messageElement = $('liveRefreshMessage');
      const detailElement = $('liveRefreshDetail');
      if (messageElement && message) messageElement.textContent = message;
      if (detailElement && detail) detailElement.textContent = detail;
    }

    function clearLiveReadyParam() {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('__liveReady')) return;
      url.searchParams.delete('__liveReady');
      url.searchParams.delete('__liveAt');
      window.history.replaceState(null, document.title, url.pathname + url.search + url.hash);
    }

    async function detectDashboardServer() {
      if (!/^https?:$/.test(window.location.protocol)) return false;
      if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)) return false;

      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) return false;
        const status = await response.json();
        return status && status.app === 'respect-dashboard';
      } catch {
        return false;
      }
    }

    async function maybeAutoRefresh() {
      const params = new URLSearchParams(window.location.search);
      if (params.get('__liveReady') === '1') {
        clearLiveReadyParam();
        return;
      }

      const isDashboardServer = await detectDashboardServer();
      if (!isDashboardServer) {
        showLiveNotice('Atualizacao automatica exige npm run dashboard. Nesta abertura, os dados sao da ultima coleta embutida.');
        return;
      }

      const overlay = $('liveRefreshOverlay');
      if (overlay) overlay.hidden = false;
      setLiveMessage(
        'Coletando Respect, Medical Brasil e PYPHARMA com Playwright.',
        'A pagina sera recarregada automaticamente quando os arquivos forem regenerados.',
      );

      try {
        const response = await fetch('/api/refresh', { method: 'POST', cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok === false) {
          throw new Error(result.error || 'Falha ao atualizar dados.');
        }

        const url = new URL(window.location.href);
        url.searchParams.set('__liveReady', '1');
        url.searchParams.set('__liveAt', String(Date.now()));
        window.location.replace(url.toString());
      } catch (error) {
        if (overlay) overlay.hidden = true;
        showLiveNotice('Nao consegui atualizar automaticamente agora: ' + (error.message || error));
      }
    }

    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', restorePrint);
    window.RespectDashboard = {
      applyFilters: applyFilterState,
      preparePrint,
      restorePrint,
      buildFilterUrl,
      getFilteredCount: () => getFilteredProducts().length,
      maybeAutoRefresh,
      state,
    };

    initFilters();
    initTabs();
    initSorting();
    applyQueryFilters();
    renderAlerts();
    renderAll();
    maybeAutoRefresh();
  </script>
</body>
</html>`;
}

function productRow(product) {
  return [
    product.nome_produto,
    product.categoria,
    product.source_type,
    product.preco_atual,
    product.preco_antigo_riscado,
    product.percentual_desconto || product.economia_texto,
    product.status,
  ];
}

function productObjectRow(product) {
  return {
    Produto: product.nome_produto,
    Categoria: product.categoria,
    Fonte: product.source_type,
    'Preço atual': product.preco_atual,
    'Preço antigo': product.preco_antigo_riscado,
    Desconto: product.percentual_desconto || product.economia_texto,
    Status: product.status,
  };
}

function toCsv(products) {
  const rows = [
    CSV_HEADERS.map(csvEscape).join(','),
    ...products.map((product) => CSV_HEADERS.map((header) => csvEscape(product[header])).join(',')),
  ];

  return `${rows.join('\n')}\n`;
}

function markdownTable(headers, rows) {
  if (!rows.length) return '';

  const escapeCell = (value) =>
    String(value ?? '')
      .replace(/\r?\n/g, '<br>')
      .replace(/\|/g, '\\|')
      .trim();

  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ].join('\n');
}

function htmlSection(title, body) {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function htmlEmpty(message) {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

function htmlTable(rows) {
  if (!rows.length) return htmlEmpty('Sem dados.');

  const headers = Object.keys(rows[0]);

  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? '')}</td>`).join('')}</tr>`,
        )
        .join('')}
    </tbody>
  </table></div>`;
}

function printTerminalSummary(data) {
  console.log('\nResumo da coleta');
  console.log(`Quantidade total de produtos: ${data.products.length}`);
  console.log('Arquivos gerados:');
  console.log(`- ${relativePath(OUTPUTS.json)}`);
  console.log(`- ${relativePath(OUTPUTS.csv)}`);
  console.log(`- ${relativePath(OUTPUTS.markdown)}`);
  console.log(`- ${relativePath(OUTPUTS.html)}`);
  console.log('- screenshots/promo_page.png');
  console.log('- screenshots/main_page.png');
  console.log('- screenshots/pypharma_page.png');

  console.log('\nTop 20 melhores custo por mg/ml:');

  if (!data.topCostPerMg.length) {
    console.log('Nenhum produto com preço e mg/ml suficientes para calcular custo por mg.');
    return;
  }

  for (const [index, product] of data.topCostPerMg.entries()) {
    console.log(
      `${index + 1}. ${product.nome_produto} | ${product.source_type} | ${product.preco_atual} | ` +
        `${product.total_mg_estimado}mg | custo_por_mg=${formatNumber(product.custo_por_mg)}`,
    );
  }
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function parsePriceNumber(value) {
  const original = String(value || '').trim();
  if (!original) return null;

  const hasGuarani = /(Gs\.?|G\$|PYG|₲)/i.test(original);
  let numeric = original.replace(/[^\d,.-]/g, '');

  if (!numeric) return null;

  if (hasGuarani) {
    const guarani = Number(numeric.replace(/[^\d]/g, ''));
    return Number.isFinite(guarani) ? guarani : null;
  }

  const lastComma = numeric.lastIndexOf(',');
  const lastDot = numeric.lastIndexOf('.');

  if (lastComma > lastDot) {
    numeric = numeric.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const decimals = numeric.slice(lastDot + 1);
    if (decimals.length === 3 && !original.includes('$') && !original.includes('US$')) {
      numeric = numeric.replace(/\./g, '');
    } else {
      numeric = numeric.replace(/,/g, '');
    }
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function roundNumber(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value).replace(/\u00a0/g, ' ');
}

function formatCurrencyRange(min, max) {
  if (typeof min !== 'number' || typeof max !== 'number') return '';

  if (min === max) return formatCurrency(min);

  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

function formatBrandSources(brand) {
  return [brand.sourceUrl || brand.sourceLabel, brand.secondarySourceUrl].filter(Boolean).join(' | ');
}

function csvEscape(value) {
  const text = String(value ?? '');

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toSafeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function relativePath(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
}

export {
  BRAND_RESEARCH,
  TARGET_TERMS,
  buildDashboardData,
  buildFamilyComparisons,
  buildMedicalBrasilSeedProducts,
  buildReportData,
  canonicalizeBrand,
  compareProductValue,
  deriveBrandParts,
  detectProductFamily,
  enrichProduct,
  estimateTotalMg,
  findBrandResearchForText,
  getBrandSection,
  normalizeText,
  normalizePyPharmaProduct,
  parsePriceNumber,
  parsePyPharmaProductPayload,
  renderInteractiveHtmlReport,
  runScrape,
  toDashboardProduct,
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error('\nFalha ao executar scraper.');
    console.error(error);
    process.exitCode = 1;
  });
}
