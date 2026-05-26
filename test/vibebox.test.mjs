import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
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
  formatDoctorReport,
  initVibeBox,
  loadJson,
  readJsonl,
  rejectMemory,
  reviewPending,
  runDoctor
} from '../src/core.mjs';

async function makeWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-'));
  process.env.VIBEBOX_HOME = storePath(root);
  process.env.VIBEBOX_LOCALE = 'en-US';
  delete process.env.VIBEBOX_LANGUAGE;
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

test('init creates the VibeBox storage layout and preserves existing wiki files', async () => {
  const root = await makeWorkspace();
  const result = await initVibeBox(root);

  const config = await loadJson(storePath(root, 'config.json'));
  assert.equal(config.memoryMode, 'review');
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

  const folderRoot = await makeWorkspace();
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

  const pendingIndex = await loadJson(storePath(root, 'index', 'pending-index.json'));
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
  const pendingIndex = await loadJson(storePath(root, 'index', 'pending-index.json'));
  assert.equal(pendingIndex.candidates.length, 0);
});

test('approve and reject move only reviewed memory into active indexes, wiki, and context packs', async () => {
  const root = await makeWorkspace();
  const { projectId } = await initVibeBox(root);

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

test('domain memory can support other projects while project memory stays namespaced', async () => {
  const projectA = await makeWorkspace();
  await initVibeBox(projectA);
  const projectB = await mkdtemp(path.join(os.tmpdir(), 'vibebox-test-other-'));
  await initVibeBox(projectB);

  const domainCandidates = await extractMemoryCandidates(projectA, {
    text: 'For dashboard projects, prefer MSSQL because reporting data lives there.'
  });
  assert.equal(domainCandidates[0].scope, 'domain');
  assert.equal(domainCandidates[0].projectId, undefined);
  await approveMemory(projectA, domainCandidates[0].id);

  const projectCandidates = await extractMemoryCandidates(projectA, {
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

  const events = await readJsonl(storePath(root, 'logs', 'events.jsonl'));
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].commands, ['npm.cmd test']);
  assert.deepEqual(events[0].changedFiles, ['src/table.mjs', 'src/layout.css']);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
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
  assert.match(redisWikiBefore, new RegExp(oldMemory.id));

  const [replacementCandidate] = await extractMemoryCandidates(root, {
    text: 'Replace the dashboard cache rule: for dashboard cache projects, prefer Memcached instead of Redis.'
  });
  await approveMemory(root, replacementCandidate.id);

  const redisWikiAfter = await readFile(storePath(root, 'wiki', 'Redis.md'), 'utf8');
  assert.doesNotMatch(redisWikiAfter, new RegExp(oldMemory.id));
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

  const failureWiki = await readFile(storePath(root, 'wiki', 'Failure Memory.md'), 'utf8');
  assert.match(failureWiki, /\[\[Prevention Rules\]\]/);
  assert.match(failureWiki, /\[\[Success Patterns\]\]/);
});

test('user pattern memory is extracted as pending and applied by situation-aware context', async () => {
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
  assert.equal(candidates.every((candidate) => candidate.status === 'pending'), true);

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

test('locale controls human-facing headings while JSON fields and Korean memory text are preserved', async () => {
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

  const wikiKo = await readFile(storePath(root, 'wiki', 'Validation Patterns.md'), 'utf8');
  assert.match(wikiKo, /# 검증 패턴/);

  const memoryIndex = await loadJson(storePath(root, 'index', 'global-memory-index.json'));
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'patternType'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], 'summary'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(memoryIndex.memories[0], '관련검증패턴'), false);

  process.env.VIBEBOX_LOCALE = 'en-US';
  const briefEn = await generatePreTaskBrief(root, {
    task: 'Verify the package.'
  });
  assert.match(briefEn, /VibeBox Pre-Task Brief/);
  assert.match(briefEn, /Relevant Validation Patterns/);
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
  assert.ok(
    plugin.skills === './skills/' || JSON.stringify(plugin.skills).includes('skills/vibebox/SKILL.md'),
    'plugin manifest should expose the shared VibeBox skill'
  );

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
    'doctor'
  ]) {
    assert.ok(commandReference.includes(`vibebox ${command}`), `COMMANDS.md should document vibebox ${command}`);
  }

  const docs = [
    'README.md',
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
  assert.match(combined, /node bin\/vibebox\.mjs <command>/);
  assert.doesNotMatch(combined, /Codex-only|Claude-only|Codex 전용|Claude 전용/i);
  assert.doesNotMatch(combined, /marketplace distribution is available|official Claude install is available|cloud install is available/i);
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
  await assertNoLocalStore(root);
});
