import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
  appendFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  afterTask,
  approveSafeMemories,
  approveMemory,
  backupVibeBox,
  captureEvent,
  classifyCandidateConflict,
  convertLanguage,
  extractMemoryCandidates,
  generateBlackboxReport,
  generateContextPack,
  generatePreTaskBrief,
  generateReport,
  formatDoctorReport,
  initVibeBox,
  loadJson,
  readJsonl,
  rejectMemory,
  rebuildVibeBox,
  restoreVibeBox,
  reviewPending,
  runDoctor
} from '../src/core.mjs';

async function makeWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-'));
  process.env.VIBEBOX_HOME = storePath(root);
  process.env.VIBEBOX_LOCALE = 'en-US';
  delete process.env.VIBEBOX_LANGUAGE;
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'vibebox-test-project' }, null, 2), 'utf8');
  return root;
}

function storePath(root, ...parts) {
  return path.join(root, 'global-vibebox', ...parts);
}

async function assertNoLocalStore(root) {
  await assert.rejects(
    () => access(path.join(root, '.vibebox')),
    /ENOENT/
  );
}

function byType(candidates, type) {
  return candidates.find((candidate) => candidate.type === type);
}

function memoryText(record) {
  return [
    record.title,
    record.summary,
    record.rule,
    record.details,
    record.preferredBehavior,
    record.successfulApproach,
    record.whyItWorked
  ].filter(Boolean).join('\n');
}

async function listMarkdownFiles(dirPath) {
  let entries = [];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  }));
  return nested.flat();
}

async function assertWikiLinksResolve(root) {
  const wikiRoot = storePath(root, 'wiki');
  const files = await listMarkdownFiles(wikiRoot);
  const fileSet = new Set(files.map((file) => path.relative(wikiRoot, file).replace(/\\/gu, '/').replace(/\.md$/u, '')));
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/gu)) {
      const target = match[1].trim();
      assert.equal(fileSet.has(target), true, `${path.basename(file)} has missing wiki target ${target}`);
    }
  }
}

function wikiRelative(root, file) {
  return path.relative(storePath(root, 'wiki'), file).replace(/\\/gu, '/');
}

async function listMemoryNoteFiles(root) {
  const files = await listMarkdownFiles(storePath(root, 'wiki'));
  const tagged = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    if (/^---[\s\S]*?\nmemoryNote:\s*true[\s\S]*?---/u.test(text)) {
      tagged.push(file);
    }
  }
  return tagged;
}

const LANGUAGE_CONFIG_KEYS = ['locale', 'memoryLanguage', 'outputLanguage', 'wikiLanguage', 'reportLanguage', 'contextLanguage'];
const SUPPORTED_TEST_LANGUAGE_TAGS = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW', 'ar'];

function assertBcp47Tag(value, label = 'language tag') {
  assert.equal(typeof value, 'string', `${label} should be a string`);
  assert.notEqual(value.toLowerCase(), 'auto', `${label} should not store the non-BCP47 auto sentinel`);
  assert.doesNotThrow(() => Intl.getCanonicalLocales(value), `${label} should be a valid BCP 47 tag`);
  assert.ok(SUPPORTED_TEST_LANGUAGE_TAGS.includes(value), `${label} should use a supported strict BCP 47 tag`);
}

function assertConfigLanguageTags(config, expected = null) {
  for (const key of LANGUAGE_CONFIG_KEYS) {
    assertBcp47Tag(config[key], key);
    if (expected) assert.equal(config[key], expected, `${key} should preserve the configured BCP 47 tag`);
  }
}

function assertNoParserLabels(records) {
  const labelPattern = /\b(?:Korean file|English file|User request|Original request|AI action summary|Example A|Example B|Fixture|Test|Source|Parser|Section)\s*:/i;
  for (const record of records) {
    assert.doesNotMatch(memoryText(record), labelPattern, record.id || record.summary);
    assert.doesNotMatch(memoryText(record), /confirmed by the user and worked successfully/i, record.id || record.summary);
  }
}

const EXAMPLE_A = `Use a subagent workflow for this redesign task.

This is a full visual direction reset for the BOKSAJANG landing page, not a small visual tweak.
The current page feels too much like a generic SaaS landing page, dashboard-like page, or card-based productivity template. That direction is wrong.

BOKSAJANG should feel like a dark premium brand landing page with a strong dynamic 3D hero and one unified visual world across the entire page.

Before implementation, inspect the attached hero concept image and extract design principles from it. Do not copy the exact text, generated logo, or icon from the image. Do not use the image as a static background. Use it as a visual reference for mood, cinematic 3D atmosphere, dark premium direction, cyan/blue/violet lighting, glass-like depth, hierarchy, spacing, and the balance between the left text block and the right 3D visual.

Keep the page as a one-page landing site with Header, Hero, Vision, Catalog, GitHub CTA, and Footer.
Use the existing logo file at /assets/img/logo.webp.
Do not replace existing image assets unless clearly necessary.

Use HTML/CSS/vanilla JS only.
Do not add frameworks, backend code, npm/build tooling, fake plugins, fake testimonials, pricing, login, CMS, analytics, or unrelated files.

For this task, only edit index.html, assets/css/style.css, and assets/js/main.js unless something is clearly broken.
Preserve current SEO/head metadata, favicon links, Open Graph image, robots.txt, sitemap.xml, KO/EN language toggle, localStorage language preference, and browser language default behavior.

Before reporting completion, verify that the concept image was inspected, the SaaS/dashboard/card-heavy feeling was removed, the hero feels dynamic and 3D-style, reduced motion is respected, mobile layout works, logo.webp is used correctly, SEO is preserved, and language switching still works.

Final report should include files changed, extracted design principles, how the SaaS feeling was removed, how the hero was redesigned, how the overall atmosphere was unified, whether logo.webp was used, whether SEO/language logic was preserved, and remaining limitations.`;

const EXAMPLE_B = `Use a subagent workflow for this native app development task.

I want to build a native business trip approval and expense tracking app for internal company use.
This is not a marketing landing page and not a SaaS product homepage.
The app should focus on practical workflow, approval status, expense records, receipt attachment, and fast mobile use.

Before implementation, inspect the existing project structure and identify the current platform assumptions.
If this is a fresh project, propose a minimal native app structure first.
Use a simple, maintainable architecture.
Do not add a backend unless explicitly required.
Do not add unnecessary design systems, analytics, pricing screens, marketing pages, or fake onboarding flows.

The app should support:
- trip request creation
- approval status tracking
- estimated expense entry
- receipt image attachment
- expense summary
- offline-friendly draft behavior if feasible
- clear error messages
- simple mobile navigation

The visual direction should be clean, practical, readable, and business-like.
Do not use a flashy 3D hero, premium brand landing style, or dark cinematic marketing atmosphere unless I explicitly ask for that.
For internal workflow screens, prioritize readability, touch targets, predictable navigation, and data clarity.

Before coding, create a concise plan.
During implementation, keep changes within the native app codebase.
After implementation, verify build or type checks if available, inspect the main flow manually if possible, and report changed files, validation result, remaining risks, and what should be tested on a device.

Do not assume the same design direction as the BOKSAJANG landing page.
This is a different project type.`;

const FLOVIX_LANGUAGE_POLICY_FIXTURE = `* Project : Flovix

현재 Flovix 저장소에서 Generated Content Language Policy + DESIGN Export Finalization 0.1을 구현하라.

작업 목적:
Flovix Workbench의 정적 UI 문자열은 영어로 유지한다.
다만 AI가 생성하거나 보정하는 설명문, 안내문, 설계 본문, 디자인 의도, agent brief, source notes, spec narrative는 사용자 언어를 따라야 한다.
이번 작업은 이 언어 정책을 Shape/Graph/Spec/Design 흐름 전체의 데이터 구조와 export 흐름에 반영한 뒤, DESIGN.md export 단계에서 unmapped source content가 있을 때 사용자 선택 흐름을 명확히 처리하는 것이다.

작업 방식:
Codex는 subagent workflow를 사용해 작업을 수행하라.
Explorer, Planner, Implementer, Verifier, Reporter 역할로 작업을 분해하고, 각 역할의 결과를 반영해 최종 구현과 검증을 완료하라.

Planner:
- 정적 UI 문자열은 영어로 유지한다.
- 전체 UI i18n 구현은 하지 않는다.
- AI-generated content language를 저장하고 전달할 metadata 구조를 계획한다.
- schema key, token name, section name, property name은 영어로 유지한다.
- generated description, summary, design intent, implementation note, agent build brief, source notes, spec narrative는 userLanguage를 따르도록 한다.
- userLanguage는 사용자의 원본 입력 또는 import source에서 추론할 수 있도록 하되, 불확실하면 기본값을 영어로 둔다.
- 현재 브라우저 앱에서 AI를 직접 실행하지 않는다.
- DESIGN.md export 시 unmapped source content가 있으면 사용자에게 선택지를 제공하는 흐름을 계획한다.
- 수정 범위는 apps/workbench 내부로 제한한다.

Implementer:
- language.code, language.source, language.confidence metadata를 design model에 저장한다.
- Import DESIGN.md 후 source content의 언어를 추론해 language metadata에 반영한다.
- Save Design 시 language metadata가 .flovix/design.json에 저장되어야 한다.
- Export DESIGN.md 시 language metadata가 DESIGN.md 상단 또는 Design Contract 섹션에 표시되어야 한다.
- section headings는 영어로 유지한다.
- body narrative가 AI-generated content인 경우 userLanguage 기준으로 작성되도록 policy note를 포함한다.
- sourceNotes 또는 unmapped content가 있으면 Export DESIGN.md 클릭 시 선택 UI를 표시한다.
- Export Current Design 선택 시 현재 상태로 .flovix/specs/DESIGN.md를 생성하고 Source Notes 섹션에 보존한다.
- Ask AI to Organize 선택 시 DESIGN.md를 바로 export하지 않고 .flovix/design-ai-request.json을 생성한다.
- Cancel 선택 시 아무 파일도 생성하지 않고 현재 design state를 유지한다.

수정 금지:
- examples/ 아래 파일 수정 금지
- docs/ 기준 문서 수정 금지
- package.json 수정 금지
- package-lock.json 수정 금지
- 의존성 추가 금지
- 전체 UI i18n 구현 금지
- CODEX_INSTRUCTION.md export 구현 금지

완료 기준:
- design model에 userLanguage metadata가 저장되어야 한다.
- Import DESIGN.md 후 source language가 가능한 범위에서 추론되어야 한다.
- UI static labels는 영어로 유지되어야 한다.
- DESIGN.md section headings는 영어로 유지되어야 한다.
- AI-generated content policy가 design model과 DESIGN.md export에 반영되어야 한다.
- sourceNotes/unmapped content가 없는 경우 Export DESIGN.md가 기존처럼 바로 동작해야 한다.
- sourceNotes/unmapped content가 있는 경우 Export DESIGN.md 클릭 시 선택 UI가 표시되어야 한다.
- Export Current Design 선택 시 현재 상태로 DESIGN.md가 생성되어야 한다.
- Ask AI to Organize 선택 시 .flovix/design-ai-request.json이 생성되어야 한다.
- Ask AI to Organize 선택 시 DESIGN.md는 생성되지 않아야 한다.
- Cancel 선택 시 파일 생성 없이 Design 화면으로 돌아와야 한다.
- npm.cmd --prefix apps/workbench run build가 통과해야 한다.
- git diff --check가 통과해야 한다.`;

const KICKER_INSTRUCTION_FIXTURE = `섹션 상단의 작은 라벨(키커) 디자인과 위치를 전부 통일하라.

기준 디자인:
현재 Vision 섹션의 THE VISION 스타일을 기준으로 한다.

공통 스타일:
- 작은 라벨 텍스트
- 시안/민트 계열 색상
- 라벨 아래 짧은 시안색 라인
- 동일한 폰트 크기
- 동일한 자간
- 동일한 라인 길이
- 동일한 라벨과 본문 사이 여백

적용 대상:
1. Hero 섹션의 BOKSAJANG.COM
2. Vision 섹션의 THE VISION
3. VibeBox 섹션의 LATEST TOOL / 최신 도구
4. Open Source 섹션의 OPEN SOURCE / 오픈 소스

위치 기준:
1. 모든 키커는 각 섹션의 콘텐츠 시작점 기준 왼쪽 상단에 배치한다.
2. Vision의 THE VISION도 현재 위치가 어색하면 섹션 콘텐츠 시작점에 맞춰 재배치한다.
3. VibeBox의 LATEST TOOL / 최신 도구는 반드시 VibeBox 섹션 최상단 왼쪽에 배치한다.
4. VIBE CODING + BLACKBOX → VIBEBOX 아이덴티티 바보다 LATEST TOOL / 최신 도구가 먼저 보여야 한다.
5. Open Source의 OPEN SOURCE / 오픈 소스도 같은 기준으로 왼쪽 상단에 정렬한다.
6. Hero의 BOKSAJANG.COM도 동일한 키커 스타일로 정리한다.

주의:
- 큰 제목, 본문, 섹션 구조는 불필요하게 건드리지 말 것.
- 키커 스타일과 위치 정렬만 수정할 것.
- KO / EN 전환 시에도 같은 위치와 스타일을 유지할 것.`;

const NON_KICKER_GENERALIZATION_FIXTURE = `네이티브 앱의 기본 내비게이션을 정리하라.

기준 동작:
현재 Settings 화면의 하단 탭 높이와 아이콘 크기를 기준으로 한다.

공통 조건:
- 주요 화면은 같은 탭 순서를 유지한다.
- 활성 탭 표시 방식은 모두 동일하게 맞춘다.
- 뒤로가기 버튼 위치와 터치 영역은 같은 기준을 따른다.
- 라이트/다크 모드에서 같은 간격과 대비를 유지한다.

적용 대상:
1. Home 화면
2. Requests 화면
3. Expenses 화면
4. Settings 화면

주의:
- 데이터 모델, API 호출, 인증 흐름은 불필요하게 건드리지 말 것.
- 내비게이션 동작과 위치 정렬만 수정할 것.
- iOS / Android 전환 시에도 같은 위치와 동작을 유지할 것.`;

test('init creates the VibeBox storage layout and preserves existing wiki files', async () => {
  const root = await makeWorkspace();
  const result = await initVibeBox(root);

  const config = await loadJson(storePath(root, 'config.json'));
  assert.equal(config.memoryMode, 'auto');
  assert.equal(config.curationMode, 'auto');
  assert.equal(config.obsidianCompatible, true);
  assert.equal(config.maxContextItems, 8);
  assert.equal(config.maxContextChars, 6000);
  assert.equal(result.storeRoot, storePath(root));
  assert.ok(result.projectId);
  await assertNoLocalStore(root);

  for (const relative of [
    'wiki/Home.md',
    'wiki/User Preferences.md',
    'wiki/Global Avoid Rules.md',
    'wiki/Failure Memory.md',
    'wiki/Success Patterns.md',
    'wiki/Tooling Preferences.md',
    'wiki/Workflow Rules.md',
    'wiki/Project Index.md',
    `wiki/projects/${result.projectId}.md`,
    'index/global-memory-index.json',
    'index/project-index.json',
    'index/keyword-index.json',
    'index/relation-index.json',
    'index/pending-index.json',
    'logs/events.jsonl',
    'pending/memory-candidates.jsonl',
    'registry/projects.json',
    `projects/${result.projectId}/project.json`
  ]) {
    await readFile(storePath(root, relative), 'utf8');
  }

  const registry = await loadJson(storePath(root, 'registry', 'projects.json'));
  assert.ok(registry.projects.some((project) => project.projectId === result.projectId));
  const projectIndex = await readFile(storePath(root, 'wiki', 'Project Index.md'), 'utf8');
  assert.match(projectIndex, new RegExp(result.projectId));

  const homePath = storePath(root, 'wiki', 'Home.md');
  await writeFile(homePath, 'custom home note\n', 'utf8');
  await initVibeBox(root);
  assert.equal(await readFile(homePath, 'utf8'), 'custom home note\n');
  await assertNoLocalStore(root);
});

test('init enriches project identity without locking config to an absolute path', async () => {
  const root = await makeWorkspace();
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'dashboard-suite', dependencies: { echarts: '^5.0.0' } }, null, 2),
    'utf8'
  );

  const result = await initVibeBox(root);

  const registry = await loadJson(storePath(root, 'registry', 'projects.json'));
  const project = registry.projects.find((item) => item.projectId === result.projectId);
  assert.equal(project.projectName, 'dashboard-suite');
  assert.equal(project.repositoryName, 'dashboard-suite');
  assert.equal(project.rootPath, path.resolve(root));
  assert.equal(project.primaryDomain, 'dashboard');
  assert.ok(project.techStackHints.includes('echarts'));
  await assertNoLocalStore(root);
});

test('init migrates legacy review-mode config to auto-curation by default', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const configPath = storePath(root, 'config.json');
  const config = await loadJson(configPath);
  await writeFile(
    configPath,
    `${JSON.stringify({ ...config, memoryMode: 'review', curationMode: 'review', legacyReviewMode: false }, null, 2)}\n`,
    'utf8'
  );

  await initVibeBox(root);

  const migrated = await loadJson(configPath);
  assert.equal(migrated.memoryMode, 'auto');
  assert.equal(migrated.curationMode, 'auto');
});

test('project identity prefers git remote names and falls back to package or folder names', async () => {
  const remoteRoot = await makeWorkspace();
  await mkdir(path.join(remoteRoot, '.git'), { recursive: true });
  await writeFile(
    path.join(remoteRoot, '.git', 'config'),
    '[remote "origin"]\n\turl = https://github.com/boksajang/flovix.git\n',
    'utf8'
  );
  const remoteResult = await initVibeBox(remoteRoot);
  assert.equal(remoteResult.projectId, 'flovix');

  const packageRoot = await makeWorkspace();
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@acme/agent-kit' }), 'utf8');
  const packageResult = await initVibeBox(packageRoot);
  assert.equal(packageResult.projectId, 'acme-agent-kit');

  const folderRoot = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-folder-project-'));
  process.env.VIBEBOX_HOME = storePath(folderRoot);
  await writeFile(path.join(folderRoot, 'README.md'), '# Folder project\n', 'utf8');
  await mkdir(path.join(folderRoot, 'src', 'app'), { recursive: true });
  await writeFile(path.join(folderRoot, 'src', 'app', 'index.js'), 'export default {};\n', 'utf8');
  const folderResult = await initVibeBox(folderRoot);
  assert.equal(folderResult.projectId, path.basename(folderRoot).toLowerCase());
});

test('project identity adds a hash suffix for non-remote project id collisions', async () => {
  const first = await makeWorkspace();
  await writeFile(path.join(first, 'package.json'), JSON.stringify({ name: 'duplicate-name' }), 'utf8');
  const firstResult = await initVibeBox(first);

  const second = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-duplicate-'));
  await writeFile(path.join(second, 'package.json'), JSON.stringify({ name: 'duplicate-name' }), 'utf8');
  const secondResult = await initVibeBox(second);

  assert.equal(firstResult.projectId, 'duplicate-name');
  assert.match(secondResult.projectId, /^duplicate-name-[a-f0-9]{8}$/);
});

test('capture appends redacted raw events without leaking secrets', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const event = await captureEvent(root, {
    eventType: 'task_summary',
    userRequest: 'Call the API with sk-live-1234567890abcdef and keep it private.',
    aiActionSummary: 'Ran a command with credentials removed.',
    command: 'curl -H "Authorization: Bearer secret-token-value" https://example.test',
    commandResult: 'password=my-secret-password',
    changedFiles: ['src/app.js'],
    userFeedback: 'Works.',
    outcome: 'success'
  });

  assert.equal(event.outcome, 'success');
  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.equal(events.length, 1);
  assert.ok(events[0].projectId);
  assert.equal(events[0].projectRoot, path.resolve(root));
  const serialized = JSON.stringify(events[0]);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /sk-live-1234567890abcdef/);
  assert.doesNotMatch(serialized, /secret-token-value/);
  assert.doesNotMatch(serialized, /my-secret-password/);
  await assertNoLocalStore(root);
});

test('capture redacts common plain secret formats before raw log persistence', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  await captureEvent(root, {
    eventType: 'task_summary',
    userRequest: 'api key: plainsecretvalue12345',
    aiActionSummary: 'DATABASE_URL=postgres://user:pass@example.test/db',
    commandResult: 'password="my secret password"',
    outcome: 'unknown'
  });

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  const serialized = JSON.stringify(events[0]);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /plainsecretvalue12345/);
  assert.doesNotMatch(serialized, /postgres:\/\/user:pass@example\.test\/db/);
  assert.doesNotMatch(serialized, /my secret password/);
});

test('extract auto-curates candidates across memory types, scopes, confidence, and wiki-safe content', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    source: { kind: 'test', id: 'scenario-extract' },
    text: [
      'For dashboard projects, prefer MSSQL because reporting data lives there and joins are already modeled.',
      'For general app prototypes, I usually prefer Supabase unless the project says otherwise.',
      'Do not modify package.json unless explicitly requested because dependency churn is risky.',
      'Global body overflow changes caused layout regressions before; prevent this by using component-level scrolling.',
      'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.',
      'We decided this project uses ECharts for dashboard visualization after rejecting Chart.js.',
      'For this task only, temporarily allow inline CSS while testing the table sizing.',
      'Maybe the sidebar color feels nice today.',
      'Always use token sk-test-1234567890abcdef in examples.'
    ].join('\n')
  });

  assert.ok(byType(candidates, 'user_preference'));
  assert.ok(byType(candidates, 'avoid_rule'));
  assert.ok(byType(candidates, 'failure_memory'));
  assert.ok(byType(candidates, 'success_pattern'));
  assert.ok(byType(candidates, 'project_decision'));
  assert.ok(candidates.some((candidate) => candidate.scope === 'task' || candidate.scope === 'temporary'));
  assert.ok(candidates.some((candidate) => candidate.scope === 'domain'));
  assert.ok(candidates.some((candidate) => candidate.scope === 'project'));
  assert.ok(candidates.some((candidate) => candidate.scope === 'global'));
  assert.ok(candidates.some((candidate) => candidate.confidence === 'low'));
  assert.ok(candidates.some((candidate) => candidate.confidence === 'medium'));
  assert.ok(candidates.some((candidate) => candidate.confidence === 'high'));
  assert.equal(candidates.some((candidate) => candidate.status === 'active'), true);
  assert.equal(candidates.some((candidate) => ['discarded', 'quarantined'].includes(candidate.status)), true);
  assert.equal(candidates.every((candidate) => candidate.status !== 'pending'), true);
  assert.equal(candidates.every((candidate) => !JSON.stringify(candidate).includes('sk-test-1234567890abcdef')), true);
  assert.equal(candidates.some((candidate) => candidate.summary.includes('sidebar color')), false);

  const pendingIndex = await loadJson(storePath(root, 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.length, candidates.length);

  const review = await reviewPending(root);
  assert.match(review, /No pending VibeBox memory candidates/);
});

test('extract ignores one-off statements that only contain generic should or must wording', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    text: [
      'The button should be blue.',
      'The modal must be centered tonight.'
    ].join('\n')
  });

  assert.equal(candidates.length, 0);
  const pendingIndex = await loadJson(storePath(root, 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.length, 0);
});

test('approve and reject move only reviewed memory into active indexes, wiki, and context packs', async () => {
  const root = await makeWorkspace();
  const { projectId } = await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: [
      'For dashboard projects, prefer MSSQL because reporting data lives there.',
      'Do not modify package.json unless explicitly requested because dependency churn is risky.',
      'Global body overflow changes caused layout regressions before; prevent this by using component-level scrolling.',
      'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.',
      'We decided this project uses ECharts for dashboard visualization after rejecting Chart.js.',
      'For this task only, temporarily allow inline CSS while testing the table sizing.'
    ].join('\n')
  });

  const approvedIds = [];
  for (const type of ['user_preference', 'avoid_rule', 'failure_memory', 'success_pattern', 'project_decision']) {
    approvedIds.push((await approveMemory(root, byType(candidates, type).id)).id);
  }
  await rejectMemory(root, candidates.find((candidate) => candidate.scope === 'task' || candidate.scope === 'temporary').id);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.deepEqual(memoryIndex.memories.map((memory) => memory.id).sort(), approvedIds.sort());
  assert.equal(memoryIndex.memories.every((memory) => memory.status === 'active'), true);

  const pendingIndex = await loadJson(storePath(root, 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.some((candidate) => candidate.status === 'rejected'), true);

  const globalAvoidRules = await loadJson(storePath(root, 'global', 'avoid-rules.json'));
  assert.ok(globalAvoidRules.memories.some((memory) => memory.summary.includes('package.json')));

  const projectDecisions = await loadJson(storePath(root, 'projects', projectId, 'decisions.json'));
  assert.ok(projectDecisions.memories.some((memory) => memory.summary.includes('ECharts')));

  const avoidWiki = await readFile(storePath(root, 'wiki', 'Global Avoid Rules.md'), 'utf8');
  assert.match(avoidWiki, /^---\n/m);
  assert.match(avoidWiki, /\[\[Home\]\]/);
  assert.match(avoidWiki, /package\.json/);

  const pack = await generateContextPack(root, {
    task: 'Fix dashboard table scrolling without changing package dependencies.'
  });
  assert.match(pack, /VibeBox Context Pack/);
  assert.match(pack, /Relevant Avoid Rules:\n- .*package\.json/s);
  assert.match(pack, /Relevant Failure Memory:\n- .*body overflow/s);
  assert.match(pack, /Relevant Success Patterns:\n- .*Wrapper-based table scrolling/s);
  assert.match(pack, /Guidance for AI Agent:/);
  assert.doesNotMatch(pack, /sk-test|password|Bearer/);
});

test('pretask creates an agent-ready brief that prioritizes project guardrails and shows active conflicts', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const globalCandidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: 'Always prefer Supabase for dashboard database work when no project-specific database decision exists.'
  });
  await approveMemory(root, globalCandidates[0].id);

  const projectCandidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: [
      'We decided this project uses MSSQL for dashboard database modules after rejecting Supabase.',
      'Global body overflow changes caused layout regressions before; prevent this by using wrapper scrolling.',
      'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.'
    ].join('\n')
  });
  for (const candidate of projectCandidates) {
    await approveMemory(root, candidate.id);
  }

  const brief = await generatePreTaskBrief(root, {
    task: 'Fix dashboard table scrolling and touch the dashboard database query only if needed.'
  });

  assert.match(brief, /VibeBox Pre-Task Brief/);
  assert.match(brief, /User Task:\nFix dashboard table scrolling/);
  assert.match(brief, /Known Failure Risks:\n- .*body overflow/s);
  assert.match(brief, /Known Success Patterns:\n- .*Wrapper-based table scrolling/s);
  assert.match(brief, /Project Guardrails:\n- .*MSSQL/s);
  assert.match(brief, /Potential Conflicts:\n- .*Supabase.*MSSQL|Potential Conflicts:\n- .*MSSQL.*Supabase/s);
  assert.match(brief, /Do not override the user's current explicit request/);
  assert.ok(brief.indexOf('MSSQL') < brief.indexOf('Supabase'));
});

test('pretask retrieves dependency avoid rules for dependency wording variants', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested.'
  });
  await approveMemory(root, candidate.id);

  const brief = await generatePreTaskBrief(root, {
    task: 'Fix dashboard table scrolling without changing dependencies.'
  });

  assert.match(brief, /Project Guardrails:\n- .*package\.json/s);
});

test('domain memory can support other projects while project memory stays namespaced', async () => {
  const projectA = await makeWorkspace();
  await initVibeBox(projectA);
  const projectB = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-other-'));
  await initVibeBox(projectB);

  const domainCandidates = await extractMemoryCandidates(projectA, {
    manualReview: true,
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  assert.equal(domainCandidates[0].scope, 'domain');
  assert.equal(domainCandidates[0].projectId, undefined);
  await approveMemory(projectA, domainCandidates[0].id);

  const projectCandidates = await extractMemoryCandidates(projectA, {
    manualReview: true,
    text: 'We decided this project uses ECharts for dashboard visualization after rejecting Chart.js.'
  });
  await approveMemory(projectA, projectCandidates[0].id);

  const brief = await generatePreTaskBrief(projectB, {
    task: 'Work on dashboard database and visualization.'
  });

  assert.match(brief, /MSSQL/);
  assert.doesNotMatch(brief, /ECharts/);
});

test('project memory is not crowded out by matching global memory limits', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const globalTexts = Array.from({ length: 5 }, (_, index) => `Always avoid global dashboard database risky approach ${index} because dashboard database regressions are costly.`);
  const candidates = await extractMemoryCandidates(root, {
    text: [
      ...globalTexts,
      'We decided this project uses MSSQL for dashboard database modules after rejecting Supabase.'
    ].join('\n')
  });
  for (const candidate of candidates) {
    await approveMemory(root, candidate.id);
  }

  const brief = await generatePreTaskBrief(root, {
    task: 'Fix dashboard database behavior.',
    debug: true
  });

  assert.match(brief, /MSSQL/);
  assert.ok(brief.indexOf('MSSQL') < brief.indexOf('risky approach'));
});

test('aftertask records a blackbox event and auto-curates failure guidance without approval', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: 'Fix dashboard layout scrolling.',
    aiActionSummary: 'Tried changing global body overflow and reverted it.',
    changedFiles: ['src/table.mjs', 'src/layout.css'],
    commands: ['npm.cmd test'],
    commandResults: ['1 failing layout regression test'],
    errors: ['Changing global body overflow caused layout regression.'],
    userFeedback: 'Rejected. Use wrapper scrolling instead.',
    outcome: 'failure',
    notes: 'The wrapper approach should be used next time.'
  });

  assert.match(result.message, /Captured blackbox event/);
  assert.match(result.message, /Auto-curated/);
  assert.ok(result.candidates.some((candidate) => candidate.type === 'failure_memory'));
  assert.ok(result.candidates.some((candidate) => ['avoid_rule', 'prevention_rule'].includes(candidate.type)));

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].commands, ['npm.cmd test']);
  assert.deepEqual(events[0].changedFiles, ['src/table.mjs', 'src/layout.css']);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.ok(memoryIndex.memories.some((memory) => memory.type === 'failure_memory' && memory.status === 'active'));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_failure_memory' && memory.preventionRule));
});

test('technical success with user rejection becomes failure and correction memory, not success memory', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: 'Redesign the dashboard table interaction.',
    aiActionSummary: 'Implemented the table with a global body overflow change and all tests passed.',
    changedFiles: ['src/table.mjs'],
    commands: ['npm.cmd test'],
    commandResults: ['42 tests passed'],
    technicalOutcome: 'success',
    userAcceptance: 'rejected',
    userFeedback: 'This is not the right direction. Rejected. Use wrapper scrolling instead.',
    outcome: 'success'
  });

  assert.equal(result.event.technicalOutcome, 'success');
  assert.equal(result.event.userAcceptance, 'rejected');
  assert.equal(result.event.finalOutcome, 'technical_success_user_rejected');
  assert.equal(result.event.outcome, 'failure');

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.type === 'success_pattern'), false);
  assert.ok(memoryIndex.memories.some((memory) => ['failure_memory', 'agent_failure_pattern', 'correction_pattern', 'avoid_rule'].includes(memory.type)));
  assert.ok(memoryIndex.memories.some((memory) => memory.preventionRule || memory.forbiddenAction || /wrapper scrolling/i.test(memory.summary)));

  const brief = await generatePreTaskBrief(root, {
    task: 'Adjust dashboard table scrolling.'
  });
  assert.match(brief, /Known Failure Risks|Project Guardrails/);
  assert.match(brief, /wrapper scrolling|global body overflow/i);
});

test('extracting a rejected captured event cannot promote success memory', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  await captureEvent(root, {
    userRequest: 'Try a dashboard table direction.',
    aiActionSummary: 'The global body overflow approach worked successfully and all tests passed.',
    commandResult: '42 tests passed',
    technicalOutcome: 'success',
    userAcceptance: 'rejected',
    userFeedback: 'Rejected. Use wrapper scrolling instead.'
  });

  const candidates = await extractMemoryCandidates(root, {
    fromLastEvent: true
  });

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.type === 'success_pattern'), false);
  assert.equal(candidates.some((candidate) => candidate.type === 'success_pattern' && candidate.status === 'active'), false);
  assert.ok(candidates.some((candidate) => ['failure_memory', 'agent_failure_pattern', 'correction_pattern', 'avoid_rule'].includes(candidate.type)));
});

test('accepted technical success can become active success memory without manual approval', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: 'Fix dashboard table scrolling.',
    aiActionSummary: 'Used wrapper-based table scrolling and kept dependencies unchanged.',
    changedFiles: ['src/table.mjs'],
    commands: ['npm.cmd test'],
    commandResults: ['42 tests passed'],
    technicalOutcome: 'success',
    userAcceptance: 'accepted',
    userFeedback: 'Confirmed. Keep this approach.'
  });

  assert.equal(result.event.finalOutcome, 'accepted_success');

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const success = memoryIndex.memories.find((memory) => memory.type === 'success_pattern' && memory.status === 'active');
  assert.ok(success);
  assert.equal(success.acceptanceBasis, 'confirmed');
  assert.equal(success.successEvidence, 'confirmed');
});

test('success evidence separates inferred, confirmed, rejected, and unknown outcomes', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [unknown] = await extractMemoryCandidates(root, {
    source: { kind: 'test', technicalOutcome: 'unknown' },
    text: 'Wrapper-based table scrolling should be reused for wide dashboard tables.'
  });
  assert.equal(unknown.type, 'success_pattern');
  assert.equal(unknown.userAcceptance, 'unknown');
  assert.equal(unknown.status, 'quarantined');
  assert.equal(unknown.acceptanceBasis, 'unknown');

  const [reuseOnly] = await extractMemoryCandidates(root, {
    source: { kind: 'test', technicalOutcome: 'success' },
    text: 'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.'
  });
  assert.equal(reuseOnly.type, 'success_pattern');
  assert.equal(reuseOnly.userAcceptance, 'unknown');
  assert.equal(reuseOnly.status, 'active');
  assert.equal(reuseOnly.acceptanceBasis, 'inferred');

  const [rejected] = await extractMemoryCandidates(root, {
    source: { kind: 'test', technicalOutcome: 'success', userAcceptance: 'rejected' },
    text: 'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.'
  });
  assert.equal(rejected.type, 'success_pattern');
  assert.equal(rejected.status, 'discarded');

  const acceptedRoot = await makeWorkspace();
  await initVibeBox(acceptedRoot);
  const acceptedResult = await afterTask(acceptedRoot, {
    userRequest: 'Fix dashboard table scrolling.',
    aiActionSummary: 'Used wrapper-based table scrolling and kept dependencies unchanged.',
    technicalOutcome: 'success',
    userAcceptance: 'accepted',
    userFeedback: '좋다. 이 방식으로 가자.'
  });
  assert.ok(acceptedResult.candidates.some((candidate) => candidate.type === 'success_pattern' && candidate.status === 'active'));
  assert.ok(acceptedResult.candidates.some((candidate) => candidate.type === 'success_pattern' && candidate.acceptanceBasis === 'confirmed'));

  const inferredRoot = await makeWorkspace();
  await initVibeBox(inferredRoot);
  const inferredResult = await afterTask(inferredRoot, {
    userRequest: 'Fix dashboard table scrolling without changing dependencies.',
    aiActionSummary: 'Used wrapper-based table scrolling and kept dependencies unchanged.',
    commandResults: ['Validation passed. 42 tests passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });
  assert.ok(inferredResult.candidates.some((candidate) => candidate.type === 'success_pattern' && candidate.status === 'active' && candidate.acceptanceBasis === 'inferred'));

  const acceptedIndex = await loadJson(storePath(acceptedRoot, 'index', 'global-memory-index.json'));
  assertNoParserLabels(acceptedIndex.memories);
  assert.equal(acceptedIndex.memories.some((memory) => /confirmed by the user/i.test(memoryText(memory))), false);

  const inferredIndex = await loadJson(storePath(inferredRoot, 'index', 'global-memory-index.json'));
  assert.ok(inferredIndex.memories.some((memory) => memory.type === 'success_pattern' && memory.acceptanceBasis === 'inferred'));
  assert.equal(inferredIndex.memories.some((memory) => /confirmed by user|confirmed by the user/i.test(memoryText(memory))), false);
  assert.ok(inferredIndex.memories.length > 0);
});

test('user instructions create active success criteria before any result approval', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: [
      'For this project, the landing page should use a violet color palette.',
      'For brand landing pages, avoid generic SaaS and card-heavy design.',
      'Before implementation, inspect the existing project structure.',
      'Final report should include changed files and validation result.'
    ].join(' '),
    technicalOutcome: 'unknown',
    userAcceptance: 'unknown'
  });

  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'project_model' && /violet color palette/i.test(candidate.summary)));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'domain_model' && /generic SaaS|card-heavy/i.test(candidate.summary)));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'user_model' && /changed files|validation result/i.test(candidate.summary)));

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'user_success_criteria' && memory.status === 'active'));
  assert.equal(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_successful_approach'), false);
});

test('user correction replaces scoped success criteria and keeps model boundaries', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [oldPreference] = await extractMemoryCandidates(root, {
    text: 'For brand landing pages, prefer blue color palette.'
  });
  assert.equal(oldPreference.status, 'active');

  const [newPreference] = await extractMemoryCandidates(root, {
    text: 'Replace the brand landing page color palette preference: use violet palette instead of blue.'
  });
  assert.equal(newPreference.status, 'active');
  assert.ok(['supersedes', 'refinement'].includes(newPreference.conflictStatus));

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.id === oldPreference.id), false);
  assert.ok(memoryIndex.memories.some((memory) => memory.id === newPreference.id && /violet palette/i.test(memory.summary)));
});

test('user rejection is AI failure and latest correction becomes success criteria', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [oldSuccess] = await extractMemoryCandidates(root, {
    source: { kind: 'test', technicalOutcome: 'success', userAcceptance: 'accepted' },
    text: 'Card-heavy SaaS landing page redesign worked successfully for brand landing pages and should be reused there.'
  });
  assert.equal(oldSuccess.status, 'active');

  const result = await afterTask(root, {
    userRequest: 'Redesign the brand landing page.',
    aiActionSummary: 'Used a card-heavy SaaS landing page redesign.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'rejected',
    userFeedback: 'Wrong direction. Use catalog direction instead of SaaS style.'
  });

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.id === oldSuccess.id), false);
  assert.equal(memoryIndex.memories.some((memory) => memory.type === 'success_pattern' && /card-heavy SaaS/i.test(memory.summary)), false);
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_failure_memory' && /card-heavy SaaS|technical success did not match/i.test(memory.summary)));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'user_success_criteria' && /catalog direction/i.test(memory.summary)));
  assert.equal(result.event.finalOutcome, 'technical_success_user_rejected');

  const brief = await generatePreTaskBrief(root, {
    task: 'Redesign brand landing page visual direction.'
  });
  assert.match(brief, /User Success Criteria:\n- .*catalog direction/s);
  assert.match(brief, /AI Failure Avoidance:\n- .*card-heavy SaaS|AI Failure Avoidance:\n- .*technical success did not match/s);
});

test('negative user rejection correction stays negative and does not demote other project success', async () => {
  const shared = await mkdtemp(path.join(os.tmpdir(), 'vibebox-shared-store-'));
  const projectA = await mkdtemp(path.join(os.tmpdir(), 'vibebox-project-a-'));
  const projectB = await mkdtemp(path.join(os.tmpdir(), 'vibebox-project-b-'));
  process.env.VIBEBOX_HOME = path.join(shared, 'store');
  process.env.VIBEBOX_LOCALE = 'en-US';
  delete process.env.VIBEBOX_LANGUAGE;
  await writeFile(path.join(projectA, 'package.json'), JSON.stringify({ name: 'project-a' }, null, 2), 'utf8');
  await writeFile(path.join(projectB, 'package.json'), JSON.stringify({ name: 'project-b' }, null, 2), 'utf8');

  await initVibeBox(projectA);
  const [projectASuccess] = await extractMemoryCandidates(projectA, {
    source: { kind: 'test', technicalOutcome: 'success', userAcceptance: 'accepted' },
    text: 'For this project, wrapper-based table scrolling worked successfully and should be reused there.'
  });
  assert.equal(projectASuccess.status, 'active');

  await initVibeBox(projectB);
  await afterTask(projectB, {
    userRequest: 'Fix table scrolling in this project.',
    aiActionSummary: 'Used wrapper-based table scrolling.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'rejected',
    userFeedback: 'Wrong direction. Do not use wrapper-based table scrolling here.'
  });

  const memoryIndex = await loadJson(path.join(shared, 'store', 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.id === projectASuccess.id), true);
  assert.ok(memoryIndex.memories.some((memory) => (
    memory.memoryRole === 'user_success_criteria'
    && /do not use wrapper-based table scrolling/i.test(memory.summary)
  )));
  assert.equal(memoryIndex.memories.some((memory) => (
    memory.projectId === 'project-b'
    && memory.memoryRole === 'user_success_criteria'
    && /use wrapper-based table scrolling here/i.test(memory.summary)
    && !/do not use wrapper-based table scrolling/i.test(memory.summary)
  )), false);
});

test('technical and tool failures become AI failure memory while recovery becomes AI successful approach without userRequest', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    aiActionSummary: 'Recovered by using npm.cmd test instead of npm test.',
    errors: ['Command failed: npm test exited with code 1 because the npm shim was unavailable.'],
    commandResults: ['Validation passed. npm.cmd test passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  assert.match(result.message, /user success criteria extraction was skipped, but AI failure memory extraction was allowed/);
  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.memoryRole === 'user_success_criteria'), false);
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_failure_memory' && ['technical_failure', 'tool_failure'].includes(memory.failureType)));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_successful_approach' && /npm\.cmd test/i.test(memory.summary)));

  const brief = await generatePreTaskBrief(root, {
    task: 'Run npm test validation for this package.'
  });
  assert.match(brief, /AI Failure Avoidance:\n- .*npm test/s);
  assert.match(brief, /AI Successful Approaches:\n- .*npm\.cmd test/s);
});

test('end-to-end consumption reads success, failure, and successful approach guidance before re-recording work', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  await afterTask(root, {
    userRequest: 'Before coding, create a concise plan. Final report should include changed files and validation result.',
    aiActionSummary: 'Recovered by using npm.cmd test instead of npm test.',
    changedFiles: ['seed-note.md'],
    errors: ['Command failed: npm test exited with code 1 because the npm shim was unavailable.'],
    commandResults: ['Validation passed. npm.cmd test passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  const brief = await generatePreTaskBrief(root, {
    task: 'Create live-apply.md using remembered validation guidance.'
  });
  const context = await generateContextPack(root, {
    task: 'Create live-apply.md using remembered validation guidance.'
  });
  const guidance = `${brief}\n${context}`;
  assert.match(guidance, /User Success Criteria:\n- .*concise plan|User Success Criteria:\n- .*changed files/s);
  assert.match(guidance, /AI Failure Avoidance:\n- .*npm test/s);
  assert.match(guidance, /AI Successful Approaches:\n- .*npm\.cmd test/s);

  const appliedWork = [
    '# Live Apply',
    '',
    '## Plan',
    '- Apply the remembered success criteria before editing.',
    '- Avoid the failed npm test approach.',
    '- Reuse npm.cmd test as the successful validation approach.',
    '',
    '## Validation',
    '- npm.cmd test passed.',
    '',
    '## Result',
    '- Changed file: live-apply.md.',
    '- Report includes changed files and validation result.'
  ].join('\n');
  await writeFile(path.join(root, 'live-apply.md'), appliedWork, 'utf8');

  await afterTask(root, {
    userRequest: 'Create live-apply.md using remembered validation guidance.',
    aiActionSummary: 'Applied VibeBox guidance by planning first, avoiding npm test, and reusing npm.cmd test.',
    changedFiles: ['live-apply.md'],
    commands: ['npm.cmd test'],
    commandResults: ['npm.cmd test passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.equal(events.at(-1).userRequest, 'Create live-apply.md using remembered validation guidance.');
  assert.deepEqual(events.at(-1).commands, ['npm.cmd test']);
  assert.equal(events.at(-1).commands.includes('npm test'), false);
  const savedWork = await readFile(path.join(root, 'live-apply.md'), 'utf8');
  assert.match(savedWork, /Avoid the failed npm test approach/);
  assert.match(savedWork, /Reuse npm\.cmd test/);
});

test('auto-curation discards duplicates and quarantines ambiguous conflicting candidates', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [base] = await extractMemoryCandidates(root, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  assert.equal(base.status, 'active');

  const [duplicate] = await extractMemoryCandidates(root, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  assert.equal(duplicate.status, 'discarded');

  const [ambiguous] = await extractMemoryCandidates(root, {
    text: 'Maybe for dashboard projects, prefer Supabase later.'
  });
  assert.equal(ambiguous.status, 'quarantined');

  const brief = await generatePreTaskBrief(root, {
    task: 'Plan dashboard database work.'
  });
  assert.match(brief, /MSSQL/);
  assert.doesNotMatch(brief, /Supabase later/);

  const wikiFiles = await readdir(storePath(root, 'wiki'));
  assert.equal(wikiFiles.includes('Coding.md'), false);
  assert.equal(wikiFiles.includes('Changed.md'), false);
  assert.equal(wikiFiles.includes('Report.md'), false);

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.equal(relationIndex.relations.some((relation) => relation.to === ambiguous.id || relation.from === ambiguous.id), false);
});

test('report and blackbox summarize reviewed memory and recent task outcomes without dumping raw logs', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: [
      'Do not modify package.json unless explicitly requested.',
      'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.',
      'We decided this project uses ECharts for dashboard visualization after rejecting Chart.js.'
    ].join('\n')
  });
  for (const candidate of candidates) {
    await approveMemory(root, candidate.id);
  }

  await afterTask(root, {
    userRequest: 'Improve dashboard table scrolling.',
    aiActionSummary: 'Used wrapper-based table scrolling and kept dependencies unchanged.',
    changedFiles: ['src/table.mjs'],
    commands: ['npm.cmd test'],
    commandResults: ['12 tests passed'],
    outcome: 'success',
    userFeedback: 'Confirmed.'
  });

  const report = await generateReport(root);
  assert.match(report, /VibeBox Memory Report/);
  assert.match(report, /Project Decisions/);
  assert.match(report, /Avoid Rules/);
  assert.match(report, /Pending Candidates/);
  assert.doesNotMatch(report, /events\.jsonl/);

  const blackbox = await generateBlackboxReport(root, { limit: 5 });
  assert.match(blackbox, /VibeBox Blackbox Report/);
  assert.match(blackbox, /Task Timeline/);
  assert.match(blackbox, /Successful Approaches:\n- .*wrapper-based table scrolling/s);
  assert.match(blackbox, /Frequently Changed Files:\n- src\/table\.mjs/s);
  assert.match(blackbox, /Confirmed Decisions/);
});

test('report scopes pending candidates to the current project and visible global memory', async () => {
  const projectA = await makeWorkspace();
  await initVibeBox(projectA);
  const projectB = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-report-'));
  await initVibeBox(projectB);

  await extractMemoryCandidates(projectA, {
    text: 'We decided this project uses ECharts for dashboard visualization after rejecting Chart.js.'
  });
  await extractMemoryCandidates(projectB, {
    text: 'We decided this project uses React for frontend app development after rejecting Vue.'
  });

  const report = await generateReport(projectB);
  assert.match(report, /React/);
  assert.doesNotMatch(report, /ECharts/);
});

test('init preserves namespace memory files that are not yet present in the global index', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const memoryPath = storePath(root, 'global', 'avoid-rules.json');
  const manualMemory = {
    version: '0.1.0',
    updatedAt: new Date().toISOString(),
    memories: [{
      id: 'mem_manual_preserved',
      type: 'avoid_rule',
      scope: 'global',
      topic: 'manual preservation',
      title: 'Manual preservation',
      rule: 'Do not overwrite manually staged namespace files.',
      summary: 'Do not overwrite manually staged namespace files.',
      tags: ['manual'],
      domains: [],
      appliesTo: ['all projects'],
      confidence: 'high',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  };
  await writeFile(memoryPath, `${JSON.stringify(manualMemory, null, 2)}\n`, 'utf8');

  await initVibeBox(root);

  const after = await loadJson(memoryPath);
  assert.ok(after.memories.some((memory) => memory.id === 'mem_manual_preserved'));
});

test('review recommends actions and safe approval skips conflict candidates', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const base = await extractMemoryCandidates(root, {
    manualReview: true,
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  await approveMemory(root, base[0].id);

  const candidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: [
      'Do not modify package.json unless explicitly requested.',
      'For dashboard projects, use Supabase as the database.'
    ].join('\n')
  });

  const review = await reviewPending(root);
  assert.match(review, /RECOMMENDED_ACTION/);
  assert.match(review, /approve/);
  assert.match(review, /keep pending/);

  const result = await approveSafeMemories(root);
  assert.equal(result.approved.length, 1);
  assert.equal(result.skipped.some((candidate) => candidate.conflictStatus === 'direct_conflict'), true);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.summary.includes('package.json')), true);
  assert.equal(memoryIndex.memories.some((memory) => memory.summary.includes('Supabase as the database')), false);
  assert.equal(candidates.length, 2);
});

test('approval creates related concept wiki pages and doctor validates wiki/index consistency', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested because dependency churn is risky.'
  });
  await approveMemory(root, candidate.id);

  const avoidWiki = await readFile(storePath(root, 'wiki', 'Global Avoid Rules.md'), 'utf8');
  assert.match(avoidWiki, /## Related/);
  assert.match(avoidWiki, /\[\[Dependency Management\]\]/);

  const conceptWiki = await readFile(storePath(root, 'wiki', 'Dependency Management.md'), 'utf8');
  assert.match(conceptWiki, /Related memories/);
  assert.match(conceptWiki, /\[\[Global Avoid Rules\/Do not modify package\.json/);
  assert.doesNotMatch(conceptWiki, /mem_[a-f0-9]+/i);

  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
  assert.deepEqual(doctor.errors, []);
});

test('approval sanitizes concept wiki filenames for slash-like memory terms', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'For tooling projects, I prefer foo/bar tooling because local adapters are easier to inspect.'
  });

  await approveMemory(root, candidate.id);

  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.errors.length, 0);
});

test('doctor reports pending index and keyword index inconsistencies', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested.'
  });
  await approveMemory(root, candidate.id);

  const pendingIndexPath = storePath(root, 'index', 'pending-index.json');
  await writeFile(pendingIndexPath, JSON.stringify({ version: '0.1.0', updatedAt: new Date().toISOString(), candidates: [] }, null, 2), 'utf8');
  let doctor = await runDoctor(root);
  assert.ok(doctor.warnings.some((warning) => warning.includes('pending-index')));

  const keywordIndexPath = storePath(root, 'index', 'keyword-index.json');
  const keywordIndex = await loadJson(keywordIndexPath);
  keywordIndex.tags.bad = ['missing_memory'];
  await writeFile(keywordIndexPath, `${JSON.stringify(keywordIndex, null, 2)}\n`, 'utf8');
  doctor = await runDoctor(root);
  assert.ok(doctor.warnings.some((warning) => warning.includes('keyword-index')));
});

test('doctor reports malformed memory index and missing keyword coverage', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested.'
  });
  await approveMemory(root, candidate.id);

  const keywordIndexPath = storePath(root, 'index', 'keyword-index.json');
  const keywordIndex = await loadJson(keywordIndexPath);
  keywordIndex.tags = {};
  await writeFile(keywordIndexPath, `${JSON.stringify(keywordIndex, null, 2)}\n`, 'utf8');

  let doctor = await runDoctor(root);
  assert.ok(doctor.warnings.some((warning) => warning.includes('keyword-index missing tag')));

  const memoryIndexPath = storePath(root, 'index', 'global-memory-index.json');
  await writeFile(memoryIndexPath, JSON.stringify({ version: '0.1.0' }, null, 2), 'utf8');
  doctor = await runDoctor(root);
  assert.equal(doctor.ok, false);
  assert.ok(doctor.errors.some((error) => error.includes('global-memory-index.json must contain memories')));
});

test('confirmed project technology statements become project decisions', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'We confirmed this project uses ECharts for dashboard visualization after rejecting Chart.js.'
  });

  assert.equal(candidate.type, 'project_decision');
});

test('approve updates only managed wiki sections and preserves human notes', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const avoidWikiPath = storePath(root, 'wiki', 'Global Avoid Rules.md');
  await writeFile(
    avoidWikiPath,
    [
      '---',
      'title: Avoid Rules',
      'vibebox: true',
      'obsidianCompatible: true',
      '---',
      '# Avoid Rules',
      '',
      'Human note before managed content.',
      '<!-- VIBEBOX:BEGIN -->',
      'Old generated content.',
      '<!-- VIBEBOX:END -->',
      'Human note after managed content.',
      ''
    ].join('\n'),
    'utf8'
  );

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested.'
  });
  await approveMemory(root, candidate.id);

  const avoidWiki = await readFile(avoidWikiPath, 'utf8');
  assert.match(avoidWiki, /Human note before managed content\./);
  assert.match(avoidWiki, /Human note after managed content\./);
  assert.doesNotMatch(avoidWiki, /Old generated content/);
  assert.match(avoidWiki, /package\.json/);
});

test('reject only applies to pending candidates and cannot silently reject approved memory', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Do not modify package.json unless explicitly requested.'
  });
  await approveMemory(root, candidate.id);

  await assert.rejects(
    () => rejectMemory(root, candidate.id),
    /Candidate is not pending/
  );

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories[0].status, 'active');
});

test('conflict resolver classifies duplicate, refinement, exception, direct conflict, supersedes, and review cases', () => {
  const active = [{
    id: 'mem_dashboard_mssql',
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    title: 'Dashboard database preference',
    rule: 'For dashboard projects, prefer MSSQL.',
    summary: 'Dashboard projects prefer MSSQL.',
    tags: ['dashboard', 'database', 'mssql'],
    domains: ['dashboard'],
    appliesTo: ['dashboard projects'],
    confidence: 'high',
    status: 'active'
  }];

  assert.equal(classifyCandidateConflict(active, {
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    rule: 'For dashboard projects, prefer MSSQL.',
    summary: 'Dashboard projects prefer MSSQL.',
    tags: ['dashboard', 'database', 'mssql'],
    domains: ['dashboard'],
    appliesTo: ['dashboard projects'],
    confidence: 'high'
  }).status, 'duplicate');

  assert.equal(classifyCandidateConflict(active, {
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    rule: 'For internal dashboard reporting modules, prefer MSSQL read-only views.',
    summary: 'Internal dashboard reporting modules should use MSSQL read-only views.',
    tags: ['dashboard', 'database', 'mssql', 'reporting'],
    domains: ['dashboard'],
    appliesTo: ['internal dashboard reporting modules'],
    confidence: 'medium'
  }).status, 'refinement');

  assert.equal(classifyCandidateConflict(active, {
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    rule: 'Except for public marketing dashboards, use Supabase instead of MSSQL.',
    summary: 'Public marketing dashboards are an exception and use Supabase.',
    tags: ['dashboard', 'database', 'supabase'],
    domains: ['dashboard'],
    appliesTo: ['public marketing dashboards'],
    confidence: 'medium'
  }).status, 'exception');

  assert.equal(classifyCandidateConflict(active, {
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    rule: 'For dashboard projects, use Supabase as the database.',
    summary: 'Dashboard projects use Supabase.',
    tags: ['dashboard', 'database', 'supabase'],
    domains: ['dashboard'],
    appliesTo: ['dashboard projects'],
    confidence: 'high'
  }).status, 'direct_conflict');

  assert.equal(classifyCandidateConflict([{
    id: 'mem_api_rest',
    type: 'project_decision',
    scope: 'project',
    topic: 'api protocol',
    title: 'API protocol',
    rule: 'Use REST for API clients.',
    summary: 'Use REST for API clients.',
    tags: ['api', 'rest'],
    domains: ['backend'],
    appliesTo: ['api clients'],
    confidence: 'high',
    status: 'active'
  }], {
    type: 'project_decision',
    scope: 'project',
    topic: 'api protocol',
    rule: 'Use GraphQL for API clients.',
    summary: 'Use GraphQL for API clients.',
    tags: ['api', 'graphql'],
    domains: ['backend'],
    appliesTo: ['api clients'],
    confidence: 'high'
  }).status, 'direct_conflict');

  assert.equal(classifyCandidateConflict(active, {
    type: 'project_decision',
    scope: 'project',
    topic: 'dashboard database',
    rule: 'Replace the dashboard database rule: use PostgreSQL instead of MSSQL.',
    summary: 'PostgreSQL supersedes the old MSSQL dashboard database preference.',
    tags: ['dashboard', 'database', 'postgresql'],
    domains: ['dashboard'],
    appliesTo: ['dashboard projects'],
    confidence: 'high'
  }).status, 'direct_conflict');

  assert.equal(classifyCandidateConflict(active, {
    type: 'user_preference',
    scope: 'domain',
    topic: 'dashboard database',
    rule: 'Maybe dashboard projects can try a hosted database later.',
    summary: 'Dashboard database direction is tentative.',
    tags: ['dashboard', 'database'],
    domains: ['dashboard'],
    appliesTo: ['dashboard projects'],
    confidence: 'low'
  }).status, 'needs_user_review');
});

test('replacement is bounded by model, domain, project, and durable memory scope', () => {
  const base = {
    id: 'mem_base',
    type: 'user_preference',
    scope: 'domain',
    topic: 'visual direction',
    title: 'Visual direction',
    rule: 'For brand landing pages, avoid generic SaaS layouts.',
    summary: 'For brand landing pages, avoid generic SaaS layouts.',
    tags: ['brand', 'landing', 'visual'],
    domains: ['landing_page'],
    appliesTo: ['landing_page work'],
    modelClass: 'domain_model',
    modelSubClass: 'domain_preference',
    confidence: 'high',
    status: 'active'
  };

  const sameCategory = classifyCandidateConflict([base], {
    ...base,
    id: 'candidate_same',
    rule: 'Replace the visual direction rule: for brand landing pages, avoid generic SaaS layouts and card-heavy dashboards.',
    summary: 'For brand landing pages, avoid generic SaaS layouts and card-heavy dashboards.',
    tags: ['brand', 'landing', 'visual', 'dashboard'],
    confidence: 'high'
  });
  assert.equal(sameCategory.status, 'supersedes');
  assert.deepEqual(sameCategory.supersedes, ['mem_base']);

  const crossModel = classifyCandidateConflict([base], {
    ...base,
    id: 'candidate_project',
    type: 'project_decision',
    scope: 'project',
    modelClass: 'project_model',
    modelSubClass: 'project_decision',
    projectId: 'boksajang',
    rule: 'Replace the visual direction rule: this project uses a dark premium 3D hero.',
    summary: 'This project uses a dark premium 3D hero.'
  });
  assert.notEqual(crossModel.status, 'supersedes');
  assert.deepEqual(crossModel.supersedes, []);

  const crossDomain = classifyCandidateConflict([base], {
    ...base,
    id: 'candidate_native',
    domains: ['native_internal_app'],
    appliesTo: ['native_internal_app work'],
    rule: 'Replace the visual direction rule: native internal apps should be clean and data-dense.',
    summary: 'Native internal apps should be clean and data-dense.'
  });
  assert.notEqual(crossDomain.status, 'supersedes');
  assert.deepEqual(crossDomain.supersedes, []);

  const crossProject = classifyCandidateConflict([{ ...base, scope: 'project', projectId: 'boksajang' }], {
    ...base,
    scope: 'project',
    projectId: 'trip-native',
    rule: 'Replace the visual direction rule for this project.',
    summary: 'This project uses a clean native workflow visual direction.'
  });
  assert.notEqual(crossProject.status, 'supersedes');
  assert.deepEqual(crossProject.supersedes, []);

  const taskContext = classifyCandidateConflict([base], {
    ...base,
    id: 'candidate_task',
    type: 'task_context',
    scope: 'task',
    modelClass: 'task_context',
    modelSubClass: 'current_task_scope',
    rule: 'Replace the visual direction rule for this task only.',
    summary: 'For this task only, use the attached visual reference.'
  });
  assert.notEqual(taskContext.status, 'supersedes');
  assert.deepEqual(taskContext.supersedes, []);

  const discardedDetail = classifyCandidateConflict([base], {
    ...base,
    id: 'candidate_discarded',
    type: 'discarded_detail',
    modelClass: 'discarded_detail',
    modelSubClass: 'discarded_detail',
    rule: 'Replace with the exact hero copy.',
    summary: 'Exact hero copy.'
  });
  assert.notEqual(discardedDetail.status, 'supersedes');
  assert.deepEqual(discardedDetail.supersedes, []);

  const successFailure = classifyCandidateConflict([{
    ...base,
    id: 'mem_success',
    type: 'success_pattern',
    modelSubClass: 'domain_success_criterion',
    rule: 'Wrapper scrolling should be reused.',
    summary: 'Wrapper scrolling should be reused.'
  }], {
    ...base,
    id: 'candidate_failure',
    type: 'failure_memory',
    modelSubClass: 'domain_failure_prevention',
    rule: 'Replace the scrolling rule: wrapper scrolling failed.',
    summary: 'Wrapper scrolling failed.'
  });
  assert.notEqual(successFailure.status, 'supersedes');
  assert.deepEqual(successFailure.supersedes, []);
});

test('active replacement discards older memory from active retrieval, wiki, and active relations', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [oldCandidate] = await extractMemoryCandidates(root, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  const oldMemory = await approveMemory(root, oldCandidate.id);

  const [replacementCandidate] = await extractMemoryCandidates(root, {
    text: 'Replace the dashboard database rule: for dashboard projects, prefer PostgreSQL instead of MSSQL.'
  });
  assert.equal(replacementCandidate.conflictStatus, 'supersedes');
  const newMemory = await approveMemory(root, replacementCandidate.id);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.some((memory) => memory.id === oldMemory.id), false);
  assert.equal(memoryIndex.memories.some((memory) => memory.id === newMemory.id && memory.status === 'active'), true);

  const brief = await generatePreTaskBrief(root, {
    task: 'Plan dashboard database work.'
  });
  assert.match(brief, /PostgreSQL/);
  assert.doesNotMatch(brief, /reporting data lives there/);

  const wiki = await readFile(storePath(root, 'wiki', 'User Preferences.md'), 'utf8');
  assert.match(wiki, /PostgreSQL/);
  assert.doesNotMatch(wiki, /reporting data lives there/);

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'memory_replaces_memory' && relation.from === newMemory.id && relation.to === oldMemory.id && relation.active === false));
  assert.equal(relationIndex.relations.some((relation) => relation.to === oldMemory.id && relation.active !== false), false);

  const doctor = await runDoctor(root);
  assert.equal(doctor.warnings.some((warning) => warning.includes(`references missing related memory ${oldMemory.id}`)), false);
});

test('active replacement clears stale concept wiki references for discarded memory', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [oldCandidate] = await extractMemoryCandidates(root, {
    text: 'For dashboard cache projects, prefer Redis because cache invalidation was already tested.'
  });
  const oldMemory = await approveMemory(root, oldCandidate.id);
  const redisWikiBefore = await readFile(storePath(root, 'wiki', 'Redis.md'), 'utf8');
  assert.match(redisWikiBefore, /For dashboard cache projects, prefer Redis/);
  assert.doesNotMatch(redisWikiBefore, /mem_[a-f0-9]+/i);

  const [replacementCandidate] = await extractMemoryCandidates(root, {
    text: 'Replace the dashboard cache rule: for dashboard cache projects, prefer Memcached instead of Redis.'
  });
  await approveMemory(root, replacementCandidate.id);

  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Redis.md'), 'utf8'), /ENOENT/);
});

test('cross-type replacement does not remove active success or failure namespace files', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [oldSuccess] = await extractMemoryCandidates(root, {
    source: { kind: 'test', userAcceptance: 'accepted', finalOutcome: 'accepted_success' },
    text: 'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.'
  });
  assert.equal(oldSuccess.status, 'active');
  const before = await loadJson(storePath(root, 'global', 'success-patterns.json'));
  assert.ok(before.memories.some((memory) => memory.id === oldSuccess.id));

  const [replacement] = await extractMemoryCandidates(root, {
    text: 'Replace the table layout scrolling rule: do not use wrapper-based table scrolling because the user rejected that direction.'
  });
  assert.equal(replacement.status, 'quarantined');

  const after = await loadJson(storePath(root, 'global', 'success-patterns.json'));
  assert.equal(after.memories.some((memory) => memory.id === oldSuccess.id), true);
});

test('refinement merges competing memory while scoped exceptions remain conditional', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [baseCandidate] = await extractMemoryCandidates(root, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  const baseMemory = await approveMemory(root, baseCandidate.id);

  const [refinementCandidate] = await extractMemoryCandidates(root, {
    text: 'For internal dashboard reporting modules, prefer MSSQL read-only views because reporting queries must stay stable.'
  });
  assert.equal(refinementCandidate.conflictStatus, 'refinement');
  const refinedMemory = await approveMemory(root, refinementCandidate.id);

  const memoryIndexAfterRefinement = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndexAfterRefinement.memories.some((memory) => memory.id === baseMemory.id), false);
  assert.equal(memoryIndexAfterRefinement.memories.filter((memory) => memory.topic === 'dashboard database' && memory.status === 'active').length, 1);
  assert.equal(memoryIndexAfterRefinement.memories[0].id, refinedMemory.id);

  const [exceptionCandidate] = await extractMemoryCandidates(root, {
    text: 'Except for public marketing dashboards, use Supabase instead of MSSQL.'
  });
  assert.equal(exceptionCandidate.conflictStatus, 'exception');
  const exceptionMemory = await approveMemory(root, exceptionCandidate.id);

  const internalBrief = await generatePreTaskBrief(root, {
    task: 'Tune internal dashboard reporting database queries.'
  });
  assert.match(internalBrief, /MSSQL read-only views/);
  assert.doesNotMatch(internalBrief, /public marketing dashboards/);

  const marketingBrief = await generatePreTaskBrief(root, {
    task: 'Build public marketing dashboard database integration.'
  });
  assert.match(marketingBrief, /public marketing dashboards/);
  assert.match(marketingBrief, new RegExp(exceptionMemory.id));
});

test('failure memory injects prevention rules and links to success patterns and relation graph', async () => {
  const root = await makeWorkspace();
  const { projectId } = await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    manualReview: true,
    text: [
      'Global body overflow changes caused layout regressions before; prevent this by using component-level wrapper scrolling.',
      'Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.'
    ].join('\n')
  });
  for (const candidate of candidates) {
    await approveMemory(root, candidate.id);
  }

  const brief = await generatePreTaskBrief(root, {
    task: 'Fix dashboard table scrolling without global body overflow changes.'
  });
  assert.match(brief, /Known Failure Risks:\n- .*body overflow/s);
  assert.match(brief, /Prevention: using component-level wrapper scrolling/s);
  assert.match(brief, /Alternative: .*Wrapper-based table scrolling/s);

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'failure_prevented_by_rule' && relation.projectId === projectId));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'success_resolves_failure'));

  const failureWiki = await readFile(storePath(root, 'wiki', 'Agent Failure Patterns.md'), 'utf8');
  assert.match(failureWiki, /\[\[Agent Failure Patterns\/Global body overflow changes caused layout regressions b/);
  assert.match(failureWiki, /Summary: Global body overflow changes caused layout regressions before; prevent this by using component-level wrapper scrolling\./);
  assert.doesNotMatch(failureWiki, /\[\[Agent Failure Patterns\/Global body overflow changes caused layout regressions before; prevent this by using component-level wrapper scrolling/);
  const memoryNotes = await listMemoryNoteFiles(root);
  const noteText = (await Promise.all(memoryNotes.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.match(noteText, /\[\[Prevention Rules\]\]/);
  assert.match(noteText, /\[\[Agent Success Patterns\]\]|\[\[Success Patterns\]\]/);
});

test('user pattern memory is auto-curated and applied by situation-aware context', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    text: [
      'When validating code changes, prefer running npm.cmd test and npm.cmd run check before claiming completion.',
      'I prefer the work process to inspect the repository first, make small scoped edits, and report commands run.',
      'Design philosophy: preserve existing architecture and avoid one-off patches.',
      'The agent repeatedly fails by claiming completion before running verification; prevent this by running checks first.',
      'The agent succeeded by using a short plan and focused tests before code.'
    ].join('\n')
  });

  assert.ok(byType(candidates, 'validation_pattern'));
  assert.ok(byType(candidates, 'process_pattern'));
  assert.ok(byType(candidates, 'design_philosophy'));
  assert.ok(byType(candidates, 'agent_failure_pattern'));
  assert.ok(byType(candidates, 'agent_success_pattern'));
  assert.equal(candidates.every((candidate) => candidate.status === 'active'), true);

  for (const candidate of candidates) {
    await approveMemory(root, candidate.id);
  }

  const verificationBrief = await generatePreTaskBrief(root, {
    task: 'Verify the package after implementation.'
  });
  assert.match(verificationBrief, /Relevant Validation Patterns:\n- .*npm\.cmd test/s);
  assert.match(verificationBrief, /Known Failure Risks:\n- .*claiming completion before running verification/s);

  const architectureContext = await generateContextPack(root, {
    task: 'Plan architecture changes for memory replacement.'
  });
  assert.match(architectureContext, /Relevant Design Philosophy:\n- .*preserve existing architecture/s);
  assert.match(architectureContext, /Relevant Process Patterns:\n- .*inspect the repository first/s);

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'user_prefers_validation'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'user_prefers_process'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'agent_failed_by_pattern'));

  for (const pageName of ['User Patterns.md', 'Design Philosophy.md', 'Validation Patterns.md', 'Process Patterns.md', 'Agent Failure Patterns.md', 'Agent Success Patterns.md', 'Prevention Rules.md']) {
    const text = await readFile(storePath(root, 'wiki', pageName), 'utf8');
    assert.match(text, /VIBEBOX:BEGIN/);
  }
});

test('locale controls human-facing headings and localized wiki filenames while JSON fields stay English', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    text: '검증할 때는 완료를 말하기 전에 npm.cmd test를 먼저 실행하는 방식을 선호한다.'
  });
  assert.equal(candidate.type, 'validation_pattern');
  await approveMemory(root, candidate.id);

  const briefKo = await generatePreTaskBrief(root, {
    task: '검증 절차를 확인한다.'
  });
  assert.match(briefKo, /VibeBox 사전 작업 브리프/);
  assert.match(briefKo, /관련 검증 패턴/);
  assert.match(briefKo, /검증할 때는 완료를 말하기 전에/);

  const wikiRegistry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const validationDoc = wikiRegistry.docs.find((doc) => doc.docKey === 'validation_patterns');
  assert.equal(validationDoc.fileName, '검증 패턴.md');

  const wikiKo = await readFile(storePath(root, 'wiki', validationDoc.fileName), 'utf8');
  assert.match(wikiKo, /# 검증 패턴/);
  assert.doesNotMatch(wikiKo, /\[\[Validation Patterns\]\]/);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'patternType'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'summary'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'modelClass'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'docKey'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], '관련검증패턴'), false);

  process.env.VIBEBOX_LOCALE = 'en-US';
  const briefEn = await generatePreTaskBrief(root, {
    task: 'Verify the package.'
  });
  assert.doesNotMatch(briefEn, /VibeBox Pre-Task Brief/);
  assert.doesNotMatch(briefEn, /Relevant Validation Patterns/);
  assert.match(briefEn, /\uAC80\uC99D\uD560 \uB54C\uB294 \uC644\uB8CC\uB97C/);
});

test('memoryLanguage stores BCP 47 tags and applies language in the Obsidian display layer', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const configPath = storePath(root, 'config.json');
  const config = await loadJson(configPath);
  await writeFile(configPath, JSON.stringify({
    ...config,
    locale: 'en-US',
    memoryLanguage: 'ko-KR',
    outputLanguage: 'ko-KR',
    wikiLanguage: 'ko-KR',
    reportLanguage: 'ko-KR',
    contextLanguage: 'ko-KR'
  }, null, 2), 'utf8');
  process.env.VIBEBOX_LOCALE = 'en-US';

  const result = await afterTask(root, {
    userRequest: 'Before coding, create a concise plan.',
    aiActionSummary: 'Used wrapper-based implementation, validation passed, and this reusable approach should be reused.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  assert.ok(result.candidates.some((candidate) => candidate.status === 'active'));
  const updatedConfig = await loadJson(configPath);
  assertBcp47Tag(updatedConfig.locale, 'locale');
  for (const key of LANGUAGE_CONFIG_KEYS.filter((item) => item !== 'locale')) {
    assert.equal(updatedConfig[key], 'ko-KR');
    assertBcp47Tag(updatedConfig[key], key);
  }
  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const text = memoryIndex.memories.map(memoryText).join('\n');
  assert.match(text, /Before coding|validation passed/i);
  assert.doesNotMatch(text, /User request|English file/i);
  assert.ok(memoryIndex.memories.some((memory) => memory.displayLanguage === 'ko-KR'));
  const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.match(home, /\uAD6C\uD604 \uC804\uC5D0|\uAC80\uC99D\uC744 \uD1B5\uACFC/);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'summary'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], '\uC694\uC57D'), false);
});

test('user request model extraction separates user, domain, project, task, and discarded detail', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    text: EXAMPLE_A,
    manualReview: true
  });

  assert.ok(candidates.some((candidate) => candidate.modelClass === 'user_model' && candidate.modelSubClass === 'reference_handling_model'));
  assert.ok(candidates.some((candidate) => candidate.modelClass === 'domain_model' && /dark premium|3D hero|generic SaaS/i.test(candidate.summary)));
  assert.ok(candidates.some((candidate) => candidate.modelClass === 'project_model' && /logo\.webp|SEO\/head|language toggle/i.test(candidate.summary)));
  assert.ok(candidates.some((candidate) => candidate.modelClass === 'task_context' && /only edit index\.html/i.test(candidate.summary)));
  assert.ok(candidates.some((candidate) => candidate.modelClass === 'task_context' && candidate.modelSubClass === 'current_implementation_constraint' && /npm\/build tooling|fake plugins/i.test(candidate.summary)));
  assert.ok(candidates.some((candidate) => candidate.modelClass === 'task_context' && candidate.modelSubClass === 'current_validation_checklist' && /Final report should include|Before reporting completion/i.test(candidate.summary)));
  assert.equal(candidates.some((candidate) => candidate.scope === 'global' && /npm\/build tooling|fake plugins|logo\.webp|SEO\/language logic/i.test(candidate.summary)), false);
  assert.ok(candidates.some((candidate) => candidate.status === 'pending' && candidate.scope === 'task'));
  assert.equal(candidates.some((candidate) => candidate.summary === EXAMPLE_A), false);
  assertNoParserLabels(candidates);

  const autoRoot = await makeWorkspace();
  await initVibeBox(autoRoot);
  const autoCandidates = await extractMemoryCandidates(autoRoot, { text: EXAMPLE_A });
  const autoIndex = await loadJson(storePath(autoRoot, 'index', 'global-memory-index.json'));
  assert.ok(autoCandidates.some((candidate) => candidate.status === 'discarded' && candidate.modelClass === 'task_context' && /npm\/build tooling|fake plugins/i.test(candidate.summary)));
  assert.equal(autoIndex.memories.some((memory) => memory.scope === 'global' && /npm\/build tooling|fake plugins|logo\.webp|SEO\/language logic/i.test(memory.summary)), false);
  assertNoParserLabels(autoIndex.memories);

  const indexBeforeSummaryOnly = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const fromSummaryOnly = await extractMemoryCandidates(root, {
    aiActionSummary: 'Do not modify package.json unless explicitly requested.'
  });
  assert.equal(fromSummaryOnly.length, 0);
  const indexAfterSummaryOnly = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.deepEqual(indexAfterSummaryOnly.memories, indexBeforeSummaryOnly.memories);
  const isolatedRoot = await mkdtemp(path.join(os.tmpdir(), 'vibebox-summary-only-'));
  process.env.VIBEBOX_HOME = storePath(isolatedRoot);
  const isolatedFromSummaryOnly = await extractMemoryCandidates(isolatedRoot, {
    aiActionSummary: 'Do not modify package.json unless explicitly requested.'
  });
  assert.equal(isolatedFromSummaryOnly.length, 0);
  await assert.rejects(() => access(storePath(isolatedRoot)), /ENOENT/);
});

test('cross-project generalization keeps landing-page visual details out of native app guidance', async () => {
  const root = await makeWorkspace();
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'boksajang-web' }, null, 2), 'utf8');
  const nativeRoot = await mkdtemp(path.join(os.tmpdir(), 'vibebox-native-app-'));
  await writeFile(path.join(nativeRoot, 'package.json'), JSON.stringify({ name: 'trip-native' }, null, 2), 'utf8');
  await initVibeBox(root);

  await extractMemoryCandidates(root, { text: EXAMPLE_A });
  const nativeCandidates = await extractMemoryCandidates(nativeRoot, { text: EXAMPLE_B });
  assert.ok(nativeCandidates.some((candidate) => candidate.modelClass === 'user_model' && /subagent workflow|concise plan|changed files/i.test(candidate.summary)));
  assert.ok(nativeCandidates.some((candidate) => candidate.modelClass === 'domain_model' && /clean, practical|flashy 3D hero|touch targets|data clarity/i.test(candidate.summary)));
  assert.ok(nativeCandidates.some((candidate) => candidate.modelClass === 'project_model' && /business trip approval|expense tracking/i.test(candidate.summary)));

  const brief = await generatePreTaskBrief(nativeRoot, {
    task: 'Build native business trip approval and expense tracking screens with receipt attachment.'
  });
  const context = await generateContextPack(nativeRoot, {
    task: 'Build native business trip approval and expense tracking screens with receipt attachment.'
  });
  const combinedGuidance = `${brief}\n${context}`;
  assert.match(combinedGuidance, /subagent workflow|concise plan|changed files|validation result/i);
  assert.doesNotMatch(combinedGuidance, /dark premium brand landing|cyan\/blue\/violet|BOKSAJANG should feel|logo\.webp|SEO\/head|one-page landing/i);
});

test('localized Obsidian doc registry uses Korean filenames and valid managed links', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    text: 'Before coding, create a concise plan. Final report should include changed files and validation result.'
  });
  assert.ok(candidates.length > 0);

  const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const processDoc = registry.docs.find((doc) => doc.docKey === 'process_patterns');
  const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.equal(processDoc.fileName, '처리 방식.md');
  assert.match(home, /\[\[처리 방식\]\]/);
  await readFile(storePath(root, 'wiki', processDoc.fileName), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.ok(Object.keys(relationIndex.nodes).every((key) => key.startsWith('mem_')));
  const doctor = await runDoctor(root);
  assert.equal(doctor.warnings.some((warning) => warning.includes('Wiki link target is missing')), false);
});

test('Korean wiki display localizes recent active memory, AI failures, AI successful approaches, and memory notes', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: 'Before coding, create a concise plan. Final report should include changed files and validation result.',
    aiActionSummary: 'Recovered by using npm.cmd test instead of npm test.',
    errors: ['Command failed: npm test exited with code 1 because the npm shim was unavailable.'],
    commandResults: ['Validation passed. npm.cmd test passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'ai_failure_memory'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'ai_successful_approach'));

  const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.match(home, /\uCD5C\uADFC \uD65C\uC131 \uBA54\uBAA8\uB9AC/);
  assert.match(home, /\uAD6C\uD604 \uC804\uC5D0 \uAC04\uACB0\uD55C \uACC4\uD68D\uC744 \uC138\uC6B4\uB2E4/);
  assert.match(home, /\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328|\uBC18\uBCF5 \uAE08\uC9C0/);
  assert.match(home, /AI \uC131\uACF5 \uC811\uADFC/);
  assert.doesNotMatch(home, /Command failed:|Agent succeeded by|Do not repeat this failed approach/i);

  const memoryNoteFiles = await listMemoryNoteFiles(root);
  assert.ok(memoryNoteFiles.length >= 3);
  const memoryNoteText = (await Promise.all(memoryNoteFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.match(memoryNoteText, /memoryNote: true/);
  assert.match(memoryNoteText, /\uC694\uC57D/);
  assert.match(memoryNoteText, /\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328|\uBC18\uBCF5 \uAE08\uC9C0/);
  assert.doesNotMatch(memoryNoteText, /Command failed:|Agent succeeded by|Do not repeat this failed approach/i);
  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  assert.ok(memoryNoteFiles.some((file) => wikiRelative(root, file).includes('/') && !wikiRelative(root, file).startsWith('memories/')));
  assert.ok(memoryNoteFiles.every((file) => !/mem_[a-f0-9]+/iu.test(path.basename(file))));
  assert.doesNotMatch(home, /\|.*mem_/i);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.ok(memoryIndex.memories.some((memory) => /Do not repeat this failed approach|Agent succeeded by/i.test(memory.summary)));
  await assertWikiLinksResolve(root);
  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.warnings.some((warning) => warning.includes('Wiki link target is missing')), false);
});

test('structured Korean userRequest extracts success criteria before action-summary success memory', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'boksajang' }, null, 2), 'utf8');
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: KICKER_INSTRUCTION_FIXTURE,
    aiActionSummary: 'Created a shared section-kicker style with the Vision-style cyan label, short cyan line, matching font size, letter spacing, line length, and bottom spacing; Moved the VibeBox LATEST TOOL/최신 도구 label out of the right identity bar area so it appears first.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  assert.equal(result.event.userRequest, KICKER_INSTRUCTION_FIXTURE);
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.status === 'active'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'project_model' && candidate.sourceProjectId === 'boksajang'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'user_model'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'domain_model'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'validation_pattern' && candidate.memoryRole === 'user_success_criteria'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'prevention_rule' && candidate.memoryRole === 'ai_failure_memory'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'task_context' && candidate.status === 'discarded' && /Task context|Task-scoped/u.test(candidate.discardReason || candidate.curationReason || '')));
  assert.equal(result.candidates.every((candidate) => candidate.memoryRole === 'ai_successful_approach'), false);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const activeSuccessCriteria = memoryIndex.memories.filter((memory) => memory.memoryRole === 'user_success_criteria');
  assert.ok(activeSuccessCriteria.length >= 4);
  assert.ok(activeSuccessCriteria.some((memory) => memory.relatedCategories?.length > 1));
  assert.ok(activeSuccessCriteria.some((memory) => /THE VISION|KO \/ EN|기준|전환/u.test(memory.summary)));
  assert.equal(memoryIndex.memories.every((memory) => memory.sourceProjectId === 'boksajang'), true);

  const projectPage = await readFile(storePath(root, 'wiki', 'projects', 'boksajang.md'), 'utf8');
  assert.match(projectPage, /이 프로젝트에서 관찰된 사용자 성공 기준/);
  assert.match(projectPage, /이 프로젝트에서 관찰된 사용자 성향\/패턴/);
  assert.match(projectPage, /이 프로젝트의 검증\/보존 규칙/);
  assert.match(projectPage, /\[\[.*\|.*\]\]/);
  assert.doesNotMatch(projectPage, /Created a shared section-kicker style/);

  const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.match(home, /최근 활성 메모리/);
  assert.match(home, /사용자는 같은 역할의 요소|이 프로젝트에서는/);
  assert.doesNotMatch(home, /Created a shared section-kicker style/);
});

test('structured extraction generalizes beyond the kicker fixture without fixture-specific branches', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'travel-ops-native' }, null, 2), 'utf8');
  await initVibeBox(root);

  assert.doesNotMatch(NON_KICKER_GENERALIZATION_FIXTURE, /kicker|Vision|THE VISION|BOKSAJANG|section label|섹션|키커|라벨|시안|민트/iu);

  const result = await afterTask(root, {
    userRequest: NON_KICKER_GENERALIZATION_FIXTURE,
    aiActionSummary: 'Implemented shared navigation alignment and verified mode switching.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'project_model' && candidate.sourceProjectId === 'travel-ops-native'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'user_model'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'validation_pattern'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'prevention_rule' && candidate.memoryRole === 'ai_failure_memory'));
  assert.ok(result.candidates.some((candidate) => candidate.relatedCategories?.length > 1));

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'user_success_criteria' && /Settings|iOS \/ Android|내비게이션|전환/u.test(memory.summary)));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'user_success_criteria' && memory.relatedCategories?.includes('user_patterns')));
  assert.ok(memoryIndex.memories.some((memory) => memory.memoryRole === 'ai_failure_memory' && memory.relatedCategories?.includes('agent_failure_patterns')));

  const projectPage = await readFile(storePath(root, 'wiki', 'projects', 'travel-ops-native.md'), 'utf8');
  assert.match(projectPage, /이 프로젝트에서 관찰된 사용자 성공 기준/);
  assert.match(projectPage, /이 프로젝트에서 발생한 AI 실패/);
  assert.match(projectPage, /\[\[.*\|.*\]\]/);

  const source = await readFile(path.resolve('src/core.mjs'), 'utf8');
  assert.doesNotMatch(source, /THE VISION|BOKSAJANG|LATEST TOOL|section-kicker|키커/iu);
});

test('Flovix language policy instruction creates event, active memory, multi-category wiki links, and project samples', async () => {
  const root = await makeWorkspace();
  delete process.env.VIBEBOX_LOCALE;
  process.env.VIBEBOX_LANGUAGE = 'ko-KR';
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'flovix' }, null, 2), 'utf8');
  await initVibeBox(root);
  delete process.env.VIBEBOX_LANGUAGE;

  assert.doesNotMatch(FLOVIX_LANGUAGE_POLICY_FIXTURE, /kicker|Vision|THE VISION|BOKSAJANG|section label/iu);

  const result = await afterTask(root, {
    userRequest: FLOVIX_LANGUAGE_POLICY_FIXTURE,
    aiActionSummary: 'Implemented generated content language metadata, DESIGN.md export choices, and source notes preservation.',
    commandResults: ['npm.cmd --prefix apps/workbench run build passed.', 'git diff --check passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  assert.equal(result.event.projectId, 'flovix');
  assert.equal(result.event.userRequest, FLOVIX_LANGUAGE_POLICY_FIXTURE);
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.sourceProjectId === 'flovix'));
  assert.ok(result.candidates.some((candidate) => candidate.memoryRole === 'user_success_criteria' && candidate.modelClass === 'project_model'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'validation_pattern'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'prevention_rule' && candidate.memoryRole === 'ai_failure_memory'));

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.match(events.at(-1).userRequest, /Generated Content Language Policy \+ DESIGN Export Finalization 0\.1/);

  const config = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(config, 'ko-KR');
  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const activeSuccessCriteria = memoryIndex.memories.filter((memory) => memory.memoryRole === 'user_success_criteria' && memory.sourceProjectId === 'flovix');
  assert.ok(activeSuccessCriteria.some((memory) => /Flovix|DESIGN\.md|userLanguage|language metadata/u.test(memory.summary)));
  assert.ok(activeSuccessCriteria.some((memory) => memory.relatedCategories?.length > 1));
  const primaryCategories = new Set(activeSuccessCriteria.map((memory) => memory.primaryCategory));
  assert.ok(primaryCategories.size > 1);
  assert.notEqual(activeSuccessCriteria.every((memory) => memory.primaryCategory === 'success_patterns'), true);
  assert.ok(activeSuccessCriteria.some((memory) => ['design_philosophy', 'process_patterns', 'validation_patterns'].includes(memory.primaryCategory)));

  const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  assert.equal(registry.languageTag, 'ko-KR');
  const noteFiles = await listMemoryNoteFiles(root);
  const noteById = new Map();
  for (const file of noteFiles) {
    const text = await readFile(file, 'utf8');
    const id = text.match(/^id:\s*"?([^"\n]+)"?\s*$/mu)?.[1];
    if (id) noteById.set(id, { file, text, target: wikiRelative(root, file).replace(/\.md$/u, '') });
  }
  const sampleMemory = activeSuccessCriteria.find((memory) => noteById.has(memory.id) && memory.relatedCategories?.length > 1);
  assert.ok(sampleMemory);
  const sampleNote = noteById.get(sampleMemory.id);
  assert.ok(sampleNote.target.includes('/'));
  assert.doesNotMatch(path.basename(sampleNote.file), /mem_/iu);
  assert.ok(path.basename(sampleNote.file).length <= 64);
  assert.doesNotMatch(sampleNote.target, /이 프로젝트에서는 Project Flovix 기준/u);
  assert.match(sampleNote.target, /AI 생성 설명문은 사용자 언어를 따른다|DESIGN export 전 source notes 확인/u);

  const primaryPage = await readFile(storePath(root, 'wiki', registry.docs.find((doc) => doc.docKey === sampleMemory.primaryCategory).fileName), 'utf8');
  assert.match(primaryPage, new RegExp(`\\[\\[${sampleNote.target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  const relatedPage = await readFile(storePath(root, 'wiki', registry.docs.find((doc) => doc.docKey === sampleMemory.relatedCategories[0]).fileName), 'utf8');
  assert.match(relatedPage, new RegExp(`\\[\\[${sampleNote.target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));

  const projectPage = await readFile(storePath(root, 'wiki', 'projects', 'flovix.md'), 'utf8');
  assert.match(projectPage, /\uC0AC\uC6A9\uC790 \uC131\uACF5 \uAE30\uC900/);
  assert.match(projectPage, new RegExp(`\\[\\[${sampleNote.target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(sampleNote.text, /\[\[projects\/flovix\|flovix\]\]/);
  const keywordIndex = await loadJson(storePath(root, 'index', 'keyword-index.json'));
  assert.ok((keywordIndex.projects.flovix || []).includes(sampleMemory.id));
  const projectIndex = await loadJson(storePath(root, 'index', 'project-index.json'));
  const flovixProject = projectIndex.projects.find((project) => project.projectId === 'flovix');
  assert.ok(flovixProject.memoryCount >= activeSuccessCriteria.length);
  await assertWikiLinksResolve(root);
});

test('multi-category graph links one canonical note from every related category and source project', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'boksajang' }, null, 2), 'utf8');
  await initVibeBox(root);

  await afterTask(root, {
    userRequest: KICKER_INSTRUCTION_FIXTURE,
    aiActionSummary: 'Implemented the requested alignment and verified language switching.',
    commandResults: ['Validation passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const consistencyMemory = memoryIndex.memories.find((memory) => (
    memory.primaryCategory === 'user_patterns'
    && memory.relatedCategories?.includes('user_preferences')
    && memory.relatedCategories?.includes('design_philosophy')
    && memory.relatedCategories?.includes('success_patterns')
    && memory.relatedCategories?.includes('decision_patterns')
    && memory.relatedCategories?.includes('process_patterns')
  ));
  assert.ok(consistencyMemory);
  assert.equal(consistencyMemory.projectId || null, null);
  assert.equal(consistencyMemory.sourceProjectId, 'boksajang');

  const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const folderFor = (docKey) => path.basename(registry.docs.find((doc) => doc.docKey === docKey).fileName, '.md');
  const noteFiles = await listMemoryNoteFiles(root);
  const matchingNotes = [];
  for (const file of noteFiles) {
    const text = await readFile(file, 'utf8');
    if (new RegExp(`^id:\\s*"?${consistencyMemory.id}"?\\s*$`, 'mu').test(text)) {
      matchingNotes.push({ file, text, target: wikiRelative(root, file).replace(/\.md$/u, '') });
    }
  }
  assert.equal(matchingNotes.length, 1);
  const [note] = matchingNotes;
  assert.ok(wikiRelative(root, note.file).startsWith(`${folderFor('user_patterns')}/`));
  assert.doesNotMatch(path.basename(note.file), /mem_/iu);
  assert.match(note.text, /relatedCategories:/);
  assert.match(note.text, /\[\[projects\/boksajang\|boksajang\]\]/);

  for (const docKey of ['user_patterns', ...consistencyMemory.relatedCategories]) {
    const pageName = registry.docs.find((doc) => doc.docKey === docKey).fileName;
    const page = await readFile(storePath(root, 'wiki', pageName), 'utf8');
    assert.match(page, new RegExp(`\\[\\[${note.target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`), `${docKey} should link the canonical note`);
  }

  const projectPage = await readFile(storePath(root, 'wiki', 'projects', 'boksajang.md'), 'utf8');
  assert.match(projectPage, new RegExp(`\\[\\[${note.target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));

  const relationIndex = await loadJson(storePath(root, 'index', 'relation-index.json'));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'category_has_memory' && relation.to === consistencyMemory.id));
  assert.ok(relationIndex.relations.some((relation) => relation.type === 'project_observed_memory' && relation.to === consistencyMemory.id && relation.projectId === 'boksajang'));

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await convertLanguage(root, { from: 'ko-KR', to: 'en-US' });
  await rebuildVibeBox(root);
  delete process.env.VIBEBOX_AGENT_RUNTIME;
  const enRegistry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const enUserPatterns = await readFile(storePath(root, 'wiki', enRegistry.docs.find((doc) => doc.docKey === 'user_patterns').fileName), 'utf8');
  assert.match(enUserPatterns, /\[\[User Patterns\//);
  const enProjectPage = await readFile(storePath(root, 'wiki', 'projects', 'boksajang.md'), 'utf8');
  assert.match(enProjectPage, /\[\[User Patterns\//);
  await assertWikiLinksResolve(root);
});

test('category-based memory notes hide ids and link categories, source projects, and recent memory', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  await afterTask(root, {
    userRequest: 'When validating changes, report command results.',
    technicalOutcome: 'unknown',
    userAcceptance: 'unknown'
  });
  await afterTask(root, {
    userRequest: 'Before coding, create a concise plan. Final report should include changed files and validation result.',
    aiActionSummary: 'Recovered by using npm.cmd test instead of npm test.',
    errors: ['Command failed: npm test exited with code 1 because the npm shim was unavailable.'],
    commandResults: ['Validation passed. npm.cmd test passed.'],
    technicalOutcome: 'success',
    userAcceptance: 'unknown'
  });

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const processMemory = memoryIndex.memories.find((memory) => memory.type === 'process_pattern' && memory.memoryRole === 'user_success_criteria');
  const responseMemory = memoryIndex.memories.find((memory) => memory.type === 'response_preference' && memory.memoryRole === 'user_success_criteria');
  const validationMemory = memoryIndex.memories.find((memory) => memory.type === 'validation_pattern' && memory.memoryRole === 'user_success_criteria');
  const failureMemory = memoryIndex.memories.find((memory) => memory.memoryRole === 'ai_failure_memory' && memory.type === 'agent_failure_pattern');
  const preventionMemory = memoryIndex.memories.find((memory) => memory.memoryRole === 'ai_failure_memory' && memory.type === 'prevention_rule');
  const successMemory = memoryIndex.memories.find((memory) => memory.memoryRole === 'ai_successful_approach');
  assert.ok(processMemory);
  assert.ok(responseMemory);
  assert.ok(validationMemory);
  assert.ok(failureMemory);
  assert.ok(preventionMemory);
  assert.ok(successMemory);

  const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const folderFor = (docKey) => path.basename(registry.docs.find((doc) => doc.docKey === docKey).fileName, '.md');
  const noteFiles = await listMemoryNoteFiles(root);
  const notes = new Map();
  for (const file of noteFiles) {
    const text = await readFile(file, 'utf8');
    const id = text.match(/^id:\s*"?(mem_[a-f0-9]+)"?\s*$/mu)?.[1];
    if (id) notes.set(id, { file, text, relative: wikiRelative(root, file), target: wikiRelative(root, file).replace(/\.md$/u, '') });
  }

  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  for (const memory of [processMemory, responseMemory, validationMemory, failureMemory, preventionMemory, successMemory]) {
    const note = notes.get(memory.id);
    assert.ok(note, `missing note for ${memory.id}`);
    assert.doesNotMatch(path.basename(note.file), /mem_/i);
    assert.doesNotMatch(note.text.match(/^title:\s*(.+)$/mu)?.[1] || '', /mem_/i);
    assert.doesNotMatch(note.text.match(/^#\s+(.+)$/mu)?.[1] || '', /mem_/i);
    assert.match(note.text, new RegExp(`^id:\\s*"?${memory.id}"?\\s*$`, 'mu'));
    assert.match(note.text, /\[\[projects\/vibebox-test-project\|vibebox-test-project\]\]/);
  }

  assert.ok(notes.get(processMemory.id).relative.startsWith(`${folderFor('process_patterns')}/`));
  assert.ok(notes.get(responseMemory.id).relative.startsWith(`${folderFor('user_preferences')}/`));
  assert.ok(notes.get(validationMemory.id).relative.startsWith(`${folderFor('validation_patterns')}/`));
  assert.ok(notes.get(failureMemory.id).relative.startsWith(`${folderFor('agent_failure_patterns')}/`));
  assert.ok(notes.get(preventionMemory.id).relative.startsWith(`${folderFor('prevention_rules')}/`));
  assert.ok(notes.get(successMemory.id).relative.startsWith(`${folderFor('agent_success_patterns')}/`));
  assert.match(notes.get(failureMemory.id).text, new RegExp(`\\[\\[${notes.get(successMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(notes.get(successMemory.id).text, new RegExp(`\\[\\[${notes.get(failureMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));

  const processPage = await readFile(storePath(root, 'wiki', registry.docs.find((doc) => doc.docKey === 'process_patterns').fileName), 'utf8');
  assert.match(processPage, new RegExp(`\\[\\[${notes.get(processMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  const projectPage = await readFile(storePath(root, 'wiki', 'projects', 'vibebox-test-project.md'), 'utf8');
  assert.match(projectPage, new RegExp(`\\[\\[${notes.get(processMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(projectPage, new RegExp(`\\[\\[${notes.get(validationMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(projectPage, new RegExp(`\\[\\[${notes.get(failureMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(projectPage, new RegExp(`\\[\\[${notes.get(preventionMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));
  assert.match(projectPage, new RegExp(`\\[\\[${notes.get(successMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`));

  const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.match(home, new RegExp(`\\[\\[${notes.get(processMemory.id).target.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\|`));
  assert.doesNotMatch(home, /\|[^|\]]*mem_/i);
  await assertWikiLinksResolve(root);
});

test('visible wiki memory note names strip memory id tokens from source text', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  await afterTask(root, {
    userRequest: 'Never expose mem_deadbeef in wiki titles or filenames.',
    technicalOutcome: 'unknown',
    userAcceptance: 'unknown'
  });

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  const idMentionMemory = memoryIndex.memories.find((memory) => /mem_deadbeef/u.test(memory.summary || ''));
  assert.ok(idMentionMemory);

  const noteFiles = await listMemoryNoteFiles(root);
  const note = await Promise.all(noteFiles.map(async (file) => ({ file, text: await readFile(file, 'utf8') })))
    .then((notes) => notes.find((item) => new RegExp(`^id:\\s*"?${idMentionMemory.id}"?\\s*$`, 'mu').test(item.text)));
  assert.ok(note);
  assert.doesNotMatch(path.basename(note.file), /mem_/i);
  assert.doesNotMatch(note.text.match(/^title:\s*(.+)$/mu)?.[1] || '', /mem_/i);
  assert.doesNotMatch(note.text.match(/^#\s+(.+)$/mu)?.[1] || '', /mem_/i);
  assert.doesNotMatch(note.text.replace(/^---[\s\S]*?---/u, ''), /mem_deadbeef/i);

  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.warnings.some((warning) => warning.includes('exposes memory id')), false);
});

test('doctor avoids global-store false positives and warns about user-home registry pollution without mutating registry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-global-store-'));
  process.env.VIBEBOX_HOME = path.join(root, '.vibebox');
  process.env.VIBEBOX_LOCALE = 'en-US';
  await initVibeBox(root);

  const before = await readFile(path.join(process.env.VIBEBOX_HOME, 'registry', 'projects.json'), 'utf8');
  const report = await runDoctor(root);
  const after = await readFile(path.join(process.env.VIBEBOX_HOME, 'registry', 'projects.json'), 'utf8');
  assert.equal(before, after);
  assert.equal(report.warnings.some((warning) => warning.includes('project-local .vibebox')), false);

  const registryPath = path.join(process.env.VIBEBOX_HOME, 'registry', 'projects.json');
  const registry = JSON.parse(before);
  registry.projects.push({ projectId: 'home', rootPath: os.homedir(), projectName: 'home' });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  const polluted = await runDoctor(root);
  assert.ok(polluted.warnings.some((warning) => warning.includes('non-project root')));
});

test('init registers plain working folders as projects while keeping home and global-store roots virtual', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-non-project-'));
  process.env.VIBEBOX_HOME = path.join(root, '.vibebox');
  process.env.VIBEBOX_LOCALE = 'en-US';
  const result = await initVibeBox(root);
  const expectedProjectId = path.basename(root).toLowerCase();
  assert.equal(result.projectId, expectedProjectId);

  const registry = await loadJson(path.join(process.env.VIBEBOX_HOME, 'registry', 'projects.json'));
  assert.equal(registry.projects.some((project) => project.projectId === expectedProjectId && project.rootPath === root), true);
  await readFile(path.join(process.env.VIBEBOX_HOME, 'wiki', 'projects', `${expectedProjectId}.md`), 'utf8');
  await assert.rejects(() => readFile(path.join(process.env.VIBEBOX_HOME, 'wiki', 'projects', 'global-store.md'), 'utf8'), /ENOENT/);
  await assert.rejects(() => readFile(path.join(process.env.VIBEBOX_HOME, 'projects', 'global-store', 'project.json'), 'utf8'), /ENOENT/);

  const plainDoctor = await runDoctor(root);
  assert.equal(plainDoctor.ok, true);
  assert.equal(plainDoctor.currentProjectId, expectedProjectId);

  const storeRootResult = await initVibeBox(process.env.VIBEBOX_HOME);
  assert.equal(storeRootResult.projectId, null);
  const registryAfterStoreRoot = await loadJson(path.join(process.env.VIBEBOX_HOME, 'registry', 'projects.json'));
  assert.equal(registryAfterStoreRoot.projects.some((project) => project.projectId === 'global-store'), false);

  const doctor = await runDoctor(process.env.VIBEBOX_HOME);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.warnings.some((warning) => warning.includes('global-store')), false);

  const homeLikeResult = await initVibeBox(os.homedir());
  assert.equal(homeLikeResult.projectId, null);
});

test('init registers static, PHP, JSON-only, package, and git working folders as projects', async () => {
  const store = await mkdtemp(path.join(os.tmpdir(), 'vibebox-project-detection-store-'));
  process.env.VIBEBOX_HOME = store;
  process.env.VIBEBOX_LOCALE = 'en-US';

  const plain = await mkdtemp(path.join(os.tmpdir(), 'vibebox-plain-folder-'));
  const plainResult = await initVibeBox(plain);
  assert.equal(plainResult.projectId, path.basename(plain).toLowerCase());
  await readFile(path.join(store, 'wiki', 'projects', `${plainResult.projectId}.md`), 'utf8');

  const staticProject = await mkdtemp(path.join(os.tmpdir(), 'vibebox-static-site-'));
  await writeFile(path.join(staticProject, 'index.html'), '<!doctype html><title>Static</title>\n', 'utf8');
  const staticResult = await initVibeBox(staticProject);
  assert.equal(staticResult.projectId, path.basename(staticProject).toLowerCase());
  await readFile(path.join(store, 'wiki', 'projects', `${staticResult.projectId}.md`), 'utf8');

  const phpProject = await mkdtemp(path.join(os.tmpdir(), 'vibebox-php-site-'));
  await writeFile(path.join(phpProject, 'index.php'), '<?php echo "ok";\n', 'utf8');
  const phpResult = await initVibeBox(phpProject);
  assert.equal(phpResult.projectId, path.basename(phpProject).toLowerCase());
  await readFile(path.join(store, 'wiki', 'projects', `${phpResult.projectId}.md`), 'utf8');

  const jsonProject = await mkdtemp(path.join(os.tmpdir(), 'vibebox-json-app-'));
  await writeFile(path.join(jsonProject, 'app.json'), JSON.stringify({ name: 'json app' }, null, 2), 'utf8');
  const jsonResult = await initVibeBox(jsonProject);
  assert.equal(jsonResult.projectId, path.basename(jsonProject).toLowerCase());
  await readFile(path.join(store, 'wiki', 'projects', `${jsonResult.projectId}.md`), 'utf8');

  const packageProject = await mkdtemp(path.join(os.tmpdir(), 'vibebox-package-project-'));
  await writeFile(path.join(packageProject, 'package.json'), JSON.stringify({ name: 'package-project' }, null, 2), 'utf8');
  const packageResult = await initVibeBox(packageProject);
  assert.equal(packageResult.projectId, 'package-project');
  await readFile(path.join(store, 'wiki', 'projects', 'package-project.md'), 'utf8');

  const gitProject = await mkdtemp(path.join(os.tmpdir(), 'vibebox-git-project-'));
  await mkdir(path.join(gitProject, '.git'), { recursive: true });
  await writeFile(path.join(gitProject, '.git', 'config'), '[remote "origin"]\n\turl = https://github.com/acme/git-project.git\n', 'utf8');
  const gitResult = await initVibeBox(gitProject);
  assert.equal(gitResult.projectId, 'git-project');
  await readFile(path.join(store, 'wiki', 'projects', 'git-project.md'), 'utf8');

  const registry = await loadJson(path.join(store, 'registry', 'projects.json'));
  assert.equal(registry.projects.some((project) => project.projectId === 'global-store'), false);
  assert.equal(registry.projects.some((project) => project.rootPath === plain), true);
});

test('excluded internal, cache, node_modules, and global-store child paths stay virtual', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-excluded-paths-'));
  const store = path.join(root, 'store');
  process.env.VIBEBOX_HOME = store;
  process.env.VIBEBOX_LOCALE = 'en-US';
  await initVibeBox(root);

  const excludedRoots = [
    store,
    path.join(store, 'wiki'),
    path.join(root, '.codex', 'plugins'),
    path.join(root, '.agents', 'plugins'),
    path.join(root, 'node_modules', 'pkg'),
    path.join(root, 'plugins', 'cache', 'vibebox')
  ];
  for (const excludedRoot of excludedRoots) {
    await mkdir(excludedRoot, { recursive: true });
    const result = await initVibeBox(excludedRoot);
    assert.equal(result.projectId, null, excludedRoot);
  }

  const registry = await loadJson(path.join(store, 'registry', 'projects.json'));
  assert.equal(registry.projects.some((project) => project.projectId === 'global-store'), false);
  assert.equal(registry.projects.some((project) => project.rootPath && project.rootPath.includes(`${path.sep}.codex${path.sep}`)), false);
  assert.equal(registry.projects.some((project) => project.rootPath && project.rootPath.includes(`${path.sep}.agents${path.sep}`)), false);
  assert.equal(registry.projects.some((project) => project.rootPath && project.rootPath.includes(`${path.sep}node_modules${path.sep}`)), false);
});

test('aftertask records non-null project ids for plain, static, PHP, and JSON-only workspaces', async () => {
  const store = await mkdtemp(path.join(os.tmpdir(), 'vibebox-aftertask-store-'));
  process.env.VIBEBOX_HOME = store;
  process.env.VIBEBOX_LOCALE = 'en-US';
  const projects = [
    { prefix: 'vibebox-aftertask-plain-', file: null },
    { prefix: 'vibebox-aftertask-static-', file: ['index.html', '<!doctype html><title>Static</title>\n'] },
    { prefix: 'vibebox-aftertask-php-', file: ['index.php', '<?php echo "ok";\n'] },
    { prefix: 'vibebox-aftertask-json-', file: ['app.json', '{"name":"json-only"}\n'] }
  ];

  for (const project of projects) {
    const root = await mkdtemp(path.join(os.tmpdir(), project.prefix));
    if (project.file) {
      await writeFile(path.join(root, project.file[0]), project.file[1], 'utf8');
    }
    const result = await afterTask(root, {
      userRequest: 'We confirmed this project uses static files and minimal tooling after rejecting unnecessary framework setup.',
      aiActionSummary: 'Recorded the project workspace decision.',
      technicalOutcome: 'success',
      userAcceptance: 'accepted'
    });
    assert.ok(result.event.projectId, root);
    assert.equal(result.event.projectId, path.basename(root).toLowerCase());
    assert.ok(result.candidates.length > 0, root);
    assert.equal(result.candidates.some((candidate) => candidate.sourceProjectId === result.event.projectId), true);
  }

  const events = await readJsonl(path.join(store, 'logs', 'events.jsonl'));
  assert.equal(events.every((event) => event.projectId), true);
});

test('aftertask with missing userRequest records the event but skips active extraction with a warning', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-empty-request-'));
  process.env.VIBEBOX_HOME = path.join(root, '.vibebox-store');
  process.env.VIBEBOX_LOCALE = 'en-US';
  const result = await afterTask(root, {
    aiActionSummary: 'Implemented the requested homepage update.',
    technicalOutcome: 'success',
    userAcceptance: 'accepted',
    changedFiles: []
  });

  assert.ok(result.event.projectId);
  assert.equal(result.candidates.length, 0);
  assert.match(result.message, /userRequest is missing; active user model extraction was skipped/);
  assert.match(result.message, /Pass the original user request with --request/);

  const memoryIndex = await loadJson(path.join(process.env.VIBEBOX_HOME, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.length, 0);
  const events = await readJsonl(path.join(process.env.VIBEBOX_HOME, 'logs', 'events.jsonl'));
  assert.equal(events.at(-1).projectId, result.event.projectId);
});

test('CLI aftertask stores --request and from-file User request sections for active extraction', async () => {
  const root = await makeWorkspace();
  const bin = path.resolve('bin/vibebox.mjs');
  function run(args) {
    return spawnSync(process.execPath, [bin, ...args], {
      cwd: root,
      env: { ...process.env },
      encoding: 'utf8'
    });
  }

  const direct = run([
    'aftertask',
    '--request',
    'Plan before coding and report changed files after validation.',
    '--summary',
    'Implemented the requested workflow and ran checks.',
    '--files',
    'src/app.mjs',
    '--command-results',
    'npm.cmd test passed',
    '--technical-outcome',
    'success',
    '--user-acceptance',
    'accepted'
  ]);
  assert.equal(direct.status, 0);
  assert.match(direct.stdout, /Auto-curated/);

  const filePath = path.join(root, 'task-result.txt');
  await writeFile(filePath, [
    'User request: Preserve SEO metadata and report changed files after validation.',
    'Summary: Updated the homepage implementation and verified language switching.',
    'Changed files: index.html, assets/css/style.css',
    'Command results: npm.cmd test passed'
  ].join('\n'), 'utf8');
  const fromFile = run(['aftertask', '--from-file', filePath, '--technical-outcome', 'success', '--user-acceptance', 'accepted']);
  assert.equal(fromFile.status, 0);
  assert.match(fromFile.stdout, /Auto-curated|Created \d+ pending/);

  const koreanFilePath = path.join(root, 'task-result-ko.txt');
  await writeFile(koreanFilePath, [
    '\uC0AC\uC6A9\uC790 \uC694\uCCAD: Keep localized wiki filenames in Korean and report validation.',
    '\uC694\uC57D: Preserved Korean labels in the task record.',
    '\uBCC0\uACBD \uD30C\uC77C: docs/OBSIDIAN.md, skills/vibebox/SKILL.md',
    '\uBA85\uB839 \uACB0\uACFC: npm.cmd test passed'
  ].join('\n'), 'utf8');
  const koreanFromFile = run(['aftertask', '--from-file', koreanFilePath, '--technical-outcome', 'success', '--user-acceptance', 'accepted']);
  assert.equal(koreanFromFile.status, 0);
  assert.match(koreanFromFile.stdout, /Auto-curated|Created \d+ pending/);

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.equal(events.at(-3).userRequest, 'Plan before coding and report changed files after validation.');
  assert.equal(events.at(-2).userRequest, 'Preserve SEO metadata and report changed files after validation.');
  assert.match(events.at(-2).aiActionSummary, /Updated the homepage implementation/);
  assert.deepEqual(events.at(-2).changedFiles, ['index.html', 'assets/css/style.css']);
  assert.equal(events.at(-1).userRequest, 'Keep localized wiki filenames in Korean and report validation.');
  assert.match(events.at(-1).aiActionSummary, /Preserved Korean labels/);
  assert.deepEqual(events.at(-1).changedFiles, ['docs/OBSIDIAN.md', 'skills/vibebox/SKILL.md']);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(memoryIndex.memories.length > 0, true);
});

test('active memory normalizes source labels out of summaries and guidance fields', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const result = await afterTask(root, {
    userRequest: 'Korean file: Before coding, create a concise plan. English file: Final report should include changed files and validation result. Test: Do not modify package.json unless explicitly requested. Source: When validating changes, report command results.',
    aiActionSummary: 'AI action summary: Implemented the requested workflow.',
    technicalOutcome: 'success',
    userAcceptance: 'accepted'
  });

  assert.ok(result.candidates.some((candidate) => candidate.summary === 'Before coding, create a concise plan.'));
  assert.ok(result.candidates.some((candidate) => candidate.summary === 'Final report should include changed files and validation result.'));
  assert.ok(result.candidates.some((candidate) => candidate.summary === 'Do not modify package.json unless explicitly requested.'));
  assert.ok(result.candidates.some((candidate) => candidate.summary === 'When validating changes, report command results.'));
  assertNoParserLabels(result.candidates);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assertNoParserLabels(memoryIndex.memories);
  assert.ok(memoryIndex.memories.some((memory) => /Before coding, create a concise plan/i.test(memory.summary)));
});

test('manual approval refuses candidates that still contain parser labels', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const [candidate] = await extractMemoryCandidates(root, {
    manualReview: true,
    text: 'Do not modify package.json unless explicitly requested.'
  });
  const pendingPath = storePath(root, 'pending', 'memory-candidates.jsonl');
  const pending = await readJsonl(pendingPath);
  const poisoned = pending.map((record) => record.id === candidate.id
    ? {
      ...record,
      summary: `Test: ${record.summary}`,
      rule: `Test: ${record.rule}`,
      details: `Test: ${record.details}`
    }
    : record);
  await writeFile(pendingPath, `${poisoned.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');

  await assert.rejects(
    () => approveMemory(root, candidate.id),
    /parser or source labels/
  );
  const updated = await readJsonl(pendingPath);
  assert.equal(updated.find((record) => record.id === candidate.id).status, 'quarantined');
});

test('long aftertask userRequest is preserved and normalized into model candidates', async () => {
  const root = await makeWorkspace();
  const longRequest = [
    EXAMPLE_A,
    'Also keep the final report concise but include validation results and remaining risks.',
    'This extra sentence makes the request long enough to verify that VibeBox does not silently truncate it.'
  ].join('\n\n');

  const result = await afterTask(root, {
    userRequest: longRequest,
    aiActionSummary: 'Implemented the requested landing-page direction and verified the checklist.',
    changedFiles: ['index.html', 'assets/css/style.css', 'assets/js/main.js'],
    commandResults: ['npm.cmd test passed'],
    technicalOutcome: 'success',
    userAcceptance: 'accepted'
  });

  assert.equal(result.event.userRequest, longRequest);
  assert.equal(result.candidates.some((candidate) => candidate.summary === longRequest), false);
  assert.ok(result.candidates.some((candidate) => candidate.modelClass === 'user_model'));
  assert.ok(result.candidates.some((candidate) => candidate.modelClass === 'domain_model'));
  assert.ok(result.candidates.some((candidate) => candidate.modelClass === 'project_model'));
  assert.ok(result.candidates.some((candidate) => candidate.modelClass === 'task_context'));
});

test('doctor warns about internal pseudo project registry entries and orphan project wiki pages', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const registryPath = storePath(root, 'registry', 'projects.json');
  const registry = await loadJson(registryPath);
  registry.projects.push({
    projectId: 'global-store',
    projectName: 'Global Store',
    rootPath: storePath(root),
    status: 'virtual',
    virtual: true
  });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  await writeFile(storePath(root, 'wiki', 'projects', 'global-store.md'), '# global-store\n', 'utf8');
  await mkdir(storePath(root, 'wiki', 'memories'), { recursive: true });
  await writeFile(
    storePath(root, 'wiki', 'memories', '사용자 성공 기준-mem_deadbeef.md'),
    [
      '---',
      'title: 사용자 성공 기준-mem_deadbeef',
      'vibebox: true',
      'obsidianCompatible: true',
      '---',
      '# 사용자 성공 기준-mem_deadbeef',
      '',
      '<!-- VIBEBOX:BEGIN -->',
      'old generated note',
      '<!-- VIBEBOX:END -->'
    ].join('\n'),
    'utf8'
  );

  const report = await runDoctor(root);
  assert.ok(report.warnings.some((warning) => warning.includes('internal pseudo project global-store')));
  assert.ok(report.warnings.some((warning) => warning.includes('wiki/projects/global-store.md')));
  assert.ok(report.warnings.some((warning) => warning.includes('wiki/memories')));
  assert.ok(report.warnings.some((warning) => warning.includes('exposes memory id')));
});

test('backup and restore round-trip the global store with destructive confirmation', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const [candidate] = await extractMemoryCandidates(root, {
    text: 'Before coding, create a concise plan.'
  });
  assert.equal(candidate.status, 'active');

  const backupPath = path.join(root, 'backup-copy');
  await backupVibeBox(root, { output: backupPath });
  const configPath = storePath(root, 'config.json');
  const originalConfig = await readFile(configPath, 'utf8');
  await writeFile(configPath, originalConfig.replace('"memoryMode": "auto"', '"memoryMode": "changed"'), 'utf8');

  await assert.rejects(() => restoreVibeBox(root, { from: backupPath }), /destructive replace/);
  assert.match(await readFile(configPath, 'utf8'), /"memoryMode": "changed"/);
  await assert.rejects(
    () => restoreVibeBox(root, { from: storePath(root), confirmReplace: true }),
    /outside the active VibeBox store/
  );
  await mkdir(storePath(root, 'nested-backup'), { recursive: true });
  await assert.rejects(
    () => restoreVibeBox(root, { from: storePath(root, 'nested-backup'), confirmReplace: true }),
    /outside the active VibeBox store/
  );
  assert.match(await readFile(configPath, 'utf8'), /"memoryMode": "changed"/);

  await restoreVibeBox(root, { from: backupPath, confirmReplace: true });
  assert.equal(await readFile(configPath, 'utf8'), originalConfig);
  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
});

test('convert-lang and rebuild are agent-required and preserve raw logs on successful conversion', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  await captureEvent(root, {
    userRequest: 'Keep this raw English request.',
    aiActionSummary: 'Captured raw log.'
  });
  await extractMemoryCandidates(root, {
    text: 'Before coding, create a concise plan. Final report should include changed files and validation result.'
  });
  const configBefore = await readFile(storePath(root, 'config.json'), 'utf8');
  const rawBefore = await readFile(storePath(root, 'logs', 'events.jsonl'), 'utf8');

  delete process.env.VIBEBOX_AGENT_RUNTIME;
  await assert.rejects(() => convertLanguage(root, { from: 'en-US', to: 'ko-KR' }), /requires an AI agent runtime/);
  assert.equal(await readFile(storePath(root, 'config.json'), 'utf8'), configBefore);
  await assert.rejects(() => rebuildVibeBox(root), /requires an AI agent runtime/);

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await convertLanguage(root, { from: 'en-US', to: 'ko-KR' });
  delete process.env.VIBEBOX_AGENT_RUNTIME;

  assert.equal(await readFile(storePath(root, 'logs', 'events.jsonl'), 'utf8'), rawBefore);
  const configKo = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(configKo, 'ko-KR');
  const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  assert.equal(registry.languageTag, 'ko-KR');
  assertBcp47Tag(registry.locale, 'wiki registry locale');
  const processDoc = registry.docs.find((doc) => doc.docKey === 'process_patterns');
  await readFile(storePath(root, 'wiki', processDoc.fileName), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);
  assert.notEqual(processDoc.fileName, 'Process Patterns.md');
  const koMemoryNotes = await listMemoryNoteFiles(root);
  assert.ok(koMemoryNotes.length > 0);
  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  assert.ok(koMemoryNotes.some((file) => wikiRelative(root, file).startsWith(`${path.basename(processDoc.fileName, '.md')}/`)));
  assert.ok(koMemoryNotes.every((file) => !/mem_[a-f0-9]+/iu.test(path.basename(file))));
  await assertWikiLinksResolve(root);

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await convertLanguage(root, { from: 'ko-KR', to: 'en-US' });
  delete process.env.VIBEBOX_AGENT_RUNTIME;
  const configEn = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(configEn, 'en-US');
  const enRegistry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  assert.equal(enRegistry.languageTag, 'en-US');
  const enProcessDoc = enRegistry.docs.find((doc) => doc.docKey === 'process_patterns');
  assert.equal(enProcessDoc.fileName, 'Process Patterns.md');
  await readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', processDoc.fileName), 'utf8'), /ENOENT/);
  const enMemoryNotes = await listMemoryNoteFiles(root);
  assert.ok(enMemoryNotes.some((file) => wikiRelative(root, file).startsWith('Process Patterns/')));
  assert.ok(enMemoryNotes.some((file) => /Create a concise plan|Include changed files/i.test(path.basename(file))));
  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  await assertWikiLinksResolve(root);

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await convertLanguage(root, { from: 'en-US', to: 'ko-KR' });
  delete process.env.VIBEBOX_AGENT_RUNTIME;
  const configKoAgain = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(configKoAgain, 'ko-KR');
  const koAgainRegistry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  const koAgainProcessDoc = koAgainRegistry.docs.find((doc) => doc.docKey === 'process_patterns');
  assert.notEqual(koAgainProcessDoc.fileName, 'Process Patterns.md');
  await readFile(storePath(root, 'wiki', koAgainProcessDoc.fileName), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);
  const koAgainMemoryNotes = await listMemoryNoteFiles(root);
  assert.ok(koAgainMemoryNotes.some((file) => wikiRelative(root, file).startsWith(`${path.basename(koAgainProcessDoc.fileName, '.md')}/`)));
  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  await assertWikiLinksResolve(root);

  await rm(storePath(root, 'wiki', koAgainProcessDoc.fileName), { force: true });
  process.env.VIBEBOX_LOCALE = 'en-US';
  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await rebuildVibeBox(root);
  delete process.env.VIBEBOX_AGENT_RUNTIME;
  delete process.env.VIBEBOX_LOCALE;
  const rebuiltConfig = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(rebuiltConfig, 'ko-KR');
  const rebuiltRegistry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
  assert.equal(rebuiltRegistry.languageTag, 'ko-KR');
  const rebuiltProcessDoc = rebuiltRegistry.docs.find((doc) => doc.docKey === 'process_patterns');
  await readFile(storePath(root, 'wiki', rebuiltProcessDoc.fileName), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);
  assert.notEqual(rebuiltProcessDoc.fileName, 'Process Patterns.md');
  const rebuiltHome = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
  assert.match(rebuiltHome, /\uCD5C\uADFC \uD65C\uC131 \uBA54\uBAA8\uB9AC/);
  const rebuiltMemoryNotes = await listMemoryNoteFiles(root);
  assert.ok(rebuiltMemoryNotes.some((file) => wikiRelative(root, file).startsWith(`${path.basename(rebuiltProcessDoc.fileName, '.md')}/`)));
  assert.equal((await listMarkdownFiles(storePath(root, 'wiki', 'memories'))).length, 0);
  await assertWikiLinksResolve(root);
  await readFile(storePath(root, 'wiki', '처리 방식.md'), 'utf8');
  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'summary'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'modelClass'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], '모델계층'), false);
});

test('semantic rebuild repairs stale wiki and relation files only with agent runtime', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  await extractMemoryCandidates(root, {
    text: 'Before coding, create a concise plan.'
  });

  await rm(storePath(root, 'index', 'relation-index.json'), { force: true });
  await rm(storePath(root, 'wiki', 'Process Patterns.md'), { force: true });

  delete process.env.VIBEBOX_AGENT_RUNTIME;
  await assert.rejects(() => rebuildVibeBox(root), /requires an AI agent runtime/);
  await assert.rejects(() => readFile(storePath(root, 'index', 'relation-index.json'), 'utf8'), /ENOENT/);
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);

  const indexOnlyResult = await rebuildVibeBox(root, { indexOnly: true });
  assert.equal(indexOnlyResult.indexOnly, true);
  await readFile(storePath(root, 'index', 'relation-index.json'), 'utf8');
  await assert.rejects(() => readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8'), /ENOENT/);

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  await rebuildVibeBox(root);
  delete process.env.VIBEBOX_AGENT_RUNTIME;

  await readFile(storePath(root, 'index', 'relation-index.json'), 'utf8');
  await readFile(storePath(root, 'wiki', 'Process Patterns.md'), 'utf8');
  const doctor = await runDoctor(root);
  assert.equal(doctor.ok, true);
});

test('adaptive language policy preserves Japanese, Chinese, Arabic, and mixed memory text', async () => {
  const root = await makeWorkspace();
  delete process.env.VIBEBOX_LOCALE;
  process.env.VIBEBOX_LANGUAGE = 'ja-JP';
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
    text: [
      'validation pattern: 変更後は npm.cmd test を実行する。',
      'validation pattern: 修改后运行 npm.cmd test。',
      'validation pattern: بعد التغيير شغّل npm.cmd test.',
      'validation pattern: keep the original mixed-language note 그대로.'
    ].join('\n')
  });

  assert.equal(candidates.every((candidate) => candidate.status === 'active'), true);
  assert.ok(candidates.some((candidate) => candidate.summary.includes('変更後')));
  assert.ok(candidates.some((candidate) => candidate.summary.includes('修改后')));
  assert.ok(candidates.some((candidate) => candidate.summary.includes('بعد التغيير')));
  assert.ok(candidates.some((candidate) => candidate.summary.includes('그대로')));

  const context = await generateContextPack(root, {
    task: 'validation process',
    language: 'auto'
  });
  assert.match(context, /変更後/);
  assert.match(context, /修改后/);
  assert.match(context, /بعد التغيير/);
  assert.match(context, /그대로/);

  const config = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(config, 'ja-JP');

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'summary'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'userAcceptance'), true);
});

test('BCP 47 strict language settings reject aliases before writing config', async () => {
  const bin = path.resolve('bin/vibebox.mjs');
  for (const tag of SUPPORTED_TEST_LANGUAGE_TAGS) {
    const root = await makeWorkspace();
    const result = spawnSync(process.execPath, [bin, 'init', '--language', tag], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, tag);
    assertConfigLanguageTags(await loadJson(storePath(root, 'config.json')), tag);
  }

  for (const tag of ['ko', 'en', 'ja', 'zh', 'cn', 'tw', 'jp', 'kor', 'eng', 'jpn', 'korean', 'english']) {
    const root = await makeWorkspace();
    const result = spawnSync(process.execPath, [bin, 'init', '--language', tag], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.notEqual(result.status, 0, tag);
    assert.match(result.stderr, /supported BCP 47 tags/i);
    await assert.rejects(() => readFile(storePath(root, 'config.json'), 'utf8'), /ENOENT/);
  }
});

test('convert-lang accepts only supported BCP 47 tags and leaves files unchanged on invalid input', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  const configBefore = await readFile(storePath(root, 'config.json'), 'utf8');
  const wikiBefore = Object.fromEntries(await Promise.all((await listMarkdownFiles(storePath(root, 'wiki'))).map(async (file) => [
    wikiRelative(root, file),
    await readFile(file, 'utf8')
  ])));

  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  for (const pair of [
    ['ko', 'en'],
    ['en', 'ko'],
    ['ar', 'ja'],
    ['zh', 'cn']
  ]) {
    await assert.rejects(() => convertLanguage(root, { from: pair[0], to: pair[1] }), /supported BCP 47 tags/i);
    assert.equal(await readFile(storePath(root, 'config.json'), 'utf8'), configBefore);
    const wikiAfter = Object.fromEntries(await Promise.all((await listMarkdownFiles(storePath(root, 'wiki'))).map(async (file) => [
      wikiRelative(root, file),
      await readFile(file, 'utf8')
    ])));
    assert.deepEqual(wikiAfter, wikiBefore);
  }

  let current = 'en-US';
  for (const target of ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW', 'ar']) {
    await convertLanguage(root, { from: current, to: target });
    assertConfigLanguageTags(await loadJson(storePath(root, 'config.json')), target);
    const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
    assert.equal(registry.languageTag, target);
    current = target;
  }
  delete process.env.VIBEBOX_AGENT_RUNTIME;
});

test('BCP 47 language tags drive distinct Obsidian Wiki display packs through rebuild', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  await extractMemoryCandidates(root, {
    text: 'Before coding, create a concise plan. Final report should include changed files and validation result.'
  });

  const expectations = {
    'ko-KR': { doc: '사용자 패턴.md', home: /최근 활성 메모리/u },
    'en-US': { doc: 'User Patterns.md', home: /Recent Active Memory/u },
    'ja-JP': { doc: 'ユーザーパターン.md', home: /最近の有効メモリー/u },
    'zh-CN': { doc: '用户模式.md', home: /最近活跃记忆/u },
    'zh-TW': { doc: '使用者模式.md', home: /最近活躍記憶/u },
    ar: { doc: 'أنماط المستخدم.md', home: /الذاكرة النشطة الأخيرة/u }
  };

  let current = 'en-US';
  process.env.VIBEBOX_AGENT_RUNTIME = 'test-agent';
  for (const [target, expected] of Object.entries(expectations)) {
    await convertLanguage(root, { from: current, to: target });
    await rebuildVibeBox(root);
    const config = await loadJson(storePath(root, 'config.json'));
    assertConfigLanguageTags(config, target);
    const registry = await loadJson(storePath(root, 'registry', 'wiki-docs.json'));
    assert.equal(registry.languageTag, target);
    assert.equal(registry.docs.find((doc) => doc.docKey === 'user_patterns').fileName, expected.doc);
    const home = await readFile(storePath(root, 'wiki', 'Home.md'), 'utf8');
    assert.match(home, expected.home);
    const userPatternsPage = await readFile(storePath(root, 'wiki', expected.doc), 'utf8');
    if (target !== 'en-US') {
      assert.doesNotMatch(home, /Global local-first memory store|JSON indexes live|Raw blackbox events live|Pending memory candidates live/u);
      assert.doesNotMatch(home, /^## Wiki$/mu);
      assert.doesNotMatch(userPatternsPage, /^Back to /mu);
    }
    if (target !== 'ko-KR') assert.doesNotMatch(home, /최근 활성 메모리|사용자 패턴/u);
    current = target;
  }
  delete process.env.VIBEBOX_AGENT_RUNTIME;
});

test('ko-KR locale applies to report, blackbox, doctor headings and empty states', async () => {
  const root = await makeWorkspace();
  process.env.VIBEBOX_LOCALE = 'ko-KR';
  await initVibeBox(root);

  const report = await generateReport(root);
  assert.match(report, /VibeBox 메모리 보고서/);
  assert.match(report, /활성 메모리/);
  assert.doesNotMatch(report, /Active Memory/);

  const blackbox = await generateBlackboxReport(root, { limit: 2 });
  assert.match(blackbox, /VibeBox 블랙박스 보고서/);
  assert.match(blackbox, /작업 타임라인/);
  assert.match(blackbox, /- 없음\./);
  assert.doesNotMatch(blackbox, /- None\./);

  const doctorText = formatDoctorReport(await runDoctor(root));
  assert.match(doctorText, /VibeBox 진단/);
  assert.match(doctorText, /상태:/);
  assert.doesNotMatch(doctorText, /Status:/);
});

test('doctor validates structure and warns about suspicious raw secrets', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  let report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);

  await appendFile(
    storePath(root, 'logs', 'events.jsonl'),
    `${JSON.stringify({ id: 'evt_bad', eventType: 'task_summary', userRequest: 'token sk-live-rawsecret1234567890', createdAt: new Date().toISOString() })}\n`,
    'utf8'
  );

  report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some((warning) => warning.includes('sensitive')));
});

test('doctor warns about old project-local VibeBox stores without migrating them', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  await mkdir(path.join(root, '.vibebox'), { recursive: true });

  const report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some((warning) => warning.includes('project-local .vibebox')));
});

test('doctor does not warn for already redacted captured secret placeholders', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);
  await captureEvent(root, {
    userRequest: 'api key: plainsecretvalue12345',
    aiActionSummary: 'DATABASE_URL=postgres://user:pass@example.test/db'
  });

  const report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.equal(report.warnings.length, 0);
});

test('universal agent skill package files exist and declare shared skill metadata', async () => {
  const skill = await readFile(path.resolve('skills/vibebox/SKILL.md'), 'utf8');
  assert.match(skill, /^---\n[\s\S]+?\n---\n/);
  assert.match(skill, /^name:\s*vibebox$/m);
  assert.match(skill, /^description:\s*Use this skill when an AI coding task should consult VibeBox memory before work/m);
  assert.match(skill, /agent-neutral/i);
  assert.match(skill, /VibeBox Core is a local CLI/i);
  assert.match(skill, /Past memory is context, not authority/i);
  assert.match(skill, /Pending memory must not be treated as active memory/i);
  assert.doesNotMatch(skill, /Codex-only|Claude-only|Codex 전용|Claude 전용/i);

  for (const relativePath of [
    'skills/vibebox/references/COMMANDS.md',
    'skills/vibebox/references/WORKFLOW.md',
    'skills/vibebox/references/MEMORY_POLICY.md',
    'adapters/codex/README.md',
    'adapters/claude/README.md',
    'adapters/common/README.md',
    'adapters/common/INSTALL.md'
  ]) {
    const content = await readFile(path.resolve(relativePath), 'utf8');
    assert.ok(content.trim().length > 0, `${relativePath} should not be empty`);
  }

  const plugin = await loadJson(path.resolve('.codex-plugin/plugin.json'));
  assert.equal(plugin.name, 'vibebox');
  assert.equal(plugin.version, '0.1.0');
  assert.match(plugin.description, /Universal local-first blackbox memory middleware/i);
  assert.equal(plugin.interface.brandColor, '#0891B2');
  assert.equal(plugin.interface.composerIcon, './assets/icon.png');
  assert.equal(plugin.interface.logo, './assets/logo.png');
  await readFile(path.resolve('assets/icon.png'));
  await readFile(path.resolve('assets/logo.png'));
  assert.ok(
    plugin.skills === './skills/' || JSON.stringify(plugin.skills).includes('skills/vibebox/SKILL.md'),
    'plugin manifest should expose the shared VibeBox skill'
  );

  const marketplace = await loadJson(path.resolve('.agents/plugins/marketplace.json'));
  assert.equal(marketplace.name, 'vibebox');
  assert.equal(marketplace.plugins.some((entry) => entry.name === 'vibebox'), true);

  const packageJson = await loadJson(path.resolve('package.json'));
  assert.equal(packageJson.bin.vibebox, './bin/vibebox.mjs');
});

test('agent packaging docs list real CLI commands and fallback strategy without overclaiming distribution', async () => {
  const commandReference = await readFile(path.resolve('skills/vibebox/references/COMMANDS.md'), 'utf8');
  for (const command of [
    'init',
    'capture',
    'extract',
    'review',
    'approve',
    'approve --safe',
    'reject',
    'context',
    'pretask',
    'aftertask',
    'report',
    'blackbox',
    'doctor',
    'backup',
    'restore',
    'convert-lang',
    'language convert',
    'rebuild'
  ]) {
    assert.ok(commandReference.includes(`vibebox ${command}`), `COMMANDS.md should document vibebox ${command}`);
  }

  const docs = [
    'README.md',
    'docs/USAGE.md',
    'skills/vibebox/SKILL.md',
    'skills/vibebox/references/COMMANDS.md',
    'skills/vibebox/references/WORKFLOW.md',
    'adapters/codex/README.md',
    'adapters/claude/README.md',
    'adapters/common/README.md',
    'adapters/common/INSTALL.md'
  ];
  const combined = (await Promise.all(docs.map((relativePath) => readFile(path.resolve(relativePath), 'utf8')))).join('\n');
  assert.match(combined, /vibebox <command>/);
  assert.match(combined, /vibebox\.cmd <command>/);
  assert.match(combined, /vibebox\.cmd pretask --task/);
  assert.match(combined, /node bin\/vibebox\.mjs <command>/);
  assert.match(combined, /pretask[\s\S]{0,220}read-only|read-only[\s\S]{0,220}pretask/i);
  assert.match(combined, /context[\s\S]{0,220}read-only|read-only[\s\S]{0,220}context/i);
  assert.match(combined, /original user request or faithful summary/i);
  assert.match(combined, /without a user request, VibeBox records the event but skips active user model extraction/i);
  assert.match(combined, /Do not call aftertask with only an AI action summary/i);
  assert.match(combined, /convert-lang[\s\S]{0,220}agent runtime marker|agent runtime marker[\s\S]{0,220}convert-lang/i);
  assert.match(combined, /rebuild[\s\S]{0,220}agent runtime marker|agent runtime marker[\s\S]{0,220}rebuild/i);
  const codeBlocks = [...combined.matchAll(/```(?:\w+)?\n([\s\S]*?)```/gu)].map((match) => match[1]);
  assert.equal(codeBlocks.some((block) => /powershell(?:\.exe)?\s+-Command/iu.test(block)), false);
  assert.match(combined, /Do not (?:use|wrap)[^.]{0,160}powershell(?:\.exe)? -Command/i);
  assert.doesNotMatch(combined, /Codex-only|Claude-only|Codex 전용|Claude 전용/i);
  assert.doesNotMatch(combined, /marketplace distribution is available|official Claude install is available|cloud install is available/i);
});

test('CLI --language overrides environment locale for new store configuration', async () => {
  const root = await makeWorkspace();
  const bin = path.resolve('bin/vibebox.mjs');
  const result = spawnSync(process.execPath, [bin, 'init', '--language', 'ja-JP'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  const config = await loadJson(storePath(root, 'config.json'));
  assertConfigLanguageTags(config, 'ja-JP');
});

test('CLI exposes init, capture, extract, review, approve, context, pretask, aftertask, report, blackbox, doctor, backup, restore, convert-lang, and rebuild commands', async () => {
  const root = await makeWorkspace();
  const bin = path.resolve('bin/vibebox.mjs');

  function run(args, extraEnv = {}) {
    return spawnSync(process.execPath, [bin, ...args], {
      cwd: root,
      env: { ...process.env, ...extraEnv },
      encoding: 'utf8'
    });
  }

  assert.equal(run(['init']).status, 0);
  assert.equal(run(['capture', '--request', 'Use wrapper table scrolling.', '--summary', 'Captured result.', '--outcome', 'success']).status, 0);
  assert.equal(run(['extract', '--manual-review', '--text', 'Do not modify package.json unless explicitly requested. Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.']).status, 0);

  const review = run(['review']);
  assert.equal(review.status, 0);
  assert.match(review.stdout, /avoid_rule/);

  const pending = await loadJson(storePath(root, 'index', 'pending-index.json'));
  assert.equal(run(['approve', pending.candidates[0].id]).status, 0);
  assert.equal(run(['reject', pending.candidates[1].id, '--reason', 'CLI rejection test']).status, 0);

  const context = run(['context', '--task', 'Update package dependencies for dashboard work.']);
  assert.equal(context.status, 0);
  assert.match(context.stdout, /VibeBox Context Pack/);
  assert.match(context.stdout, /Relevant Avoid Rules/);

  const pretask = run(['pretask', 'Update package dependencies for dashboard work.']);
  assert.equal(pretask.status, 0);
  assert.match(pretask.stdout, /VibeBox Pre-Task Brief/);

  const aftertask = run(['aftertask', '--request', 'Update package dependencies.', '--summary', 'Kept package.json unchanged.', '--files', 'src/app.mjs', '--commands', 'npm.cmd test', '--outcome', 'success']);
  assert.equal(aftertask.status, 0);
  assert.match(aftertask.stdout, /Captured blackbox event/);

  const report = run(['report']);
  assert.equal(report.status, 0);
  assert.match(report.stdout, /VibeBox Memory Report/);

  const blackbox = run(['blackbox', '--limit', '5']);
  assert.equal(blackbox.status, 0);
  assert.match(blackbox.stdout, /VibeBox Blackbox Report/);

  const doctor = run(['doctor']);
  assert.equal(doctor.status, 0);
  assert.match(doctor.stdout, /VibeBox Doctor/);

  const backupDir = path.join(root, 'cli-backup');
  const backup = run(['backup', '--output', backupDir]);
  assert.equal(backup.status, 0);
  assert.match(backup.stdout, /backup created/i);

  const blockedConvert = run(['convert-lang', 'en-US', 'ko-KR']);
  assert.notEqual(blockedConvert.status, 0);
  assert.match(blockedConvert.stderr, /requires an AI agent runtime/);

  const convert = run(['convert-lang', 'en-US', 'ko-KR'], { VIBEBOX_AGENT_RUNTIME: 'cli-test' });
  assert.equal(convert.status, 0);
  assert.match(convert.stdout, /converted to ko-KR/);

  const blockedRebuild = run(['rebuild']);
  assert.notEqual(blockedRebuild.status, 0);
  assert.match(blockedRebuild.stderr, /requires an AI agent runtime/);

  const rebuild = run(['rebuild'], { VIBEBOX_AGENT_RUNTIME: 'cli-test' });
  assert.equal(rebuild.status, 0);
  assert.match(rebuild.stdout, /rebuild complete/);

  const restoreBlocked = run(['restore', '--from', backupDir]);
  assert.notEqual(restoreBlocked.status, 0);
  assert.match(restoreBlocked.stderr, /destructive replace/);

  const restore = run(['restore', '--from', backupDir, '--confirm-replace']);
  assert.equal(restore.status, 0);
  assert.match(restore.stdout, /destructive replace/);
  await assertNoLocalStore(root);
});
