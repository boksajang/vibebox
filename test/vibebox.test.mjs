import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  afterTask,
  approveSafeMemories,
  approveMemory,
  captureEvent,
  classifyCandidateConflict,
  extractMemoryCandidates,
  generateBlackboxReport,
  generateContextPack,
  generatePreTaskBrief,
  generateReport,
  initVibeBox,
  loadJson,
  readJsonl,
  rejectMemory,
  reviewPending,
  runDoctor
} from '../src/core.mjs';

async function makeWorkspace() {
  return mkdtemp(path.join(os.tmpdir(), 'vibebox-test-'));
}

function byType(candidates, type) {
  return candidates.find((candidate) => candidate.type === type);
}

test('init creates the VibeBox storage layout and preserves existing wiki files', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const config = await loadJson(path.join(root, '.vibebox', 'config.json'));
  assert.equal(config.projectName, path.basename(root));
  assert.equal(config.rootPath, '.');
  assert.equal(config.memoryMode, 'review');
  assert.equal(config.obsidianCompatible, true);
  assert.equal(config.maxContextItems, 8);
  assert.equal(config.maxContextChars, 6000);

  for (const relative of [
    'wiki/Home.md',
    'wiki/User Preferences.md',
    'wiki/Project Decisions.md',
    'wiki/Architecture Rules.md',
    'wiki/Avoid Rules.md',
    'wiki/Failure Memory.md',
    'wiki/Success Patterns.md',
    'wiki/Tooling Preferences.md',
    'wiki/Workflow Rules.md',
    'index/memory-index.json',
    'index/keyword-index.json',
    'index/relation-index.json',
    'index/pending-index.json',
    'logs/events.jsonl',
    'pending/memory-candidates.jsonl'
  ]) {
    await readFile(path.join(root, '.vibebox', relative), 'utf8');
  }

  const homePath = path.join(root, '.vibebox', 'wiki', 'Home.md');
  await writeFile(homePath, 'custom home note\n', 'utf8');
  await initVibeBox(root);
  assert.equal(await readFile(homePath, 'utf8'), 'custom home note\n');
});

test('init enriches project identity without locking config to an absolute path', async () => {
  const root = await makeWorkspace();
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'dashboard-suite', dependencies: { echarts: '^5.0.0' } }, null, 2),
    'utf8'
  );

  await initVibeBox(root);

  const config = await loadJson(path.join(root, '.vibebox', 'config.json'));
  assert.equal(config.projectName, 'dashboard-suite');
  assert.equal(config.repositoryName, 'dashboard-suite');
  assert.equal(config.rootPath, '.');
  assert.equal(config.primaryDomain, 'dashboard');
  assert.ok(config.techStackHints.includes('echarts'));
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
  const events = await readJsonl(path.join(root, '.vibebox', 'logs', 'events.jsonl'));
  assert.equal(events.length, 1);
  const serialized = JSON.stringify(events[0]);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /sk-live-1234567890abcdef/);
  assert.doesNotMatch(serialized, /secret-token-value/);
  assert.doesNotMatch(serialized, /my-secret-password/);
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

  const events = await readJsonl(path.join(root, '.vibebox', 'logs', 'events.jsonl'));
  const serialized = JSON.stringify(events[0]);
  assert.match(serialized, /\[REDACTED\]/);
  assert.doesNotMatch(serialized, /plainsecretvalue12345/);
  assert.doesNotMatch(serialized, /postgres:\/\/user:pass@example\.test\/db/);
  assert.doesNotMatch(serialized, /my secret password/);
});

test('extract creates conservative pending candidates across memory types, scopes, confidence, and wiki-safe content', async () => {
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
  assert.equal(candidates.every((candidate) => candidate.status === 'pending'), true);
  assert.equal(candidates.every((candidate) => !JSON.stringify(candidate).includes('sk-test-1234567890abcdef')), true);
  assert.equal(candidates.some((candidate) => candidate.summary.includes('sidebar color')), false);

  const pendingIndex = await loadJson(path.join(root, '.vibebox', 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.length, candidates.length);

  const review = await reviewPending(root);
  assert.match(review, /ID\s+TYPE\s+SCOPE/i);
  assert.match(review, /failure_memory/);
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
  const pendingIndex = await loadJson(path.join(root, '.vibebox', 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.length, 0);
});

test('approve and reject move only reviewed memory into active indexes, wiki, and context packs', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
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

  const memoryIndex = await loadJson(path.join(root, '.vibebox', 'index', 'memory-index.json'));
  assert.deepEqual(memoryIndex.memories.map((memory) => memory.id).sort(), approvedIds.sort());
  assert.equal(memoryIndex.memories.every((memory) => memory.status === 'active'), true);

  const pendingIndex = await loadJson(path.join(root, '.vibebox', 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.some((candidate) => candidate.status === 'rejected'), true);

  const avoidWiki = await readFile(path.join(root, '.vibebox', 'wiki', 'Avoid Rules.md'), 'utf8');
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
    text: 'Always prefer Supabase for dashboard database work when no project-specific database decision exists.'
  });
  await approveMemory(root, globalCandidates[0].id);

  const projectCandidates = await extractMemoryCandidates(root, {
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

test('aftertask records a blackbox event and creates pending candidates without active promotion', async () => {
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
  assert.match(result.message, /Review pending memory/);
  assert.ok(result.candidates.some((candidate) => candidate.type === 'failure_memory'));
  assert.ok(result.candidates.some((candidate) => candidate.type === 'avoid_rule'));

  const events = await readJsonl(path.join(root, '.vibebox', 'logs', 'events.jsonl'));
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].commands, ['npm.cmd test']);
  assert.deepEqual(events[0].changedFiles, ['src/table.mjs', 'src/layout.css']);

  const memoryIndex = await loadJson(path.join(root, '.vibebox', 'index', 'memory-index.json'));
  assert.equal(memoryIndex.memories.length, 0);
});

test('report and blackbox summarize reviewed memory and recent task outcomes without dumping raw logs', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const candidates = await extractMemoryCandidates(root, {
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

test('review recommends actions and safe approval skips conflict candidates', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  const base = await extractMemoryCandidates(root, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  await approveMemory(root, base[0].id);

  const candidates = await extractMemoryCandidates(root, {
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

  const memoryIndex = await loadJson(path.join(root, '.vibebox', 'index', 'memory-index.json'));
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

  const avoidWiki = await readFile(path.join(root, '.vibebox', 'wiki', 'Avoid Rules.md'), 'utf8');
  assert.match(avoidWiki, /## Related/);
  assert.match(avoidWiki, /\[\[Dependency Management\]\]/);

  const conceptWiki = await readFile(path.join(root, '.vibebox', 'wiki', 'Dependency Management.md'), 'utf8');
  assert.match(conceptWiki, /Related memories/);
  assert.match(conceptWiki, new RegExp(candidate.id));

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

  const pendingIndexPath = path.join(root, '.vibebox', 'index', 'pending-index.json');
  await writeFile(pendingIndexPath, JSON.stringify({ version: '0.1.0', updatedAt: new Date().toISOString(), candidates: [] }, null, 2), 'utf8');
  let doctor = await runDoctor(root);
  assert.ok(doctor.warnings.some((warning) => warning.includes('pending-index')));

  const keywordIndexPath = path.join(root, '.vibebox', 'index', 'keyword-index.json');
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

  const keywordIndexPath = path.join(root, '.vibebox', 'index', 'keyword-index.json');
  const keywordIndex = await loadJson(keywordIndexPath);
  keywordIndex.tags = {};
  await writeFile(keywordIndexPath, `${JSON.stringify(keywordIndex, null, 2)}\n`, 'utf8');

  let doctor = await runDoctor(root);
  assert.ok(doctor.warnings.some((warning) => warning.includes('keyword-index missing tag')));

  const memoryIndexPath = path.join(root, '.vibebox', 'index', 'memory-index.json');
  await writeFile(memoryIndexPath, JSON.stringify({ version: '0.1.0' }, null, 2), 'utf8');
  doctor = await runDoctor(root);
  assert.equal(doctor.ok, false);
  assert.ok(doctor.errors.some((error) => error.includes('memory-index.json must contain memories')));
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
  const avoidWikiPath = path.join(root, '.vibebox', 'wiki', 'Avoid Rules.md');
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

  const memoryIndex = await loadJson(path.join(root, '.vibebox', 'index', 'memory-index.json'));
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
  }).status, 'supersedes');

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

test('doctor validates structure and warns about suspicious raw secrets', async () => {
  const root = await makeWorkspace();
  await initVibeBox(root);

  let report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);

  await appendFile(
    path.join(root, '.vibebox', 'logs', 'events.jsonl'),
    `${JSON.stringify({ id: 'evt_bad', eventType: 'task_summary', userRequest: 'token sk-live-rawsecret1234567890', createdAt: new Date().toISOString() })}\n`,
    'utf8'
  );

  report = await runDoctor(root);
  assert.equal(report.ok, true);
  assert.ok(report.warnings.some((warning) => warning.includes('sensitive')));
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

test('CLI exposes init, capture, extract, review, approve, context, pretask, aftertask, report, blackbox, and doctor commands', async () => {
  const root = await makeWorkspace();
  const bin = path.resolve('bin/vibebox.mjs');

  function run(args) {
    return spawnSync(process.execPath, [bin, ...args], {
      cwd: root,
      encoding: 'utf8'
    });
  }

  assert.equal(run(['init']).status, 0);
  assert.equal(run(['capture', '--request', 'Use wrapper table scrolling.', '--summary', 'Captured result.', '--outcome', 'success']).status, 0);
  assert.equal(run(['extract', '--text', 'Do not modify package.json unless explicitly requested. Wrapper-based table scrolling worked successfully for wide dashboard tables and should be reused there.']).status, 0);

  const review = run(['review']);
  assert.equal(review.status, 0);
  assert.match(review.stdout, /avoid_rule/);

  const pending = await loadJson(path.join(root, '.vibebox', 'index', 'pending-index.json'));
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
});
