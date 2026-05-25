import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  appendFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';

export const VIBEBOX_VERSION = '0.1.0';

const WIKI_PAGES = [
  'Home.md',
  'User Preferences.md',
  'Project Decisions.md',
  'Architecture Rules.md',
  'Avoid Rules.md',
  'Failure Memory.md',
  'Success Patterns.md',
  'Tooling Preferences.md',
  'Workflow Rules.md'
];

const MEMORY_TYPES = new Set([
  'user_preference',
  'project_decision',
  'architecture_rule',
  'avoid_rule',
  'failure_memory',
  'success_pattern',
  'tooling_preference',
  'coding_style',
  'design_preference',
  'workflow_rule'
]);

const TYPE_TO_PAGE = {
  user_preference: 'User Preferences.md',
  coding_style: 'User Preferences.md',
  design_preference: 'User Preferences.md',
  project_decision: 'Project Decisions.md',
  architecture_rule: 'Architecture Rules.md',
  avoid_rule: 'Avoid Rules.md',
  failure_memory: 'Failure Memory.md',
  success_pattern: 'Success Patterns.md',
  tooling_preference: 'Tooling Preferences.md',
  workflow_rule: 'Workflow Rules.md'
};

const SCOPE_PRIORITY = {
  project: 50,
  domain: 40,
  global: 30,
  task: 20,
  temporary: 10
};

const TYPE_PRIORITY = {
  avoid_rule: 90,
  failure_memory: 85,
  project_decision: 65,
  architecture_rule: 60,
  success_pattern: 50,
  tooling_preference: 40,
  workflow_rule: 40,
  user_preference: 35,
  coding_style: 30,
  design_preference: 30
};

const CONFIDENCE_PRIORITY = {
  high: 15,
  medium: 9,
  low: 2
};

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'already',
  'also',
  'because',
  'before',
  'being',
  'could',
  'current',
  'during',
  'every',
  'example',
  'explicitly',
  'general',
  'instead',
  'later',
  'maybe',
  'memory',
  'module',
  'project',
  'projects',
  'should',
  'task',
  'testing',
  'there',
  'these',
  'those',
  'unless',
  'using',
  'usually',
  'while',
  'worked',
  'would'
]);

const SENSITIVE_PATTERNS = [
  /\bsk-[a-z0-9_-]{12,}\b/gi,
  /\b(?:ghp|github_pat)_[a-z0-9_]{12,}\b/gi,
  /\b(?:api[_ -]?key|token|password|passwd|pwd|secret|connection[_ -]?string|database[_ -]?url|database_url|db_url)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
  /\bAuthorization\s*:\s*Bearer\s+[a-z0-9._~+/=-]{8,}/gi,
  /\bBearer\s+[a-z0-9._~+/=-]{16,}/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
];

const MANAGED_BEGIN = '<!-- VIBEBOX:BEGIN -->';
const MANAGED_END = '<!-- VIBEBOX:END -->';

export function vibeboxPath(root, ...parts) {
  return path.join(root, '.vibebox', ...parts);
}

export function nowIso() {
  return new Date().toISOString();
}

function hashId(prefix, value) {
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return `${prefix}_${digest}`;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function writeIfMissing(filePath, content) {
  if (await exists(filePath)) {
    return false;
  }
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
  return true;
}

async function saveJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tmpPath, filePath);
}

export async function loadJson(filePath, fallback = undefined) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export async function readJsonl(filePath) {
  try {
    const text = await readFile(filePath, 'utf8');
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonl(filePath, records) {
  await ensureDir(path.dirname(filePath));
  const text = records.map((record) => JSON.stringify(record)).join('\n');
  await writeFile(filePath, text.length > 0 ? `${text}\n` : '', 'utf8');
}

function defaultConfig(root) {
  const timestamp = nowIso();
  return {
    version: VIBEBOX_VERSION,
    projectName: path.basename(root),
    projectId: hashId('project', path.resolve(root).toLowerCase()),
    rootPath: '.',
    memoryMode: 'review',
    obsidianCompatible: true,
    maxContextItems: 8,
    maxContextChars: 6000,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function defaultMemoryIndex() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    memories: []
  };
}

function defaultKeywordIndex() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    keywords: {},
    tags: {},
    topics: {},
    domains: {},
    types: {},
    scopes: {}
  };
}

function defaultRelationIndex() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    relations: [],
    related: {},
    supersedes: {}
  };
}

function defaultPendingIndex() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    candidates: []
  };
}

function wikiFrontmatter(title) {
  return [
    '---',
    `title: ${title}`,
    'vibebox: true',
    'obsidianCompatible: true',
    '---',
    ''
  ].join('\n');
}

function initialWikiPage(pageName) {
  if (pageName === 'Home.md') {
    return `${renderHomeShell()}\n\n${managedBlock(renderHomeManaged([]))}\n`;
  }

  return `${renderMemoryShell(pageName)}\n\n${managedBlock(renderMemoryManaged([]))}\n`;
}

export async function initVibeBox(root = process.cwd()) {
  const base = vibeboxPath(root);
  const created = [];

  for (const dir of ['', 'wiki', 'index', 'logs', 'pending']) {
    const dirPath = vibeboxPath(root, dir);
    if (!(await exists(dirPath))) {
      created.push(path.relative(root, dirPath));
    }
    await ensureDir(dirPath);
  }

  const files = [
    ['config.json', `${JSON.stringify(defaultConfig(root), null, 2)}\n`],
    ['index/memory-index.json', `${JSON.stringify(defaultMemoryIndex(), null, 2)}\n`],
    ['index/keyword-index.json', `${JSON.stringify(defaultKeywordIndex(), null, 2)}\n`],
    ['index/relation-index.json', `${JSON.stringify(defaultRelationIndex(), null, 2)}\n`],
    ['index/pending-index.json', `${JSON.stringify(defaultPendingIndex(), null, 2)}\n`],
    ['logs/events.jsonl', ''],
    ['pending/memory-candidates.jsonl', '']
  ];

  for (const page of WIKI_PAGES) {
    files.push([`wiki/${page}`, initialWikiPage(page)]);
  }

  for (const [relative, content] of files) {
    const didCreate = await writeIfMissing(vibeboxPath(root, relative), content);
    if (didCreate) {
      created.push(path.join('.vibebox', relative));
    }
  }

  return {
    root: path.resolve(root),
    vibeboxPath: base,
    created
  };
}

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[`"'()[\]{}]/gu, ' ')
    .replace(/[^a-z0-9가-힣_.#/+:-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitStatements(text) {
  return String(text ?? '')
    .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z가-힣])/u)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function containsSensitive(value) {
  const text = (typeof value === 'string' ? value : JSON.stringify(value ?? ''))
    .replace(/\b(?:api[_ -]?key|token|password|passwd|pwd|secret|connection[_ -]?string|database[_ -]?url|database_url|db_url)\s*[:=]\s*\[REDACTED\]/giu, '')
    .replace(/\[REDACTED\]/gu, '');
  return SENSITIVE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function redactSensitive(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactSensitive(item)])
    );
  }
  if (typeof value !== 'string') {
    return value;
  }

  let redacted = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, (match) => {
      const separator = match.match(/^([^:=]+[:=])/u);
      if (separator) {
        return `${separator[1]}[REDACTED]`;
      }
      if (/^Authorization\s*:/iu.test(match)) {
        return 'Authorization: Bearer [REDACTED]';
      }
      if (/^Bearer\s+/iu.test(match)) {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED]';
    });
  }
  return redacted;
}

export async function captureEvent(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const timestamp = nowIso();
  const event = redactSensitive({
    id: input.id || `evt_${randomUUID()}`,
    eventType: input.eventType || 'task_summary',
    userRequest: input.userRequest || '',
    aiActionSummary: input.aiActionSummary || '',
    command: input.command || '',
    commandResult: input.commandResult || '',
    changedFiles: Array.isArray(input.changedFiles) ? input.changedFiles : [],
    userFeedback: input.userFeedback || '',
    outcome: input.outcome || 'unknown',
    createdAt: input.createdAt || timestamp
  });

  await appendFile(vibeboxPath(root, 'logs/events.jsonl'), `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

function textHasAny(text, phrases) {
  const normalized = normalizeText(text);
  return phrases.some((phrase) => normalized.includes(normalizeText(phrase)));
}

function extractDomains(statement) {
  const domains = new Set();
  if (textHasAny(statement, ['dashboard', 'reporting'])) domains.add('dashboard');
  if (textHasAny(statement, ['app', 'prototype', 'prototypes'])) domains.add('app');
  if (textHasAny(statement, ['backend', 'api'])) domains.add('backend');
  if (textHasAny(statement, ['frontend', 'ui', 'ux', 'layout'])) domains.add('frontend');
  if (textHasAny(statement, ['database', 'mssql', 'supabase', 'postgresql'])) domains.add('database');
  if (textHasAny(statement, ['tool', 'command', 'cli'])) domains.add('tooling');
  return [...domains];
}

function extractTags(statement) {
  const normalized = normalizeText(statement);
  const tags = new Set();
  const known = [
    'dashboard',
    'database',
    'mssql',
    'supabase',
    'postgresql',
    'fastapi',
    'echarts',
    'chart.js',
    'package.json',
    'dependency',
    'dependencies',
    'layout',
    'scrolling',
    'overflow',
    'body',
    'wrapper',
    'table',
    'inline',
    'css',
    'visualization',
    'read-only',
    'reporting',
    'api',
    'rest',
    'graphql',
    'grpc',
    'tailwind',
    'css modules',
    'styled-components',
    'recharts'
  ];
  for (const item of known) {
    if (normalized.includes(normalizeText(item))) tags.add(item);
  }
  for (const token of normalized.split(/\s+/u)) {
    if (token.length >= 5 && !STOP_WORDS.has(token) && tags.size < 12) {
      tags.add(token);
    }
  }
  return [...tags];
}

function determineScope(statement, domains) {
  if (textHasAny(statement, ['for this task only', 'this task only', 'temporarily', 'temporary', 'this once'])) {
    return textHasAny(statement, ['temporarily', 'temporary']) ? 'temporary' : 'task';
  }
  if (textHasAny(statement, ['this project', 'we decided this project', 'in this repo', 'current project'])) {
    return 'project';
  }
  if (domains.length > 0 && textHasAny(statement, ['for dashboard', 'dashboard projects', 'for app', 'app projects', 'backend services', 'frontend'])) {
    return 'domain';
  }
  if (textHasAny(statement, ['always', 'do not', 'never', 'unless explicitly requested', 'i usually', 'i prefer'])) {
    return 'global';
  }
  return domains.length > 0 ? 'domain' : 'task';
}

function determineConfidence(statement, type, scope) {
  if (textHasAny(statement, ['maybe', 'might', 'feels', 'try later', 'can try'])) {
    return 'low';
  }
  if (scope === 'task' || scope === 'temporary') {
    return 'low';
  }
  if (type === 'avoid_rule' && textHasAny(statement, ['do not', 'never', 'must not', 'forbidden'])) {
    return 'high';
  }
  if (type === 'project_decision' && textHasAny(statement, ['decided', 'confirmed', 'uses', 'use echarts'])) {
    return 'high';
  }
  if (type === 'success_pattern' && textHasAny(statement, ['worked successfully', 'approved', 'confirmed'])) {
    return 'high';
  }
  if (type === 'failure_memory' && textHasAny(statement, ['caused', 'failed', 'regression', 'rejected'])) {
    return 'medium';
  }
  if (textHasAny(statement, ['prefer', 'usually', 'should', 'because'])) {
    return 'medium';
  }
  return 'low';
}

function inferType(statement) {
  const normalized = normalizeText(statement);
  const hasTemporaryAllowance = textHasAny(statement, ['for this task only', 'temporarily allow', 'temporary allow', 'this once']);
  const hasRejection = textHasAny(statement, ['do not', 'never', 'must not', 'avoid', 'forbidden', 'unless explicitly requested']);
  const hasFailure = textHasAny(statement, ['failed', 'failure', 'caused', 'regression', 'broke', 'rejected', 'wrong approach']);
  const hasSuccess = textHasAny(statement, ['worked successfully', 'successful', 'approved', 'confirmed', 'reuse', 'should be reused']);
  const hasDecision = textHasAny(statement, ['we decided', 'decided this project', 'this project uses', 'uses echarts', 'after rejecting']);
  const hasPreference = textHasAny(statement, ['prefer', 'usually prefer', 'i prefer']);
  const hasWorkflow = textHasAny(statement, ['review first', 'approval', 'workflow']);
  const hasArchitecture = textHasAny(statement, ['architecture', 'component-level', 'preserve existing behavior']);

  if (hasRejection) return 'avoid_rule';
  if (hasFailure) return 'failure_memory';
  if (hasSuccess) return 'success_pattern';
  if (hasDecision) return 'project_decision';
  if (hasTemporaryAllowance) return 'workflow_rule';
  if (hasWorkflow) return 'workflow_rule';
  if (hasArchitecture) return 'architecture_rule';
  if (hasPreference && normalized.includes('tool')) return 'tooling_preference';
  if (hasPreference) return 'user_preference';
  return null;
}

function inferTopic(statement, tags, domains) {
  if (tags.includes('dashboard') && (tags.includes('database') || tags.includes('mssql') || tags.includes('supabase') || tags.includes('postgresql'))) {
    return 'dashboard database';
  }
  if (tags.includes('package.json') || tags.includes('dependency') || tags.includes('dependencies')) {
    return 'package dependency changes';
  }
  if (tags.includes('overflow') || tags.includes('layout') || tags.includes('scrolling')) {
    return tags.includes('table') ? 'table layout scrolling' : 'layout scrolling';
  }
  if (tags.includes('echarts') || tags.includes('visualization')) {
    return 'dashboard visualization';
  }
  if (domains.includes('dashboard')) return 'dashboard development';
  if (domains.includes('database')) return 'database choice';
  return tags.slice(0, 3).join(' ') || 'general workflow';
}

function toTitle(type, topic) {
  const label = type
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
  return `${label}: ${topic}`;
}

function summarizeStatement(statement) {
  const text = redactSensitive(statement).replace(/\s+/gu, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function buildCandidate(statement, source, activeMemories) {
  if (containsSensitive(statement)) {
    return null;
  }

  const type = inferType(statement);
  if (!type || !MEMORY_TYPES.has(type)) {
    return null;
  }

  const domains = extractDomains(statement);
  const tags = extractTags(statement);
  const scope = determineScope(statement, domains);
  const confidence = determineConfidence(statement, type, scope);
  const topic = inferTopic(statement, tags, domains);
  const timestamp = nowIso();
  const summary = summarizeStatement(statement);
  const appliesTo = inferAppliesTo(statement, scope, domains, topic);
  const candidate = {
    id: hashId('mem', `${type}|${scope}|${topic}|${summary}`),
    type,
    scope,
    topic,
    title: toTitle(type, topic),
    rule: summary,
    summary,
    details: summary,
    tags,
    domains,
    appliesTo,
    source: source || { kind: 'text' },
    evidence: [{
      kind: source?.kind || 'text',
      summary
    }],
    confidence,
    status: 'pending',
    conflictStatus: 'no_conflict',
    supersedes: [],
    related: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: null
  };

  enrichTypedFields(candidate, statement);
  const conflict = classifyCandidateConflict(activeMemories, candidate);
  candidate.conflictStatus = conflict.status;
  candidate.related = [...new Set([...(candidate.related || []), ...(conflict.related || [])])];
  candidate.supersedes = [...new Set([...(candidate.supersedes || []), ...(conflict.supersedes || [])])];
  if (conflict.reason) {
    candidate.conflictReason = conflict.reason;
  }
  return candidate;
}

function inferAppliesTo(statement, scope, domains, topic) {
  if (textHasAny(statement, ['for this task only', 'this task only'])) return ['current task'];
  if (textHasAny(statement, ['dashboard projects'])) return ['dashboard projects'];
  if (textHasAny(statement, ['general app prototypes'])) return ['general app prototypes'];
  if (textHasAny(statement, ['this project'])) return ['current project'];
  if (textHasAny(statement, ['package.json'])) return ['dependency changes'];
  if (domains.length > 0) return domains.map((domain) => `${domain} work`);
  return [scope === 'global' ? 'all projects' : topic];
}

function enrichTypedFields(candidate, statement) {
  if (candidate.type === 'failure_memory') {
    candidate.failureType = inferFailureType(statement);
    candidate.failedApproach = inferFailureApproach(statement);
    candidate.failureReason = candidate.summary;
    candidate.preventionRule = inferPreventionRule(statement);
    candidate.relatedFiles = candidate.tags.includes('package.json') ? ['package.json'] : [];
    candidate.recurrenceRisk = candidate.confidence === 'high' ? 'high' : 'medium';
  }

  if (candidate.type === 'success_pattern') {
    candidate.successfulApproach = candidate.summary;
    candidate.whyItWorked = textHasAny(statement, ['because'])
      ? candidate.summary.split(/\bbecause\b/iu).slice(1).join('because').trim()
      : 'Confirmed by prior successful task outcome.';
    candidate.reuseWhen = candidate.appliesTo;
    candidate.relatedFiles = [];
  }

  if (candidate.type === 'avoid_rule') {
    candidate.forbiddenAction = candidate.summary;
    candidate.reason = textHasAny(statement, ['because'])
      ? candidate.summary.split(/\bbecause\b/iu).slice(1).join('because').trim()
      : 'Marked as an explicit avoid rule.';
    candidate.severity = candidate.confidence === 'high' ? 'high' : 'medium';
  }

  if (candidate.type === 'project_decision') {
    candidate.decision = candidate.summary;
    candidate.reason = textHasAny(statement, ['because'])
      ? candidate.summary.split(/\bbecause\b/iu).slice(1).join('because').trim()
      : 'Captured from an explicit project decision statement.';
    candidate.alternativesRejected = inferRejectedAlternatives(statement);
  }
}

function inferFailureType(statement) {
  if (textHasAny(statement, ['regression', 'layout'])) return 'regression';
  if (textHasAny(statement, ['dependency', 'package.json'])) return 'dependency_violation';
  if (textHasAny(statement, ['wrong stack', 'wrong technology'])) return 'wrong_stack_choice';
  if (textHasAny(statement, ['assumption'])) return 'wrong_assumption';
  if (textHasAny(statement, ['repeated'])) return 'repeated_mistake';
  return 'unclear_requirement';
}

function inferFailureApproach(statement) {
  if (textHasAny(statement, ['body overflow'])) return 'Changing global body overflow.';
  if (textHasAny(statement, ['package.json'])) return 'Changing package dependencies without approval.';
  return summarizeStatement(statement);
}

function inferPreventionRule(statement) {
  if (textHasAny(statement, ['prevent this by'])) {
    return statement.split(/prevent this by/iu).slice(1).join('prevent this by').trim();
  }
  if (textHasAny(statement, ['body overflow'])) {
    return 'Prefer component-level scrolling instead of global body overflow changes.';
  }
  return 'Review prior failure before repeating this approach.';
}

function inferRejectedAlternatives(statement) {
  const match = String(statement).match(/reject(?:ing|ed)\s+([^.;]+)/iu);
  if (!match) {
    return [];
  }
  return match[1].split(/\s+and\s+|,/u).map((item) => item.trim()).filter(Boolean);
}

async function activeMemories(root) {
  const index = await loadJson(vibeboxPath(root, 'index/memory-index.json'), defaultMemoryIndex());
  return index.memories.filter((memory) => memory.status === 'active');
}

export async function extractMemoryCandidates(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  let text = input.text || '';
  const source = input.source || { kind: 'manual_extract' };

  if (!text && input.eventId) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.find((item) => item.id === input.eventId);
    if (event) {
      text = [
        event.userRequest,
        event.aiActionSummary,
        event.commandResult,
        event.userFeedback
      ].filter(Boolean).join('\n');
    }
  }

  if (!text && input.fromLastEvent) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.at(-1);
    if (event) {
      text = [
        event.userRequest,
        event.aiActionSummary,
        event.commandResult,
        event.userFeedback
      ].filter(Boolean).join('\n');
    }
  }

  const memories = await activeMemories(root);
  const existingPending = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const existingIds = new Set(existingPending.map((candidate) => candidate.id));
  const newCandidates = [];

  for (const statement of splitStatements(redactSensitive(text))) {
    const candidate = buildCandidate(statement, source, memories);
    if (candidate && !existingIds.has(candidate.id)) {
      newCandidates.push(candidate);
      existingIds.add(candidate.id);
    }
  }

  if (newCandidates.length > 0) {
    await appendFile(
      vibeboxPath(root, 'pending/memory-candidates.jsonl'),
      newCandidates.map((candidate) => JSON.stringify(candidate)).join('\n') + '\n',
      'utf8'
    );
  }
  await updatePendingIndex(root);
  return newCandidates;
}

function setOverlap(left = [], right = []) {
  const rightSet = new Set(right.map((item) => normalizeText(item)));
  return left.filter((item) => rightSet.has(normalizeText(item))).length;
}

function hasTargetOverlap(memory, candidate) {
  return memory.topic === candidate.topic
    || setOverlap(memory.tags, candidate.tags) >= 2
    || setOverlap(memory.domains, candidate.domains) >= 1
    || setOverlap(memory.appliesTo, candidate.appliesTo) >= 1;
}

function hasOpposingChoice(memory, candidate) {
  const left = new Set((memory.tags || []).map((tag) => normalizeText(tag)));
  const right = new Set((candidate.tags || []).map((tag) => normalizeText(tag)));
  const mutuallyExclusiveGroups = [
    ['mssql', 'supabase', 'postgresql', 'mysql', 'sqlite'],
    ['rest', 'graphql', 'grpc'],
    ['echarts', 'chart.js', 'recharts'],
    ['tailwind', 'css modules', 'styled-components']
  ];

  return mutuallyExclusiveGroups.some((group) => {
    const leftChoices = group.filter((choice) => left.has(choice));
    const rightChoices = group.filter((choice) => right.has(choice));
    return leftChoices.length > 0
      && rightChoices.length > 0
      && leftChoices.some((choice) => !rightChoices.includes(choice));
  });
}

function isMoreSpecific(memory, candidate) {
  return (candidate.tags || []).length > (memory.tags || []).length
    || normalizeText(candidate.summary).length > normalizeText(memory.summary).length + 20
    || (candidate.appliesTo || []).join(' ').length > (memory.appliesTo || []).join(' ').length + 10;
}

export function classifyCandidateConflict(activeMemoryRecords = [], candidate) {
  const relatedMemories = activeMemoryRecords.filter((memory) => hasTargetOverlap(memory, candidate));
  if (relatedMemories.length === 0) {
    return { status: 'no_conflict', related: [], supersedes: [], reason: '' };
  }

  const candidateText = normalizeText([candidate.rule, candidate.summary, candidate.details].filter(Boolean).join(' '));
  const related = relatedMemories.map((memory) => memory.id);

  for (const memory of relatedMemories) {
    const memoryText = normalizeText([memory.rule, memory.summary, memory.details].filter(Boolean).join(' '));
    const sameShape = memory.type === candidate.type && memory.scope === candidate.scope && memory.topic === candidate.topic;
    const sameCore = normalizeText(memory.rule) === normalizeText(candidate.rule)
      || normalizeText(memory.summary) === normalizeText(candidate.summary)
      || memoryText === candidateText;
    if (sameShape && sameCore) {
      return { status: 'duplicate', related: [memory.id], supersedes: [], reason: 'Candidate is effectively identical to active memory.' };
    }
  }

  if (candidate.confidence === 'low') {
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Low-confidence candidate overlaps existing memory.' };
  }

  if (textHasAny(candidateText, ['except', 'exception', 'unless', 'only when', 'apart from'])) {
    return { status: 'exception', related, supersedes: [], reason: 'Candidate defines an exception to existing memory.' };
  }

  if (textHasAny(candidateText, ['replace', 'supersede', 'supersedes', 'instead of', 'no longer', 'override'])) {
    return { status: 'supersedes', related, supersedes: related, reason: 'Candidate explicitly replaces existing memory.' };
  }

  if (relatedMemories.some((memory) => hasOpposingChoice(memory, candidate))) {
    return { status: 'direct_conflict', related, supersedes: [], reason: 'Candidate points to a different mutually exclusive technology choice.' };
  }

  if (relatedMemories.some((memory) => isMoreSpecific(memory, candidate))) {
    return { status: 'refinement', related, supersedes: [], reason: 'Candidate adds a more specific condition to existing memory.' };
  }

  return { status: 'needs_user_review', related, supersedes: [], reason: 'Candidate overlaps existing memory but relation is ambiguous.' };
}

async function updatePendingIndex(root) {
  const candidates = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  await saveJson(vibeboxPath(root, 'index/pending-index.json'), {
    ...defaultPendingIndex(),
    candidates: candidates.map(toPendingIndexEntry)
  });
}

function toPendingIndexEntry(candidate) {
  return {
    id: candidate.id,
    type: candidate.type,
    scope: candidate.scope,
    topic: candidate.topic,
    title: candidate.title,
    summary: candidate.summary,
    confidence: candidate.confidence,
    status: candidate.status,
    conflictStatus: candidate.conflictStatus,
    related: candidate.related || [],
    supersedes: candidate.supersedes || [],
    updatedAt: candidate.updatedAt
  };
}

function toMemoryIndexEntry(memory) {
  return {
    id: memory.id,
    type: memory.type,
    scope: memory.scope,
    topic: memory.topic,
    title: memory.title,
    rule: memory.rule,
    summary: memory.summary,
    tags: memory.tags || [],
    domains: memory.domains || [],
    appliesTo: memory.appliesTo || [],
    source: memory.source || {},
    evidence: memory.evidence || [],
    confidence: memory.confidence,
    status: memory.status,
    conflictStatus: memory.conflictStatus,
    supersedes: memory.supersedes || [],
    related: memory.related || [],
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    lastUsedAt: memory.lastUsedAt || null,
    failureType: memory.failureType,
    failedApproach: memory.failedApproach,
    failureReason: memory.failureReason,
    preventionRule: memory.preventionRule,
    relatedFiles: memory.relatedFiles,
    recurrenceRisk: memory.recurrenceRisk,
    successfulApproach: memory.successfulApproach,
    whyItWorked: memory.whyItWorked,
    reuseWhen: memory.reuseWhen,
    forbiddenAction: memory.forbiddenAction,
    reason: memory.reason,
    severity: memory.severity,
    decision: memory.decision,
    alternativesRejected: memory.alternativesRejected
  };
}

export async function reviewPending(root = process.cwd()) {
  await initVibeBox(root);
  const candidates = (await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl')))
    .filter((candidate) => candidate.status === 'pending');
  if (candidates.length === 0) {
    return 'No pending VibeBox memory candidates.';
  }

  const header = ['ID', 'TYPE', 'SCOPE', 'TOPIC', 'TITLE', 'SUMMARY', 'CONFIDENCE', 'CONFLICT'].join('  ');
  const rows = candidates.map((candidate) => [
    candidate.id,
    candidate.type,
    candidate.scope,
    candidate.topic,
    candidate.title,
    candidate.summary,
    candidate.confidence,
    candidate.conflictStatus
  ].map((value) => String(value ?? '').replace(/\s+/gu, ' ').trim()).join('  '));
  return [header, ...rows].join('\n');
}

export async function approveMemory(root = process.cwd(), candidateId) {
  await initVibeBox(root);
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) {
    throw new Error(`Pending candidate not found: ${candidateId}`);
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Candidate is not pending: ${candidateId}`);
  }
  if (containsSensitive(candidate)) {
    candidate.status = 'rejected';
    candidate.updatedAt = nowIso();
    candidate.rejectionReason = 'Sensitive value suspected; cannot promote to active memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate contains suspected sensitive data and was rejected: ${candidateId}`);
  }

  const memoryIndex = await loadJson(vibeboxPath(root, 'index/memory-index.json'), defaultMemoryIndex());
  const timestamp = nowIso();
  const memory = {
    ...candidate,
    status: 'active',
    updatedAt: timestamp
  };

  for (const existing of memoryIndex.memories) {
    if ((memory.supersedes || []).includes(existing.id) && existing.status === 'active') {
      existing.status = 'superseded';
      existing.updatedAt = timestamp;
    }
  }

  if (!memoryIndex.memories.some((item) => item.id === memory.id)) {
    memoryIndex.memories.push(toMemoryIndexEntry(memory));
  }
  memoryIndex.updatedAt = timestamp;
  await saveJson(vibeboxPath(root, 'index/memory-index.json'), memoryIndex);

  candidate.status = 'active';
  candidate.updatedAt = timestamp;
  await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
  await rebuildIndexes(root);
  await rebuildWiki(root);
  return memory;
}

export async function rejectMemory(root = process.cwd(), candidateId, reason = 'Rejected during review.') {
  await initVibeBox(root);
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) {
    throw new Error(`Pending candidate not found: ${candidateId}`);
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Candidate is not pending: ${candidateId}`);
  }
  candidate.status = 'rejected';
  candidate.rejectionReason = reason;
  candidate.updatedAt = nowIso();
  await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
  await updatePendingIndex(root);
  return candidate;
}

async function rebuildIndexes(root) {
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/memory-index.json'), defaultMemoryIndex());
  const keywordIndex = defaultKeywordIndex();
  const relationIndex = defaultRelationIndex();

  for (const memory of memoryIndex.memories) {
    indexValue(keywordIndex.types, memory.type, memory.id);
    indexValue(keywordIndex.scopes, memory.scope, memory.id);
    indexValue(keywordIndex.topics, memory.topic, memory.id);
    for (const tag of memory.tags || []) indexValue(keywordIndex.tags, tag, memory.id);
    for (const domain of memory.domains || []) indexValue(keywordIndex.domains, domain, memory.id);
    for (const keyword of memoryKeywords(memory)) indexValue(keywordIndex.keywords, keyword, memory.id);

    for (const relatedId of memory.related || []) {
      relationIndex.relations.push({ from: memory.id, to: relatedId, type: 'related' });
      relationIndex.related[memory.id] = [...new Set([...(relationIndex.related[memory.id] || []), relatedId])];
    }
    for (const supersededId of memory.supersedes || []) {
      relationIndex.relations.push({ from: memory.id, to: supersededId, type: 'supersedes' });
      relationIndex.supersedes[memory.id] = [...new Set([...(relationIndex.supersedes[memory.id] || []), supersededId])];
    }
  }

  await saveJson(vibeboxPath(root, 'index/keyword-index.json'), keywordIndex);
  await saveJson(vibeboxPath(root, 'index/relation-index.json'), relationIndex);
  await updatePendingIndex(root);
}

function indexValue(index, value, id) {
  const key = normalizeText(value);
  if (!key) return;
  index[key] = [...new Set([...(index[key] || []), id])].sort();
}

function memoryKeywords(memory) {
  const text = [
    memory.type,
    memory.scope,
    memory.topic,
    memory.title,
    memory.summary,
    memory.rule,
    ...(memory.tags || []),
    ...(memory.domains || []),
    ...(memory.appliesTo || [])
  ].join(' ');
  return normalizeText(text)
    .split(/\s+/u)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .slice(0, 60);
}

function pageTitle(pageName) {
  return pageName.replace(/\.md$/u, '');
}

function wikiLink(label) {
  const clean = String(label || '')
    .replace(/[[\]]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return clean ? `[[${clean}]]` : '';
}

async function rebuildWiki(root) {
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/memory-index.json'), defaultMemoryIndex());
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active');

  await writeManagedWikiPage(root, 'Home.md', renderHomeShell(), renderHomeManaged(active));
  for (const page of WIKI_PAGES.filter((item) => item !== 'Home.md')) {
    const pageMemories = active.filter((memory) => TYPE_TO_PAGE[memory.type] === page);
    await writeManagedWikiPage(root, page, renderMemoryShell(page), renderMemoryManaged(pageMemories));
  }
}

function managedBlock(content) {
  return `${MANAGED_BEGIN}\n${content.trim()}\n${MANAGED_END}`;
}

async function writeManagedWikiPage(root, pageName, shell, managedContent) {
  const filePath = vibeboxPath(root, 'wiki', pageName);
  const block = managedBlock(managedContent);
  let existing = '';
  try {
    existing = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (existing.includes(MANAGED_BEGIN) && existing.includes(MANAGED_END)) {
    const pattern = new RegExp(`${escapeRegExp(MANAGED_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_END)}`, 'u');
    await writeFile(filePath, `${existing.replace(pattern, block).replace(/\s*$/u, '')}\n`, 'utf8');
    return;
  }

  if (existing.trim().length > 0) {
    await writeFile(filePath, `${existing.replace(/\s*$/u, '')}\n\n${block}\n`, 'utf8');
    return;
  }

  await writeFile(filePath, `${shell.trim()}\n\n${block}\n`, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function renderHomeShell() {
  return `${wikiFrontmatter('VibeBox Home')}# VibeBox Home

Local memory vault for this project.`;
}

function renderHomeManaged(memories) {
  const counts = memories.reduce((acc, memory) => {
    acc[memory.type] = (acc[memory.type] || 0) + 1;
    return acc;
  }, {});
  return `## Wiki

- [[User Preferences]] (${counts.user_preference || 0})
- [[Project Decisions]] (${counts.project_decision || 0})
- [[Architecture Rules]] (${counts.architecture_rule || 0})
- [[Avoid Rules]] (${counts.avoid_rule || 0})
- [[Failure Memory]] (${counts.failure_memory || 0})
- [[Success Patterns]] (${counts.success_pattern || 0})
- [[Tooling Preferences]] (${counts.tooling_preference || 0})
- [[Workflow Rules]] (${counts.workflow_rule || 0})

## Recent Active Memory

${memories.slice(-10).map((memory) => `- ${wikiLink(pageTitle(TYPE_TO_PAGE[memory.type]))} ${memory.title}: ${memory.summary}`).join('\n') || '- No approved memory yet.'}

## Storage

- JSON indexes live in \`../index/\`.
- Raw blackbox events live in \`../logs/events.jsonl\`.
- Pending memory candidates live in \`../pending/memory-candidates.jsonl\`.
`;
}

function renderMemoryShell(pageName) {
  const title = pageTitle(pageName);
  return `${wikiFrontmatter(title)}# ${title}

Back to [[Home]].`;
}

function renderMemoryManaged(memories) {
  return memories.length === 0 ? 'No approved memory yet.' : memories.map(renderMemoryMarkdown).join('\n\n');
}

function renderMemoryMarkdown(memory) {
  const links = [
    ...(memory.tags || []).slice(0, 8),
    ...(memory.domains || []).slice(0, 5)
  ].map(wikiLink).filter(Boolean).join(' ');

  const lines = [
    `## ${memory.title}`,
    '',
    `- ID: \`${memory.id}\``,
    `- Scope: \`${memory.scope}\``,
    `- Confidence: \`${memory.confidence}\``,
    `- Topic: ${wikiLink(memory.topic) || memory.topic}`,
    `- Summary: ${memory.summary}`,
    `- Applies to: ${(memory.appliesTo || []).map((item) => wikiLink(item) || item).join(', ') || 'Not specified'}`
  ];

  if (memory.type === 'failure_memory') {
    lines.push(`- Failure type: \`${memory.failureType || 'unclear_requirement'}\``);
    lines.push(`- Prevention rule: ${memory.preventionRule || 'Review before repeating.'}`);
  }
  if (memory.type === 'success_pattern') {
    lines.push(`- Reuse when: ${(memory.reuseWhen || memory.appliesTo || []).join(', ') || 'Similar work appears.'}`);
  }
  if (memory.type === 'avoid_rule') {
    lines.push(`- Forbidden action: ${memory.forbiddenAction || memory.rule}`);
    lines.push(`- Severity: \`${memory.severity || 'medium'}\``);
  }
  if (memory.type === 'project_decision') {
    lines.push(`- Decision: ${memory.decision || memory.rule}`);
    if ((memory.alternativesRejected || []).length > 0) {
      lines.push(`- Alternatives rejected: ${memory.alternativesRejected.join(', ')}`);
    }
  }
  if (links) {
    lines.push(`- Links: ${links}`);
  }
  return lines.join('\n');
}

function scoreMemory(memory, task) {
  const taskTokens = new Set(memoryKeywords({ summary: task, tags: [], domains: [], appliesTo: [] }));
  const memoryTokenSet = new Set(memoryKeywords(memory));
  let score = (SCOPE_PRIORITY[memory.scope] || 0)
    + (TYPE_PRIORITY[memory.type] || 0)
    + (CONFIDENCE_PRIORITY[memory.confidence] || 0);

  for (const token of taskTokens) {
    if (memoryTokenSet.has(token)) score += 12;
  }
  if (normalizeText(task).includes(normalizeText(memory.topic))) score += 25;
  if ((memory.domains || []).some((domain) => normalizeText(task).includes(normalizeText(domain)))) score += 20;
  if ((memory.tags || []).some((tag) => normalizeText(task).includes(normalizeText(tag)))) score += 16;
  const ageMs = Date.now() - Date.parse(memory.updatedAt || memory.createdAt || nowIso());
  if (Number.isFinite(ageMs)) {
    score += Math.max(0, 8 - Math.floor(ageMs / 86_400_000));
  }
  return score;
}

export async function generateContextPack(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig(root));
  const task = input.task || input.text || '';
  const index = await loadJson(vibeboxPath(root, 'index/memory-index.json'), defaultMemoryIndex());
  const active = index.memories.filter((memory) => memory.status === 'active');
  const scored = active
    .map((memory) => ({ memory, score: scoreMemory(memory, task) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, config.maxContextItems || 8)
    .map((item) => ({ ...item.memory, lastUsedAt: nowIso() }));

  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const conflicts = pendingIndex.candidates
    .filter((candidate) => candidate.status === 'pending' && !['no_conflict', 'duplicate'].includes(candidate.conflictStatus))
    .filter((candidate) => scoreMemory(candidate, task) > 0)
    .slice(0, 4);

  const sections = [
    'VibeBox Context Pack',
    '',
    'Task:',
    redactSensitive(task),
    '',
    renderContextSection('Relevant User Preferences', scored.filter((memory) => ['user_preference', 'tooling_preference', 'coding_style', 'design_preference', 'workflow_rule'].includes(memory.type))),
    renderContextSection('Relevant Project Decisions', scored.filter((memory) => memory.type === 'project_decision')),
    renderContextSection('Relevant Architecture Rules', scored.filter((memory) => memory.type === 'architecture_rule')),
    renderContextSection('Relevant Avoid Rules', scored.filter((memory) => memory.type === 'avoid_rule')),
    renderContextSection('Relevant Failure Memory', scored.filter((memory) => memory.type === 'failure_memory')),
    renderContextSection('Relevant Success Patterns', scored.filter((memory) => memory.type === 'success_pattern')),
    renderConflictSection(conflicts),
    'Guidance for AI Agent:',
    '- Use the memory context as constraints.',
    '- Do not treat low-confidence memory as a final fact.',
    "- If memory conflicts with the user's current explicit request, follow the current explicit request and mention the conflict.",
    '- Preserve existing project behavior unless the task explicitly changes it.',
    '- Avoid repeating known failed approaches.'
  ];

  let pack = sections.join('\n');
  if (pack.length > (config.maxContextChars || 6000)) {
    pack = `${pack.slice(0, config.maxContextChars || 6000)}\n[Context truncated by VibeBox maxContextChars]`;
  }
  return redactSensitive(pack);
}

function renderContextSection(title, memories) {
  return [
    `${title}:`,
    ...(memories.length > 0 ? memories.map((memory) => `- ${memory.summary} [${memory.id}; ${memory.scope}; ${memory.confidence}]`) : ['- None.']),
    ''
  ].join('\n');
}

function renderConflictSection(conflicts) {
  return [
    'Potential Conflicts:',
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.summary} [${candidate.id}; ${candidate.conflictStatus}; ${candidate.confidence}]`) : ['- None.']),
    ''
  ].join('\n');
}

export async function runDoctor(root = process.cwd()) {
  const errors = [];
  const warnings = [];
  const base = vibeboxPath(root);
  const requiredFiles = [
    'config.json',
    ...WIKI_PAGES.map((page) => `wiki/${page}`),
    'index/memory-index.json',
    'index/keyword-index.json',
    'index/relation-index.json',
    'index/pending-index.json',
    'logs/events.jsonl',
    'pending/memory-candidates.jsonl'
  ];

  for (const dir of [base, vibeboxPath(root, 'wiki'), vibeboxPath(root, 'index'), vibeboxPath(root, 'logs'), vibeboxPath(root, 'pending')]) {
    try {
      const info = await stat(dir);
      if (!info.isDirectory()) errors.push(`Missing directory: ${dir}`);
    } catch {
      errors.push(`Missing directory: ${dir}`);
    }
  }

  for (const relative of requiredFiles) {
    const filePath = vibeboxPath(root, relative);
    if (!(await exists(filePath))) {
      errors.push(`Missing file: .vibebox/${relative}`);
      continue;
    }
    if (relative.endsWith('.json')) {
      try {
        await loadJson(filePath);
      } catch (error) {
        errors.push(`Invalid JSON in .vibebox/${relative}: ${error.message}`);
      }
    }
    if (relative.endsWith('.jsonl')) {
      try {
        await readJsonl(filePath);
      } catch (error) {
        errors.push(`Invalid JSONL in .vibebox/${relative}: ${error.message}`);
      }
    }
  }

  try {
    const logs = await readFile(vibeboxPath(root, 'logs/events.jsonl'), 'utf8');
    if (containsSensitive(logs)) {
      warnings.push('Potential sensitive value found in raw event log. Consider redacting or removing it.');
    }
  } catch {
    // Missing logs are already reported above.
  }

  try {
    const memoryIndex = await loadJson(vibeboxPath(root, 'index/memory-index.json'));
    const ids = new Set(memoryIndex.memories.map((memory) => memory.id));
    for (const memory of memoryIndex.memories) {
      for (const relatedId of [...(memory.related || []), ...(memory.supersedes || [])]) {
        if (!ids.has(relatedId)) {
          warnings.push(`Memory ${memory.id} references missing related memory ${relatedId}.`);
        }
      }
    }
  } catch {
    // Invalid JSON is already reported above.
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

export function formatDoctorReport(report) {
  const lines = ['VibeBox Doctor', `Status: ${report.ok ? 'ok' : 'error'}`];
  if (report.errors.length > 0) {
    lines.push('', 'Errors:', ...report.errors.map((error) => `- ${error}`));
  }
  if (report.warnings.length > 0) {
    lines.push('', 'Warnings:', ...report.warnings.map((warning) => `- ${warning}`));
  }
  if (report.errors.length === 0 && report.warnings.length === 0) {
    lines.push('', 'No issues found.');
  }
  return lines.join('\n');
}
