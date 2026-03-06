import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');

const sourcePaths = {
  bestBeforeDir: path.join(workspaceRoot, 'BEST BEFORE'),
  provenance: path.join(workspaceRoot, 'COMBU', 'provenance.json'),
  openByNumber: path.join(workspaceRoot, 'BEST BEFORE', 'BEST BEFORE (OPEN) in Number'),
  expiredDir: path.join(workspaceRoot, 'BEST BEFORE', 'BEST BEFORE EXPIRED'),
  diaryRtf: path.join(workspaceRoot, 'html text', 'Lemon HTML.rtf'),
  aboutFaqRtf: path.join(workspaceRoot, 'BEST BEFORE', 'BEST BEFORE - ABOUT AND FAQ.rtf'),
};

const outputPaths = {
  dataDir: path.join(projectRoot, 'public', 'data'),
  logoDir: path.join(projectRoot, 'public', 'assets', 'logo'),
  storyDir: path.join(projectRoot, 'public', 'assets', 'story'),
  outputsDir: path.join(projectRoot, 'public', 'assets', 'outputs'),
  outputsThumbsDir: path.join(projectRoot, 'public', 'assets', 'outputs', 'thumbs'),
  itemsJson: path.join(projectRoot, 'public', 'data', 'best-before-items.json'),
  summaryJson: path.join(projectRoot, 'public', 'data', 'best-before-summary.json'),
  diaryTxt: path.join(projectRoot, 'public', 'data', 'bb-diary.txt'),
  diaryFocusedTxt: path.join(projectRoot, 'public', 'data', 'bb-diary-best-before.txt'),
  aboutFaqTxt: path.join(projectRoot, 'public', 'data', 'bb-about-faq.txt'),
};

const numberFromName = (name) => {
  const match = /N(?:º|°|o)?\s*(\d+)/i.exec(name || '');
  return match ? Number.parseInt(match[1], 10) : null;
};

const parseTimestampToIso = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(' UTC', 'Z').replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseNumeric = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const isKnownHeight = (value) => {
  if (typeof value === 'number') {
    return true;
  }

  return typeof value === 'string' && /^\d+$/.test(value.trim());
};

export const splitProvenanceParts = (value) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const resolveBestBeforeStatus = ({ id, number, openNumberMap, expiredNumbers }) => {
  let status = id === 'SEALED' ? 'sealed' : 'open';

  if (number !== null && openNumberMap.has(number)) {
    status = 'open';
  }

  if (number !== null && expiredNumbers.has(number)) {
    status = 'expired';
  }

  return status;
};

export const buildPreparedItem = (item, { openNumberMap, expiredNumbers, previewMap, previewThumbMap }) => {
  const number = numberFromName(item.name);
  const knownHeight = isKnownHeight(item.height);
  const id = item.id || 'SEALED';
  const contentSizeBytes = parseNumeric(item.content_size);
  const feeSat = parseNumeric(item.fee);
  const status = resolveBestBeforeStatus({ id, number, openNumberMap, expiredNumbers });

  return {
    number,
    name: item.name,
    status,
    id,
    ordinalsUrl: id === 'SEALED' ? null : `https://ordinals.com/content/${id}`,
    preview: number !== null && previewMap.has(number) ? previewMap.get(number) : null,
    previewThumb: number !== null && previewThumbMap.has(number) ? previewThumbMap.get(number) : null,
    artworkType: item.artwork_type || null,
    dimensions: item.dimensions || null,
    timestamp: item.timestamp || null,
    timestampIso: parseTimestampToIso(item.timestamp),
    contentType: item.content_type || null,
    contentSizeBytes,
    feeSat,
    sat: item.sat || null,
    height: item.height || null,
    knownHeight,
    provenanceParts: splitProvenanceParts(item.provenance),
  };
};

const extractBestBeforeDiary = (fullText) => {
  const lines = fullText.split(/\r?\n/);
  const markers = /best before|part 1 \(the logo\)|deconstructed g1|ordinally/i;
  const selectedIndices = new Set();

  lines.forEach((line, index) => {
    if (!markers.test(line)) {
      return;
    }

    for (let offset = -3; offset <= 3; offset += 1) {
      const target = index + offset;
      if (target >= 0 && target < lines.length) {
        selectedIndices.add(target);
      }
    }

    selectedIndices.add(index);
  });

  if (selectedIndices.size === 0) {
    return 'No BEST BEFORE references were found in the source diary file.';
  }

  const sorted = [...selectedIndices].sort((a, b) => a - b);
  return sorted.map((index) => lines[index]).join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const sanitizeDiaryText = (text) => {
  if (!text) {
    return '';
  }

  let cleaned = text;

  // Remove the excluded diary fragment explicitly flagged by request.
  cleaned = cleaned.replace(/11:03am:[\s\S]*?Friday,\s*November\s+14,\s*2025[^\n]*\n?/gi, '');
  cleaned = cleaned.replace(/11:03am:[\s\S]*?<!--BEST BEFORE by Lemonhaze & ORDINALLY-->\s*/gi, '');
  cleaned = cleaned.replace(/11:03am:[\s\S]*?content="viewport-fit=cover,\s*width=device-width,\s*initial-scale=1"\s*\n\s*\/>\s*/gi, '');

  cleaned = cleaned
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !(
        /^11:03am:/i.test(trimmed) ||
        /^11:40am:/i.test(trimmed) ||
        /^8:04pm:/i.test(trimmed) ||
        /Mostly Art by Lemonhaze/i.test(trimmed) ||
        /Part 1 \(The Logo\)/i.test(trimmed) ||
        /Part 2 \(A Day In The Life\)/i.test(trimmed) ||
        /Deconstructed G1/i.test(trimmed) ||
        /name="viewport"/i.test(trimmed) ||
        /content="viewport-fit=cover/i.test(trimmed)
      );
    })
    .join('\n');

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
};

const getNumberMapFromDirectory = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const map = new Map();

  entries.forEach((entry) => {
    if (!entry.isFile()) {
      return;
    }

    const match = /^BB(\d+)\.png$/i.exec(entry.name);
    if (!match) {
      return;
    }

    const number = Number.parseInt(match[1], 10);
    map.set(number, path.join(directoryPath, entry.name));
  });

  return map;
};

const getExpiredNumbers = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const expiredNumbers = new Set();

  entries.forEach((entry) => {
    if (!entry.isFile()) {
      return;
    }

    const match = /BB(\d+)/i.exec(entry.name);
    if (match) {
      expiredNumbers.add(Number.parseInt(match[1], 10));
    }
  });

  return expiredNumbers;
};

const findBestBeforeLogo = async () => {
  const directCandidates = [
    'bestbeforelogo.jpeg',
    'bestbeforelogo.jpg',
    'bestbeforelogo.png',
    'bestbeforelogo.webp',
    'BESTBEFORELOGO.jpeg',
    'BESTBEFORELOGO.jpg',
    'BESTBEFORELOGO.png',
    'BESTBEFORELOGO.webp',
  ];

  for (const filename of directCandidates) {
    const candidatePath = path.join(sourcePaths.bestBeforeDir, filename);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  const entries = await readdir(sourcePaths.bestBeforeDir, { withFileTypes: true });
  const dynamicMatch = entries.find(
    (entry) =>
      entry.isFile() &&
      /\.(jpe?g|png|webp)$/i.test(entry.name) &&
      /best.*before.*logo|bb.*logo|bestbeforelogo/i.test(entry.name),
  );

  if (!dynamicMatch) {
    return null;
  }

  return path.join(sourcePaths.bestBeforeDir, dynamicMatch.name);
};

const copyBestBeforeLogo = async () => {
  await mkdir(outputPaths.logoDir, { recursive: true });

  const existingTargets = ['bb-uploaded-logo.png', 'bb-uploaded-logo.jpg', 'bb-uploaded-logo.jpeg', 'bb-uploaded-logo.webp'];
  for (const targetName of existingTargets) {
    await rm(path.join(outputPaths.logoDir, targetName), { force: true });
  }

  const logoSource = await findBestBeforeLogo();
  if (!logoSource) {
    return null;
  }

  const extension = path.extname(logoSource).toLowerCase();
  const targetName = `bb-uploaded-logo${extension}`;
  await cp(logoSource, path.join(outputPaths.logoDir, targetName));

  return `/assets/logo/${targetName}`;
};

const copyStoryAssets = async () => {
  await rm(outputPaths.storyDir, { recursive: true, force: true });
  await mkdir(outputPaths.storyDir, { recursive: true });

  const entries = await readdir(sourcePaths.bestBeforeDir, { withFileTypes: true });

  const matchSource = (patterns) => {
    const found = entries.find((entry) => entry.isFile() && patterns.some((pattern) => pattern.test(entry.name)));
    return found ? path.join(sourcePaths.bestBeforeDir, found.name) : null;
  };

  const definitions = [
    {
      key: 'aboutIntro',
      baseName: 'about-intro',
      patterns: [/^About Intro Image\.(webp|png|jpe?g)$/i, /about.*intro.*image\.(webp|png|jpe?g)$/i],
    },
    {
      key: 'lifecycle',
      baseName: 'lifecycle',
      patterns: [/^Lifecycle\.(webp|png|jpe?g)$/i, /lifecycle\.(webp|png|jpe?g)$/i],
    },
    {
      key: 'teaser',
      baseName: 'teaser',
      patterns: [/^Teasers?\.(webp|png|jpe?g)$/i, /teaser.*\.(webp|png|jpe?g)$/i],
    },
  ];

  const mapped = {};
  for (const definition of definitions) {
    const source = matchSource(definition.patterns);
    if (!source) {
      continue;
    }

    const ext = path.extname(source).toLowerCase() || '.webp';
    const targetName = `${definition.baseName}${ext}`;
    await cp(source, path.join(outputPaths.storyDir, targetName));
    mapped[definition.key] = `/assets/story/${targetName}`;
  }

  return mapped;
};

const build = async () => {
  const raw = JSON.parse(await readFile(sourcePaths.provenance, 'utf8'));
  const allBestBeforeItems = raw.filter((item) => item.collection === 'BEST BEFORE');

  const openNumberMap = await getNumberMapFromDirectory(sourcePaths.openByNumber);
  const expiredNumbers = await getExpiredNumbers(sourcePaths.expiredDir);

  await mkdir(outputPaths.dataDir, { recursive: true });
  await rm(outputPaths.outputsDir, { recursive: true, force: true });
  await mkdir(outputPaths.outputsDir, { recursive: true });
  await mkdir(outputPaths.outputsThumbsDir, { recursive: true });
  const logoAsset = await copyBestBeforeLogo();
  const storyAssets = await copyStoryAssets();

  const previewNumbers = [...openNumberMap.keys()].sort((a, b) => a - b);
  const previewMap = new Map();
  const previewThumbMap = new Map();

  for (const number of previewNumbers) {
    const source = openNumberMap.get(number);
    const destinationFilename = `BB${number}.png`;
    const destination = path.join(outputPaths.outputsDir, destinationFilename);
    const thumbFilename = `BB${number}.jpg`;
    const thumbDestination = path.join(outputPaths.outputsThumbsDir, thumbFilename);
    previewMap.set(number, `/assets/outputs/${destinationFilename}`);
    previewThumbMap.set(number, `/assets/outputs/thumbs/${thumbFilename}`);
    await cp(source, destination);

    try {
      execFileSync(
        'sips',
        ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', '-Z', '720', source, '--out', thumbDestination],
        {
          stdio: 'ignore',
        },
      );
    } catch {
      // Fallback if thumbnail generation fails for a source file.
      await cp(source, thumbDestination);
    }
  }

  const items = allBestBeforeItems
    .map((item) => buildPreparedItem(item, { openNumberMap, expiredNumbers, previewMap, previewThumbMap }))
    .sort((a, b) => {
      if (a.number === null && b.number === null) {
        return 0;
      }

      if (a.number === null) {
        return 1;
      }

      if (b.number === null) {
        return -1;
      }

      return a.number - b.number;
    });

  const totals = {
    total: items.length,
    sealed: items.filter((item) => item.status === 'sealed').length,
    open: items.filter((item) => item.status === 'open').length,
    expired: items.filter((item) => item.status === 'expired').length,
  };

  const knownHeights = items.filter((item) => item.knownHeight);
  const timelineKnownHeightMin = knownHeights.length
    ? Math.min(...knownHeights.map((item) => Number(item.height)))
    : null;
  const timelineKnownHeightMax = knownHeights.length
    ? Math.max(...knownHeights.map((item) => Number(item.height)))
    : null;

  const summary = {
    generatedAt: new Date().toISOString(),
    source: {
      provenance: '../COMBU/provenance.json',
      openByNumberDir: '../BEST BEFORE/BEST BEFORE (OPEN) in Number',
      expiredDir: '../BEST BEFORE/BEST BEFORE EXPIRED',
      diarySource: '../html text/Lemon HTML.rtf',
      aboutFaqSource: '../BEST BEFORE/BEST BEFORE - ABOUT AND FAQ.rtf',
    },
    totals,
    logoAsset,
    storyAssets,
    previewAssets: previewMap.size,
    heightCoverage: {
      knownHeights: knownHeights.length,
      placeholders: items.length - knownHeights.length,
      minKnownHeight: timelineKnownHeightMin,
      maxKnownHeight: timelineKnownHeightMax,
    },
    snapshot: {
      nowUtc: new Date().toISOString(),
      liveConfidence: 'partial',
      note: 'Live open/expired tracking is based on local source files and placeholders until chain-height mapping is complete.',
    },
  };

  await writeFile(outputPaths.itemsJson, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  await writeFile(outputPaths.summaryJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  if (existsSync(sourcePaths.diaryRtf)) {
    const diaryPlainText = execFileSync('textutil', ['-convert', 'txt', '-stdout', sourcePaths.diaryRtf], {
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
    });

    const sanitizedDiary = sanitizeDiaryText(diaryPlainText);
    const focusedDiary = sanitizeDiaryText(extractBestBeforeDiary(sanitizedDiary));

    await writeFile(outputPaths.diaryTxt, `${sanitizedDiary}\n`, 'utf8');
    await writeFile(outputPaths.diaryFocusedTxt, `${focusedDiary}\n`, 'utf8');
  }

  // Keep a tiny fallback note if diary source is missing.
  if (!existsSync(sourcePaths.diaryRtf)) {
    const missingNote = 'BBDIARY source file not found at ../html text/Lemon HTML.rtf';
    await writeFile(outputPaths.diaryTxt, `${missingNote}\n`, 'utf8');
    await writeFile(outputPaths.diaryFocusedTxt, `${missingNote}\n`, 'utf8');
  }

  if (existsSync(sourcePaths.aboutFaqRtf)) {
    const aboutFaqText = execFileSync('textutil', ['-convert', 'txt', '-stdout', sourcePaths.aboutFaqRtf], {
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
    });
    await writeFile(outputPaths.aboutFaqTxt, `${aboutFaqText.trim()}\n`, 'utf8');
  } else {
    const missingNote = 'ABOUT/FAQ source file not found at ../BEST BEFORE/BEST BEFORE - ABOUT AND FAQ.rtf';
    await writeFile(outputPaths.aboutFaqTxt, `${missingNote}\n`, 'utf8');
  }

  process.stdout.write(`Prepared BEST BEFORE dataset: ${totals.total} items, ${totals.open} open, ${totals.expired} expired.\n`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  build().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exit(1);
  });
}
