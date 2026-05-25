import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const VIBEBOX_VERSION = '0.1.0';

const WIKI_PAGES = [
  'Home.md',
  'User Preferences.md',
  'Global Avoid Rules.md',
  'Failure Memory.md',
  'Success Patterns.md',
  'Tooling Preferences.md',
  'Workflow Rules.md',
  'Project Index.md'
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
  project_decision: 'Project Index.md',
  architecture_rule: 'Project Index.md',
  avoid_rule: 'Global Avoid Rules.md',
  failure_memory: 'Failure Memory.md',
  success_pattern: 'Success Patterns.md',
  tooling_preference: 'Tooling Preferences.md',
  workflow_rule: 'Workflow Rules.md'
};

const GLOBAL_MEMORY_FILES = {
  user_preference: 'user-preferences.json',
  avoid_rule: 'avoid-rules.json',
  tooling_preference: 'tooling-preferences.json',
  coding_style: 'coding-style.json',
  workflow_rule: 'workflow-rules.json',
  architecture_rule: 'architecture-patterns.json',
  failure_memory: 'failure-memory.json',
  success_pattern: 'success-patterns.json',
  design_preference: 'user-preferences.json'
};

const PROJECT_MEMORY_FILES = {
  project_decision: 'decisions.json',
  architecture_rule: 'architecture-rules.json',
  avoid_rule: 'avoid-rules.json',
  failure_memory: 'failures.json',
  success_pattern: 'successes.json',
  tooling_preference: 'tooling-preferences.json',
  workflow_rule: 'workflow-rules.json',
  design_preference: 'design-preferences.json',
  user_preference: 'workflow-rules.json',
  coding_style: 'design-preferences.json'
};

const GLOBAL_MEMORY_FILE_NAMES = [
  'user-preferences.json',
  'avoid-rules.json',
  'tooling-preferences.json',
  'coding-style.json',
  'workflow-rules.json',
  'architecture-patterns.json'
];

const PROJECT_MEMORY_FILE_NAMES = [
  'decisions.json',
  'architecture-rules.json',
  'avoid-rules.json',
  'failures.json',
  'successes.json',
  'tooling-preferences.json',
  'workflow-rules.json',
  'design-preferences.json',
  'task-history.json'
];

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

export function getVibeBoxHome(options = {}) {
  return path.resolve(options.storeRoot || process.env.VIBEBOX_HOME || path.join(os.homedir(), '.vibebox'));
}

export function resolveGlobalStore(options = {}) {
  const storeRoot = getVibeBoxHome(options);
  return {
    storeRoot,
    configPath: path.join(storeRoot, 'config.json'),
    registryPath: path.join(storeRoot, 'registry', 'projects.json')
  };
}

export function vibeboxPath(_root = process.cwd(), ...parts) {
  return path.join(getVibeBoxHome(), ...parts);
}

function projectNamespacePath(projectId, ...parts) {
  return vibeboxPath(process.cwd(), 'projects', projectId, ...parts);
}

export function getProjectNamespacePath(projectId, ...parts) {
  return projectNamespacePath(projectId, ...parts);
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

function defaultConfig() {
  const timestamp = nowIso();
  return {
    version: VIBEBOX_VERSION,
    memoryMode: 'review',
    obsidianCompatible: true,
    maxContextItems: 8,
    maxContextChars: 6000,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function defaultRegistry() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    projects: []
  };
}

function defaultMemoryFile() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    memories: []
  };
}

async function findGitRoot(cwd) {
  let current = path.resolve(cwd);
  while (true) {
    if (await exists(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function readGitConfigPath(gitRoot) {
  const dotGit = path.join(gitRoot, '.git');
  try {
    const info = await stat(dotGit);
    if (info.isDirectory()) {
      return path.join(dotGit, 'config');
    }
    if (info.isFile()) {
      const text = await readFile(dotGit, 'utf8');
      const match = text.match(/gitdir:\s*(.+)/iu);
      if (match) {
        const gitDir = path.isAbsolute(match[1].trim())
          ? match[1].trim()
          : path.resolve(gitRoot, match[1].trim());
        return path.join(gitDir, 'config');
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function readGitRemoteOrigin(gitRoot) {
  if (!gitRoot) return '';
  const configPath = await readGitConfigPath(gitRoot);
  if (!configPath) return '';
  try {
    const text = await readFile(configPath, 'utf8');
    const lines = text.split(/\r?\n/u);
    let inOrigin = false;
    for (const line of lines) {
      const section = line.match(/^\s*\[remote\s+"([^"]+)"\]\s*$/u);
      if (section) {
        inOrigin = section[1] === 'origin';
        continue;
      }
      if (inOrigin) {
        const url = line.match(/^\s*url\s*=\s*(.+?)\s*$/u);
        if (url) return url[1];
      }
    }
  } catch {
    return '';
  }
  return '';
}

function parseRemoteRepository(gitRemote = '') {
  const value = String(gitRemote).trim();
  if (!value) return {};
  const withoutSuffix = value.replace(/\.git$/iu, '');
  const scpLike = withoutSuffix.match(/^[^@]+@[^:]+:([^/]+)\/(.+)$/u);
  if (scpLike) {
    return { owner: scpLike[1], repositoryName: path.basename(scpLike[2]) };
  }
  try {
    const parsed = new URL(withoutSuffix);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts.at(-2), repositoryName: parts.at(-1) };
    }
  } catch {
    // Fall through to path-like parsing.
  }
  const parts = withoutSuffix.split(/[\\/]/u).filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts.at(-2), repositoryName: parts.at(-1) };
  }
  return { repositoryName: parts.at(-1) || '' };
}

function slugProjectId(value) {
  const slug = String(value || '')
    .replace(/^@/u, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 80);
  return slug || 'project';
}

async function detectProjectIdentity(root) {
  const cwd = path.resolve(root);
  const gitRoot = await findGitRoot(cwd);
  const projectRoot = gitRoot || cwd;
  const gitRemote = await readGitRemoteOrigin(gitRoot);
  const remote = parseRemoteRepository(gitRemote);
  const identity = {
    projectId: slugProjectId(remote.repositoryName || path.basename(projectRoot)),
    projectName: remote.repositoryName || path.basename(projectRoot),
    rootPath: projectRoot,
    gitRemote,
    repositoryName: remote.repositoryName || path.basename(projectRoot),
    packageName: '',
    primaryDomain: 'general',
    techStackHints: [],
    aliases: [],
    status: 'active'
  };

  const packagePath = path.join(projectRoot, 'package.json');
  try {
    const packageData = JSON.parse(await readFile(packagePath, 'utf8'));
    if (packageData.name) {
      identity.packageName = packageData.name;
      if (!remote.repositoryName) {
        identity.projectId = slugProjectId(packageData.name);
        identity.projectName = packageData.name;
        identity.repositoryName = packageData.name;
      } else {
        identity.projectName = packageData.name;
      }
    }
    const dependencyNames = Object.keys({
      ...(packageData.dependencies || {}),
      ...(packageData.devDependencies || {})
    });
    identity.techStackHints = dependencyNames
      .filter((name) => ['react', 'vue', 'svelte', 'next', 'vite', 'express', 'fastify', 'echarts', 'chart.js', 'typescript'].includes(name))
      .sort();
    const searchable = `${packageData.name || ''} ${packageData.description || ''} ${dependencyNames.join(' ')}`;
    if (textHasAny(searchable, ['dashboard', 'echarts', 'chart.js', 'reporting'])) {
      identity.primaryDomain = 'dashboard';
    } else if (textHasAny(searchable, ['api', 'express', 'fastify', 'backend'])) {
      identity.primaryDomain = 'backend';
    } else if (textHasAny(searchable, ['react', 'vue', 'svelte', 'frontend', 'ui'])) {
      identity.primaryDomain = 'frontend';
    }
  } catch {
    // package.json is optional for agent-neutral VibeBox workspaces.
  }

  return identity;
}

async function resolveCurrentProjectIdentity(root = process.cwd()) {
  await ensureDir(vibeboxPath(root, 'registry'));
  const registryPath = vibeboxPath(root, 'registry/projects.json');
  const registry = await loadJson(registryPath, defaultRegistry());
  registry.projects = Array.isArray(registry.projects) ? registry.projects : [];
  const detected = await detectProjectIdentity(root);
  const timestamp = nowIso();

  const existing = registry.projects.find((project) => (
    (detected.gitRemote && project.gitRemote === detected.gitRemote)
    || (project.rootPath && path.resolve(project.rootPath) === detected.rootPath)
  ));

  let projectId = existing?.projectId || detected.projectId;
  const collides = registry.projects.some((project) => project.projectId === projectId && project !== existing);
  if (collides) {
    const remote = parseRemoteRepository(detected.gitRemote);
    const ownerRepo = remote.owner && remote.repositoryName
      ? slugProjectId(`${remote.owner}-${remote.repositoryName}`)
      : '';
    projectId = ownerRepo && !registry.projects.some((project) => project.projectId === ownerRepo && project !== existing)
      ? ownerRepo
      : `${detected.projectId}-${createHash('sha256').update(`${detected.gitRemote}|${detected.rootPath}`).digest('hex').slice(0, 8)}`;
  }

  const aliases = new Set([...(existing?.aliases || []), ...(detected.aliases || [])]);
  if (detected.projectId !== projectId) aliases.add(detected.projectId);
  const project = {
    ...existing,
    ...detected,
    projectId,
    firstSeenAt: existing?.firstSeenAt || timestamp,
    lastSeenAt: timestamp,
    aliases: [...aliases].sort(),
    status: existing?.status || detected.status || 'active'
  };

  if (existing) {
    registry.projects = registry.projects.map((item) => item.projectId === existing.projectId ? project : item);
  } else {
    registry.projects.push(project);
  }
  registry.updatedAt = timestamp;
  registry.projects.sort((left, right) => left.projectId.localeCompare(right.projectId));
  await saveJson(registryPath, registry);
  return project;
}

export { resolveCurrentProjectIdentity };

async function createDefaultConfig() {
  return defaultConfig();
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
    scopes: {},
    projects: {}
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

function defaultProjectIndex(projects = [], memories = []) {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    projects: projects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      rootPath: project.rootPath,
      gitRemote: project.gitRemote,
      repositoryName: project.repositoryName,
      packageName: project.packageName,
      primaryDomain: project.primaryDomain,
      techStackHints: project.techStackHints || [],
      firstSeenAt: project.firstSeenAt,
      lastSeenAt: project.lastSeenAt,
      aliases: project.aliases || [],
      status: project.status || 'active',
      memoryCount: memories.filter((memory) => memory.projectId === project.projectId).length
    }))
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
  if (pageName === 'Project Index.md') {
    return `${renderProjectIndexShell()}\n\n${managedBlock(renderProjectIndexManaged([]))}\n`;
  }

  return `${renderMemoryShell(pageName)}\n\n${managedBlock(renderMemoryManaged([]))}\n`;
}

function initialProjectWikiPage(project) {
  return `${renderProjectShell(project)}\n\n${managedBlock(renderProjectManaged(project, []))}\n`;
}

export async function initVibeBox(root = process.cwd()) {
  const base = vibeboxPath(root);
  const created = [];
  const config = await createDefaultConfig();

  await ensureDir(vibeboxPath(root, 'registry'));
  await writeIfMissing(vibeboxPath(root, 'registry/projects.json'), `${JSON.stringify(defaultRegistry(), null, 2)}\n`);
  const project = await resolveCurrentProjectIdentity(root);

  for (const dir of ['', 'global', 'projects', `projects/${project.projectId}`, 'wiki', 'wiki/projects', 'index', 'logs', 'pending', 'registry']) {
    const dirPath = vibeboxPath(root, dir);
    if (!(await exists(dirPath))) {
      created.push(path.relative(base, dirPath) || '.');
    }
    await ensureDir(dirPath);
  }

  const files = [
    ['config.json', `${JSON.stringify(config, null, 2)}\n`],
    ['index/global-memory-index.json', `${JSON.stringify(defaultMemoryIndex(), null, 2)}\n`],
    ['index/project-index.json', `${JSON.stringify(defaultProjectIndex([], []), null, 2)}\n`],
    ['index/keyword-index.json', `${JSON.stringify(defaultKeywordIndex(), null, 2)}\n`],
    ['index/relation-index.json', `${JSON.stringify(defaultRelationIndex(), null, 2)}\n`],
    ['index/pending-index.json', `${JSON.stringify(defaultPendingIndex(), null, 2)}\n`],
    ['logs/events.jsonl', ''],
    ['pending/memory-candidates.jsonl', ''],
    [`projects/${project.projectId}/project.json`, `${JSON.stringify(project, null, 2)}\n`]
  ];

  for (const fileName of GLOBAL_MEMORY_FILE_NAMES) {
    files.push([`global/${fileName}`, `${JSON.stringify(defaultMemoryFile(), null, 2)}\n`]);
  }
  for (const fileName of PROJECT_MEMORY_FILE_NAMES) {
    files.push([`projects/${project.projectId}/${fileName}`, `${JSON.stringify(defaultMemoryFile(), null, 2)}\n`]);
  }
  for (const page of WIKI_PAGES) {
    files.push([`wiki/${page}`, initialWikiPage(page)]);
  }
  files.push([`wiki/projects/${project.projectId}.md`, initialProjectWikiPage(project)]);

  for (const [relative, content] of files) {
    const didCreate = await writeIfMissing(vibeboxPath(root, relative), content);
    if (didCreate) {
      created.push(relative);
    }
  }

  await ensureConfigFields(root);
  await saveJson(vibeboxPath(root, `projects/${project.projectId}/project.json`), project);
  await rebuildIndexes(root, { syncNamespaceFiles: false });
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  await writeManagedWikiPage(root, 'Project Index.md', renderProjectIndexShell(), renderProjectIndexManaged(registry.projects || []));

  return {
    root: path.resolve(root),
    projectRoot: project.rootPath,
    projectId: project.projectId,
    storeRoot: base,
    vibeboxPath: base,
    created
  };
}

async function ensureConfigFields(root) {
  const configPath = vibeboxPath(root, 'config.json');
  const existing = await loadJson(configPath, {});
  const defaults = await createDefaultConfig();
  const merged = { ...defaults, ...existing };
  let changed = false;

  for (const key of ['maxContextItems', 'maxContextChars', 'memoryMode', 'obsidianCompatible']) {
    if (existing[key] === undefined) {
      merged[key] = defaults[key];
      changed = true;
    }
  }
  if (changed) {
    merged.updatedAt = nowIso();
    await saveJson(configPath, merged);
  }
}

async function ensureStoreForRead(root) {
  if (!(await exists(vibeboxPath(root)))) {
    throw new Error(`VibeBox global store not found at ${vibeboxPath(root)}. Run \`vibebox init\` first.`);
  }
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
  const project = await resolveCurrentProjectIdentity(root);
  const timestamp = nowIso();
  const event = redactSensitive({
    id: input.id || `evt_${randomUUID()}`,
    projectId: project.projectId,
    projectRoot: project.rootPath,
    eventType: input.eventType || 'task_summary',
    userRequest: input.userRequest || '',
    aiActionSummary: input.aiActionSummary || '',
    command: input.command || '',
    commandResult: input.commandResult || '',
    commands: Array.isArray(input.commands) ? input.commands : [],
    commandResults: Array.isArray(input.commandResults) ? input.commandResults : [],
    errors: Array.isArray(input.errors) ? input.errors : [],
    changedFiles: Array.isArray(input.changedFiles) ? input.changedFiles : [],
    userFeedback: input.userFeedback || '',
    outcome: input.outcome || 'unknown',
    notes: input.notes || '',
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
  const hasDurableUseInstruction = textHasAny(statement, ['for dashboard projects, use', 'dashboard projects use', 'for app projects, use', 'app projects use', 'this project uses']);
  const hasWorkflow = textHasAny(statement, ['review first', 'approval', 'workflow']);
  const hasArchitecture = textHasAny(statement, ['architecture', 'component-level', 'preserve existing behavior']);

  if (hasRejection) return 'avoid_rule';
  if (hasFailure) return 'failure_memory';
  if (hasDecision) return 'project_decision';
  if (hasSuccess) return 'success_pattern';
  if (hasTemporaryAllowance) return 'workflow_rule';
  if (hasWorkflow) return 'workflow_rule';
  if (hasArchitecture) return 'architecture_rule';
  if (hasPreference && normalized.includes('tool')) return 'tooling_preference';
  if (hasPreference) return 'user_preference';
  if (hasDurableUseInstruction) return textHasAny(statement, ['this project']) ? 'project_decision' : 'user_preference';
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
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const project = await resolveCurrentProjectIdentity(root);
  return index.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
}

function isMemoryVisibleForProject(memory, project) {
  if (!memory) return false;
  if (memory.scope === 'global') return true;
  if (memory.scope === 'domain') return !memory.projectId || memory.projectId === project.projectId;
  return memory.projectId === project.projectId;
}

export async function extractMemoryCandidates(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  let text = input.text || '';
  const source = input.source || { kind: 'manual_extract' };

  if (!text && input.eventId) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.find((item) => item.id === input.eventId && item.projectId === project.projectId);
    if (event) {
      text = [
        event.userRequest,
        event.aiActionSummary,
        ...(event.commands || []),
        event.commandResult,
        ...(event.commandResults || []),
        ...(event.errors || []),
        event.userFeedback,
        event.notes,
        event.outcome ? `Outcome: ${event.outcome}` : ''
      ].filter(Boolean).join('\n');
    }
  }

  if (!text && input.fromLastEvent) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.filter((item) => item.projectId === project.projectId).at(-1);
    if (event) {
      text = [
        event.userRequest,
        event.aiActionSummary,
        ...(event.commands || []),
        event.commandResult,
        ...(event.commandResults || []),
        ...(event.errors || []),
        event.userFeedback,
        event.notes,
        event.outcome ? `Outcome: ${event.outcome}` : ''
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
      if (['project', 'task', 'temporary'].includes(candidate.scope)) {
        candidate.projectId = project.projectId;
        candidate.id = hashId('mem', `${candidate.id}|${project.projectId}`);
      }
      if (existingIds.has(candidate.id)) {
        continue;
      }
      candidate.sourceProjectRoot = project.rootPath;
      candidate.repositoryName = project.repositoryName || project.projectName;
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

  if (textHasAny(candidateText, ['except', 'exception', 'unless', 'only when', 'apart from'])) {
    return { status: 'exception', related, supersedes: [], reason: 'Candidate defines an exception to existing memory.' };
  }

  if (textHasAny(candidateText, ['replace', 'supersede', 'supersedes', 'instead of', 'no longer', 'override'])) {
    return { status: 'supersedes', related, supersedes: related, reason: 'Candidate explicitly replaces existing memory.' };
  }

  if (relatedMemories.some((memory) => hasOpposingChoice(memory, candidate))) {
    return { status: 'direct_conflict', related, supersedes: [], reason: 'Candidate points to a different mutually exclusive technology choice.' };
  }

  if (candidate.confidence === 'low') {
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Low-confidence candidate overlaps existing memory.' };
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
    projectId: candidate.projectId || null,
    sourceProjectRoot: candidate.sourceProjectRoot || null,
    confidence: candidate.confidence,
    status: candidate.status,
    conflictStatus: candidate.conflictStatus,
    recommendedAction: recommendCandidateAction(candidate).action,
    related: candidate.related || [],
    supersedes: candidate.supersedes || [],
    updatedAt: candidate.updatedAt
  };
}

function recommendCandidateAction(candidate) {
  if (candidate.status !== 'pending') {
    return { action: candidate.status, reason: `Candidate is already ${candidate.status}.` };
  }
  if (containsSensitive(candidate)) {
    return { action: 'reject', reason: 'Sensitive value suspected.' };
  }
  if (candidate.conflictStatus === 'duplicate') {
    return { action: 'merge', reason: 'Candidate appears to duplicate active memory.' };
  }
  if (['direct_conflict', 'exception', 'supersedes', 'needs_user_review'].includes(candidate.conflictStatus)) {
    return { action: candidate.conflictStatus === 'supersedes' ? 'supersede' : 'keep pending', reason: `Requires review because conflictStatus is ${candidate.conflictStatus}.` };
  }
  if (candidate.confidence === 'low') {
    return { action: 'keep pending', reason: 'Low-confidence candidate needs confirmation.' };
  }
  return { action: 'approve', reason: 'No conflict detected and confidence is sufficient.' };
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
    details: memory.details,
    tags: memory.tags || [],
    domains: memory.domains || [],
    appliesTo: memory.appliesTo || [],
    projectId: memory.projectId,
    sourceProjectRoot: memory.sourceProjectRoot,
    repositoryName: memory.repositoryName,
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
  const project = await resolveCurrentProjectIdentity(root);
  const candidates = (await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl')))
    .filter((candidate) => candidate.status === 'pending' && isMemoryVisibleForProject(candidate, project));
  if (candidates.length === 0) {
    return 'No pending VibeBox memory candidates.';
  }

  const header = ['ID', 'TYPE', 'SCOPE', 'TOPIC', 'TITLE', 'SUMMARY', 'CONFIDENCE', 'CONFLICT', 'RECOMMENDED_ACTION'].join('  ');
  const rows = candidates.map((candidate) => [
    candidate.id,
    candidate.type,
    candidate.scope,
    candidate.topic,
    candidate.title,
    candidate.summary,
    candidate.confidence,
    candidate.conflictStatus,
    recommendCandidateAction(candidate).action
  ].map((value) => String(value ?? '').replace(/\s+/gu, ' ').trim()).join('  '));
  return [header, ...rows].join('\n');
}

export async function approveSafeMemories(root = process.cwd()) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const candidates = (await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl')))
    .filter((candidate) => candidate.status === 'pending' && isMemoryVisibleForProject(candidate, project));
  const approved = [];
  const skipped = [];

  for (const candidate of candidates) {
    const recommendation = recommendCandidateAction(candidate);
    if (recommendation.action === 'approve') {
      approved.push(await approveMemory(root, candidate.id));
    } else {
      skipped.push({ ...candidate, recommendedAction: recommendation.action, recommendationReason: recommendation.reason });
    }
  }

  return { approved, skipped };
}

export async function approveMemory(root = process.cwd(), candidateId) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) {
    throw new Error(`Pending candidate not found: ${candidateId}`);
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Candidate is not pending: ${candidateId}`);
  }
  if (!isMemoryVisibleForProject(candidate, project)) {
    throw new Error(`Pending candidate does not belong to current project: ${candidateId}`);
  }
  if (containsSensitive(candidate)) {
    candidate.status = 'rejected';
    candidate.updatedAt = nowIso();
    candidate.rejectionReason = 'Sensitive value suspected; cannot promote to active memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate contains suspected sensitive data and was rejected: ${candidateId}`);
  }

  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const timestamp = nowIso();
  const memory = {
    ...candidate,
    projectId: ['project', 'task', 'temporary'].includes(candidate.scope)
      ? candidate.projectId || project.projectId
      : candidate.projectId,
    sourceProjectRoot: candidate.sourceProjectRoot || project.rootPath,
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
  await saveJson(vibeboxPath(root, 'index/global-memory-index.json'), memoryIndex);

  candidate.status = 'active';
  candidate.updatedAt = timestamp;
  await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
  await rebuildIndexes(root);
  await rebuildWiki(root);
  return memory;
}

export async function rejectMemory(root = process.cwd(), candidateId, reason = 'Rejected during review.') {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) {
    throw new Error(`Pending candidate not found: ${candidateId}`);
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Candidate is not pending: ${candidateId}`);
  }
  if (!isMemoryVisibleForProject(candidate, project)) {
    throw new Error(`Pending candidate does not belong to current project: ${candidateId}`);
  }
  candidate.status = 'rejected';
  candidate.rejectionReason = reason;
  candidate.updatedAt = nowIso();
  await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
  await updatePendingIndex(root);
  return candidate;
}

async function rebuildIndexes(root, options = {}) {
  const syncNamespaceFiles = options.syncNamespaceFiles !== false;
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const keywordIndex = defaultKeywordIndex();
  const relationIndex = defaultRelationIndex();
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());

  for (const memory of memoryIndex.memories) {
    indexValue(keywordIndex.types, memory.type, memory.id);
    indexValue(keywordIndex.scopes, memory.scope, memory.id);
    indexValue(keywordIndex.topics, memory.topic, memory.id);
    if (memory.projectId) indexValue(keywordIndex.projects, memory.projectId, memory.id);
    for (const tag of memory.tags || []) indexValue(keywordIndex.tags, tag, memory.id);
    for (const domain of memory.domains || []) indexValue(keywordIndex.domains, domain, memory.id);
    for (const keyword of memoryKeywords(memory)) indexValue(keywordIndex.keywords, keyword, memory.id);

    for (const relatedId of memory.related || []) {
      relationIndex.relations.push({ from: memory.id, to: relatedId, type: 'related', fromProjectId: memory.projectId || null });
      relationIndex.related[memory.id] = [...new Set([...(relationIndex.related[memory.id] || []), relatedId])];
    }
    for (const supersededId of memory.supersedes || []) {
      relationIndex.relations.push({ from: memory.id, to: supersededId, type: 'supersedes', fromProjectId: memory.projectId || null });
      relationIndex.supersedes[memory.id] = [...new Set([...(relationIndex.supersedes[memory.id] || []), supersededId])];
    }
  }

  await saveJson(vibeboxPath(root, 'index/project-index.json'), defaultProjectIndex(registry.projects || [], memoryIndex.memories));
  await saveJson(vibeboxPath(root, 'index/keyword-index.json'), keywordIndex);
  await saveJson(vibeboxPath(root, 'index/relation-index.json'), relationIndex);
  if (syncNamespaceFiles) {
    await syncMemoryNamespaceFiles(root, memoryIndex.memories, registry.projects || []);
  }
  await updatePendingIndex(root);
}

async function syncMemoryNamespaceFiles(root, memories, projects) {
  const timestamp = nowIso();
  const globalBuckets = new Map(GLOBAL_MEMORY_FILE_NAMES.map((fileName) => [fileName, []]));
  const projectIds = new Set(projects.map((project) => project.projectId).filter(Boolean));
  const projectBuckets = new Map();

  function ensureProjectBuckets(projectId) {
    if (!projectBuckets.has(projectId)) {
      projectBuckets.set(projectId, new Map(PROJECT_MEMORY_FILE_NAMES.map((fileName) => [fileName, []])));
    }
    return projectBuckets.get(projectId);
  }

  for (const memory of memories) {
    if (memory.projectId) projectIds.add(memory.projectId);
    if (memoryScopeUsesGlobalNamespace(memory)) {
      const fileName = GLOBAL_MEMORY_FILES[memory.type] || 'user-preferences.json';
      if (!globalBuckets.has(fileName)) globalBuckets.set(fileName, []);
      globalBuckets.get(fileName).push(memory);
      continue;
    }
    if (!memory.projectId) continue;
    const fileName = memory.scope === 'task' || memory.scope === 'temporary'
      ? 'task-history.json'
      : PROJECT_MEMORY_FILES[memory.type] || 'workflow-rules.json';
    ensureProjectBuckets(memory.projectId).get(fileName).push(memory);
  }

  for (const [fileName, bucket] of globalBuckets.entries()) {
    await saveJson(vibeboxPath(root, 'global', fileName), { version: VIBEBOX_VERSION, updatedAt: timestamp, memories: bucket });
  }
  for (const projectId of projectIds) ensureProjectBuckets(projectId);
  for (const [projectId, buckets] of projectBuckets.entries()) {
    await ensureDir(vibeboxPath(root, 'projects', projectId));
    for (const [fileName, bucket] of buckets.entries()) {
      await saveJson(vibeboxPath(root, 'projects', projectId, fileName), { version: VIBEBOX_VERSION, updatedAt: timestamp, memories: bucket });
    }
  }
}

function memoryScopeUsesGlobalNamespace(memory) {
  return memory.scope === 'global' || (memory.scope === 'domain' && !memory.projectId);
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
    .map(normalizeKeywordToken)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .slice(0, 60);
}

function normalizeKeywordToken(token) {
  const aliases = {
    dependencies: 'dependency',
    deps: 'dependency',
    packages: 'package',
    scrolling: 'scroll',
    scrolls: 'scroll',
    changed: 'change',
    changing: 'change',
    changes: 'change'
  };
  return aliases[token] || token;
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
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active');
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());

  await writeManagedWikiPage(root, 'Home.md', renderHomeShell(), renderHomeManaged(active));
  await writeManagedWikiPage(root, 'Project Index.md', renderProjectIndexShell(), renderProjectIndexManaged(registry.projects || []));
  for (const page of WIKI_PAGES.filter((item) => !['Home.md', 'Project Index.md'].includes(item))) {
    const pageMemories = active.filter((memory) => (
      TYPE_TO_PAGE[memory.type] === page
      && (['Failure Memory.md', 'Success Patterns.md'].includes(page) || memoryScopeUsesGlobalNamespace(memory))
    ));
    await writeManagedWikiPage(root, page, renderMemoryShell(page), renderMemoryManaged(pageMemories));
  }
  for (const project of registry.projects || []) {
    const projectMemories = active.filter((memory) => memory.projectId === project.projectId);
    await writeManagedWikiPage(root, `projects/${project.projectId}.md`, renderProjectShell(project), renderProjectManaged(project, projectMemories));
  }
  await writeConceptWikiPages(root, active);
}

function managedBlock(content) {
  return `${MANAGED_BEGIN}\n${content.trim()}\n${MANAGED_END}`;
}

async function writeManagedWikiPage(root, pageName, shell, managedContent) {
  const filePath = vibeboxPath(root, 'wiki', pageName);
  await ensureDir(path.dirname(filePath));
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

Global local-first memory store for AI coding agents.`;
}

function renderHomeManaged(memories) {
  const counts = memories.reduce((acc, memory) => {
    acc[memory.type] = (acc[memory.type] || 0) + 1;
    return acc;
  }, {});
  return `## Wiki

- [[User Preferences]] (${counts.user_preference || 0})
- [[Global Avoid Rules]] (${counts.avoid_rule || 0})
- [[Failure Memory]] (${counts.failure_memory || 0})
- [[Success Patterns]] (${counts.success_pattern || 0})
- [[Tooling Preferences]] (${counts.tooling_preference || 0})
- [[Workflow Rules]] (${counts.workflow_rule || 0})
- [[Project Index]]

## Recent Active Memory

${memories.slice(-10).map((memory) => `- ${wikiLink(pageTitle(TYPE_TO_PAGE[memory.type] || 'Project Index.md'))} ${memory.title}: ${memory.summary}`).join('\n') || '- No approved memory yet.'}

## Storage

- JSON indexes live in \`../index/\`.
- Raw blackbox events live in \`../logs/events.jsonl\`.
- Pending memory candidates live in \`../pending/memory-candidates.jsonl\`.
`;
}

function renderProjectIndexShell() {
  return `${wikiFrontmatter('Project Index')}# Project Index

Back to [[Home]].`;
}

function renderProjectIndexManaged(projects) {
  if (!projects.length) return 'No projects registered yet.';
  return [
    '## Projects',
    '',
    ...projects.map((project) => `- [[projects/${project.projectId}|${project.projectName || project.projectId}]] (${project.projectId})`)
  ].join('\n');
}

function renderProjectShell(project) {
  return `${wikiFrontmatter(project.projectName || project.projectId)}# ${project.projectName || project.projectId}

Back to [[Project Index]].`;
}

function renderProjectManaged(project, memories) {
  const lines = [
    '## Project',
    '',
    `- Project ID: \`${project.projectId}\``,
    `- Repository: ${project.repositoryName || 'Not detected'}`,
    `- Primary domain: \`${project.primaryDomain || 'general'}\``,
    `- Last seen: ${project.lastSeenAt || 'unknown'}`,
    '',
    '## Active Memory',
    ''
  ];
  if (memories.length === 0) {
    lines.push('- No approved project memory yet.');
  } else {
    lines.push(...memories.map((memory) => `- \`${memory.id}\` ${memory.title}: ${memory.summary}`));
  }
  return lines.join('\n');
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
  const concepts = conceptsForMemory(memory);
  const links = concepts.map(wikiLink).filter(Boolean).join(' ');

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
    lines.push('', '## Related', '', links);
  }
  return lines.join('\n');
}

async function writeConceptWikiPages(root, memories) {
  const concepts = new Map();
  for (const memory of memories) {
    for (const concept of conceptsForMemory(memory)) {
      if (!concepts.has(concept)) concepts.set(concept, []);
      concepts.get(concept).push(memory);
    }
  }

  for (const [concept, relatedMemories] of concepts) {
    const pageName = `${safeWikiPageName(concept)}.md`;
    const shell = `${wikiFrontmatter(concept)}# ${concept}

Back to [[Home]].`;
    const managed = [
      '## Related memories',
      '',
      ...relatedMemories.map((memory) => `- \`${memory.id}\` ${wikiLink(pageTitle(TYPE_TO_PAGE[memory.type]))}: ${memory.summary}`)
    ].join('\n');
    await writeManagedWikiPage(root, pageName, shell, managed);
  }
}

function safeWikiPageName(name) {
  return String(name || 'Concept')
    .replace(/[<>:"/\\|?*\x00-\x1F]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 80) || 'Concept';
}

function conceptsForMemory(memory) {
  const concepts = new Set();
  const terms = [
    memory.topic,
    ...(memory.domains || []),
    ...(memory.tags || [])
  ];
  for (const term of terms) {
    const concept = conceptNameForTerm(term);
    if (concept) concepts.add(concept);
  }
  if (memory.type === 'failure_memory') concepts.add('Failure Patterns');
  if (memory.type === 'success_pattern') concepts.add('Success Patterns');
  if (memory.type === 'workflow_rule') concepts.add('Agent Workflow');
  return [...concepts].slice(0, 8);
}

function conceptNameForTerm(term) {
  const normalized = normalizeText(term);
  if (!normalized || STOP_WORDS.has(normalized) || normalized.length < 3) return '';
  if (['dependency', 'dependencies', 'package.json', 'package dependency changes'].includes(normalized)) return 'Dependency Management';
  if (['database', 'mssql', 'supabase', 'postgresql', 'dashboard database'].includes(normalized)) return 'Database Selection';
  if (['dashboard', 'dashboard development'].includes(normalized)) return 'Dashboard Development';
  if (['app', 'app development'].includes(normalized)) return 'App Development';
  if (['ui', 'ux', 'layout', 'scrolling', 'table layout scrolling', 'layout scrolling'].includes(normalized)) return 'UI Design Rules';
  if (['workflow', 'agent', 'tooling'].includes(normalized)) return 'Agent Workflow';
  if (/^[a-z0-9_.#+/-]+$/u.test(normalized) && (normalized.includes('.') || normalized.includes('/'))) return '';
  return normalized
    .split(/\s+/u)
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function scoreMemoryDetailed(memory, task, config = {}) {
  const taskTokens = new Set(memoryKeywords({ summary: task, tags: [], domains: [], appliesTo: [] }));
  const memoryTokenSet = new Set(memoryKeywords(memory));
  let matchScore = 0;
  let score = (SCOPE_PRIORITY[memory.scope] || 0)
    + (TYPE_PRIORITY[memory.type] || 0)
    + (CONFIDENCE_PRIORITY[memory.confidence] || 0);

  for (const token of taskTokens) {
    if (memoryTokenSet.has(token)) {
      score += 12;
      matchScore += 12;
    }
  }
  if (normalizeText(task).includes(normalizeText(memory.topic))) {
    score += 32;
    matchScore += 32;
  }
  if ((memory.domains || []).some((domain) => normalizeText(task).includes(normalizeText(domain)))) {
    score += 24;
    matchScore += 24;
  }
  if ((memory.tags || []).some((tag) => normalizeText(task).includes(normalizeText(tag)))) {
    score += 18;
    matchScore += 18;
  }
  if (memory.scope === 'project' && memory.projectId && memory.projectId === config.projectId) score += 25;
  if (memory.scope === 'project') score += 16;
  if (memory.scope === 'global') score -= 6;
  if (['avoid_rule', 'failure_memory'].includes(memory.type) && matchScore > 0) score += 35;
  score += Math.min(20, Number(memory.usageCount || 0) * 2);
  const ageMs = Date.now() - Date.parse(memory.updatedAt || memory.createdAt || nowIso());
  if (Number.isFinite(ageMs)) {
    score += Math.max(0, 8 - Math.floor(ageMs / 86_400_000));
  }
  return { score, matchScore };
}

function scoreMemory(memory, task) {
  return scoreMemoryDetailed(memory, task).score;
}

function selectRelevantMemories(memories, task, config) {
  const maxItems = config.maxContextItems || 8;
  const scored = memories
    .filter((memory) => memory.status === 'active')
    .map((memory) => ({ memory, ...scoreMemoryDetailed(memory, task, config) }))
    .filter((item) => item.matchScore > 0)
    .sort((left, right) => right.score - left.score);
  const currentProject = scored.filter((item) => memoryBelongsToCurrentProject(item.memory, config.projectId));
  const broader = scored.filter((item) => !memoryBelongsToCurrentProject(item.memory, config.projectId));
  return [...currentProject, ...broader]
    .slice(0, maxItems)
    .map((item) => ({ ...item.memory, retrievalScore: item.score, retrievalMatchScore: item.matchScore, lastUsedAt: nowIso() }));
}

function memoryBelongsToCurrentProject(memory, projectId) {
  return Boolean(projectId && memory.projectId === projectId);
}

export async function generateContextPack(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const project = await resolveCurrentProjectIdentity(root);
  const task = input.task || input.text || '';
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const active = index.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
  const scored = selectRelevantMemories(active, task, { ...config, projectId: project.projectId });

  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const conflicts = pendingIndex.candidates
    .filter((candidate) => candidate.status === 'pending' && !['no_conflict', 'duplicate'].includes(candidate.conflictStatus))
    .filter((candidate) => isMemoryVisibleForProject(candidate, project))
    .filter((candidate) => scoreMemoryDetailed(candidate, task, { ...config, projectId: project.projectId }).matchScore > 0)
    .slice(0, 4);
  const activeConflicts = findActiveMemoryConflicts(scored);

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
    renderConflictSection([...conflicts, ...activeConflicts]),
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
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.summary} [${candidate.id}; ${candidate.conflictStatus || 'active_conflict'}; ${candidate.confidence || 'medium'}]`) : ['- None.']),
    ''
  ].join('\n');
}

function findActiveMemoryConflicts(memories) {
  const conflicts = [];
  for (let leftIndex = 0; leftIndex < memories.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < memories.length; rightIndex += 1) {
      const left = memories[leftIndex];
      const right = memories[rightIndex];
      const scopePair = new Set([left.scope, right.scope]);
      if (!scopePair.has('project') || left.scope === right.scope) continue;
      if (!hasTargetOverlap(left, right) || !hasOpposingChoice(left, right)) continue;
      const projectMemory = left.scope === 'project' ? left : right;
      const broaderMemory = left.scope === 'project' ? right : left;
      conflicts.push({
        id: `${projectMemory.id}_vs_${broaderMemory.id}`,
        summary: `Project memory "${projectMemory.summary}" conflicts with broader memory "${broaderMemory.summary}". Follow current user request and verify repository reality.`,
        conflictStatus: 'direct_conflict',
        confidence: projectMemory.confidence,
        related: [projectMemory.id, broaderMemory.id],
        broaderMemoryId: broaderMemory.id,
        projectMemoryId: projectMemory.id
      });
    }
  }
  return conflicts;
}

export async function generatePreTaskBrief(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const project = await resolveCurrentProjectIdentity(root);
  const task = input.task || input.text || '';
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const relevant = selectRelevantMemories(index.memories.filter((memory) => isMemoryVisibleForProject(memory, project)), task, { ...config, projectId: project.projectId });
  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const conflicts = [
    ...pendingIndex.candidates
      .filter((candidate) => candidate.status === 'pending' && !['no_conflict', 'duplicate'].includes(candidate.conflictStatus))
      .filter((candidate) => isMemoryVisibleForProject(candidate, project))
      .filter((candidate) => scoreMemoryDetailed(candidate, task, { ...config, projectId: project.projectId }).matchScore > 0),
    ...findActiveMemoryConflicts(relevant)
  ].slice(0, 6);
  const broaderConflictIds = new Set(conflicts.map((conflict) => conflict.broaderMemoryId).filter(Boolean));

  const memoryContext = relevant.filter((memory) => !broaderConflictIds.has(memory.id) && !['failure_memory', 'success_pattern', 'avoid_rule', 'architecture_rule', 'project_decision'].includes(memory.type));
  const projectGuardrails = relevant.filter((memory) => ['avoid_rule', 'architecture_rule', 'project_decision'].includes(memory.type));
  const lines = [
    'VibeBox Pre-Task Brief',
    '',
    'User Task:',
    redactSensitive(task),
    '',
    renderBriefSection('Relevant Memory Context', memoryContext),
    renderBriefSection('Known Failure Risks', relevant.filter((memory) => memory.type === 'failure_memory')),
    renderBriefSection('Known Success Patterns', relevant.filter((memory) => memory.type === 'success_pattern')),
    renderBriefSection('Project Guardrails', projectGuardrails),
    renderConflictSection(conflicts).trim(),
    '',
    'Instruction for AI Agent:',
    '- Analyze the repository before editing.',
    '- Use the memory context as constraints.',
    "- Do not override the user's current explicit request.",
    '- If memory conflicts with repository reality, report the conflict.',
    '- Do not treat low-confidence memory as final fact.',
    '- Preserve existing project behavior unless the task explicitly changes it.',
    '- Avoid repeating known failed approaches.',
    "- Keep the implementation scope aligned with the user's request."
  ];

  let brief = lines.join('\n');
  if (input.debug) {
    brief += `\n\nRetrieval Debug:\n${relevant.map((memory) => `- ${memory.id}: score=${memory.retrievalScore}, match=${memory.retrievalMatchScore}`).join('\n') || '- No selected memory.'}`;
  }
  if (brief.length > (config.maxContextChars || 6000)) {
    brief = `${brief.slice(0, config.maxContextChars || 6000)}\n[Brief truncated by VibeBox maxContextChars]`;
  }
  return redactSensitive(brief);
}

function renderBriefSection(title, memories) {
  return [
    `${title}:`,
    ...(memories.length > 0
      ? memories.map((memory) => `- ${memory.confidence === 'low' ? '[low confidence] ' : ''}${memory.summary} [${memory.id}; ${memory.scope}; ${memory.confidence}]`)
      : ['- None.']),
    ''
  ].join('\n');
}

export async function afterTask(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const event = await captureEvent(root, {
    eventType: 'task_summary',
    userRequest: input.userRequest || input.request || '',
    aiActionSummary: input.aiActionSummary || input.summary || '',
    command: input.command || '',
    commandResult: input.commandResult || '',
    commands: input.commands || [],
    commandResults: input.commandResults || [],
    errors: input.errors || [],
    changedFiles: input.changedFiles || input.files || [],
    userFeedback: input.userFeedback || input.feedback || '',
    outcome: input.outcome || 'unknown',
    notes: input.notes || ''
  });

  const extractionText = [
    input.userRequest || input.request ? `User requested: ${input.userRequest || input.request}` : '',
    input.aiActionSummary || input.summary ? `AI action summary: ${input.aiActionSummary || input.summary}` : '',
    ...(input.errors || []).map((error) => `The approach failed: ${error}. Prevent this by avoiding the failed approach unless the user explicitly asks for it.`),
    input.userFeedback && textHasAny(input.userFeedback, ['reject', 'rejected', 'instead'])
      ? `User rejected this direction: ${input.userFeedback}. Do not repeat it without confirmation.`
      : '',
    input.outcome === 'success'
      ? `This approach worked successfully: ${input.aiActionSummary || input.summary}. Reuse when the task is similar to: ${input.userRequest || input.request}.`
      : '',
    input.outcome === 'failure'
      ? `This task failed: ${input.aiActionSummary || input.summary}. Failure reason: ${(input.errors || []).join('; ') || input.commandResult || 'unknown'}.`
      : '',
    input.notes || ''
  ].filter(Boolean).join('\n');

  const candidates = await extractMemoryCandidates(root, {
    text: extractionText,
    source: { kind: 'aftertask', id: event.id }
  });

  return {
    event,
    candidates,
    message: [
      `Captured blackbox event ${event.id}.`,
      `Created ${candidates.length} pending memory candidate(s).`,
      'Review pending memory with `vibebox review`, then approve or reject candidate ids.'
    ].join('\n')
  };
}

export async function generateReport(root = process.cwd()) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const events = (await readJsonl(vibeboxPath(root, 'logs/events.jsonl'))).filter((event) => event.projectId === project.projectId);
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
  const visiblePending = pendingIndex.candidates.filter((candidate) => candidate.status === 'pending' && isMemoryVisibleForProject(candidate, project));
  const conflicts = visiblePending.filter((candidate) => !['no_conflict', 'duplicate'].includes(candidate.conflictStatus));

  return redactSensitive([
    'VibeBox Memory Report',
    `Project: ${project.projectId}`,
    `Global Store: ${vibeboxPath(root)}`,
    '',
    `Active Memory: ${active.length}`,
    `Pending Candidates: ${visiblePending.length}`,
    `Recent Blackbox Events: ${events.length}`,
    '',
    renderReportType('User Preferences', active, ['user_preference', 'coding_style', 'design_preference']),
    renderReportType('Project Decisions', active, ['project_decision']),
    renderReportType('Architecture Rules', active, ['architecture_rule']),
    renderReportType('Avoid Rules', active, ['avoid_rule']),
    renderReportType('Failure Memory', active, ['failure_memory']),
    renderReportType('Success Patterns', active, ['success_pattern']),
    renderReportType('Tooling Preferences', active, ['tooling_preference']),
    renderReportType('Workflow Rules', active, ['workflow_rule']),
    'Pending Candidates:',
    ...(visiblePending.slice(0, 12).map((candidate) => `- ${candidate.id} ${candidate.type}/${candidate.scope}: ${candidate.summary} [${candidate.conflictStatus}; ${candidate.recommendedAction || recommendCandidateAction(candidate).action}]`) || []),
    visiblePending.length === 0 ? '- None.' : '',
    '',
    'Potential Conflicts:',
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.id}: ${candidate.summary} [${candidate.conflictStatus}]`) : ['- None.'])
  ].filter((line) => line !== '').join('\n'));
}

function renderReportType(title, memories, types) {
  const selected = memories.filter((memory) => types.includes(memory.type));
  return [
    `${title}:`,
    ...(selected.length > 0 ? selected.map((memory) => `- ${memory.summary} [${memory.id}; ${memory.scope}; ${memory.confidence}]`) : ['- None.']),
    ''
  ].join('\n');
}

export async function generateBlackboxReport(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const limit = Number(input.limit || 10);
  const since = input.since ? Date.parse(input.since) : null;
  const type = input.type || '';
  let events = (await readJsonl(vibeboxPath(root, 'logs/events.jsonl'))).filter((event) => event.projectId === project.projectId);
  if (type) events = events.filter((event) => event.eventType === type || event.outcome === type);
  if (Number.isFinite(since)) events = events.filter((event) => Date.parse(event.createdAt) >= since);
  events = events.slice(-limit);

  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
  const changedFiles = countValues(events.flatMap((event) => event.changedFiles || []));
  const recurringFailureTypes = countValues(active.filter((memory) => memory.type === 'failure_memory').map((memory) => memory.failureType || 'unclear_requirement'));

  return redactSensitive([
    'VibeBox Blackbox Report',
    `Project: ${project.projectId}`,
    '',
    'Task Timeline:',
    ...(events.length > 0 ? events.map((event) => `- ${event.createdAt} ${event.outcome || 'unknown'}: ${event.userRequest || event.aiActionSummary || event.id}`) : ['- No events recorded.']),
    '',
    'Failed Approaches:',
    ...reportEventApproaches(events, 'failure'),
    '',
    'Successful Approaches:',
    ...reportEventApproaches(events, 'success'),
    '',
    'Rejected Directions:',
    ...events.filter((event) => textHasAny(event.userFeedback || '', ['reject', 'rejected', 'instead'])).map((event) => `- ${event.userFeedback}`),
    events.some((event) => textHasAny(event.userFeedback || '', ['reject', 'rejected', 'instead'])) ? '' : '- None.',
    '',
    'Confirmed Decisions:',
    ...(active.filter((memory) => memory.type === 'project_decision').map((memory) => `- ${memory.summary}`) || []),
    active.some((memory) => memory.type === 'project_decision') ? '' : '- None.',
    '',
    'Recurring Failure Types:',
    ...formatCounts(recurringFailureTypes),
    '',
    'Frequently Changed Files:',
    ...formatCounts(changedFiles),
    '',
    'Prevention Rules:',
    ...(active.filter((memory) => ['failure_memory', 'avoid_rule'].includes(memory.type)).map((memory) => `- ${memory.preventionRule || memory.forbiddenAction || memory.summary}`) || []),
    active.some((memory) => ['failure_memory', 'avoid_rule'].includes(memory.type)) ? '' : '- None.'
  ].filter((line) => line !== '').join('\n'));
}

function reportEventApproaches(events, outcome) {
  const selected = events.filter((event) => event.outcome === outcome);
  if (selected.length === 0) return ['- None.'];
  return selected.map((event) => `- ${event.aiActionSummary || event.commandResult || event.userRequest || event.id}`);
}

function countValues(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function formatCounts(counts) {
  return counts.length > 0 ? counts.map(([value, count]) => `- ${value} (${count})`) : ['- None.'];
}

export async function runDoctor(root = process.cwd()) {
  const errors = [];
  const warnings = [];
  const base = vibeboxPath(root);
  const legacyPath = path.join(path.resolve(root), '.vibebox');
  let detectedProject = null;
  try {
    detectedProject = await detectProjectIdentity(root);
  } catch (error) {
    warnings.push(`Current project identity could not be fully detected: ${error.message}`);
  }
  if (await exists(legacyPath)) {
    warnings.push('old project-local .vibebox detected; VibeBox now uses the global store. Migrate manually or wait for a future migration command.');
  }

  let registry = defaultRegistry();
  try {
    registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  } catch {
    // Missing or invalid registry is reported in the required-file pass below.
  }
  const currentProject = detectedProject
    ? (registry.projects || []).find((project) => (
      (detectedProject.gitRemote && project.gitRemote === detectedProject.gitRemote)
      || (project.rootPath && path.resolve(project.rootPath) === detectedProject.rootPath)
      || project.projectId === detectedProject.projectId
    ))
    : null;
  const currentProjectId = currentProject?.projectId || detectedProject?.projectId || 'unknown';
  const requiredFiles = [
    'config.json',
    'registry/projects.json',
    ...WIKI_PAGES.map((page) => `wiki/${page}`),
    `wiki/projects/${currentProjectId}.md`,
    'index/global-memory-index.json',
    'index/project-index.json',
    'index/keyword-index.json',
    'index/relation-index.json',
    'index/pending-index.json',
    'logs/events.jsonl',
    'pending/memory-candidates.jsonl',
    `projects/${currentProjectId}/project.json`
  ];

  for (const dir of [base, vibeboxPath(root, 'global'), vibeboxPath(root, 'projects'), vibeboxPath(root, 'wiki'), vibeboxPath(root, 'wiki/projects'), vibeboxPath(root, 'index'), vibeboxPath(root, 'logs'), vibeboxPath(root, 'pending'), vibeboxPath(root, 'registry')]) {
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
      errors.push(`Missing file: ${relative}`);
      continue;
    }
    if (relative.endsWith('.json')) {
      try {
        await loadJson(filePath);
      } catch (error) {
        errors.push(`Invalid JSON in ${relative}: ${error.message}`);
      }
    }
    if (relative.endsWith('.jsonl')) {
      try {
        await readJsonl(filePath);
      } catch (error) {
        errors.push(`Invalid JSONL in ${relative}: ${error.message}`);
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
    const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'));
    if (!Array.isArray(memoryIndex.memories)) {
      errors.push('global-memory-index.json must contain memories array.');
      return { ok: false, errors, warnings, storeRoot: base, projectIdentity: detectedProject || null };
    }
    const ids = new Set(memoryIndex.memories.map((memory) => memory.id));
    for (const memory of memoryIndex.memories) {
      for (const relatedId of [...(memory.related || []), ...(memory.supersedes || [])]) {
        if (!ids.has(relatedId)) {
          warnings.push(`Memory ${memory.id} references missing related memory ${relatedId}.`);
        }
      }
      if (memory.status === 'active') {
        const wikiPage = memory.projectId && !memoryScopeUsesGlobalNamespace(memory)
          ? `projects/${memory.projectId}.md`
          : TYPE_TO_PAGE[memory.type];
        if (!wikiPage || !(await exists(vibeboxPath(root, 'wiki', wikiPage)))) {
          warnings.push(`Active memory ${memory.id} has no known wiki page.`);
        } else {
          const pageText = await readFile(vibeboxPath(root, 'wiki', wikiPage), 'utf8');
          if (!pageText.includes(memory.id)) {
            warnings.push(`Active memory ${memory.id} is not linked from wiki/${wikiPage}.`);
          }
        }
      }
      if (memory.status === 'superseded' && memory.lastUsedAt) {
        warnings.push(`Superseded memory ${memory.id} has a lastUsedAt value and should not be retrieved.`);
      }
    }

    const pendingRecords = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
    const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'));
    const pendingRecordIds = new Set(pendingRecords.map((candidate) => `${candidate.id}:${candidate.status}`));
    const pendingIndexIds = new Set((pendingIndex.candidates || []).map((candidate) => `${candidate.id}:${candidate.status}`));
    if (pendingRecordIds.size !== pendingIndexIds.size || [...pendingRecordIds].some((id) => !pendingIndexIds.has(id))) {
      warnings.push('pending-index.json does not match pending/memory-candidates.jsonl.');
    }

    const keywordIndex = await loadJson(vibeboxPath(root, 'index/keyword-index.json'));
    for (const memory of memoryIndex.memories.filter((item) => item.status === 'active')) {
      for (const tag of memory.tags || []) {
        if (!(keywordIndex.tags?.[normalizeText(tag)] || []).includes(memory.id)) {
          warnings.push(`keyword-index missing tag ${tag} for memory ${memory.id}.`);
        }
      }
      if (!(keywordIndex.types?.[normalizeText(memory.type)] || []).includes(memory.id)) {
        warnings.push(`keyword-index missing type ${memory.type} for memory ${memory.id}.`);
      }
      if (!(keywordIndex.scopes?.[normalizeText(memory.scope)] || []).includes(memory.id)) {
        warnings.push(`keyword-index missing scope ${memory.scope} for memory ${memory.id}.`);
      }
      if (memory.projectId && !(keywordIndex.projects?.[normalizeText(memory.projectId)] || []).includes(memory.id)) {
        warnings.push(`keyword-index missing project ${memory.projectId} for memory ${memory.id}.`);
      }
      if (!(keywordIndex.topics?.[normalizeText(memory.topic)] || []).includes(memory.id)) {
        warnings.push(`keyword-index missing topic ${memory.topic} for memory ${memory.id}.`);
      }
    }
    for (const [sectionName, section] of Object.entries(keywordIndex)) {
      if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
      for (const [key, referencedIds] of Object.entries(section)) {
        if (!Array.isArray(referencedIds)) continue;
        for (const referencedId of referencedIds) {
          if (!ids.has(referencedId)) {
            warnings.push(`keyword-index ${sectionName}.${key} references missing memory ${referencedId}.`);
          }
        }
      }
    }

    const relationIndex = await loadJson(vibeboxPath(root, 'index/relation-index.json'));
    for (const relation of relationIndex.relations || []) {
      if (!ids.has(relation.from) || !ids.has(relation.to)) {
        warnings.push(`relation-index references missing memory: ${relation.from} -> ${relation.to}.`);
      }
    }

    const wikiFiles = await listMarkdownFiles(vibeboxPath(root, 'wiki'));
    for (const wikiFile of wikiFiles) {
      const text = await readFile(wikiFile, 'utf8');
      for (const match of text.matchAll(/`(mem_[a-f0-9]+)`/giu)) {
        if (!ids.has(match[1])) {
          warnings.push(`Wiki file ${path.basename(wikiFile)} references missing memory ${match[1]}.`);
        }
      }
    }
  } catch (error) {
    warnings.push(`Doctor consistency checks skipped: ${error.message}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    storeRoot: base,
    projectIdentity: detectedProject || null,
    currentProjectId
  };
}

async function listMarkdownFiles(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listMarkdownFiles(fullPath);
      return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
    }));
    return nested.flat();
  } catch {
    return [];
  }
}

export function formatDoctorReport(report) {
  const lines = ['VibeBox Doctor', `Status: ${report.ok ? 'ok' : 'error'}`];
  if (report.storeRoot) {
    lines.push(`Global store: ${report.storeRoot}`);
  }
  if (report.currentProjectId || report.projectIdentity?.projectId) {
    lines.push(`Current projectId: ${report.currentProjectId || report.projectIdentity.projectId}`);
  }
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
