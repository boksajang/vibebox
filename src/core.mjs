import { createHash, randomUUID } from 'node:crypto';
import {
  access,
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const VIBEBOX_VERSION = '0.1.1';

const WIKI_DOCS = [
  { docKey: 'home', canonicalFileName: 'Home.md', titleKey: 'homeTitle', technicalName: true },
  { docKey: 'user_preferences', canonicalFileName: 'User Preferences.md', titleKey: 'pageUserPreferences' },
  { docKey: 'user_patterns', canonicalFileName: 'User Patterns.md', titleKey: 'pageUserPatterns' },
  { docKey: 'design_philosophy', canonicalFileName: 'Design Philosophy.md', titleKey: 'pageDesignPhilosophy' },
  { docKey: 'validation_patterns', canonicalFileName: 'Validation Patterns.md', titleKey: 'pageValidationPatterns' },
  { docKey: 'process_patterns', canonicalFileName: 'Process Patterns.md', titleKey: 'pageProcessPatterns' },
  { docKey: 'decision_patterns', canonicalFileName: 'Decision Patterns.md', titleKey: 'pageDecisionPatterns' },
  { docKey: 'technology_preferences', canonicalFileName: 'Technology Preferences.md', titleKey: 'pageTechnologyPreferences' },
  { docKey: 'agent_failure_patterns', canonicalFileName: 'Agent Failure Patterns.md', titleKey: 'pageAgentFailurePatterns' },
  { docKey: 'agent_success_patterns', canonicalFileName: 'Agent Success Patterns.md', titleKey: 'pageAgentSuccessPatterns' },
  { docKey: 'prevention_rules', canonicalFileName: 'Prevention Rules.md', titleKey: 'pagePreventionRules' },
  { docKey: 'global_avoid_rules', canonicalFileName: 'Global Avoid Rules.md', titleKey: 'pageGlobalAvoidRules' },
  { docKey: 'failure_memory', canonicalFileName: 'Failure Memory.md', titleKey: 'pageFailureMemory' },
  { docKey: 'success_patterns', canonicalFileName: 'Success Patterns.md', titleKey: 'pageSuccessPatterns' },
  { docKey: 'tooling_preferences', canonicalFileName: 'Tooling Preferences.md', titleKey: 'pageToolingPreferences' },
  { docKey: 'workflow_rules', canonicalFileName: 'Workflow Rules.md', titleKey: 'pageWorkflowRules' },
  { docKey: 'project_index', canonicalFileName: 'Project Index.md', titleKey: 'pageProjectIndex' }
];

const WIKI_PAGES = WIKI_DOCS.map((doc) => doc.canonicalFileName);
const DOC_BY_KEY = Object.fromEntries(WIKI_DOCS.map((doc) => [doc.docKey, doc]));
const DOC_KEY_BY_CANONICAL_FILE = Object.fromEntries(WIKI_DOCS.map((doc) => [doc.canonicalFileName, doc.docKey]));

const MEMORY_TYPES = new Set([
  'user_preference',
  'project_decision',
  'architecture_rule',
  'avoid_rule',
  'failure_memory',
  'success_pattern',
  'tooling_preference',
  'technology_preference',
  'coding_style',
  'design_preference',
  'workflow_rule',
  'question_pattern',
  'response_preference',
  'process_pattern',
  'validation_pattern',
  'design_philosophy',
  'decision_pattern',
  'communication_pattern',
  'correction_pattern',
  'agent_failure_pattern',
  'agent_success_pattern',
  'prevention_rule',
  'handoff_pattern',
  'task_context',
  'discarded_detail'
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
  technology_preference: 'Technology Preferences.md',
  workflow_rule: 'Workflow Rules.md'
};

Object.assign(TYPE_TO_PAGE, {
  question_pattern: 'User Patterns.md',
  response_preference: 'User Patterns.md',
  process_pattern: 'Process Patterns.md',
  validation_pattern: 'Validation Patterns.md',
  design_philosophy: 'Design Philosophy.md',
  decision_pattern: 'Decision Patterns.md',
  communication_pattern: 'User Patterns.md',
  correction_pattern: 'User Patterns.md',
  agent_failure_pattern: 'Agent Failure Patterns.md',
  agent_success_pattern: 'Agent Success Patterns.md',
  prevention_rule: 'Prevention Rules.md',
  handoff_pattern: 'Process Patterns.md'
});

const TYPE_TO_DOC_KEY = {
  user_preference: 'user_preferences',
  coding_style: 'user_preferences',
  design_preference: 'user_preferences',
  project_decision: 'project_index',
  architecture_rule: 'project_index',
  avoid_rule: 'global_avoid_rules',
  failure_memory: 'failure_memory',
  success_pattern: 'success_patterns',
  tooling_preference: 'tooling_preferences',
  technology_preference: 'technology_preferences',
  workflow_rule: 'workflow_rules',
  question_pattern: 'user_patterns',
  response_preference: 'user_patterns',
  process_pattern: 'process_patterns',
  validation_pattern: 'validation_patterns',
  design_philosophy: 'design_philosophy',
  decision_pattern: 'decision_patterns',
  communication_pattern: 'user_patterns',
  correction_pattern: 'user_patterns',
  agent_failure_pattern: 'agent_failure_patterns',
  agent_success_pattern: 'agent_success_patterns',
  prevention_rule: 'prevention_rules',
  handoff_pattern: 'process_patterns',
  task_context: 'workflow_rules',
  discarded_detail: 'workflow_rules'
};

const GLOBAL_MEMORY_FILES = {
  user_preference: 'user-preferences.json',
  avoid_rule: 'avoid-rules.json',
  tooling_preference: 'tooling-preferences.json',
  technology_preference: 'tooling-preferences.json',
  coding_style: 'coding-style.json',
  workflow_rule: 'workflow-rules.json',
  architecture_rule: 'architecture-patterns.json',
  failure_memory: 'failure-memory.json',
  success_pattern: 'success-patterns.json',
  design_preference: 'user-preferences.json',
  question_pattern: 'workflow-rules.json',
  response_preference: 'user-preferences.json',
  process_pattern: 'workflow-rules.json',
  validation_pattern: 'workflow-rules.json',
  design_philosophy: 'architecture-patterns.json',
  decision_pattern: 'workflow-rules.json',
  communication_pattern: 'workflow-rules.json',
  correction_pattern: 'workflow-rules.json',
  agent_failure_pattern: 'failure-memory.json',
  agent_success_pattern: 'success-patterns.json',
  prevention_rule: 'avoid-rules.json',
  handoff_pattern: 'workflow-rules.json',
  task_context: 'workflow-rules.json',
  discarded_detail: 'workflow-rules.json'
};

const PROJECT_MEMORY_FILES = {
  project_decision: 'decisions.json',
  architecture_rule: 'architecture-rules.json',
  avoid_rule: 'avoid-rules.json',
  failure_memory: 'failures.json',
  success_pattern: 'successes.json',
  tooling_preference: 'tooling-preferences.json',
  technology_preference: 'tooling-preferences.json',
  workflow_rule: 'workflow-rules.json',
  design_preference: 'design-preferences.json',
  user_preference: 'workflow-rules.json',
  coding_style: 'design-preferences.json',
  question_pattern: 'workflow-rules.json',
  response_preference: 'workflow-rules.json',
  process_pattern: 'workflow-rules.json',
  validation_pattern: 'workflow-rules.json',
  design_philosophy: 'architecture-rules.json',
  decision_pattern: 'decisions.json',
  communication_pattern: 'workflow-rules.json',
  correction_pattern: 'workflow-rules.json',
  agent_failure_pattern: 'failures.json',
  agent_success_pattern: 'successes.json',
  handoff_pattern: 'workflow-rules.json',
  task_context: 'task-history.json',
  discarded_detail: 'task-history.json'
};

const GLOBAL_MEMORY_FILE_NAMES = [
  'user-preferences.json',
  'avoid-rules.json',
  'tooling-preferences.json',
  'coding-style.json',
  'workflow-rules.json',
  'architecture-patterns.json',
  'failure-memory.json',
  'success-patterns.json'
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
  validation_pattern: 58,
  agent_failure_pattern: 58,
  design_philosophy: 56,
  process_pattern: 54,
  agent_success_pattern: 52,
  success_pattern: 50,
  tooling_preference: 40,
  technology_preference: 40,
  workflow_rule: 40,
  correction_pattern: 39,
  decision_pattern: 38,
  handoff_pattern: 38,
  response_preference: 37,
  communication_pattern: 36,
  question_pattern: 36,
  user_preference: 35,
  coding_style: 30,
  design_preference: 30
};

const PATTERN_TYPES = new Set([
  'question_pattern',
  'response_preference',
  'process_pattern',
  'validation_pattern',
  'design_philosophy',
  'decision_pattern',
  'communication_pattern',
  'correction_pattern',
  'agent_failure_pattern',
  'agent_success_pattern',
  'handoff_pattern'
]);

const CONFIDENCE_PRIORITY = {
  high: 15,
  medium: 9,
  low: 2
};

const AUTO_CURATED_STATUSES = new Set(['active', 'discarded', 'quarantined', 'rejected']);
const ACTIVE_MODEL_CLASSES = new Set(['user_model', 'domain_model', 'project_model']);
const TECHNICAL_OUTCOMES = new Set(['success', 'failure', 'partial', 'unknown']);
const USER_ACCEPTANCE_VALUES = new Set(['accepted', 'rejected', 'mixed', 'unknown']);
const FINAL_OUTCOMES = new Set([
  'accepted_success',
  'technical_success_user_rejected',
  'technical_failure_user_direction_valid',
  'failed',
  'partial',
  'unknown'
]);
const SUCCESS_EVIDENCE_VALUES = new Set(['confirmed', 'inferred', 'rejected', 'unknown']);
const MEMORY_ROLE_VALUES = new Set([
  'user_success_criteria',
  'ai_failure_memory',
  'ai_successful_approach',
  'task_context',
  'discarded_detail'
]);
const MODEL_CLASS_VALUES = new Set(['user_model', 'domain_model', 'project_model', 'task_context', 'discarded_detail']);
const CANDIDATE_SCOPE_VALUES = new Set(['global', 'domain', 'project', 'task', 'temporary']);
const CANDIDATE_STATUS_VALUES = new Set(['active', 'pending', 'discarded', 'quarantined', 'rejected']);
const CANDIDATE_SOURCE_TYPE_VALUES = new Set([
  'agent_semantic_extraction',
  'technical_failure_detection',
  'manual_override',
  'legacy_import'
]);
const DEFAULT_AGENT_SOURCE_TYPE = 'agent_semantic_extraction';

const STRUCTURED_CANDIDATE_TITLE_FIELDS = ['title', 'canonicalTitle'];
const STRUCTURED_CANDIDATE_SUMMARY_FIELDS = ['summary', 'canonicalSummary'];
const STRUCTURED_CANDIDATE_REQUIRED_FIELDS = [
  'memoryRole',
  'type',
  'modelClass',
  'modelSubClass',
  'scope',
  'primaryCategory',
  STRUCTURED_CANDIDATE_TITLE_FIELDS.join(' or '),
  STRUCTURED_CANDIDATE_SUMMARY_FIELDS.join(' or '),
  'displayLanguage',
  'confidence',
  'sourceType'
];
const STRUCTURED_CANDIDATE_RECOMMENDED_FIELDS = [
  'relatedCategories',
  'rule',
  'displayTitle',
  'displaySummary',
  'displayRule',
  'evidence',
  'relationCandidates',
  'replaces',
  'whyOnlyOneCandidate'
];

const CATEGORY_AXIS_DOC_KEYS = [
  'validation_patterns',
  'technology_preferences',
  'tooling_preferences',
  'user_preferences',
  'user_patterns',
  'design_philosophy',
  'success_patterns',
  'failure_memory',
  'prevention_rules',
  'workflow_rules',
  'global_avoid_rules',
  'process_patterns',
  'decision_patterns',
  'agent_success_patterns',
  'agent_failure_patterns'
];

const BASE_MEMORY_LANGUAGE = 'en-US';

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

function isPermissionDeniedError(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '');
  return ['EACCES', 'EPERM'].includes(code)
    || /\b(?:permission denied|access denied|operation not permitted|not permitted|sandbox denied|sandbox denial|outside the workspace)\b/iu.test(message);
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

function detectSystemLocale() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale || BASE_MEMORY_LANGUAGE;
  } catch {
    return BASE_MEMORY_LANGUAGE;
  }
}

function normalizeLanguageTag(locale) {
  const value = String(locale || '').trim();
  if (!value || value.toLowerCase() === 'auto') return 'auto';
  const bcp47 = value.replace(/_/gu, '-');
  try {
    return Intl.getCanonicalLocales(bcp47)[0] || bcp47;
  } catch {
    return '';
  }
}

function normalizeLocale(locale) {
  const tag = normalizeLanguageTag(locale);
  if (tag === 'auto') return 'auto';
  return tag || BASE_MEMORY_LANGUAGE;
}

function languageFromLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (normalized === 'auto') return 'auto';
  const match = normalized.match(/^([a-z]{2,3})(?:-|$)/iu);
  return match ? match[1].toLowerCase() : 'en';
}

function localeFromLanguage(language = BASE_MEMORY_LANGUAGE) {
  return normalizeLocale(language || BASE_MEMORY_LANGUAGE);
}

function languageValidationError(_value, label = 'memoryLanguage') {
  return new Error(`${label} must be a valid canonical BCP 47 language tag.`);
}

function assertSupportedMemoryLanguageTag(value, label = 'memoryLanguage') {
  const raw = String(value || '').trim();
  const canonical = normalizeLanguageTag(raw);
  if (!raw || raw.toLowerCase() === 'auto' || !canonical || canonical !== raw) {
    throw languageValidationError(raw || '(empty)', label);
  }
  return canonical;
}

function normalizeConfigLanguageTag(value, fallback = BASE_MEMORY_LANGUAGE) {
  const raw = String(value || '').trim();
  return assertSupportedMemoryLanguageTag(raw || fallback, 'memoryLanguage');
}

function configuredMemoryLanguageTag(config = {}) {
  activateDisplayTemplates(config);
  const explicit = config.memoryLanguage || config.outputLanguage || config.wikiLanguage || config.reportLanguage || config.contextLanguage;
  return normalizeConfigLanguageTag(explicit || config.locale || BASE_MEMORY_LANGUAGE, config.locale || BASE_MEMORY_LANGUAGE);
}

function configuredMemoryLanguage(config = {}) {
  const language = languageFromLocale(configuredMemoryLanguageTag(config));
  return language === 'auto' ? languageFromLocale(BASE_MEMORY_LANGUAGE) : language;
}

function configuredMemoryLocale(config = {}) {
  return configuredMemoryLanguageTag(config);
}

function countScript(text, regex) {
  return (String(text || '').match(regex) || []).length;
}

function detectLanguageFromText(text) {
  const value = String(text || '');
  if (!value.trim()) return '';
  const counts = {
    ko: countScript(value, /\p{Script=Hangul}/gu),
    ja: countScript(value, /[\p{Script=Hiragana}\p{Script=Katakana}]/gu),
    zh: countScript(value, /\p{Script=Han}/gu),
    ar: countScript(value, /\p{Script=Arabic}/gu),
    latin: countScript(value, /\p{Script=Latin}/gu)
  };
  if (counts.ko > 0) return 'ko';
  if (counts.ja > 0) return 'ja';
  if (counts.ar > 0) return 'ar';
  if (counts.zh >= Math.max(2, counts.latin)) return 'zh';
  if (counts.latin > 0) return 'en';
  return '';
}

function languageDetectionText(input = {}) {
  return [
    input.text,
    input.task,
    input.userRequest,
    input.request,
    input.aiActionSummary,
    input.summary,
    input.userFeedback,
    input.feedback,
    input.notes
  ].filter(Boolean).join('\n');
}

function defaultConfig(options = {}) {
  const timestamp = nowIso();
  const explicitLanguage = options.language || options.locale || process.env.VIBEBOX_LANGUAGE || process.env.VIBEBOX_LOCALE || '';
  const selectedLanguage = explicitLanguage || detectSystemLocale() || BASE_MEMORY_LANGUAGE;
  const outputLanguage = normalizeConfigLanguageTag(selectedLanguage, BASE_MEMORY_LANGUAGE);
  const displayTemplateInput = options.displayTemplates
    ?? options.displayTemplate
    ?? process.env.VIBEBOX_DISPLAY_TEMPLATES
    ?? process.env.VIBEBOX_DISPLAY_TEMPLATE
    ?? process.env.VIBEBOX_LOCALE_TEMPLATE
    ?? null;
  const displayTemplates = normalizeAgentDisplayTemplates(displayTemplateInput, outputLanguage, 'display template');
  if (options.requireDisplayTemplate === true && outputLanguage !== BASE_MEMORY_LANGUAGE && !displayTemplates[outputLanguage]) {
    throw new Error(`init for ${outputLanguage} requires an AI-agent display template for that exact canonical BCP 47 tag. Provide --display-template/--display-template-file or VIBEBOX_DISPLAY_TEMPLATE so Core can initialize user-facing templates without hardcoded locale packs.`);
  }
  const locale = outputLanguage;
  const config = {
    version: VIBEBOX_VERSION,
    memoryMode: 'auto',
    curationMode: 'auto',
    legacyReviewMode: false,
    quarantineOnConflict: true,
    autoActivateConfidence: 'medium',
    obsidianCompatible: true,
    maxContextItems: 8,
    maxContextChars: 6000,
    locale,
    memoryLanguage: outputLanguage,
    outputLanguage,
    wikiLanguage: outputLanguage,
    reportLanguage: outputLanguage,
    contextLanguage: outputLanguage,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  if (Object.keys(displayTemplates).length > 0) {
    config.displayTemplates = displayTemplates;
  }
  activateDisplayTemplates(config);
  return config;
}

const BASE_DISPLAY_TEMPLATE = Object.freeze({
  homeTitle: 'VibeBox Home',
  contextTitle: 'VibeBox Context Pack',
  pretaskTitle: 'VibeBox Pre-Task Brief',
  reportTitle: 'VibeBox Memory Report',
  blackboxTitle: 'VibeBox Blackbox Report',
  doctorTitle: 'VibeBox Doctor',
  task: 'Task',
  userTask: 'User Task',
  relevantMemoryContext: 'Relevant Memory Context',
  relevantUserPreferences: 'Relevant User Preferences',
  relevantUserPatterns: 'Relevant User Patterns',
  relevantProjectDecisions: 'Relevant Project Decisions',
  relevantArchitectureRules: 'Relevant Architecture Rules',
  relevantAvoidRules: 'Relevant Avoid Rules',
  relevantFailureMemory: 'Relevant Failure Memory',
  knownFailureRisks: 'Known Failure Risks',
  knownSuccessPatterns: 'Known Success Patterns',
  relevantSuccessPatterns: 'Relevant Success Patterns',
  relevantValidationPatterns: 'Relevant Validation Patterns',
  relevantProcessPatterns: 'Relevant Process Patterns',
  relevantDesignPhilosophy: 'Relevant Design Philosophy',
  relevantAgentFailurePatterns: 'Relevant Agent Failure Patterns',
  relevantAgentSuccessPatterns: 'Relevant Agent Success Patterns',
  relevantCorrectionPatterns: 'Relevant Correction Patterns',
  relevantResponsePreferences: 'Relevant Response Preferences',
  relevantCommunicationPatterns: 'Relevant Communication Patterns',
  relevantQuestionPatterns: 'Relevant Question Patterns',
  relevantDecisionPatterns: 'Relevant Decision Patterns',
  relevantHandoffPatterns: 'Relevant Handoff Patterns',
  userSuccessCriteria: 'User Success Criteria',
  aiFailureAvoidance: 'AI Failure Avoidance',
  aiSuccessfulApproaches: 'AI Successful Approaches',
  projectGuardrails: 'Project Guardrails',
  potentialConflicts: 'Potential Conflicts',
  guidanceForAgent: 'Guidance for AI Agent',
  instructionForAgent: 'Instruction for AI Agent',
  prevention: 'Prevention',
  alternative: 'Alternative',
  none: 'None.',
  pageUserPreferences: 'User Preferences',
  pageUserPatterns: 'User Patterns',
  pageDesignPhilosophy: 'Design Philosophy',
  pageValidationPatterns: 'Validation Patterns',
  pageProcessPatterns: 'Process Patterns',
  pageDecisionPatterns: 'Decision Patterns',
  pageTechnologyPreferences: 'Technology Preferences',
  pageAgentFailurePatterns: 'Agent Failure Patterns',
  pageAgentSuccessPatterns: 'Agent Success Patterns',
  pagePreventionRules: 'Prevention Rules',
  pageGlobalAvoidRules: 'Global Avoid Rules',
  pageFailureMemory: 'Failure Memory',
  pageSuccessPatterns: 'Success Patterns',
  pageToolingPreferences: 'Tooling Preferences',
  pageWorkflowRules: 'Workflow Rules',
  pageProjectIndex: 'Project Index',
  activeMemory: 'Active Memory',
  pendingCandidates: 'Pending Candidates',
  recentBlackboxEvents: 'Recent Blackbox Events',
  candidateDiagnostics: 'Candidate Diagnostics',
  noReusableMemoryCandidate: 'No reusable memory candidate',
  taskTimeline: 'Task Timeline',
  failedApproaches: 'Failed Approaches',
  successfulApproaches: 'Successful Approaches',
  rejectedDirections: 'Rejected Directions',
  confirmedDecisions: 'Confirmed Decisions',
  recurringFailureTypes: 'Recurring Failure Types',
  frequentlyChangedFiles: 'Frequently Changed Files',
  preventionRules: 'Prevention Rules',
  project: 'Project',
  status: 'Status',
  globalStore: 'Global store',
  currentProjectId: 'Current projectId',
  errors: 'Errors',
  warnings: 'Warnings',
  noIssuesFound: 'No issues found.',
  modelClass: 'Model class',
  modelSubClass: 'Model',
  idLabel: 'ID',
  scopeLabel: 'Scope',
  confidenceLabel: 'Confidence',
  topicLabel: 'Topic',
  summaryLabel: 'Summary',
  appliesToLabel: 'Applies to',
  failureTypeLabel: 'Failure type',
  preventionRuleLabel: 'Prevention rule',
  reuseWhenLabel: 'Reuse when',
  patternTypeLabel: 'Pattern type',
  situationLabel: 'Situation',
  preferredBehaviorLabel: 'Preferred behavior',
  forbiddenActionLabel: 'Forbidden action',
  severityLabel: 'Severity',
  decisionLabel: 'Decision',
  alternativesRejectedLabel: 'Alternatives rejected',
  notSpecified: 'Not specified',
  wiki: 'Wiki',
  recentActiveMemory: 'Recent Active Memory',
  storage: 'Storage',
  memoryNote: 'Memory note',
  displayTextMissing: 'display text missing',
  projectSection: 'Project',
  activePatternGraph: 'Active Pattern Graph',
  projectId: 'Project ID',
  repository: 'Repository',
  primaryDomain: 'Primary domain',
  lastSeen: 'Last seen',
  category: 'Category',
  relatedMemory: 'Related memories',
  relatedSuccessfulApproaches: 'Related Successful Approaches',
  relatedFailureAvoidance: 'Related Failure Avoidance',
  aiFailureMemory: 'AI Failure Memory',
  aiSuccessfulApproach: 'AI Successful Approach',
  taskContext: 'Task Context',
  discardedDetail: 'Discarded Detail',
  commandFailed: 'Command failed',
  aiSuccessApproach: 'AI successful approach',
  doNotRepeat: 'Do not repeat',
  reviewPriorFailure: 'Review prior failure before repeating this approach.',
  similarWork: 'Similar work appears.',
  sameFailure: 'when the same failure appears.',
  summarySection: 'Summary',
  scopeSection: 'Applicability',
  sourceSection: 'Observed Source',
  relatedCategories: 'Related Categories',
  observedUserSuccessCriteria: 'User Success Criteria Observed In This Project',
  observedUserPatterns: 'User Tendencies And Patterns Observed In This Project',
  observedAiFailures: 'AI Failures Observed In This Project',
  observedAiSuccessfulApproaches: 'AI Successful Approaches Used In This Project',
  observedValidationPreservation: 'Validation And Preservation Rules For This Project',
  projectSpecificMemory: 'Project-Specific Decisions And Rules',
  relatedProjectMemory: 'Other Memory Observed In This Project',
  homeDescription: 'Global local-first memory store for AI coding agents.',
  backTo: 'Back to',
  storageJsonIndexes: 'JSON indexes live in `../index/`.',
  storageRawEvents: 'Raw blackbox events live in `../logs/events.jsonl`.',
  storagePendingCandidates: 'Pending memory candidates live in `../pending/memory-candidates.jsonl`.'
});

const REQUIRED_DISPLAY_TEMPLATE_KEYS = Object.freeze(Object.keys(BASE_DISPLAY_TEMPLATE));
const ACTIVE_DISPLAY_TEMPLATES = new Map();

export function displayTemplateSchema() {
  return {
    defaultLanguage: BASE_MEMORY_LANGUAGE,
    requiredKeys: [...REQUIRED_DISPLAY_TEMPLATE_KEYS],
    baseTemplate: { ...BASE_DISPLAY_TEMPLATE }
  };
}

function firstAllowedValue(values) {
  return [...values][0] || '';
}

function structuredCandidateSkeleton(locale = 'en-US') {
  const memoryRole = firstAllowedValue(MEMORY_ROLE_VALUES);
  const type = firstAllowedValue([...MEMORY_TYPES].filter((candidateType) => CATEGORY_AXIS_DOC_KEYS.includes(TYPE_TO_DOC_KEY[candidateType])));
  const modelClass = firstAllowedValue(MODEL_CLASS_VALUES);
  const scope = firstAllowedValue(CANDIDATE_SCOPE_VALUES);
  const confidence = firstAllowedValue(Object.keys(CONFIDENCE_PRIORITY));
  const primaryCategory = TYPE_TO_DOC_KEY[type];
  return {
    memoryRole,
    type,
    modelClass,
    modelSubClass: `${type}_model`,
    scope,
    primaryCategory,
    relatedCategories: [],
    title: '<canonical English title>',
    summary: '<canonical English reusable memory summary>',
    rule: '<canonical English rule or guidance>',
    displayTitle: '<localized title in configured memoryLanguage>',
    displaySummary: '<localized summary in configured memoryLanguage>',
    displayRule: '<localized rule in configured memoryLanguage>',
    displayLanguage: locale,
    confidence,
    sourceType: DEFAULT_AGENT_SOURCE_TYPE,
    evidence: [
      {
        kind: 'user_request',
        summary: '<evidence summary>'
      }
    ]
  };
}

export function structuredCandidateSchema(options = {}) {
  const locale = options.locale || 'en-US';
  return {
    schemaName: 'vibebox.structuredMemoryCandidate',
    version: VIBEBOX_VERSION,
    source: 'VibeBox Core constants',
    requiredFields: STRUCTURED_CANDIDATE_REQUIRED_FIELDS,
    recommendedFields: STRUCTURED_CANDIDATE_RECOMMENDED_FIELDS,
    enums: {
      memoryRole: [...MEMORY_ROLE_VALUES],
      type: [...MEMORY_TYPES],
      modelClass: [...MODEL_CLASS_VALUES],
      scope: [...CANDIDATE_SCOPE_VALUES],
      primaryCategory: [...CATEGORY_AXIS_DOC_KEYS],
      relatedCategories: [...CATEGORY_AXIS_DOC_KEYS],
      confidence: Object.keys(CONFIDENCE_PRIORITY),
      sourceType: [...CANDIDATE_SOURCE_TYPE_VALUES],
      status: [...CANDIDATE_STATUS_VALUES]
    },
    categoryModel: {
      docKeys: WIKI_DOCS.map((doc) => doc.docKey),
      categoryDocKeys: [...CATEGORY_AXIS_DOC_KEYS],
      typeToDocKey: { ...TYPE_TO_DOC_KEY },
      typeToWikiPage: { ...TYPE_TO_PAGE }
    },
    defaults: {
      sourceType: DEFAULT_AGENT_SOURCE_TYPE,
      status: 'active',
      displayLanguage: locale
    },
    candidateSkeleton: structuredCandidateSkeleton(locale),
    noReusableMemoryCandidate: {
      type: 'no_reusable_memory_candidate',
      no_reusable_memory_candidate: true,
      noCandidateReason: '<why no durable reusable memory exists>'
    },
    notes: [
      'The AI Agent chooses semantic type/category from these enums; Core only validates and renders.',
      'Do not invent enum values. If unsure, rerun `vibebox schema --format json` and rebuild the candidate.',
      'Use primaryCategory for the canonical category and relatedCategories for additional category links.'
    ]
  };
}

export function formatStructuredCandidateSchema(schema = structuredCandidateSchema()) {
  const enums = schema.enums || {};
  const categoryModel = schema.categoryModel || {};
  const lines = [
    `${schema.schemaName || 'vibebox.structuredMemoryCandidate'} v${schema.version || VIBEBOX_VERSION}`,
    '',
    'Required fields:',
    ...((schema.requiredFields || []).map((field) => `- ${field}`)),
    '',
    'Enums:',
    ...Object.entries(enums).map(([key, values]) => `- ${key}: ${(values || []).join(', ')}`),
    '',
    'Category model:',
    `- categoryDocKeys: ${(categoryModel.categoryDocKeys || []).join(', ')}`,
    `- typeToDocKey: ${JSON.stringify(categoryModel.typeToDocKey || {})}`,
    '',
    'Default agent semantic sourceType:',
    `- ${schema.defaults?.sourceType || DEFAULT_AGENT_SOURCE_TYPE}`,
    '',
    'Candidate skeleton:',
    JSON.stringify(schema.candidateSkeleton || {}, null, 2),
    '',
    'No reusable memory diagnostic:',
    JSON.stringify(schema.noReusableMemoryCandidate || {}, null, 2)
  ];
  return lines.join('\n');
}

function parseDisplayTemplateJson(value, label = 'display template') {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a JSON object.`);
  }
  const text = stripJsonFence(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error.message}`);
  }
}

function looksLikeDisplayTemplatePack(value = {}) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && REQUIRED_DISPLAY_TEMPLATE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function sanitizeDisplayTemplatePack(pack, locale, label = 'display template') {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    throw new Error(`${label} for ${locale} must be a JSON object of template keys to strings.`);
  }
  const normalized = {};
  for (const [key, value] of Object.entries(pack)) {
    if (typeof value !== 'string') {
      throw new Error(`${label} value ${key} for ${locale} must be a string.`);
    }
    normalized[key] = value;
  }
  const missing = REQUIRED_DISPLAY_TEMPLATE_KEYS.filter((key) => !normalized[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`${label} for ${locale} is missing required key(s): ${missing.join(', ')}.`);
  }
  return normalized;
}

function normalizeAgentDisplayTemplates(value, fallbackLocale = BASE_MEMORY_LANGUAGE, label = 'display template') {
  const parsed = parseDisplayTemplateJson(value, label);
  if (!parsed) return {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const fallbackTag = normalizeConfigLanguageTag(
    parsed.languageTag || parsed.locale || parsed.memoryLanguage || fallbackLocale,
    fallbackLocale
  );
  let templateMap = null;
  if (parsed.displayTemplates || parsed.templates) {
    templateMap = parsed.displayTemplates || parsed.templates;
  } else if (parsed.displayTemplate || parsed.template) {
    templateMap = { [fallbackTag]: parsed.displayTemplate || parsed.template };
  } else if (looksLikeDisplayTemplatePack(parsed)) {
    templateMap = { [fallbackTag]: parsed };
  } else if (Object.values(parsed).every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    templateMap = parsed;
  }

  if (!templateMap || typeof templateMap !== 'object' || Array.isArray(templateMap)) {
    throw new Error(`${label} must be either a template pack, { displayTemplate }, or { displayTemplates: { languageTag: pack } }.`);
  }

  const normalized = {};
  for (const [rawLocale, pack] of Object.entries(templateMap)) {
    const locale = normalizeConfigLanguageTag(rawLocale || fallbackTag, fallbackTag);
    normalized[locale] = sanitizeDisplayTemplatePack(pack, locale, label);
  }
  return normalized;
}

function mergeDisplayTemplates(...templateSets) {
  return Object.assign({}, ...templateSets.filter(Boolean));
}

function activateDisplayTemplates(config = {}) {
  const targetLocale = config.memoryLanguage || config.outputLanguage || config.wikiLanguage || config.locale || BASE_MEMORY_LANGUAGE;
  const templates = normalizeAgentDisplayTemplates(
    config.displayTemplates ? { displayTemplates: config.displayTemplates } : config.displayTemplate ? { locale: targetLocale, displayTemplate: config.displayTemplate } : null,
    targetLocale,
    'configured display template'
  );
  for (const [locale, template] of Object.entries(templates)) {
    ACTIVE_DISPLAY_TEMPLATES.set(locale, template);
  }
  return templates;
}

function requireDisplayTemplateForLocale(locale, templates = {}, label = 'display template') {
  const tag = normalizeConfigLanguageTag(locale, BASE_MEMORY_LANGUAGE);
  if (tag === BASE_MEMORY_LANGUAGE) return;
  if (!templates[tag] && !ACTIVE_DISPLAY_TEMPLATES.has(tag)) {
    throw new Error(`${label} for ${tag} is required. AI Agent must provide localized template text for the configured memoryLanguage; Core has no hardcoded locale pack for this language.`);
  }
}

function resolveLocale(input = {}, config = {}) {
  activateDisplayTemplates(config);
  const explicit = input.locale
    || input.language;
  const configured = config.memoryLanguage
    || config.outputLanguage
    || config.contextLanguage
    || config.reportLanguage
    || config.wikiLanguage
    || config.locale;
  const selected = explicit || configured || process.env.VIBEBOX_LANGUAGE || process.env.VIBEBOX_LOCALE || detectLanguageFromText(languageDetectionText(input)) || detectSystemLocale() || BASE_MEMORY_LANGUAGE;
  if (String(selected).toLowerCase() === 'auto') {
    return normalizeConfigLanguageTag(detectLanguageFromText(languageDetectionText(input)) || config.locale || detectSystemLocale() || BASE_MEMORY_LANGUAGE, BASE_MEMORY_LANGUAGE);
  }
  return normalizeConfigLanguageTag(selected, BASE_MEMORY_LANGUAGE);
}

function localeTemplates(locale) {
  const normalized = normalizeConfigLanguageTag(locale || BASE_MEMORY_LANGUAGE, BASE_MEMORY_LANGUAGE);
  return ACTIVE_DISPLAY_TEMPLATES.get(normalized) || BASE_DISPLAY_TEMPLATE;
}

function t(locale, key) {
  return localeTemplates(locale)[key] || BASE_DISPLAY_TEMPLATE[key] || key;
}

function docDefinition(docKey) {
  return DOC_BY_KEY[docKey] || DOC_BY_KEY.home;
}

function docKeyForPageName(pageName) {
  return DOC_KEY_BY_CANONICAL_FILE[pageName] || null;
}

function docKeyForType(type) {
  return TYPE_TO_DOC_KEY[type] || 'project_index';
}

function localizedDocTitle(docKey, locale = 'en-US') {
  return t(locale, docDefinition(docKey).titleKey);
}

function localizedDocFileName(docKey, locale = 'en-US') {
  const doc = docDefinition(docKey);
  if (doc.technicalName) return doc.canonicalFileName;
  return `${safeWikiPageName(localizedDocTitle(docKey, locale))}.md`;
}

function currentWikiPages(locale = 'en-US') {
  return WIKI_DOCS.map((doc) => localizedDocFileName(doc.docKey, locale));
}

function localizedPageTitle(pageName, locale = 'en-US') {
  const docKey = docKeyForPageName(pageName);
  return docKey ? localizedDocTitle(docKey, locale) : pageTitle(pageName);
}

function defaultRegistry() {
  return {
    version: VIBEBOX_VERSION,
    updatedAt: nowIso(),
    projects: []
  };
}

function defaultWikiDocRegistry(locale = 'en-US') {
  const localeTag = normalizeConfigLanguageTag(locale, BASE_MEMORY_LANGUAGE);
  const language = languageFromLocale(localeTag);
  return {
    version: VIBEBOX_VERSION,
    language,
    languageTag: localeTag,
    locale: localeTag,
    updatedAt: nowIso(),
    docs: WIKI_DOCS.map((doc) => ({
      docKey: doc.docKey,
      canonicalFileName: doc.canonicalFileName,
      fileName: localizedDocFileName(doc.docKey, localeTag),
      title: localizedDocTitle(doc.docKey, localeTag),
      aliases: [...new Set([
        pageTitle(doc.canonicalFileName),
        localizedDocTitle(doc.docKey, localeTag)
      ])]
    }))
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
  } catch {
    // package.json is optional for agent-neutral VibeBox workspaces.
  }

  return identity;
}

async function isRecognizedProjectRoot(root) {
  const resolved = path.resolve(root);
  return !isIgnoredProjectRoot(resolved);
}

function isPathInside(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isIgnoredProjectRoot(root) {
  const resolved = path.resolve(root);
  const home = path.resolve(os.homedir());
  const storeRoot = path.resolve(getVibeBoxHome());
  const tempRoot = path.resolve(os.tmpdir());
  const normalized = resolved.toLowerCase();
  const segments = path.normalize(resolved).split(/[\\/]+/u).filter(Boolean).map((segment) => segment.toLowerCase());
  const isDriveRoot = path.parse(resolved).root === resolved;
  return resolved === home
    || resolved === tempRoot
    || isDriveRoot
    || isPathInside(resolved, storeRoot)
    || segments.includes('.codex')
    || segments.includes('.agents')
    || segments.includes('node_modules')
    || segments.includes('plugin cache')
    || normalized.includes(`${path.sep}plugins${path.sep}cache${path.sep}`)
    || normalized.endsWith(`${path.sep}plugins${path.sep}cache`);
}

function virtualProjectIdentity(root) {
  const timestamp = nowIso();
  return {
    projectId: null,
    projectName: 'No active project',
    rootPath: path.resolve(root),
    gitRemote: '',
    repositoryName: '',
    packageName: '',
    primaryDomain: 'global',
    techStackHints: [],
    aliases: [],
    status: 'virtual',
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    virtual: true
  };
}

function isRealProjectIdentity(project) {
  return Boolean(project && project.projectId && project.status !== 'virtual' && !project.virtual);
}

function isRegistryProject(project) {
  return Boolean(
    project
    && project.projectId
    && project.projectId !== 'global-store'
    && project.status !== 'virtual'
    && !project.virtual
    && (!project.rootPath || !isIgnoredProjectRoot(project.rootPath))
  );
}

async function resolveCurrentProjectIdentity(root = process.cwd()) {
  await ensureDir(vibeboxPath(root, 'registry'));
  if (!(await isRecognizedProjectRoot(root))) {
    return virtualProjectIdentity(root);
  }
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

async function resolveProjectIdentityForRead(root = process.cwd()) {
  if (!(await isRecognizedProjectRoot(root))) {
    return virtualProjectIdentity(root);
  }

  const detected = await detectProjectIdentity(root);
  const registryPath = vibeboxPath(root, 'registry/projects.json');
  const registry = await loadJson(registryPath, defaultRegistry());
  registry.projects = Array.isArray(registry.projects) ? registry.projects : [];
  const existing = registry.projects.find((project) => (
    (detected.gitRemote && project.gitRemote === detected.gitRemote)
    || (project.rootPath && path.resolve(project.rootPath) === detected.rootPath)
    || project.projectId === detected.projectId
    || (Array.isArray(project.aliases) && project.aliases.includes(detected.projectId))
  ));

  if (!existing) {
    return {
      ...detected,
      firstSeenAt: null,
      lastSeenAt: null,
      aliases: [...new Set(detected.aliases || [])].sort(),
      readOnly: true
    };
  }

  const aliases = new Set([...(existing.aliases || []), ...(detected.aliases || [])]);
  if (detected.projectId !== existing.projectId) aliases.add(detected.projectId);
  return {
    ...existing,
    ...detected,
    projectId: existing.projectId,
    firstSeenAt: existing.firstSeenAt || null,
    lastSeenAt: existing.lastSeenAt || null,
    aliases: [...aliases].sort(),
    status: existing.status || detected.status || 'active',
    readOnly: true
  };
}

async function createDefaultConfig(options = {}) {
  return defaultConfig(options);
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
    supersedes: {},
    byType: {},
    byProject: {},
    nodes: {}
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
      memoryCount: memories.filter((memory) => memoryObservedInProject(memory, project.projectId)).length
    }))
  };
}

function memoryObservedProjectIds(memory = {}) {
  return [...new Set([memory.projectId, memory.sourceProjectId].filter(Boolean))];
}

function memoryObservedInProject(memory = {}, projectId = '') {
  return Boolean(projectId && memoryObservedProjectIds(memory).includes(projectId));
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

function initialWikiPage(pageName, locale = 'en-US') {
  if (pageName === 'Home.md') {
    return `${renderHomeShell(locale)}\n\n${managedBlock(renderHomeManaged([], locale))}\n`;
  }
  if (pageName === 'Project Index.md') {
    return `${renderProjectIndexShell(locale)}\n\n${managedBlock(renderProjectIndexManaged([], locale))}\n`;
  }

  return `${renderMemoryShell(pageName, locale)}\n\n${managedBlock(renderMemoryManaged([], locale))}\n`;
}

function initialWikiDocPage(docKey, locale = 'en-US') {
  if (docKey === 'home') {
    return `${renderHomeShell(locale)}\n\n${managedBlock(renderHomeManaged([], locale))}\n`;
  }
  if (docKey === 'project_index') {
    return `${renderProjectIndexShell(locale)}\n\n${managedBlock(renderProjectIndexManaged([], locale))}\n`;
  }

  return `${renderMemoryShell(localizedDocFileName(docKey, locale), locale)}\n\n${managedBlock(renderMemoryManaged([], locale))}\n`;
}

function initialProjectWikiPage(project, locale = 'en-US') {
  return `${renderProjectShell(project, locale)}\n\n${managedBlock(renderProjectManaged(project, [], locale))}\n`;
}

export async function initVibeBox(root = process.cwd(), options = {}) {
  const base = vibeboxPath(root);
  const created = [];
  const existingConfig = await loadJson(vibeboxPath(root, 'config.json'), {});
  const configOptions = { ...options };
  if (Object.keys(existingConfig).length > 0) {
    if (!configOptions.locale && !configOptions.language) {
      configOptions.locale = existingConfig.locale || existingConfig.memoryLanguage;
    }
    if (configOptions.displayTemplates === undefined && configOptions.displayTemplate === undefined) {
      configOptions.displayTemplates = existingConfig.displayTemplates ?? existingConfig.displayTemplate;
    }
  }
  const config = await createDefaultConfig({ ...configOptions, requireDisplayTemplate: true });
  const memoryLocale = configuredMemoryLocale(config);

  await ensureDir(vibeboxPath(root, 'registry'));
  await writeIfMissing(vibeboxPath(root, 'registry/projects.json'), `${JSON.stringify(defaultRegistry(), null, 2)}\n`);
  await writeIfMissing(vibeboxPath(root, 'registry/wiki-docs.json'), `${JSON.stringify(defaultWikiDocRegistry(memoryLocale), null, 2)}\n`);
  const project = await resolveCurrentProjectIdentity(root);
  const hasProject = isRealProjectIdentity(project);

  const dirs = ['', 'global', 'projects', 'wiki', 'wiki/projects', 'index', 'logs', 'pending', 'registry'];
  if (hasProject) dirs.push(`projects/${project.projectId}`);
  for (const dir of dirs) {
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
    ['pending/memory-candidates.jsonl', '']
  ];

  for (const fileName of GLOBAL_MEMORY_FILE_NAMES) {
    files.push([`global/${fileName}`, `${JSON.stringify(defaultMemoryFile(), null, 2)}\n`]);
  }
  if (hasProject) {
    files.push([`projects/${project.projectId}/project.json`, `${JSON.stringify(project, null, 2)}\n`]);
    for (const fileName of PROJECT_MEMORY_FILE_NAMES) {
      files.push([`projects/${project.projectId}/${fileName}`, `${JSON.stringify(defaultMemoryFile(), null, 2)}\n`]);
    }
  }
  for (const doc of WIKI_DOCS) {
    const page = localizedDocFileName(doc.docKey, memoryLocale);
    files.push([`wiki/${page}`, initialWikiDocPage(doc.docKey, memoryLocale)]);
  }
  if (hasProject) {
    files.push([`wiki/projects/${project.projectId}.md`, initialProjectWikiPage(project, memoryLocale)]);
  }

  for (const [relative, content] of files) {
    const didCreate = await writeIfMissing(vibeboxPath(root, relative), content);
    if (didCreate) {
      created.push(relative);
    }
  }

  await ensureConfigFields(root);
  const actualConfig = await loadJson(vibeboxPath(root, 'config.json'), config);
  const actualLocale = configuredMemoryLocale(actualConfig);
  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(actualLocale));
  if (hasProject) {
    await saveJson(vibeboxPath(root, `projects/${project.projectId}/project.json`), project);
  }
  await rebuildIndexes(root, { syncNamespaceFiles: false });
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  await writeManagedWikiDoc(root, 'project_index', renderProjectIndexShell(actualLocale), renderProjectIndexManaged((registry.projects || []).filter(isRegistryProject), actualLocale), actualLocale);

  return {
    root: path.resolve(root),
    projectRoot: project.rootPath,
    projectId: hasProject ? project.projectId : null,
    storeRoot: base,
    vibeboxPath: base,
    created
  };
}

async function ensureConfigFields(root) {
  const configPath = vibeboxPath(root, 'config.json');
  const existing = await loadJson(configPath, {});
  const defaults = await createDefaultConfig({
    locale: existing.locale || existing.memoryLanguage,
    displayTemplates: existing.displayTemplates
  });
  const merged = { ...defaults, ...existing };
  let changed = false;

  const languageKeys = ['memoryLanguage', 'outputLanguage', 'wikiLanguage', 'reportLanguage', 'contextLanguage'];
  const configKeys = ['maxContextItems', 'maxContextChars', 'memoryMode', 'curationMode', 'legacyReviewMode', 'quarantineOnConflict', 'autoActivateConfidence', 'obsidianCompatible', 'locale', ...languageKeys];

  for (const key of configKeys) {
    if (existing[key] === undefined) {
      merged[key] = defaults[key];
      changed = true;
    }
  }
  const normalizedLocale = normalizeConfigLanguageTag(merged.locale, defaults.locale);
  if (merged.locale !== normalizedLocale) {
    merged.locale = normalizedLocale;
    changed = true;
  }
  for (const key of languageKeys) {
    const normalized = normalizeConfigLanguageTag(merged[key], merged.locale);
    if (merged[key] !== normalized) {
      merged[key] = normalized;
      changed = true;
    }
  }
  if (existing.legacyReviewMode !== true && (merged.memoryMode === 'review' || merged.curationMode === 'review')) {
    merged.memoryMode = 'auto';
    merged.curationMode = 'auto';
    changed = true;
  }
  if (changed) {
    merged.updatedAt = nowIso();
    await saveJson(configPath, merged);
  }
}

async function ensureStoreForRead(root) {
  const storePath = vibeboxPath(root);
  try {
    await access(storePath);
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      const wrapped = new Error(`VibeBox global store access denied at ${storePath}. pretask/context require read access to the single global VibeBox store. No workspace-local snapshot will be created.`);
      wrapped.code = error.code || 'EACCES';
      throw wrapped;
    }
    if (error.code === 'ENOENT') {
      throw new Error(`VibeBox global store not found at ${storePath}. Run \`vibebox init\` first.`);
    }
    throw error;
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

function normalizeEnum(value, allowed, fallback = 'unknown') {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/gu, '_');
  return allowed.has(normalized) ? normalized : fallback;
}

const USER_FEEDBACK_SIGNAL_VALUES = new Set(['none', 'acceptance', 'rejection', 'mixed', 'comment']);

function normalizeExplicitUserAcceptance(input = {}) {
  const explicit = normalizeEnum(input.userAcceptance || input.user_acceptance, USER_ACCEPTANCE_VALUES, '');
  if (explicit) return explicit;
  return 'unknown';
}

function normalizeExplicitTechnicalOutcome(input = {}) {
  const explicit = normalizeEnum(input.technicalOutcome || input.technical_outcome, TECHNICAL_OUTCOMES, '');
  if (explicit) return explicit;
  const legacy = normalizeEnum(input.outcome, new Set(['success', 'failure', 'partial', 'unknown']), '');
  return legacy || 'unknown';
}

function deriveFinalOutcome(technicalOutcome, userAcceptance, explicitFinalOutcome = '') {
  const explicit = normalizeEnum(explicitFinalOutcome, FINAL_OUTCOMES, '');
  if (explicit) return explicit;
  if (technicalOutcome === 'success' && userAcceptance === 'accepted') return 'accepted_success';
  if (technicalOutcome === 'success' && userAcceptance === 'rejected') return 'technical_success_user_rejected';
  if (technicalOutcome === 'failure' && ['accepted', 'mixed'].includes(userAcceptance)) return 'technical_failure_user_direction_valid';
  if (technicalOutcome === 'failure') return 'failed';
  if (technicalOutcome === 'partial' || userAcceptance === 'mixed') return 'partial';
  return 'unknown';
}

function legacyOutcomeFromFinal(finalOutcome) {
  if (finalOutcome === 'accepted_success') return 'success';
  if (['technical_success_user_rejected', 'technical_failure_user_direction_valid', 'failed'].includes(finalOutcome)) return 'failure';
  if (finalOutcome === 'partial') return 'partial';
  return 'unknown';
}

function deriveOutcomeFields(input = {}) {
  const technicalOutcome = normalizeExplicitTechnicalOutcome(input);
  const userAcceptance = normalizeExplicitUserAcceptance(input);
  const finalOutcome = deriveFinalOutcome(technicalOutcome, userAcceptance, input.finalOutcome || input.final_outcome);
  const userFeedbackSignal = normalizeEnum(input.userFeedbackSignal || input.user_feedback_signal, USER_FEEDBACK_SIGNAL_VALUES, 'none');
  const successEvidence = normalizeEnum(input.successEvidence || input.acceptanceBasis, SUCCESS_EVIDENCE_VALUES, 'unknown');
  const rejectionReason = String(input.rejectionReason || input.rejection_reason || '').trim();
  const correctionDirection = String(input.correctionDirection || input.correction_direction || '').trim();
  const preventionRule = '';
  const legacyInputOutcome = normalizeEnum(input.outcome, new Set(['success', 'failure', 'partial', 'unknown']), '');
  return {
    technicalOutcome,
    userAcceptance,
    userFeedbackSignal,
    successEvidence,
    acceptanceBasis: successEvidence,
    finalOutcome,
    rejectionReason,
    correctionDirection,
    preventionRule,
    outcome: userAcceptance === 'rejected'
      ? 'failure'
      : legacyInputOutcome || legacyOutcomeFromFinal(finalOutcome)
  };
}

export async function captureEvent(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const timestamp = nowIso();
  const outcomeFields = deriveOutcomeFields(input);
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
    technicalOutcome: outcomeFields.technicalOutcome,
    userAcceptance: outcomeFields.userAcceptance,
    userFeedbackSignal: outcomeFields.userFeedbackSignal,
    successEvidence: outcomeFields.successEvidence,
    acceptanceBasis: outcomeFields.acceptanceBasis,
    finalOutcome: outcomeFields.finalOutcome,
    rejectionReason: outcomeFields.rejectionReason,
    correctionDirection: outcomeFields.correctionDirection,
    preventionRule: outcomeFields.preventionRule,
    semanticExtractionStatus: input.semanticExtractionStatus || 'not_applicable',
    structuredCandidateCount: Number.isFinite(input.structuredCandidateCount) ? input.structuredCandidateCount : 0,
    semanticExtractionWarning: input.semanticExtractionWarning || '',
    noCandidateReason: input.noCandidateReason || '',
    noCandidateReasons: Array.isArray(input.noCandidateReasons) ? input.noCandidateReasons : [],
    noCandidateReasonMissing: input.noCandidateReasonMissing === true,
    whyOnlyOneCandidate: input.whyOnlyOneCandidate || '',
    candidateContractWarning: input.candidateContractWarning || '',
    outcome: outcomeFields.outcome,
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
  if (textHasAny(statement, ['app', 'prototype', 'prototypes', 'native', 'mobile'])) domains.add('app');
  if (textHasAny(statement, ['landing page', 'homepage', 'marketing page', 'brand landing', 'catalog landing'])) domains.add('landing_page');
  if (textHasAny(statement, ['brand', 'premium', 'catalog'])) domains.add('brand_design');
  if (textHasAny(statement, ['saas style', 'catalog direction', 'catalog-style', 'card-heavy'])) domains.add('brand_design');
  if (textHasAny(statement, ['native app', 'mobile app', 'receipt', 'expense', 'approval', 'business trip'])) domains.add('native_internal_app');
  if (textHasAny(statement, ['backend', 'api'])) domains.add('backend');
  if (textHasAny(statement, ['frontend', 'ui', 'ux', 'layout'])) domains.add('frontend');
  if (textHasAny(statement, ['visual', '3d', 'hero', 'cinematic', 'design'])) domains.add('visual_design');
  if (textHasAny(statement, ['database', 'mssql', 'supabase', 'postgresql'])) domains.add('database');
  if (textHasAny(statement, ['tool', 'command', 'cli'])) domains.add('tooling');
  if (textHasAny(statement, ['test', 'check', 'verify', 'verification', 'validating', '검증'])) domains.add('verification');
  if (textHasAny(statement, ['architecture', 'design philosophy', '설계'])) domains.add('architecture');
  if (textHasAny(statement, ['agent', 'ai', '에이전트'])) domains.add('agent');
  return [...domains];
}

function extractTags(statement) {
  const normalized = normalizeText(statement);
  const tags = new Set();
  const known = [
    'dashboard',
    'landing page',
    'brand',
    'catalog',
    'catalog direction',
    'premium',
    'saas',
    'saas style',
    'violet',
    'blue',
    'color palette',
    'marketing',
    'native',
    'mobile',
    'internal',
    'business trip',
    'expense',
    'receipt',
    'approval',
    'offline',
    '3d',
    'hero',
    'cinematic',
    'dark',
    'readable',
    'practical',
    'touch targets',
    'data clarity',
    'reference',
    'principles',
    'copy',
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
    'recharts',
    'test',
    'check',
    'verification',
    'validation',
    '검증',
    'process',
    'repository',
    'architecture',
    'design philosophy',
    'agent',
    'handoff',
    'correction',
    'communication'
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

const MEMORY_METADATA_LABEL_PATTERN = /(?:^|\b)(?:user request|original request|ai action summary|action summary|source)\s*[:\uFF1A]/iu;

function uniqueNonEmpty(values = []) {
  const seen = new Set();
  return values.filter(Boolean).filter((value) => {
    const key = String(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function containsMemoryMetadataLabel(value) {
  const text = String(value ?? '');
  return MEMORY_METADATA_LABEL_PATTERN.test(text)
    || /confirmed by the user and worked successfully/iu.test(text);
}

function normalizeCandidateStructure(candidate) {
  candidate.docKey = candidate.docKey || docKeyForType(candidate.type);
  return candidate;
}

function matchesActiveCondition(memory, task) {
  if (!memory.activeCondition?.keywords?.length) return true;
  const taskTokens = new Set(memoryKeywords({ summary: task, tags: [], domains: [], appliesTo: [] }));
  return memory.activeCondition.keywords.some((keyword) => taskTokens.has(keyword) || normalizeText(task).includes(keyword));
}

function stripJsonFence(value = '') {
  const text = String(value || '').trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  return fence ? fence[1].trim() : text;
}

function parseStructuredCandidateInput(value, label = 'structured memory candidates') {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    if (Array.isArray(value.candidates)) return value.candidates;
    if (Array.isArray(value.memoryCandidates)) return value.memoryCandidates;
    if (Array.isArray(value.structuredMemoryCandidates)) return value.structuredMemoryCandidates;
    return [value];
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a JSON array or object.`);
  }
  const text = stripJsonFence(value);
  if (!text) return [];
  try {
    return parseStructuredCandidateInput(JSON.parse(text), label);
  } catch (error) {
    throw new Error(`${label} must be valid JSON: ${error.message}`);
  }
}

function structuredCandidatesFromInput(input = {}) {
  const value = input.structuredMemoryCandidates
    ?? input.memoryCandidates
    ?? input.candidates
    ?? input.agentMemoryCandidates
    ?? input.agentCandidates;
  return parseStructuredCandidateInput(value);
}

function structuredCandidateInputValue(input = {}) {
  return input.structuredMemoryCandidates
    ?? input.memoryCandidates
    ?? input.candidates
    ?? input.agentMemoryCandidates
    ?? input.agentCandidates;
}

function parsedStructuredCandidateEnvelope(input = {}) {
  const value = structuredCandidateInputValue(input);
  if (!value || Array.isArray(value)) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(stripJsonFence(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isNoReusableMemoryDiagnostic(candidate = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  return candidate.no_reusable_memory_candidate === true
    || candidate.noReusableMemoryCandidate === true
    || candidate.type === 'no_reusable_memory_candidate'
    || candidate.memoryRole === 'no_reusable_memory_candidate';
}

function candidateDiagnosticReason(candidate = {}) {
  return [
    candidate.noCandidateReason,
    candidate.no_candidate_reason
  ].find((value) => typeof value === 'string' && value.trim())?.trim() || '';
}

function splitCandidateDiagnostics(candidates = [], input = {}) {
  const envelope = parsedStructuredCandidateEnvelope(input);
  const noCandidateReasons = [];
  const realCandidates = [];
  let noCandidateReasonMissing = false;
  let whyOnlyOneCandidate = typeof input.whyOnlyOneCandidate === 'string' ? input.whyOnlyOneCandidate.trim() : '';
  if (envelope) {
    const envelopeReason = candidateDiagnosticReason(envelope);
    if (envelopeReason && (isNoReusableMemoryDiagnostic(envelope) || !Array.isArray(envelope.candidates) || envelope.candidates.length === 0)) {
      noCandidateReasons.push(envelopeReason);
    }
    if (isNoReusableMemoryDiagnostic(envelope) && !envelopeReason) {
      noCandidateReasonMissing = true;
    }
    if (!whyOnlyOneCandidate && typeof envelope.whyOnlyOneCandidate === 'string') {
      whyOnlyOneCandidate = envelope.whyOnlyOneCandidate.trim();
    }
  }
  for (const candidate of candidates) {
    if (isNoReusableMemoryDiagnostic(candidate)) {
      const reason = candidateDiagnosticReason(candidate);
      if (reason) noCandidateReasons.push(reason);
      else noCandidateReasonMissing = true;
      continue;
    }
    if (!whyOnlyOneCandidate && typeof candidate?.whyOnlyOneCandidate === 'string') {
      whyOnlyOneCandidate = candidate.whyOnlyOneCandidate.trim();
    }
    realCandidates.push(candidate);
  }
  return {
    realCandidates,
    noCandidateReasons: uniqueNonEmpty(noCandidateReasons),
    noCandidateReasonMissing,
    whyOnlyOneCandidate
  };
}

function normalizeStringArray(value = []) {
  if (!value) return [];
  if (Array.isArray(value)) return uniqueNonEmpty(value.map((item) => String(item || '').trim()).filter(Boolean));
  return uniqueNonEmpty(String(value).split(/\r?\n|[,;]/u).map((item) => item.trim()).filter(Boolean));
}

function requiredCandidateString(raw, fieldName, candidateLabel) {
  const value = raw?.[fieldName];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Structured memory candidate ${candidateLabel} is missing required field ${fieldName}.`);
  }
  return value.trim();
}

function requiredCandidateStringAny(raw, fieldNames, candidateLabel) {
  for (const fieldName of fieldNames) {
    const value = raw?.[fieldName];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  throw new Error(`Structured memory candidate ${candidateLabel} is missing required field ${fieldNames.join(' or ')}.`);
}

function optionalCandidateString(raw, fieldName) {
  const value = raw?.[fieldName];
  return typeof value === 'string' ? value.trim() : '';
}

function optionalCandidateStringAny(raw, fieldNames) {
  for (const fieldName of fieldNames) {
    const value = raw?.[fieldName];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
}

function requiredCandidateEnum(raw, fieldName, allowed, candidateLabel) {
  const value = requiredCandidateString(raw, fieldName, candidateLabel);
  if (!allowed.has(value)) {
    throw new Error(`Structured memory candidate ${candidateLabel} has invalid ${fieldName}: ${value}. Allowed ${fieldName} values: ${[...allowed].join(', ')}.`);
  }
  return value;
}

function normalizeCandidateEvidence(value = []) {
  const evidence = Array.isArray(value) ? value : value ? [value] : [];
  return evidence.map((item) => {
    if (item && typeof item === 'object') return redactSensitive(item);
    return { kind: 'text', summary: String(item || '').trim() };
  }).filter((item) => Object.values(item).some(Boolean));
}

function isAgentStructuredCandidate(candidate = {}) {
  const sourceType = candidate.sourceType || candidate.source?.sourceType || '';
  return CANDIDATE_SOURCE_TYPE_VALUES.has(sourceType);
}

function normalizeStructuredMemoryCandidate(rawCandidate, context = {}) {
  if (!rawCandidate || typeof rawCandidate !== 'object' || Array.isArray(rawCandidate)) {
    throw new Error('Structured memory candidates must be objects.');
  }
  const raw = redactSensitive(rawCandidate);
  const candidateLabel = raw.candidateId || raw.id || raw.title || '(unidentified)';
  const memoryRole = requiredCandidateEnum(raw, 'memoryRole', MEMORY_ROLE_VALUES, candidateLabel);
  const type = requiredCandidateEnum(raw, 'type', MEMORY_TYPES, candidateLabel);
  const modelClass = requiredCandidateEnum(raw, 'modelClass', MODEL_CLASS_VALUES, candidateLabel);
  const modelSubClass = requiredCandidateString(raw, 'modelSubClass', candidateLabel);
  const scope = requiredCandidateEnum(raw, 'scope', CANDIDATE_SCOPE_VALUES, candidateLabel);
  const confidence = requiredCandidateEnum(raw, 'confidence', new Set(Object.keys(CONFIDENCE_PRIORITY)), candidateLabel);
  const sourceType = requiredCandidateEnum(raw, 'sourceType', CANDIDATE_SOURCE_TYPE_VALUES, candidateLabel);
  const title = requiredCandidateStringAny(raw, STRUCTURED_CANDIDATE_TITLE_FIELDS, candidateLabel);
  const summary = requiredCandidateStringAny(raw, STRUCTURED_CANDIDATE_SUMMARY_FIELDS, candidateLabel);
  const displayTitle = optionalCandidateString(raw, 'displayTitle');
  const displaySummary = optionalCandidateString(raw, 'displaySummary');
  const displayRule = optionalCandidateString(raw, 'displayRule');
  const displayTextDiagnostics = [
    displayTitle ? '' : 'displayTitle missing; Wiki will show display text missing diagnostic instead of canonical title.',
    displaySummary ? '' : 'displaySummary missing; Wiki will show display text missing diagnostic instead of canonical summary.',
    displayRule ? '' : 'displayRule missing; Wiki will show display text missing diagnostic instead of canonical rule.'
  ].filter(Boolean);
  const rawPrimaryCategory = requiredCandidateString(raw, 'primaryCategory', candidateLabel);
  const rawStatus = raw.status ? requiredCandidateEnum(raw, 'status', CANDIDATE_STATUS_VALUES, candidateLabel) : 'active';
  const displayLanguage = assertSupportedMemoryLanguageTag(
    requiredCandidateString(raw, 'displayLanguage', candidateLabel),
    'structured candidate displayLanguage'
  );
  const configuredDisplayLanguage = context.locale ? assertSupportedMemoryLanguageTag(context.locale, 'configured memoryLanguage') : '';
  const displayLanguageDiagnostics = configuredDisplayLanguage && displayLanguage !== configuredDisplayLanguage
    ? [`displayLanguage ${displayLanguage} does not match configured memoryLanguage ${configuredDisplayLanguage}; AI Agent must provide display fields in ${configuredDisplayLanguage}.`]
    : [];
  const primaryCategory = normalizeCategoryDocKeys([rawPrimaryCategory])[0];
  if (!primaryCategory) {
    throw new Error(`Structured memory candidate ${candidateLabel} has invalid primaryCategory: ${rawPrimaryCategory}. Allowed primaryCategory values: ${CATEGORY_AXIS_DOC_KEYS.join(', ')}.`);
  }
  const rawRelatedCategories = normalizeStringArray(raw.relatedCategories || []);
  const relatedCategories = normalizeCategoryDocKeys(rawRelatedCategories);
  if (rawRelatedCategories.length && relatedCategories.length !== rawRelatedCategories.length) {
    throw new Error(`Structured memory candidate ${candidateLabel} has one or more invalid relatedCategories. Allowed relatedCategories values: ${CATEGORY_AXIS_DOC_KEYS.join(', ')}.`);
  }

  const project = context.project || {};
  const idSeed = [
    raw.candidateId || raw.id || '',
    memoryRole,
    type,
    scope,
    title,
    summary
  ].join('|');
  const id = String(raw.id || raw.candidateId || hashId('mem', idSeed)).trim().replace(/\s+/gu, '_');
  const timestamp = nowIso();
  const domains = uniqueNonEmpty([
    ...normalizeStringArray(raw.domains || []),
    ...(raw.domain ? [String(raw.domain).trim()] : [])
  ]);
  const candidate = {
    id,
    candidateId: raw.candidateId || raw.id || id,
    type,
    scope,
    topic: String(raw.topic || title).trim(),
    title,
    rule: optionalCandidateString(raw, 'rule'),
    summary,
    details: optionalCandidateString(raw, 'details'),
    tags: normalizeStringArray(raw.tags || []),
    domains,
    domain: raw.domain || domains[0] || '',
    appliesTo: normalizeStringArray(raw.appliesTo || raw.applies_to || []),
    source: {
      kind: context.source?.kind || 'agent_candidate',
      id: context.source?.id || null,
      sourceType,
      role: 'structuredMemoryCandidate'
    },
    sourceType,
    sourceTextKind: 'structuredMemoryCandidate',
    sourcePriority: 1,
    evidence: normalizeCandidateEvidence(raw.evidence || []),
    technicalOutcome: normalizeEnum(raw.technicalOutcome || raw.technical_outcome, TECHNICAL_OUTCOMES, 'unknown'),
    userAcceptance: normalizeEnum(raw.userAcceptance || raw.user_acceptance, USER_ACCEPTANCE_VALUES, 'unknown'),
    userFeedbackSignal: raw.userFeedbackSignal || 'none',
    successEvidence: normalizeEnum(raw.successEvidence || raw.acceptanceBasis, SUCCESS_EVIDENCE_VALUES, 'unknown'),
    acceptanceBasis: normalizeEnum(raw.acceptanceBasis || raw.successEvidence, SUCCESS_EVIDENCE_VALUES, 'unknown'),
    finalOutcome: normalizeEnum(raw.finalOutcome || raw.final_outcome, FINAL_OUTCOMES, 'unknown'),
    rejectionReason: raw.rejectionReason || '',
    correctionDirection: raw.correctionDirection || '',
    preventionRule: optionalCandidateString(raw, 'preventionRule'),
    confidence,
    status: 'pending',
    agentProposedStatus: rawStatus,
    conflictStatus: 'no_conflict',
    supersedes: normalizeStringArray(raw.supersedes || []),
    related: normalizeStringArray(raw.related || []),
    relationCandidates: Array.isArray(raw.relationCandidates) ? raw.relationCandidates : [],
    replaces: normalizeStringArray(raw.replaces || []),
    activeCondition: raw.activeCondition && typeof raw.activeCondition === 'object' ? raw.activeCondition : null,
    discardReason: raw.discardReason || '',
    quarantineReason: raw.quarantineReason || '',
    primaryCategory,
    relatedCategories,
    memoryRole,
    modelClass,
    modelSubClass,
    docKey: raw.docKey || docKeyForType(type),
    displayTitle,
    displaySummary,
    displayRule,
    displayLanguage,
    displayTextDiagnostics,
    displayLanguageDiagnostics,
    whyOnlyOneCandidate: raw.whyOnlyOneCandidate || '',
    sourceProjectId: raw.sourceProjectId || project.projectId || '',
    projectId: ['project', 'task', 'temporary'].includes(scope)
      ? raw.projectId || project.projectId
      : raw.projectId,
    sourceProjectRoot: raw.sourceProjectRoot || project.rootPath,
    repositoryName: raw.repositoryName || project.repositoryName || project.projectName,
    createdAt: raw.createdAt || timestamp,
    updatedAt: timestamp,
    lastUsedAt: null
  };

  if (memoryRole === 'user_success_criteria') {
    candidate.successCriterion = optionalCandidateString(raw, 'successCriterion');
  }
  if (memoryRole === 'ai_failure_memory') {
    candidate.failureType = optionalCandidateString(raw, 'failureType');
    candidate.failureCategory = optionalCandidateString(raw, 'failureCategory');
    candidate.failedApproach = optionalCandidateString(raw, 'failedApproach');
    candidate.failureReason = optionalCandidateString(raw, 'failureReason');
    candidate.affectedContext = optionalCandidateString(raw, 'affectedContext');
    candidate.recurrenceRisk = optionalCandidateString(raw, 'recurrenceRisk');
  }
  if (memoryRole === 'ai_successful_approach') {
    candidate.successfulApproach = optionalCandidateString(raw, 'successfulApproach');
    candidate.recoveryApproach = optionalCandidateString(raw, 'recoveryApproach');
    candidate.whyItWorked = optionalCandidateString(raw, 'whyItWorked');
    candidate.reuseWhen = raw.reuseWhen || candidate.appliesTo;
  }

  return candidate;
}

async function buildStructuredMemoryCandidates(root, rawCandidates = [], context = {}) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = configuredMemoryLocale(config);
  const memories = await activeMemories(root);
  return rawCandidates.map((rawCandidate) => {
    const candidate = normalizeStructuredMemoryCandidate(rawCandidate, {
      ...context,
      project,
      locale
    });
    const conflict = classifyCandidateConflict(memories, candidate);
    candidate.conflictStatus = conflict.status;
    candidate.related = [...new Set([...(candidate.related || []), ...(conflict.related || [])])];
    candidate.supersedes = [...new Set([...(candidate.supersedes || []), ...(conflict.supersedes || [])])];
    if (conflict.reason) candidate.conflictReason = conflict.reason;
    return candidate;
  });
}

async function activeMemories(root) {
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), { memories: [] });
  return (memoryIndex.memories || []).filter((memory) => memory.status === 'active');
}

export async function extractMemoryCandidates(root = process.cwd(), input = {}) {
  const parsedStructuredCandidates = structuredCandidatesFromInput(input);
  const { realCandidates: structuredCandidates } = splitCandidateDiagnostics(parsedStructuredCandidates, input);
  if (structuredCandidates.length === 0) {
    return [];
  }
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const existingPending = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const existingIds = new Set(existingPending.map((candidate) => candidate.id));
  const newCandidates = [];

  for (const candidate of await buildStructuredMemoryCandidates(root, structuredCandidates, { source: input.source || { kind: 'manual_extract' } })) {
    if (!existingIds.has(candidate.id)) {
      newCandidates.push(candidate);
      existingIds.add(candidate.id);
      continue;
    }
    if (isManualReviewMode(input, config)) continue;
    const duplicateOf = candidate.id;
    candidate.id = hashId('mem', `${duplicateOf}|duplicate|${nowIso()}`);
    candidate.conflictStatus = 'duplicate';
    candidate.related = [...new Set([...(candidate.related || []), duplicateOf])];
    if (!existingIds.has(candidate.id)) {
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
  if (newCandidates.length === 0 || isManualReviewMode(input, config)) {
    return newCandidates;
  }
  return autoCurateCandidates(root, newCandidates);
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

function isNonDurableMemoryCandidate(candidate) {
  return !candidate
    || candidate.type === 'discarded_detail'
    || candidate.type === 'task_context'
    || candidate.modelClass === 'discarded_detail'
    || candidate.modelClass === 'task_context'
    || ['task', 'temporary'].includes(candidate.scope);
}

function hasSameActiveSubject(memory, candidate) {
  return memory.topic === candidate.topic
    || setOverlap(memory.tags, candidate.tags) >= 2
    || (memory.type === candidate.type && setOverlap(memory.appliesTo, candidate.appliesTo) >= 1);
}

function valuesCompatible(leftValue, rightValue) {
  if (!leftValue || !rightValue) return true;
  return normalizeText(leftValue) === normalizeText(rightValue);
}

function domainsCompatible(memory, candidate) {
  const memoryDomains = memory.domains || [];
  const candidateDomains = candidate.domains || [];
  if (memoryDomains.length === 0 || candidateDomains.length === 0) return true;
  return setOverlap(memoryDomains, candidateDomains) > 0;
}

function projectCompatibleForReplacement(memory, candidate) {
  const memoryProject = memory.projectId || null;
  const candidateProject = candidate.projectId || null;
  if (memoryProject || candidateProject) return memoryProject === candidateProject;
  return true;
}

function canReplaceMemory(existing, candidate) {
  if (isNonDurableMemoryCandidate(candidate) || isNonDurableMemoryCandidate(existing)) return false;
  if (!valuesCompatible(existing.modelClass, candidate.modelClass)) return false;
  if (!valuesCompatible(existing.modelSubClass, candidate.modelSubClass)) return false;
  if (!valuesCompatible(existing.type, candidate.type)) return false;
  if (!valuesCompatible(existing.scope, candidate.scope)) return false;
  if (!domainsCompatible(existing, candidate)) return false;
  if (!projectCompatibleForReplacement(existing, candidate)) return false;
  if (!valuesCompatible(existing.situation, candidate.situation)) return false;
  return hasSameActiveSubject(existing, candidate);
}

function canApplyAgentReplacement(existing, candidate) {
  if (isNonDurableMemoryCandidate(candidate) || isNonDurableMemoryCandidate(existing)) return false;
  if (!valuesCompatible(existing.modelClass, candidate.modelClass)) return false;
  if (!valuesCompatible(existing.type, candidate.type)) return false;
  if (!valuesCompatible(existing.scope, candidate.scope)) return false;
  if (!domainsCompatible(existing, candidate)) return false;
  if (!projectCompatibleForReplacement(existing, candidate)) return false;
  if (!valuesCompatible(existing.situation, candidate.situation)) return false;
  return true;
}

export function classifyCandidateConflict(activeMemoryRecords = [], candidate) {
  const relatedMemories = activeMemoryRecords.filter((memory) => hasTargetOverlap(memory, candidate));
  if (relatedMemories.length === 0) {
    return { status: 'no_conflict', related: [], supersedes: [], reason: '' };
  }

  const related = relatedMemories.map((memory) => memory.id);
  const replaceableMemories = relatedMemories.filter((memory) => canReplaceMemory(memory, candidate));
  const replaceable = replaceableMemories.map((memory) => memory.id);
  const explicitReplacementIds = normalizeStringArray([
    ...(candidate.replaces || []),
    ...(candidate.supersedes || [])
  ]);
  const explicitConflictIds = normalizeStringArray((candidate.relationCandidates || [])
    .filter((relation) => relation && relation.type === 'conflicts_with')
    .flatMap((relation) => [relation.targetId, relation.target]));
  const explicitReplaceable = replaceable.filter((id) => explicitReplacementIds.includes(id));
  if (explicitConflictIds.length > 0 && related.every((id) => explicitConflictIds.includes(id))) {
    return { status: 'no_conflict', related, supersedes: [], reason: 'Agent provided explicit conflict relation for coexisting active memory.' };
  }

  for (const memory of replaceableMemories) {
    const memoryText = normalizeText([memory.rule, memory.summary, memory.details].filter(Boolean).join(' '));
    const candidateText = normalizeText([candidate.rule, candidate.summary, candidate.details].filter(Boolean).join(' '));
    const sameShape = memory.type === candidate.type && memory.scope === candidate.scope && memory.topic === candidate.topic;
    const sameCore = normalizeText(memory.rule) === normalizeText(candidate.rule)
      || normalizeText(memory.summary) === normalizeText(candidate.summary)
      || memoryText === candidateText;
    if (sameShape && sameCore) {
      return { status: 'duplicate', related: [memory.id], supersedes: [], reason: 'Candidate is effectively identical to active memory.' };
    }
  }

  if (candidate.activeCondition && typeof candidate.activeCondition === 'object') {
    return { status: 'exception', related, supersedes: [], reason: 'Agent provided an explicit activeCondition for overlapping memory.' };
  }

  if (explicitReplacementIds.length > 0) {
    if (explicitReplaceable.length > 0) {
      return { status: 'supersedes', related, supersedes: explicitReplaceable, reason: 'Agent explicitly requested replacement of compatible active memory.' };
    }
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Agent requested replacement outside the safe model, scope, domain, or project boundary.' };
  }

  if (candidate.confidence === 'low') {
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Low-confidence candidate overlaps existing memory.' };
  }

  return { status: 'needs_user_review', related, supersedes: [], reason: 'Candidate overlaps existing memory but relation is ambiguous.' };
}

function isManualReviewMode(input = {}, config = {}) {
  return Boolean(input.manualReview || input.reviewOnly || input.debugReview)
    || input.curationMode === 'review'
    || input.memoryMode === 'review'
    || (config.legacyReviewMode === true && (config.curationMode === 'review' || config.memoryMode === 'review'));
}

function candidateHasMetadataLabels(candidate) {
  const fields = [
    candidate.title,
    candidate.summary,
    candidate.rule,
    candidate.details,
    candidate.preferredBehavior,
    candidate.successfulApproach,
    candidate.whyItWorked,
    candidate.successCriterion,
    candidate.recoveryApproach,
    candidate.affectedContext
  ];
  return fields.some((field) => containsMemoryMetadataLabel(field));
}

function isAcceptedSuccessCandidate(candidate) {
  if (!['success_pattern', 'agent_success_pattern'].includes(candidate.type)) return true;
  if (candidate.userAcceptance === 'accepted' || candidate.finalOutcome === 'accepted_success') return true;
  if (candidate.userFeedbackSignal === 'acceptance') return true;
  if (candidate.acceptanceBasis === 'confirmed' || candidate.successEvidence === 'confirmed') return true;
  if (candidate.acceptanceBasis === 'inferred' || candidate.successEvidence === 'inferred') return true;
  return false;
}

function isRejectedSuccessCandidate(candidate) {
  return ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
    && (
      candidate.userAcceptance === 'rejected'
      || candidate.finalOutcome === 'technical_success_user_rejected'
      || candidate.acceptanceBasis === 'rejected'
      || candidate.successEvidence === 'rejected'
    );
}

function computeAutoCurationDecision(candidate) {
  if (containsSensitive(candidate)) {
    return { action: 'quarantine', status: 'quarantined', reason: 'Sensitive value suspected.' };
  }
  if (candidateHasMetadataLabels(candidate)) {
    return { action: 'quarantine', status: 'quarantined', reason: 'Memory text still contains parser or source labels and needs normalization.' };
  }
  if (candidate.type === 'discarded_detail') {
    candidate.modelClass = 'discarded_detail';
    candidate.modelSubClass = 'discarded_detail';
    return { action: 'discard', status: 'discarded', reason: 'Task-only or low-value detail is not durable active memory.' };
  }
  if (candidate.type === 'task_context') {
    return { action: 'discard', status: 'discarded', reason: 'Task context is useful for the current task but is not stored as active memory.' };
  }
  if (['task', 'temporary'].includes(candidate.scope)) {
    return { action: 'discard', status: 'discarded', reason: 'Task-scoped candidate is current task context, not active memory.' };
  }
  if (candidate.agentProposedStatus === 'pending') {
    return { action: 'keep_pending', status: 'pending', reason: 'Agent submitted this candidate for manual review.' };
  }
  if (candidate.agentProposedStatus === 'discarded') {
    return { action: 'discard', status: 'discarded', reason: candidate.discardReason || 'Agent marked this structured detail as discarded.' };
  }
  if (candidate.agentProposedStatus === 'quarantined') {
    return { action: 'quarantine', status: 'quarantined', reason: candidate.quarantineReason || 'Agent marked this structured candidate for quarantine.' };
  }
  if (candidate.agentProposedStatus === 'rejected') {
    return { action: 'reject', status: 'rejected', reason: candidate.rejectionReason || 'Agent marked this structured candidate as rejected.' };
  }
  if (isRejectedSuccessCandidate(candidate)) {
    return { action: 'discard', status: 'discarded', reason: 'User rejected the technically successful result; do not promote as success.' };
  }
  if (!isAcceptedSuccessCandidate(candidate)) {
    return { action: 'quarantine', status: 'quarantined', reason: 'Success memory requires confirmed or inferred reusable success evidence.' };
  }
  if (candidate.conflictStatus === 'duplicate') {
    return { action: 'discard', status: 'discarded', reason: 'Duplicate of active memory.' };
  }
  if (['task', 'temporary'].includes(candidate.scope) && candidate.confidence === 'low') {
    return { action: 'discard', status: 'discarded', reason: 'Low-value task-scoped candidate.' };
  }
  if (candidate.conflictStatus === 'exception') {
    if (candidate.activeCondition?.keywords?.length) {
      return { action: 'active', status: 'active', reason: 'Scoped exception has an active condition.' };
    }
    return { action: 'quarantine', status: 'quarantined', reason: 'Exception scope is unclear.' };
  }
  if (['supersedes', 'refinement'].includes(candidate.conflictStatus)) {
    return { action: 'replace', status: 'active', reason: `Candidate ${candidate.conflictStatus} existing active memory.` };
  }
  if (['direct_conflict', 'needs_user_review'].includes(candidate.conflictStatus)) {
    return { action: 'quarantine', status: 'quarantined', reason: `Ambiguous conflict: ${candidate.conflictStatus}.` };
  }
  if (candidate.confidence === 'low') {
    return { action: 'quarantine', status: 'quarantined', reason: 'Low-confidence candidate needs more evidence.' };
  }
  if (candidate.conflictStatus === 'no_conflict' && ['success_pattern', 'agent_success_pattern'].includes(candidate.type) && ['confirmed', 'inferred'].includes(candidate.acceptanceBasis || candidate.successEvidence)) {
    return {
      action: 'active',
      status: 'active',
      reason: `${candidate.acceptanceBasis === 'confirmed' || candidate.successEvidence === 'confirmed' ? 'Confirmed' : 'Inferred'} reusable success evidence.`
    };
  }
  if (candidate.conflictStatus === 'no_conflict' && ['medium', 'high'].includes(candidate.confidence)) {
    return { action: 'active', status: 'active', reason: 'Clear reusable memory with sufficient confidence.' };
  }
  return { action: 'discard', status: 'discarded', reason: 'No durable active guidance detected.' };
}

async function markCandidateLifecycle(root, candidateId, decision) {
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) return null;
  candidate.status = decision.status;
  candidate.curationDecision = decision.action;
  candidate.curationReason = decision.reason;
  candidate.updatedAt = nowIso();
  if (decision.status === 'discarded') candidate.discardReason = decision.reason;
  if (decision.status === 'quarantined') candidate.quarantineReason = decision.reason;
  if (decision.status === 'rejected') candidate.rejectionReason = decision.reason;
  await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
  await updatePendingIndex(root);
  return candidate;
}

async function autoCurateCandidates(root, candidates = []) {
  const curated = [];
  for (const candidate of candidates) {
    const decision = computeAutoCurationDecision(candidate);
    if (decision.status === 'active') {
      curated.push(await approveMemory(root, candidate.id, {
        curationDecision: decision.action,
        curationReason: decision.reason
      }));
      continue;
    }
    curated.push(await markCandidateLifecycle(root, candidate.id, decision));
  }
  return curated.filter(Boolean);
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
    modelClass: candidate.modelClass,
    modelSubClass: candidate.modelSubClass,
    memoryRole: candidate.memoryRole,
    successCriterion: candidate.successCriterion,
    docKey: candidate.docKey,
    primaryCategory: candidate.primaryCategory || null,
    relatedCategories: candidate.relatedCategories || [],
    projectId: candidate.projectId || null,
    sourceProjectRoot: candidate.sourceProjectRoot || null,
    confidence: candidate.confidence,
    status: candidate.status,
    curationDecision: candidate.curationDecision,
    curationReason: candidate.curationReason,
    discardReason: candidate.discardReason,
    quarantineReason: candidate.quarantineReason,
    rejectionReason: candidate.rejectionReason,
    failureCategory: candidate.failureCategory,
    affectedContext: candidate.affectedContext,
    recoveryApproach: candidate.recoveryApproach,
    technicalOutcome: candidate.technicalOutcome,
    userAcceptance: candidate.userAcceptance,
    successEvidence: candidate.successEvidence,
    acceptanceBasis: candidate.acceptanceBasis,
    finalOutcome: candidate.finalOutcome,
    conflictStatus: candidate.conflictStatus,
    recommendedAction: recommendCandidateAction(candidate).action,
    related: candidate.related || [],
    supersedes: candidate.supersedes || [],
    replaces: candidate.replaces || [],
    activeCondition: candidate.activeCondition || null,
    displayTextDiagnostics: candidate.displayTextDiagnostics || [],
    displayLanguageDiagnostics: candidate.displayLanguageDiagnostics || [],
    whyOnlyOneCandidate: candidate.whyOnlyOneCandidate || '',
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
    modelClass: memory.modelClass || '',
    modelSubClass: memory.modelSubClass || '',
    memoryRole: memory.memoryRole,
    successCriterion: memory.successCriterion,
    docKey: memory.docKey || docKeyForType(memory.type),
    primaryCategory: memory.primaryCategory || null,
    relatedCategories: memory.relatedCategories || [],
    tags: memory.tags || [],
    domains: memory.domains || [],
    appliesTo: memory.appliesTo || [],
    projectId: memory.projectId,
    sourceProjectId: memory.sourceProjectId,
    sourceProjectRoot: memory.sourceProjectRoot,
    repositoryName: memory.repositoryName,
    source: memory.source || {},
    evidence: memory.evidence || [],
    confidence: memory.confidence,
    status: memory.status,
    curationDecision: memory.curationDecision,
    curationReason: memory.curationReason,
    conflictStatus: memory.conflictStatus,
    supersedes: memory.supersedes || [],
    related: memory.related || [],
    replaces: memory.replaces || [],
    replacedBy: memory.replacedBy || null,
    activeCondition: memory.activeCondition || null,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    lastUsedAt: memory.lastUsedAt || null,
    patternType: memory.patternType,
    situation: memory.situation,
    trigger: memory.trigger,
    observedBehavior: memory.observedBehavior,
    preferredBehavior: memory.preferredBehavior,
    relatedProjects: memory.relatedProjects,
    relatedPatterns: memory.relatedPatterns,
    relatedFailures: memory.relatedFailures,
    relatedSuccesses: memory.relatedSuccesses,
    relatedDecisions: memory.relatedDecisions,
    relatedPreferences: memory.relatedPreferences,
    failureType: memory.failureType,
    failureCategory: memory.failureCategory,
    failedApproach: memory.failedApproach,
    failureReason: memory.failureReason,
    preventionRule: memory.preventionRule,
    affectedContext: memory.affectedContext,
    technicalOutcome: memory.technicalOutcome,
    userAcceptance: memory.userAcceptance,
    userFeedbackSignal: memory.userFeedbackSignal,
    successEvidence: memory.successEvidence,
    acceptanceBasis: memory.acceptanceBasis,
    finalOutcome: memory.finalOutcome,
    rejectionReason: memory.rejectionReason,
    correctionDirection: memory.correctionDirection,
    relatedFiles: memory.relatedFiles,
    recurrenceRisk: memory.recurrenceRisk,
    successfulApproach: memory.successfulApproach,
    recoveryApproach: memory.recoveryApproach,
    whyItWorked: memory.whyItWorked,
    reuseWhen: memory.reuseWhen,
    forbiddenAction: memory.forbiddenAction,
    reason: memory.reason,
    severity: memory.severity,
    decision: memory.decision,
    alternativesRejected: memory.alternativesRejected,
    sourceType: memory.sourceType,
    relationCandidates: memory.relationCandidates || [],
    displayTitle: memory.displayTitle,
    displaySummary: memory.displaySummary,
    displayRule: memory.displayRule,
    displayLanguage: memory.displayLanguage,
    displayTextDiagnostics: memory.displayTextDiagnostics || [],
    displayLanguageDiagnostics: memory.displayLanguageDiagnostics || [],
    whyOnlyOneCandidate: memory.whyOnlyOneCandidate || ''
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

function replacementIdsForMemory(memory, existingMemories = []) {
  if (memory.conflictStatus === 'exception') return [];
  const explicitIds = [...new Set([...(memory.replaces || []), ...(memory.supersedes || [])])]
    .filter((id) => {
      const existing = existingMemories.find((item) => item.id === id);
      return existing && canApplyAgentReplacement(existing, memory);
    });
  if (explicitIds.length > 0) return explicitIds;
  if (['supersedes', 'refinement'].includes(memory.conflictStatus)) {
    const candidateIds = [...new Set([...(memory.supersedes || []), ...(memory.related || [])])];
    return candidateIds.filter((id) => {
      const existing = existingMemories.find((item) => item.id === id);
      return existing && canReplaceMemory(existing, memory);
    });
  }
  return [...new Set(memory.supersedes || [])].filter((id) => {
    const existing = existingMemories.find((item) => item.id === id);
    return existing && canReplaceMemory(existing, memory);
  });
}

function projectIdentityKeys(project = {}) {
  const currentProjectIds = new Set([
    project.projectId,
    project.id,
    project.projectName,
    project.repositoryName,
    project.rootPath ? path.basename(project.rootPath) : ''
  ].filter(Boolean).map((value) => String(value)));
  for (const alias of project.aliases || []) {
    if (alias) currentProjectIds.add(String(alias));
  }
  if (project.rootPath) {
    currentProjectIds.add(slugProjectId(path.basename(project.rootPath)));
  }
  return currentProjectIds;
}

function memoryProjectIdentityKeys(memory = {}) {
  const memoryProjectIds = [
    memory.projectId,
    memory.sourceProjectId,
    memory.projectName,
    memory.repositoryName
  ].filter(Boolean).map((value) => String(value));
  return memoryProjectIds;
}

function isMemoryVisibleForProject(memory, project = {}) {
  if (!memory) return false;
  if (['global', 'domain'].includes(memory.scope)) return true;
  const currentProjectIds = projectIdentityKeys(project);
  if (memory.projectId) return currentProjectIds.has(String(memory.projectId));
  const memoryProjectIds = memoryProjectIdentityKeys(memory);
  if (memoryProjectIds.length === 0) return true;
  return memoryProjectIds.some((id) => currentProjectIds.has(id));
}

export async function approveMemory(root = process.cwd(), candidateId, options = {}) {
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const records = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const candidate = records.find((record) => record.id === candidateId);
  if (!candidate) {
    throw new Error(`Pending candidate not found: ${candidateId}`);
  }
  if (candidate.status === 'active') {
    const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
    return memoryIndex.memories.find((memory) => memory.id === candidateId) || candidate;
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Candidate is not pending: ${candidateId}`);
  }
  if (!isMemoryVisibleForProject(candidate, project)) {
    throw new Error(`Pending candidate does not belong to current project: ${candidateId}`);
  }
  if (candidateHasMetadataLabels(candidate)) {
    candidate.status = 'quarantined';
    candidate.updatedAt = nowIso();
    candidate.quarantineReason = 'Memory text still contains parser or source labels and needs normalization.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate still contains parser or source labels and cannot become active memory: ${candidateId}`);
  }
  if (isNonDurableMemoryCandidate(candidate)) {
    candidate.status = 'discarded';
    candidate.updatedAt = nowIso();
    candidate.discardReason = 'Task context and discarded detail cannot become durable active memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate is task-only or discarded detail and cannot become active memory: ${candidateId}`);
  }
  if (isRejectedSuccessCandidate(candidate)) {
    candidate.status = 'rejected';
    candidate.updatedAt = nowIso();
    candidate.rejectionReason = 'User rejected this outcome; cannot promote as success memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate was rejected by user feedback and cannot become success memory: ${candidateId}`);
  }
  const manualSuccessApproval = ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
    && (!options.curationDecision || options.curationDecision === 'manual_approve');
  if (manualSuccessApproval && !isAcceptedSuccessCandidate(candidate)) {
    candidate.successEvidence = candidate.successEvidence === 'unknown' ? 'inferred' : candidate.successEvidence || 'inferred';
    candidate.acceptanceBasis = candidate.acceptanceBasis === 'unknown' ? 'inferred' : candidate.acceptanceBasis || candidate.successEvidence;
  }
  if (!isAcceptedSuccessCandidate(candidate)) {
    candidate.status = 'quarantined';
    candidate.updatedAt = nowIso();
    candidate.quarantineReason = 'Success memory requires confirmed or inferred reusable success evidence.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Success memory requires confirmed or inferred reusable success evidence: ${candidateId}`);
  }
  if (containsSensitive(candidate)) {
    candidate.status = 'rejected';
    candidate.updatedAt = nowIso();
    candidate.rejectionReason = 'Sensitive value suspected; cannot promote to active memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate contains suspected sensitive data and was rejected: ${candidateId}`);
  }

  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const memoryLanguage = configuredMemoryLanguage(config);
  const memoryLocale = configuredMemoryLocale(config);
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const timestamp = nowIso();
  let memory = {
    ...candidate,
    projectId: ['project', 'task', 'temporary'].includes(candidate.scope)
      ? candidate.projectId || project.projectId
      : candidate.projectId,
    sourceProjectRoot: candidate.sourceProjectRoot || project.rootPath,
    status: 'active',
    curationDecision: options.curationDecision || candidate.curationDecision || 'manual_approve',
    curationReason: options.curationReason || candidate.curationReason || 'Manual approval.',
    updatedAt: timestamp
  };
  if (!isAgentStructuredCandidate(memory)) {
    normalizeCandidateStructure(memory);
  } else {
    memory.docKey = memory.docKey || docKeyForType(memory.type);
  }
  memory = normalizeMemoryLanguage(memory, memoryLanguage, memoryLocale);
  const replaceIds = replacementIdsForMemory(memory, memoryIndex.memories);
  memory.replaces = [...new Set([...(memory.replaces || []), ...replaceIds])];
  memory.related = (memory.related || []).filter((id) => !replaceIds.includes(id));
  memory.supersedes = (memory.supersedes || []).filter((id) => !replaceIds.includes(id));
  memoryIndex.memories = memoryIndex.memories
    .filter((existing) => existing.id === memory.id || !replaceIds.includes(existing.id));

  if (!memoryIndex.memories.some((item) => item.id === memory.id)) {
    memoryIndex.memories.push(toMemoryIndexEntry(memory));
  } else {
    memoryIndex.memories = memoryIndex.memories.map((item) => item.id === memory.id ? toMemoryIndexEntry(memory) : item);
  }
  memoryIndex.updatedAt = timestamp;
  await saveJson(vibeboxPath(root, 'index/global-memory-index.json'), memoryIndex);

  candidate.status = 'active';
  candidate.curationDecision = memory.curationDecision;
  candidate.curationReason = memory.curationReason;
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

function relationId(type, from, to, projectId = null) {
  return hashId('rel', `${type}|${from}|${to}|${projectId || ''}`);
}

function addRelation(relationIndex, relation) {
  const normalized = {
    id: relation.id || relationId(relation.type, relation.from, relation.to, relation.projectId),
    type: relation.type,
    from: relation.from,
    to: relation.to,
    projectId: relation.projectId || null,
    strength: relation.strength || 0.7,
    evidence: relation.evidence || '',
    createdAt: relation.createdAt || nowIso(),
    active: relation.active !== false
  };
  if (!normalized.type || !normalized.from || !normalized.to) return;
  if (relationIndex.relations.some((item) => item.type === normalized.type && item.from === normalized.from && item.to === normalized.to && (item.projectId || null) === normalized.projectId)) {
    return;
  }
  relationIndex.relations.push(normalized);
  relationIndex.byType[normalized.type] = [...new Set([...(relationIndex.byType[normalized.type] || []), normalized.id])].sort();
  if (normalized.projectId) {
    relationIndex.byProject[normalized.projectId] = [...new Set([...(relationIndex.byProject[normalized.projectId] || []), normalized.id])].sort();
  }
}

function addMemoryNode(relationIndex, memory) {
  relationIndex.nodes[memory.id] = {
    id: memory.id,
    type: memory.type,
    topic: memory.topic,
    projectId: memory.projectId || null,
    active: memory.status === 'active'
  };
}

function relationProjectId(memory) {
  return memory.projectId || memory.sourceProjectId || null;
}

function addDerivedMemoryRelations(relationIndex, memory, activeMemories) {
  const observedProjectId = relationProjectId(memory);
  const projectNode = observedProjectId ? `project:${observedProjectId}` : null;
  if (projectNode) {
    const projectRelationByType = {
      project_decision: 'project_has_decision',
      failure_memory: 'project_has_failure',
      agent_failure_pattern: 'project_has_failure',
      success_pattern: 'project_has_success',
      agent_success_pattern: 'project_has_success'
    };
    if (projectRelationByType[memory.type]) {
      addRelation(relationIndex, {
        type: projectRelationByType[memory.type],
        from: projectNode,
        to: memory.id,
        projectId: observedProjectId,
        strength: 0.9,
        evidence: memory.summary
      });
    }
    addRelation(relationIndex, {
      type: 'project_observed_memory',
      from: projectNode,
      to: memory.id,
      projectId: observedProjectId,
      strength: memory.sourceProjectId === observedProjectId ? 0.85 : 0.7,
      evidence: memory.summary
    });
    if (PATTERN_TYPES.has(memory.type)) {
      addRelation(relationIndex, {
        type: 'project_uses_pattern',
        from: projectNode,
        to: memory.id,
        projectId: observedProjectId,
        evidence: memory.summary
      });
      addRelation(relationIndex, {
        type: 'pattern_applies_to_project',
        from: memory.id,
        to: projectNode,
        projectId: observedProjectId,
        evidence: memory.summary
      });
    }
  }

  for (const categoryDocKey of memoryCategoryDocKeys(memory)) {
    addRelation(relationIndex, {
      type: 'category_has_memory',
      from: `category:${categoryDocKey}`,
      to: memory.id,
      projectId: relationProjectId(memory),
      strength: categoryDocKey === memoryCategoryDocKey(memory) ? 0.95 : 0.75,
      evidence: memory.summary
    });
    addRelation(relationIndex, {
      type: 'memory_in_category',
      from: memory.id,
      to: `category:${categoryDocKey}`,
      projectId: relationProjectId(memory),
      strength: categoryDocKey === memoryCategoryDocKey(memory) ? 0.95 : 0.75,
      evidence: memory.summary
    });
  }

  if (memory.preventionRule && ['failure_memory', 'agent_failure_pattern'].includes(memory.type)) {
    addRelation(relationIndex, {
      type: 'failure_prevented_by_rule',
      from: memory.id,
      to: `rule:${hashId('rule', memory.preventionRule)}`,
      projectId: relationProjectId(memory),
      strength: 0.95,
      evidence: memory.preventionRule
    });
  }

  const preferenceRelationByType = {
    validation_pattern: 'user_prefers_validation',
    process_pattern: 'user_prefers_process',
    response_preference: 'user_prefers_response_style',
    design_philosophy: 'decision_based_on_preference',
    agent_failure_pattern: 'agent_failed_by_pattern',
    agent_success_pattern: 'agent_succeeded_by_pattern'
  };
  if (preferenceRelationByType[memory.type]) {
    addRelation(relationIndex, {
      type: preferenceRelationByType[memory.type],
      from: memory.type.startsWith('agent_') ? 'agent:ai-coding-agent' : 'user:local',
      to: memory.id,
      projectId: relationProjectId(memory),
      strength: 0.85,
      evidence: memory.summary
    });
  }
  if (memory.type === 'avoid_rule') {
    addRelation(relationIndex, {
      type: 'user_rejects_approach',
      from: 'user:local',
      to: memory.id,
      projectId: relationProjectId(memory),
      evidence: memory.summary
    });
  }

  if (memory.type === 'success_pattern' || memory.type === 'agent_success_pattern') {
    for (const failure of activeMemories.filter((item) => (
      ['failure_memory', 'agent_failure_pattern'].includes(item.type)
      && (
        hasTargetOverlap(item, memory)
        || setOverlap(item.tags || [], memory.tags || []) >= 1
      )
    ))) {
      addRelation(relationIndex, {
        type: 'success_resolves_failure',
        from: memory.id,
        to: failure.id,
        projectId: relationProjectId(memory) || relationProjectId(failure),
        strength: 0.8,
        evidence: memory.summary
      });
      addRelation(relationIndex, {
        type: 'failure_replaced_by_success',
        from: failure.id,
        to: memory.id,
        projectId: relationProjectId(memory) || relationProjectId(failure),
        strength: 0.75,
        evidence: memory.summary
      });
    }
  }

  for (const relatedId of memory.related || []) {
    if ((memory.replaces || []).includes(relatedId)) continue;
    addRelation(relationIndex, {
      type: 'related',
      from: memory.id,
      to: relatedId,
      projectId: relationProjectId(memory),
      evidence: memory.summary
    });
    relationIndex.related[memory.id] = [...new Set([...(relationIndex.related[memory.id] || []), relatedId])];
  }
  for (const supersededId of memory.supersedes || []) {
    addRelation(relationIndex, {
      type: 'memory_replaces_memory',
      from: memory.id,
      to: supersededId,
      projectId: relationProjectId(memory),
      evidence: memory.summary,
      active: false
    });
    relationIndex.supersedes[memory.id] = [...new Set([...(relationIndex.supersedes[memory.id] || []), supersededId])];
  }
  for (const replacedId of memory.replaces || []) {
    addRelation(relationIndex, {
      type: 'memory_replaces_memory',
      from: memory.id,
      to: replacedId,
      projectId: relationProjectId(memory),
      evidence: memory.summary,
      active: false
    });
  }
  if (memory.conflictStatus === 'refinement') {
    for (const replacedId of memory.replaces || memory.related || []) {
      addRelation(relationIndex, {
        type: 'memory_refines_memory',
        from: memory.id,
        to: replacedId,
        projectId: relationProjectId(memory),
        evidence: memory.summary,
        active: false
      });
    }
  }
  if (memory.conflictStatus === 'exception') {
    for (const relatedId of memory.related || []) {
      addRelation(relationIndex, {
        type: 'memory_exception_to_memory',
        from: memory.id,
        to: relatedId,
        projectId: relationProjectId(memory),
        evidence: memory.activeCondition?.summary || memory.summary
      });
    }
  }
}

async function rebuildIndexes(root, options = {}) {
  const syncNamespaceFiles = options.syncNamespaceFiles !== false;
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const keywordIndex = defaultKeywordIndex();
  const relationIndex = defaultRelationIndex();
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  const projects = (registry.projects || []).filter(isRegistryProject);
  const activeMemoriesForIndex = memoryIndex.memories.filter((memory) => memory.status === 'active');

  for (const memory of activeMemoriesForIndex) {
    indexValue(keywordIndex.types, memory.type, memory.id);
    indexValue(keywordIndex.scopes, memory.scope, memory.id);
    indexValue(keywordIndex.topics, memory.topic, memory.id);
    for (const projectId of memoryObservedProjectIds(memory)) {
      indexValue(keywordIndex.projects, projectId, memory.id);
    }
    for (const tag of memory.tags || []) indexValue(keywordIndex.tags, tag, memory.id);
    for (const domain of memory.domains || []) indexValue(keywordIndex.domains, domain, memory.id);
    for (const keyword of memoryKeywords(memory)) indexValue(keywordIndex.keywords, keyword, memory.id);
    addMemoryNode(relationIndex, memory);
  }
  for (const memory of activeMemoriesForIndex) {
    addDerivedMemoryRelations(relationIndex, memory, activeMemoriesForIndex);
  }

  await saveJson(vibeboxPath(root, 'index/project-index.json'), defaultProjectIndex(projects, activeMemoriesForIndex));
  await saveJson(vibeboxPath(root, 'index/keyword-index.json'), keywordIndex);
  await saveJson(vibeboxPath(root, 'index/relation-index.json'), relationIndex);
  if (syncNamespaceFiles) {
    await syncMemoryNamespaceFiles(root, activeMemoriesForIndex, projects);
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
    memory.patternType,
    memory.situation,
    memory.trigger,
    memory.preferredBehavior,
    memory.preventionRule,
    memory.failedApproach,
    memory.successfulApproach,
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
    changes: 'change',
    verify: 'verification',
    verifying: 'verification',
    validating: 'validation',
    checks: 'check',
    tested: 'test'
  };
  return aliases[token] || token;
}

function pageTitle(pageName) {
  return pageName.replace(/\.md$/u, '');
}

function wikiLinkTargetFromFileName(fileName) {
  return pageTitle(fileName);
}

function wikiLink(label) {
  const clean = String(label || '')
    .replace(/[[\]]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return clean ? `[[${clean}]]` : '';
}

function wikiLinkForDocKey(docKey, locale = 'en-US', alias = '') {
  const target = wikiLinkTargetFromFileName(localizedDocFileName(docKey, locale));
  const cleanAlias = String(alias || '').replace(/[[\]]/gu, '').trim();
  return cleanAlias && cleanAlias !== target ? `[[${target}|${cleanAlias}]]` : `[[${target}]]`;
}

const VISIBLE_MEMORY_ID_PATTERN = /\bmem_[A-Za-z0-9_-]+\b/iu;

function stripVisibleMemoryIds(text) {
  return String(text || '')
    .replace(/\bmem_[A-Za-z0-9_-]+\b/giu, 'memory record')
    .replace(/\s+/gu, ' ')
    .trim();
}

function wd(locale, key) {
  return t(locale, key);
}

function localizeWikiDisplayText(text, locale = 'en-US') {
  const value = stripVisibleMemoryIds(text);
  if (!value) return '';
  return value.trim();
}

function memoryDisplayLanguageMatches(memory, locale = 'en-US') {
  if (!memory.displayLanguage) return false;
  try {
    return assertSupportedMemoryLanguageTag(memory.displayLanguage, 'memory displayLanguage') === assertSupportedMemoryLanguageTag(locale, 'wiki locale');
  } catch {
    return false;
  }
}

function memoryDisplayTitle(memory, locale = 'en-US') {
  if (memory.displayTitle && memoryDisplayLanguageMatches(memory, locale)) return stripVisibleMemoryIds(memory.displayTitle).trim();
  return wd(locale, 'displayTextMissing');
}

function memoryDisplaySummary(memory, locale = 'en-US') {
  if (memory.displaySummary && memoryDisplayLanguageMatches(memory, locale)) return localizeWikiDisplayText(memory.displaySummary, locale);
  return localizeWikiDisplayText(wd(locale, 'displayTextMissing') || BASE_DISPLAY_TEMPLATE.displayTextMissing, locale);
}

function memoryDisplayField(memory, field, locale = 'en-US', fallback = '') {
  if (field === 'rule' && memory.displayRule && memoryDisplayLanguageMatches(memory, locale)) return stripVisibleMemoryIds(memory.displayRule).trim();
  if (field === 'preventionRule' && memory.displayRule && memoryDisplayLanguageMatches(memory, locale)) return stripVisibleMemoryIds(memory.displayRule).trim();
  if (['rule', 'preventionRule', 'preferredBehavior', 'forbiddenAction', 'decision', 'recoveryApproach', 'successfulApproach'].includes(field)) {
    return localizeWikiDisplayText(wd(locale, 'displayTextMissing'), locale);
  }
  return localizeWikiDisplayText(memory[field] || fallback, locale);
}

function shouldWriteMemoryNote(memory) {
  if (!memory || memory.status !== 'active') return false;
  if (memory.type === 'task_context' || memory.type === 'discarded_detail') return false;
  if (['task', 'temporary'].includes(memory.scope)) return false;
  return [
    'user_success_criteria',
    'ai_failure_memory',
    'ai_successful_approach'
  ].includes(memory.memoryRole)
    || [
      'avoid_rule',
      'failure_memory',
      'success_pattern',
      'project_decision',
      'validation_pattern',
      'response_preference',
      'process_pattern',
      'agent_failure_pattern',
      'agent_success_pattern',
      'prevention_rule'
    ].includes(memory.type);
}

function normalizeCategoryDocKeys(values = []) {
  const allowed = new Set(CATEGORY_AXIS_DOC_KEYS);
  return uniqueNonEmpty(values)
    .map((value) => String(value || '').trim())
    .filter((value) => allowed.has(value));
}

function memoryCategoryDocKey(memory) {
  const [primary] = normalizeCategoryDocKeys([memory.primaryCategory]);
  if (primary) return primary;
  if (memory.type === 'prevention_rule') return 'prevention_rules';
  if (memory.type === 'avoid_rule') return 'global_avoid_rules';
  if (memory.memoryRole === 'ai_successful_approach') return 'agent_success_patterns';
  if (memory.memoryRole === 'ai_failure_memory') return 'agent_failure_patterns';
  if (memory.type === 'response_preference') return 'user_patterns';
  if (memory.type === 'process_pattern' || memory.type === 'handoff_pattern') return 'process_patterns';
  if (memory.type === 'validation_pattern') return 'validation_patterns';
  if (memory.type === 'design_philosophy') return 'design_philosophy';
  if (memory.type === 'design_preference') return 'design_philosophy';
  if (memory.type === 'workflow_rule') return 'workflow_rules';
  if (memory.type === 'failure_memory' || memory.type === 'agent_failure_pattern') return 'agent_failure_patterns';
  if (memory.type === 'success_pattern' || memory.type === 'agent_success_pattern') return 'agent_success_patterns';
  return memory.docKey || docKeyForType(memory.type);
}

function memoryCategoryDocKeys(memory) {
  return uniqueNonEmpty([
    memoryCategoryDocKey(memory),
    ...normalizeCategoryDocKeys(memory.relatedCategories || [])
  ]);
}

function memoryCategoryFolder(memory, locale = 'en-US') {
  return safeWikiPageName(pageTitle(localizedDocFileName(memoryCategoryDocKey(memory), locale)));
}

function memoryNoteTitle(memory, locale = 'en-US') {
  const display = stripVisibleMemoryIds(memory.displayTitle && memoryDisplayLanguageMatches(memory, locale)
    ? memory.displayTitle
    : memoryDisplayTitle(memory, locale))
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 56) || memoryDisplayTitle(memory, locale);
  return display.replace(/\.$/u, '');
}

function buildMemoryNotePathMap(memories, locale = 'en-US') {
  const noteMemories = memories.filter(shouldWriteMemoryNote);
  const counts = new Map();
  const paths = new Map();
  for (const memory of noteMemories) {
    const folder = memoryCategoryFolder(memory, locale);
    const baseTitle = safeWikiPageName(memoryNoteTitle(memory, locale));
    const countKey = `${folder}/${baseTitle}`;
    const nextCount = (counts.get(countKey) || 0) + 1;
    counts.set(countKey, nextCount);
    const title = nextCount === 1 ? baseTitle : `${baseTitle}-${nextCount}`;
    paths.set(memory.id, {
      categoryDocKey: memoryCategoryDocKey(memory),
      categoryFolder: folder,
      title,
      fileName: `${folder}/${title}.md`,
      target: `${folder}/${title}`
    });
  }
  return paths;
}

function memoryNoteInfo(memory, locale = 'en-US', notePathMap = null) {
  return notePathMap?.get(memory.id) || {
    categoryDocKey: memoryCategoryDocKey(memory),
    categoryFolder: memoryCategoryFolder(memory, locale),
    title: safeWikiPageName(memoryNoteTitle(memory, locale)),
    fileName: `${memoryCategoryFolder(memory, locale)}/${safeWikiPageName(memoryNoteTitle(memory, locale))}.md`,
    target: `${memoryCategoryFolder(memory, locale)}/${safeWikiPageName(memoryNoteTitle(memory, locale))}`
  };
}

function memoryNoteFileName(memory, locale = 'en-US', notePathMap = null) {
  return memoryNoteInfo(memory, locale, notePathMap).fileName;
}

function wikiLinkForMemory(memory, locale = 'en-US', alias = '', notePathMap = null) {
  const note = memoryNoteInfo(memory, locale, notePathMap);
  const target = wikiLinkTargetFromFileName(note.fileName);
  const cleanAlias = String(alias || note.title).replace(/[[\]]/gu, '').trim();
  return cleanAlias && cleanAlias !== target ? `[[${target}|${cleanAlias}]]` : `[[${target}]]`;
}

async function rebuildWiki(root) {
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = configuredMemoryLocale(config);
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active');
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  const projects = (registry.projects || []).filter(isRegistryProject);
  const notePathMap = buildMemoryNotePathMap(active, locale);

  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(locale));
  await writeManagedWikiDoc(root, 'home', renderHomeShell(locale), renderHomeManaged(active, locale, notePathMap), locale);
  await writeManagedWikiDoc(root, 'project_index', renderProjectIndexShell(locale), renderProjectIndexManaged(projects, locale), locale);
  for (const doc of WIKI_DOCS.filter((item) => !['home', 'project_index'].includes(item.docKey))) {
    const pageMemories = active.filter((memory) => (
      shouldWriteMemoryNote(memory)
      && memoryCategoryDocKeys(memory).includes(doc.docKey)
    ));
    await writeManagedWikiDoc(root, doc.docKey, renderMemoryShell(localizedDocFileName(doc.docKey, locale), locale), renderMemoryManaged(pageMemories, locale, notePathMap), locale);
  }
  for (const project of projects) {
    const projectMemories = active.filter((memory) => memory.projectId === project.projectId || memory.sourceProjectId === project.projectId);
    await writeManagedWikiPage(root, `projects/${project.projectId}.md`, renderProjectShell(project, locale), renderProjectManaged(project, projectMemories, locale, notePathMap));
  }
  await writeMemoryWikiNotes(root, active, projects, locale, notePathMap);
  await writeConceptWikiPages(root, active, locale, notePathMap);
}

function managedBlock(content) {
  return `${MANAGED_BEGIN}\n${content.trim()}\n${MANAGED_END}`;
}

async function writeManagedWikiDoc(root, docKey, shell, managedContent, locale = 'en-US') {
  await writeManagedWikiPage(root, localizedDocFileName(docKey, locale), shell, managedContent);
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
    if (isManagedOnlyWikiText(existing)) {
      await writeFile(filePath, `${shell.trim()}\n\n${block}\n`, 'utf8');
      return;
    }
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

function renderHomeShell(locale = 'en-US') {
  return `${wikiFrontmatter(t(locale, 'homeTitle'))}# ${t(locale, 'homeTitle')}

${wd(locale, 'homeDescription')}`;
}

function renderHomeManaged(memories, locale = 'en-US', notePathMap = null) {
  const counts = memories.reduce((acc, memory) => {
    acc[memory.type] = (acc[memory.type] || 0) + 1;
    return acc;
  }, {});
  return `## ${wd(locale, 'wiki')}

- ${wikiLinkForDocKey('user_preferences', locale)} (${counts.user_preference || 0})
- ${wikiLinkForDocKey('user_patterns', locale)} (${PATTERN_TYPES.size > 0 ? memories.filter((memory) => PATTERN_TYPES.has(memory.type)).length : 0})
- ${wikiLinkForDocKey('design_philosophy', locale)} (${counts.design_philosophy || 0})
- ${wikiLinkForDocKey('validation_patterns', locale)} (${counts.validation_pattern || 0})
- ${wikiLinkForDocKey('process_patterns', locale)} (${counts.process_pattern || 0})
- ${wikiLinkForDocKey('prevention_rules', locale)}
- ${wikiLinkForDocKey('global_avoid_rules', locale)} (${counts.avoid_rule || 0})
- ${wikiLinkForDocKey('failure_memory', locale)} (${counts.failure_memory || 0})
- ${wikiLinkForDocKey('success_patterns', locale)} (${counts.success_pattern || 0})
- ${wikiLinkForDocKey('tooling_preferences', locale)} (${counts.tooling_preference || 0})
- ${wikiLinkForDocKey('workflow_rules', locale)} (${counts.workflow_rule || 0})
- ${wikiLinkForDocKey('project_index', locale)}

## ${wd(locale, 'recentActiveMemory')}

${memories.slice(-10).map((memory) => `- ${wikiLinkForMemory(memory, locale, '', notePathMap)} ${memoryDisplaySummary(memory, locale)}`).join('\n') || `- ${t(locale, 'none')}`}

## ${wd(locale, 'storage')}

- ${wd(locale, 'storageJsonIndexes')}
- ${wd(locale, 'storageRawEvents')}
- ${wd(locale, 'storagePendingCandidates')}
`;
}

function renderProjectIndexShell(locale = 'en-US') {
  return `${wikiFrontmatter(t(locale, 'pageProjectIndex'))}# ${t(locale, 'pageProjectIndex')}

${wd(locale, 'backTo')} ${wikiLinkForDocKey('home', locale)}.`;
}

function renderProjectIndexManaged(projects, locale = 'en-US') {
  if (!projects.length) return t(locale, 'none');
  return [
    `## ${t(locale, 'pageProjectIndex')}`,
    '',
    ...projects.map((project) => `- [[projects/${project.projectId}|${project.projectName || project.projectId}]] (${project.projectId})`)
  ].join('\n');
}

function renderProjectShell(project, locale = 'en-US') {
  return `${wikiFrontmatter(project.projectName || project.projectId)}# ${project.projectName || project.projectId}

${wd(locale, 'backTo')} ${wikiLinkForDocKey('project_index', locale)}.`;
}

function renderProjectManaged(project, memories, locale = 'en-US', notePathMap = null) {
  const successCriteria = memories.filter((memory) => memory.memoryRole === 'user_success_criteria');
  const userPatterns = memories.filter((memory) => (
    memory.memoryRole === 'user_success_criteria'
    && memoryCategoryDocKeys(memory).some((docKey) => ['user_preferences', 'user_patterns', 'design_philosophy', 'decision_patterns', 'process_patterns'].includes(docKey))
  ));
  const failures = memories.filter((memory) => memory.memoryRole === 'ai_failure_memory');
  const approaches = memories.filter((memory) => memory.memoryRole === 'ai_successful_approach');
  const validationPreservation = memories.filter((memory) => (
    memoryCategoryDocKeys(memory).some((docKey) => ['validation_patterns', 'prevention_rules'].includes(docKey))
    || /validation|preservation|localization|scope_control/iu.test(memory.modelSubClass || '')
  ));
  const groupedIds = new Set([...successCriteria, ...userPatterns, ...failures, ...approaches, ...validationPreservation].map((memory) => memory.id));
  const projectSpecific = memories.filter((memory) => (
    (memory.scope === 'project' || ['project_decision', 'architecture_rule'].includes(memory.type))
    && !groupedIds.has(memory.id)
  ));
  for (const memory of projectSpecific) groupedIds.add(memory.id);
  const byRole = {
    successCriteria,
    userPatterns,
    failures,
    approaches,
    validationPreservation,
    projectSpecific,
    related: memories.filter((memory) => shouldWriteMemoryNote(memory) && !groupedIds.has(memory.id))
  };
  const renderProjectMemoryList = (items) => (
    items.length > 0
      ? items.map((memory) => `- ${wikiLinkForMemory(memory, locale, '', notePathMap)} ${memoryDisplaySummary(memory, locale)}`)
      : [`- ${t(locale, 'none')}`]
  );
  const lines = [
    `## ${wd(locale, 'projectSection')}`,
    '',
    `- ${wd(locale, 'projectId')}: \`${project.projectId}\``,
    `- ${wd(locale, 'repository')}: ${project.repositoryName || t(locale, 'notSpecified')}`,
    `- ${wd(locale, 'primaryDomain')}: \`${project.primaryDomain || 'general'}\``,
    `- ${wd(locale, 'lastSeen')}: ${project.lastSeenAt || 'unknown'}`,
    '',
    `## ${wd(locale, 'observedUserSuccessCriteria')}`,
    '',
    ...renderProjectMemoryList(byRole.successCriteria),
    '',
    `## ${wd(locale, 'observedUserPatterns')}`,
    '',
    ...renderProjectMemoryList(byRole.userPatterns),
    '',
    `## ${wd(locale, 'observedAiFailures')}`,
    '',
    ...renderProjectMemoryList(byRole.failures),
    '',
    `## ${wd(locale, 'observedAiSuccessfulApproaches')}`,
    '',
    ...renderProjectMemoryList(byRole.approaches),
    '',
    `## ${wd(locale, 'observedValidationPreservation')}`,
    '',
    ...renderProjectMemoryList(byRole.validationPreservation),
    '',
    `## ${wd(locale, 'projectSpecificMemory')}`,
    '',
    ...renderProjectMemoryList(byRole.projectSpecific),
    '',
    `## ${wd(locale, 'relatedProjectMemory')}`,
    '',
    ...renderProjectMemoryList(byRole.related)
  ];
  return lines.join('\n');
}

function renderMemoryShell(pageName, locale = 'en-US') {
  const title = localizedPageTitle(pageName, locale);
  return `${wikiFrontmatter(title)}# ${title}

${wd(locale, 'backTo')} ${wikiLinkForDocKey('home', locale)}.`;
}

function renderMemoryManaged(memories, locale = 'en-US', notePathMap = null) {
  return memories.length === 0 ? t(locale, 'none') : memories.map((memory) => renderMemoryMarkdown(memory, locale, notePathMap)).join('\n\n');
}

function renderMemoryMarkdown(memory, locale = 'en-US', notePathMap = null) {
  const concepts = conceptsForMemory(memory);
  const links = concepts.map((concept) => conceptWikiLink(concept, locale)).filter(Boolean).join(' ');
  const note = memoryNoteInfo(memory, locale, notePathMap);
  const displaySummary = memoryDisplaySummary(memory, locale);
  const topicConcept = conceptNameForTerm(memory.topic);

  const lines = [
    `## ${wikiLinkForMemory(memory, locale, note.title, notePathMap)}`,
    '',
    `- ${t(locale, 'modelClass')}: \`${memory.modelClass || t(locale, 'notSpecified')}\``,
    `- ${t(locale, 'modelSubClass')}: \`${memory.modelSubClass || t(locale, 'notSpecified')}\``,
    `- ${t(locale, 'scopeLabel')}: \`${memory.scope}\``,
    `- ${t(locale, 'confidenceLabel')}: \`${memory.confidence}\``,
    `- ${t(locale, 'topicLabel')}: ${topicConcept ? conceptWikiLink(topicConcept, locale) : memory.topic}`,
    `- ${t(locale, 'summaryLabel')}: ${displaySummary}`,
    `- ${t(locale, 'appliesToLabel')}: ${(memory.appliesTo || []).join(', ') || t(locale, 'notSpecified')}`
  ];

  if (memory.type === 'failure_memory' || memory.type === 'agent_failure_pattern') {
    lines.push(`- ${t(locale, 'failureTypeLabel')}: \`${memory.failureType || 'unclear_requirement'}\``);
    lines.push(`- ${t(locale, 'preventionRuleLabel')}: ${memoryDisplayField(memory, 'preventionRule', locale, 'Review before repeating.')}`);
  }
  if (memory.type === 'success_pattern' || memory.type === 'agent_success_pattern') {
    lines.push(`- ${t(locale, 'reuseWhenLabel')}: ${localizeWikiDisplayText((memory.reuseWhen || memory.appliesTo || []).join(', ') || 'Similar work appears.', locale)}`);
  }
  if (memory.patternType) {
    lines.push(`- ${t(locale, 'patternTypeLabel')}: \`${memory.patternType}\``);
    lines.push(`- ${t(locale, 'situationLabel')}: \`${memory.situation || 'general'}\``);
    if (memory.preferredBehavior) lines.push(`- ${t(locale, 'preferredBehaviorLabel')}: ${memoryDisplayField(memory, 'preferredBehavior', locale)}`);
  }
  if (memory.type === 'avoid_rule') {
    lines.push(`- ${t(locale, 'forbiddenActionLabel')}: ${memoryDisplayField(memory, 'forbiddenAction', locale, memory.rule)}`);
    lines.push(`- ${t(locale, 'severityLabel')}: \`${memory.severity || 'medium'}\``);
  }
  if (memory.type === 'project_decision') {
    lines.push(`- ${t(locale, 'decisionLabel')}: ${memoryDisplayField(memory, 'decision', locale, memory.rule)}`);
    if ((memory.alternativesRejected || []).length > 0) {
      lines.push(`- ${t(locale, 'alternativesRejectedLabel')}: ${memory.alternativesRejected.join(', ')}`);
    }
  }
  if (links) {
    lines.push('', `## ${wd(locale, 'relatedMemory')}`, '', links);
  }
  return lines.join('\n');
}

async function writeMemoryWikiNotes(root, memories, projects = [], locale = 'en-US', notePathMap = null) {
  const activeMemoryNotes = new Set();
  const projectById = new Map(projects.map((project) => [project.projectId, project]));
  const noteMemories = memories.filter(shouldWriteMemoryNote);
  for (const memory of noteMemories) {
    const note = memoryNoteInfo(memory, locale, notePathMap);
    const pageName = note.fileName;
    activeMemoryNotes.add(pageName);
    const shell = `${memoryNoteFrontmatter(memory, note, locale)}# ${note.title}

${wd(locale, 'backTo')} ${wikiLinkForDocKey(note.categoryDocKey, locale)}.`;
    await writeManagedWikiPage(root, pageName, shell, renderMemoryNoteManaged(memory, memories, projectById, locale, notePathMap));
  }

  await cleanupStaleMemoryNotes(root, activeMemoryNotes);
}

function yamlScalar(value) {
  if (value === null || value === undefined) return '';
  return JSON.stringify(String(value));
}

function memoryNoteFrontmatter(memory, note, locale = 'en-US') {
  const domain = (memory.domains || [])[0] || '';
  return [
    '---',
    `title: ${yamlScalar(note.title)}`,
    `id: ${yamlScalar(memory.id)}`,
    `memoryRole: ${yamlScalar(memory.memoryRole || '')}`,
    `type: ${yamlScalar(memory.type || '')}`,
    `modelClass: ${yamlScalar(memory.modelClass || '')}`,
    `modelSubClass: ${yamlScalar(memory.modelSubClass || '')}`,
    `scope: ${yamlScalar(memory.scope || '')}`,
    `sourceProjectId: ${yamlScalar(memory.sourceProjectId || '')}`,
    `projectId: ${yamlScalar(memory.projectId || '')}`,
    `domain: ${yamlScalar(domain)}`,
    `category: ${yamlScalar(localizedDocTitle(note.categoryDocKey, locale))}`,
    `primaryCategory: ${yamlScalar(localizedDocTitle(memoryCategoryDocKey(memory), locale))}`,
    `relatedCategories: ${JSON.stringify(memoryCategoryDocKeys(memory).map((docKey) => localizedDocTitle(docKey, locale)))}`,
    'vibebox: true',
    'obsidianCompatible: true',
    'memoryNote: true',
    '---',
    ''
  ].join('\n');
}

async function cleanupStaleMemoryNotes(root, activeMemoryNotes) {
  const wikiRoot = vibeboxPath(root, 'wiki');
  for (const wikiFile of await listMarkdownFiles(wikiRoot)) {
    const relative = path.relative(wikiRoot, wikiFile).replace(/\\/gu, '/');
    const text = await readFile(wikiFile, 'utf8');
    const isMemoryNote = /^---[\s\S]*?\nmemoryNote:\s*true[\s\S]*?---/u.test(text)
      || (relative.startsWith('memories/') && text.includes('vibebox: true') && text.includes(MANAGED_BEGIN));
    if (!isMemoryNote || activeMemoryNotes.has(relative)) continue;
    if (isManagedOnlyWikiText(text)) {
      await rm(wikiFile, { force: true });
    }
  }
  const oldMemoryDir = path.join(wikiRoot, 'memories');
  try {
    const entries = await readdir(oldMemoryDir);
    if (entries.length === 0) {
      await rm(oldMemoryDir, { recursive: true, force: true });
    }
  } catch {
    // No legacy memories directory remains.
  }
}

function sourceProjectForMemory(memory, projectById) {
  const sourceId = memory.sourceProjectId || memory.projectId || '';
  return sourceId ? projectById.get(sourceId) : null;
}

function renderMemoryNoteManaged(memory, allMemories, projectById, locale = 'en-US', notePathMap = null) {
  const sourceProject = sourceProjectForMemory(memory, projectById);
  const categoryDocKey = memoryNoteInfo(memory, locale, notePathMap).categoryDocKey;
  const categoryLinks = memoryCategoryDocKeys(memory)
    .map((docKey) => wikiLinkForDocKey(docKey, locale))
    .filter(Boolean);
  const relatedSuccesses = allMemories.filter((item) => (
    item.id !== memory.id
    && item.status === 'active'
    && item.memoryRole === 'ai_successful_approach'
    && (memory.memoryRole === 'ai_failure_memory' || memory.type === 'avoid_rule' || memory.type === 'failure_memory' || memory.type === 'agent_failure_pattern')
    && (item.projectId === memory.projectId || !item.projectId || !memory.projectId)
  )).slice(0, 5);
  const relatedFailures = allMemories.filter((item) => (
    item.id !== memory.id
    && item.status === 'active'
    && item.memoryRole === 'ai_failure_memory'
    && memory.memoryRole === 'ai_successful_approach'
    && (item.projectId === memory.projectId || !item.projectId || !memory.projectId)
  )).slice(0, 5);

  const lines = [
    `## ${wd(locale, 'summarySection')}`,
    '',
    memoryDisplaySummary(memory, locale),
    '',
    `## ${wd(locale, 'scopeSection')}`,
    '',
    `- ${t(locale, 'scopeLabel')}: \`${memory.scope}\``,
    `- ${t(locale, 'situationLabel')}: \`${memory.situation || 'general'}\``,
    `- ${t(locale, 'appliesToLabel')}: ${(memory.appliesTo || []).join(', ') || t(locale, 'notSpecified')}`,
    '',
    `## ${wd(locale, 'sourceSection')}`,
    '',
    sourceProject ? `- [[projects/${sourceProject.projectId}|${sourceProject.projectName || sourceProject.projectId}]]` : `- ${t(locale, 'none')}`,
    '',
    `## ${wd(locale, 'relatedCategories')}`,
    '',
    ...(categoryLinks.length > 0 ? categoryLinks.map((link) => `- ${link}`) : [`- ${wikiLinkForDocKey(categoryDocKey, locale)}`])
  ];

  if (memory.preventionRule) {
    lines.push(`- ${wikiLinkForDocKey('prevention_rules', locale)} ${memoryDisplayField(memory, 'preventionRule', locale)}`);
  }
  if (memory.recoveryApproach) {
    lines.push(`- ${wikiLinkForDocKey('agent_success_patterns', locale)} ${memoryDisplayField(memory, 'recoveryApproach', locale)}`);
  } else if (memory.successfulApproach) {
    lines.push(`- ${wikiLinkForDocKey('agent_success_patterns', locale)} ${memoryDisplayField(memory, 'successfulApproach', locale)}`);
  }

  lines.push('', `## ${wd(locale, 'relatedMemory')}`);
  if (relatedSuccesses.length > 0) {
    lines.push('', `### ${wd(locale, 'relatedSuccessfulApproaches')}`, '', ...relatedSuccesses.map((item) => `- ${wikiLinkForMemory(item, locale, '', notePathMap)} ${memoryDisplaySummary(item, locale)}`));
  }
  if (relatedFailures.length > 0) {
    lines.push('', `### ${wd(locale, 'relatedFailureAvoidance')}`, '', ...relatedFailures.map((item) => `- ${wikiLinkForMemory(item, locale, '', notePathMap)} ${memoryDisplaySummary(item, locale)}`));
  }
  if (relatedSuccesses.length === 0 && relatedFailures.length === 0) {
    lines.push('', `- ${t(locale, 'none')}`);
  }
  return lines.join('\n');
}

async function writeConceptWikiPages(root, memories, locale = 'en-US', notePathMap = null) {
  const concepts = new Map();
  const reservedTitles = new Set([
    ...WIKI_PAGES.map(pageTitle),
    ...WIKI_DOCS.map((doc) => localizedDocTitle(doc.docKey, locale))
  ]);
  for (const memory of memories) {
    for (const concept of conceptsForMemory(memory)) {
      if (reservedTitles.has(concept)) continue;
      if (!concepts.has(concept)) concepts.set(concept, []);
      concepts.get(concept).push(memory);
    }
  }

  const activeConceptPages = new Set();
  for (const [concept, relatedMemories] of concepts) {
    if (!shouldWriteConceptWikiPage(concept, locale)) continue;
    const pageName = `${safeWikiPageName(concept)}.md`;
    activeConceptPages.add(pageName);
    const shell = `${wikiFrontmatter(concept)}# ${concept}

${wd(locale, 'backTo')} ${wikiLinkForDocKey('home', locale)}.`;
    const managed = [
      `## ${wd(locale, 'relatedMemory')}`,
      '',
      ...relatedMemories.map((memory) => `- ${wikiLinkForMemory(memory, locale, '', notePathMap)} ${memoryDisplaySummary(memory, locale)}`)
    ].join('\n');
    await writeManagedWikiPage(root, pageName, shell, managed);
  }

  const wikiRoot = vibeboxPath(root, 'wiki');
  const managedDocFiles = new Set(currentWikiPages(locale));
  for (const wikiFile of await listMarkdownFiles(wikiRoot)) {
    const relative = path.relative(wikiRoot, wikiFile);
    if (relative.includes(path.sep) || relative.includes(path.posix.sep)) continue;
    if (WIKI_PAGES.includes(relative) || managedDocFiles.has(relative) || activeConceptPages.has(relative)) continue;
    const text = await readFile(wikiFile, 'utf8');
    if (!text.includes('vibebox: true') || !text.includes(MANAGED_BEGIN)) continue;
    if (isManagedOnlyWikiText(text)) {
      await rm(wikiFile, { force: true });
      continue;
    }
    const concept = pageTitle(relative);
    const shell = `${wikiFrontmatter(concept)}# ${concept}

${wd(locale, 'backTo')} ${wikiLinkForDocKey('home', locale)}.`;
    await writeManagedWikiPage(root, relative, shell, [`## ${wd(locale, 'relatedMemory')}`, '', `- ${t(locale, 'none')}`].join('\n'));
  }
}

function shouldWriteConceptWikiPage(concept, locale = 'en-US') {
  if (conceptDocKey(concept, locale)) return true;
  return normalizeConfigLanguageTag(locale, BASE_MEMORY_LANGUAGE) === BASE_MEMORY_LANGUAGE;
}

function conceptWikiLink(concept, locale = 'en-US') {
  const docKey = conceptDocKey(concept, locale);
  if (docKey) return wikiLinkForDocKey(docKey, locale);
  const conceptTitle = conceptNameForTerm(concept) || safeWikiPageName(concept);
  return shouldWriteConceptWikiPage(conceptTitle, locale) ? wikiLink(safeWikiPageName(conceptTitle)) : '';
}

function conceptDocKey(concept, locale = BASE_MEMORY_LANGUAGE) {
  const normalized = normalizeText(concept);
  for (const doc of WIKI_DOCS) {
    const matches = [
      pageTitle(doc.canonicalFileName),
      localizedDocTitle(doc.docKey, locale)
    ].map(normalizeText);
    if (matches.includes(normalized)) return doc.docKey;
  }
  return null;
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
  if (memory.type === 'failure_memory') {
    concepts.add('Failure Memory');
    concepts.add('Prevention Rules');
    concepts.add('Success Patterns');
  }
  if (memory.type === 'success_pattern') concepts.add('Success Patterns');
  if (memory.type === 'validation_pattern') {
    concepts.add('User Patterns');
    concepts.add('Validation Patterns');
  }
  if (memory.type === 'process_pattern') {
    concepts.add('User Patterns');
    concepts.add('Process Patterns');
  }
  if (memory.type === 'design_philosophy') {
    concepts.add('User Patterns');
    concepts.add('Design Philosophy');
  }
  if (memory.type === 'agent_failure_pattern') {
    concepts.add('Agent Failure Patterns');
    concepts.add('Prevention Rules');
  }
  if (memory.type === 'agent_success_pattern') concepts.add('Agent Success Patterns');
  if (memory.type === 'workflow_rule') concepts.add('Agent Workflow');
  const terms = [
    memory.topic,
    ...(memory.domains || []),
    ...(memory.tags || [])
  ];
  for (const term of terms) {
    const concept = conceptNameForTerm(term);
      if (concept) concepts.add(concept);
  }
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
  const normalizedTopic = normalizeText(memory.topic);
  if (normalizedTopic && normalizeText(task).includes(normalizedTopic)) {
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
  if (memoryBelongsToCurrentProject(memory, config.projectIds || config.projectId)) score += 25;
  if (memory.scope === 'project') score += 16;
  if (memory.scope === 'global') score -= 6;
  if (['avoid_rule', 'failure_memory', 'agent_failure_pattern'].includes(memory.type) && matchScore > 0) score += 35;
  if (config.situation && situationPreferredTypes(config.situation).includes(memory.type)) {
    score += 22;
    if (PATTERN_TYPES.has(memory.type)) matchScore += 8;
  }
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

function detectSituation(task) {
  if (textHasAny(task, ['debug', 'fix', 'failed', 'failure', 'regression', 'error', 'bug'])) return 'debugging';
  if (textHasAny(task, ['verify', 'test', 'check', 'doctor', '검증'])) return 'verification';
  if (textHasAny(task, ['architecture', 'design', 'plan', '설계'])) return 'architecture';
  if (textHasAny(task, ['doc', 'readme', 'documentation', '문서'])) return 'documentation';
  if (textHasAny(task, ['package', 'install', 'adapter', 'npm link'])) return 'packaging';
  if (textHasAny(task, ['refactor', 'cleanup'])) return 'refactoring';
  if (textHasAny(task, ['handoff', 'report', 'summary'])) return 'handoff';
  return 'implementation';
}

function situationPreferredTypes(situation) {
  const bySituation = {
    implementation: ['process_pattern', 'validation_pattern', 'avoid_rule', 'failure_memory', 'success_pattern', 'agent_failure_pattern'],
    debugging: ['failure_memory', 'agent_failure_pattern', 'avoid_rule', 'validation_pattern', 'success_pattern', 'agent_success_pattern'],
    architecture: ['design_philosophy', 'architecture_rule', 'project_decision', 'process_pattern', 'avoid_rule'],
    documentation: ['response_preference', 'communication_pattern', 'handoff_pattern', 'process_pattern'],
    verification: ['validation_pattern', 'agent_failure_pattern', 'failure_memory', 'avoid_rule', 'success_pattern'],
    packaging: ['tooling_preference', 'technology_preference', 'avoid_rule', 'failure_memory', 'validation_pattern'],
    refactoring: ['design_philosophy', 'architecture_rule', 'process_pattern', 'validation_pattern'],
    handoff: ['handoff_pattern', 'response_preference', 'communication_pattern', 'process_pattern']
  };
  return bySituation[situation] || bySituation.implementation;
}

function addIndexedIds(target, indexSection = {}, values = []) {
  for (const value of values || []) {
    const key = normalizeText(value);
    if (!key) continue;
    for (const id of indexSection[key] || []) {
      target.add(id);
    }
  }
}

function hasUsableKeywordIndex(keywordIndex = {}) {
  return ['keywords', 'tags', 'topics', 'domains', 'types', 'scopes', 'projects']
    .some((section) => Object.keys(keywordIndex[section] || {}).length > 0);
}

function retrievalCandidateIdsFromKeywordIndex(keywordIndex = {}, task = '', project = {}, situation = 'implementation') {
  const ids = new Set();
  const taskDomains = extractDomains(task);
  const taskTags = extractTags(task);
  const taskKeywords = memoryKeywords({ summary: task, tags: taskTags, domains: taskDomains, appliesTo: [] });

  addIndexedIds(ids, keywordIndex.projects, [...projectIdentityKeys(project)]);
  addIndexedIds(ids, keywordIndex.scopes, ['global', 'domain']);
  addIndexedIds(ids, keywordIndex.keywords, taskKeywords);
  addIndexedIds(ids, keywordIndex.tags, taskTags);
  addIndexedIds(ids, keywordIndex.domains, taskDomains);
  addIndexedIds(ids, keywordIndex.types, situationPreferredTypes(situation));

  return ids;
}

function expandCandidateIdsWithRelations(ids, relationIndex = {}) {
  if (ids.size === 0) return ids;
  const expanded = new Set(ids);
  for (const relation of relationIndex.relations || []) {
    if (!relation || relation.active === false) continue;
    if (ids.has(relation.from) && relation.to) expanded.add(relation.to);
    if (ids.has(relation.to) && relation.from) expanded.add(relation.from);
  }
  return expanded;
}

function indexedVisibleMemories(memoryIndex = {}, keywordIndex = {}, relationIndex = {}, task = '', project = {}, config = {}) {
  const active = (memoryIndex.memories || []).filter((memory) => memory.status === 'active');
  if (!hasUsableKeywordIndex(keywordIndex)) {
    return active.filter((memory) => isMemoryVisibleForProject(memory, project));
  }

  const situation = config.situation || detectSituation(task);
  const candidateIds = expandCandidateIdsWithRelations(
    retrievalCandidateIdsFromKeywordIndex(keywordIndex, task, project, situation),
    relationIndex
  );
  if (candidateIds.size === 0) {
    return active.filter((memory) => isMemoryVisibleForProject(memory, project));
  }

  return active.filter((memory) => candidateIds.has(memory.id) && isMemoryVisibleForProject(memory, project));
}

function selectRelevantMemories(memories, task, config) {
  const maxItems = config.maxContextItems || 8;
  const situation = config.situation || detectSituation(task);
  const taskDomains = extractDomains(task);
  const taskTags = extractTags(task);
  const scored = memories
    .filter((memory) => memory.status === 'active')
    .filter((memory) => matchesActiveCondition(memory, task))
    .filter((memory) => memoryMatchesTaskDomain(memory, { taskDomains, taskTags, task }, config.projectIds || config.projectId))
    .map((memory) => ({ memory, ...scoreMemoryDetailed(memory, task, { ...config, situation }) }))
    .filter((item) => item.matchScore > 0)
    .sort((left, right) => right.score - left.score);
  const currentProject = scored.filter((item) => memoryBelongsToCurrentProject(item.memory, config.projectIds || config.projectId));
  const broader = scored.filter((item) => !memoryBelongsToCurrentProject(item.memory, config.projectIds || config.projectId));
  const preferredBroader = broader.filter((item) => situationPreferredTypes(situation).includes(item.memory.type));
  const combined = [...currentProject, ...preferredBroader, ...broader];
  const seen = new Set();
  const selected = combined
    .filter((item) => {
      if (seen.has(item.memory.id)) return false;
      seen.add(item.memory.id);
      return true;
    })
    .slice(0, maxItems)
    .map((item) => ({ ...item.memory, retrievalScore: item.score, retrievalMatchScore: item.matchScore, lastUsedAt: nowIso() }));
  return includeSuccessFailurePairs(selected, scored.map((item) => item.memory), maxItems);
}

function memoryMatchesTaskDomain(memory, taskContext = {}, projectId = null) {
  if (memoryBelongsToCurrentProject(memory, projectId)) return true;
  const taskDomains = taskContext.taskDomains || [];
  const taskTags = taskContext.taskTags || [];
  const task = taskContext.task || '';
  if (taskDomains.length === 0) return true;
  const memoryDomains = memory.domains || [];
  if (memoryDomains.length === 0) return true;
  const domainScoped = memory.scope === 'domain' || memory.modelClass === 'domain_model';
  if (!domainScoped) return true;
  if (setOverlap(memory.tags || [], taskTags) > 0) return true;
  if (memory.topic && normalizeText(task).includes(normalizeText(memory.topic))) return true;
  return setOverlap(memoryDomains, taskDomains) > 0;
}

function memoryBelongsToCurrentProject(memory, projectIdentity) {
  const currentProjectIds = projectIdentity instanceof Set
    ? projectIdentity
    : new Set((Array.isArray(projectIdentity) ? projectIdentity : [projectIdentity]).filter(Boolean).map((value) => String(value)));
  if (currentProjectIds.size === 0) return false;
  if (memory.projectId) return currentProjectIds.has(String(memory.projectId));
  return memoryProjectIdentityKeys(memory).some((id) => currentProjectIds.has(id));
}

function includeSuccessFailurePairs(selected, candidates, maxItems) {
  const selectedIds = new Set(selected.map((memory) => memory.id));
  const additions = [];
  for (const memory of selected) {
    const wantsSuccess = ['failure_memory', 'agent_failure_pattern', 'avoid_rule'].includes(memory.type);
    const wantsFailure = ['success_pattern', 'agent_success_pattern'].includes(memory.type);
    if (!wantsSuccess && !wantsFailure) continue;
    const counterpart = candidates.find((candidate) => (
      !selectedIds.has(candidate.id)
      && (
        wantsSuccess
          ? ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
          : ['failure_memory', 'agent_failure_pattern', 'avoid_rule'].includes(candidate.type)
      )
      && (
        hasTargetOverlap(memory, candidate)
        || setOverlap(memory.tags || [], candidate.tags || []) >= 1
        || setOverlap(memory.domains || [], candidate.domains || []) >= 1
      )
    ));
    if (counterpart) {
      selectedIds.add(counterpart.id);
      additions.push({ ...counterpart, lastUsedAt: nowIso() });
    }
  }
  if (additions.length === 0) return selected;
  const pairAware = [...selected];
  for (const addition of additions) {
    if (pairAware.length < maxItems) {
      pairAware.push(addition);
      continue;
    }
    const replaceIndex = pairAware.findLastIndex((memory) => (
      !['failure_memory', 'agent_failure_pattern', 'avoid_rule', 'success_pattern', 'agent_success_pattern'].includes(memory.type)
    ));
    if (replaceIndex >= 0) {
      pairAware[replaceIndex] = addition;
    }
  }
  return pairAware;
}

export async function generateContextPack(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
  const project = await resolveProjectIdentityForRead(root);
  const task = input.task || input.text || '';
  const situation = detectSituation(task);
  const retrievalConfig = { ...config, projectId: project.projectId, projectIds: [...projectIdentityKeys(project)], situation };
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const keywordIndex = await loadJson(vibeboxPath(root, 'index/keyword-index.json'), defaultKeywordIndex());
  const relationIndex = await loadJson(vibeboxPath(root, 'index/relation-index.json'), defaultRelationIndex());
  const active = indexedVisibleMemories(index, keywordIndex, relationIndex, task, project, retrievalConfig);
  const scored = selectRelevantMemories(active, task, retrievalConfig);

  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const conflicts = pendingIndex.candidates
    .filter((candidate) => candidate.status === 'pending' && !['no_conflict', 'duplicate'].includes(candidate.conflictStatus))
    .filter((candidate) => isMemoryVisibleForProject(candidate, project))
    .filter((candidate) => scoreMemoryDetailed(candidate, task, retrievalConfig).matchScore > 0)
    .slice(0, 4);
  const activeConflicts = findActiveMemoryConflicts(scored);
  const userSuccessCriteria = scored.filter((memory) => memory.memoryRole === 'user_success_criteria');
  const aiFailureAvoidance = scored.filter((memory) => memory.memoryRole === 'ai_failure_memory' || ['failure_memory', 'agent_failure_pattern'].includes(memory.type));
  const aiSuccessfulApproaches = scored.filter((memory) => memory.memoryRole === 'ai_successful_approach' || ['success_pattern', 'agent_success_pattern'].includes(memory.type));

  const sections = [
    t(locale, 'contextTitle'),
    '',
    `${t(locale, 'task')}:`,
    redactSensitive(task),
    '',
    renderContextSection(t(locale, 'userSuccessCriteria'), userSuccessCriteria, { locale, allMemories: scored }),
    renderContextSection(t(locale, 'aiFailureAvoidance'), aiFailureAvoidance, { locale, allMemories: scored }),
    renderContextSection(t(locale, 'aiSuccessfulApproaches'), aiSuccessfulApproaches, { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantUserPreferences'), scored.filter((memory) => ['user_preference', 'tooling_preference', 'technology_preference', 'coding_style', 'design_preference', 'workflow_rule'].includes(memory.type)), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantUserPatterns'), scored.filter((memory) => ['question_pattern', 'response_preference', 'communication_pattern', 'correction_pattern', 'decision_pattern', 'handoff_pattern'].includes(memory.type)), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantValidationPatterns'), scored.filter((memory) => memory.type === 'validation_pattern'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantProcessPatterns'), scored.filter((memory) => memory.type === 'process_pattern'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantDesignPhilosophy'), scored.filter((memory) => memory.type === 'design_philosophy'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantProjectDecisions'), scored.filter((memory) => memory.type === 'project_decision'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantArchitectureRules'), scored.filter((memory) => memory.type === 'architecture_rule'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantAvoidRules'), scored.filter((memory) => memory.type === 'avoid_rule'), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantFailureMemory'), scored.filter((memory) => ['failure_memory', 'agent_failure_pattern'].includes(memory.type)), { locale, allMemories: scored }),
    renderContextSection(t(locale, 'relevantSuccessPatterns'), scored.filter((memory) => ['success_pattern', 'agent_success_pattern'].includes(memory.type)), { locale, allMemories: scored }),
    renderConflictSection([...conflicts, ...activeConflicts], locale),
    `${t(locale, 'guidanceForAgent')}:`,
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

function formatMemoryLine(memory, options = {}) {
  const locale = options.locale || 'en-US';
  const details = [];
  if (['failure_memory', 'agent_failure_pattern'].includes(memory.type) && memory.preventionRule) {
    details.push(`${t(locale, 'prevention')}: ${memoryDisplayField(memory, 'preventionRule', locale)}`);
    if (memory.affectedContext) {
      details.push(`Context: ${localizeWikiDisplayText(memory.affectedContext, locale)}`);
    }
    const alternative = (options.allMemories || []).find((candidate) => (
      ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
      && (
        hasTargetOverlap(memory, candidate)
        || setOverlap(memory.tags || [], candidate.tags || []) >= 1
      )
    ));
    if (alternative) {
      details.push(`${t(locale, 'alternative')}: ${memoryDisplaySummary(alternative, locale)}`);
    }
  }
  if (memory.type === 'success_pattern' && (memory.reuseWhen || []).length > 0) {
    details.push(`Reuse when: ${memoryDisplayField(memory, 'rule', locale)}`);
  }
  if (memory.type === 'agent_success_pattern' && memory.recoveryApproach) {
    details.push(`Recovery: ${memoryDisplayField(memory, 'recoveryApproach', locale)}`);
  }
  if (memory.patternType && memory.preferredBehavior && memory.preferredBehavior !== memory.summary) {
    details.push(`${t(locale, 'guidanceForAgent')}: ${memoryDisplayField(memory, 'preferredBehavior', locale)}`);
  }
  const detailText = details.length > 0 ? ` ${details.join(' ')}` : '';
  return `- ${memory.confidence === 'low' ? '[low confidence] ' : ''}${memoryDisplaySummary(memory, locale)}${detailText} [${memory.id}; ${memory.scope}; ${memory.confidence}]`;
}

function renderContextSection(title, memories, options = {}) {
  const locale = options.locale || 'en-US';
  return [
    `${title}:`,
    ...(memories.length > 0 ? memories.map((memory) => formatMemoryLine(memory, options)) : [`- ${t(locale, 'none')}`]),
    ''
  ].join('\n');
}

function renderConflictSection(conflicts, locale = 'en-US') {
  return [
    `${t(locale, 'potentialConflicts')}:`,
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${memoryDisplaySummary(candidate, locale)} [${candidate.id}; ${candidate.conflictStatus || 'active_conflict'}; ${candidate.confidence || 'medium'}]`) : [`- ${t(locale, 'none')}`]),
    ''
  ].join('\n');
}

function findActiveMemoryConflicts(memories) {
  return memories
    .flatMap((memory) => (memory.relationCandidates || [])
      .filter((relation) => relation && relation.type === 'conflicts_with' && relation.targetId)
      .map((relation) => ({
        id: `${memory.id}_vs_${relation.targetId}`,
        summary: relation.summary || relation.reason || 'Agent-provided memory conflict relation.',
        displayTitle: relation.displayTitle || '',
        displaySummary: relation.displaySummary || relation.summary || relation.reason || '',
        displayRule: relation.displayRule || '',
        displayLanguage: relation.displayLanguage || memory.displayLanguage || '',
        conflictStatus: 'agent_conflict_relation',
        confidence: memory.confidence,
        related: [memory.id, relation.targetId],
        projectMemoryId: memory.id,
        broaderMemoryId: relation.targetId
      })));
}

export async function generatePreTaskBrief(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
  const project = await resolveProjectIdentityForRead(root);
  const task = input.task || input.text || '';
  const situation = detectSituation(task);
  const retrievalConfig = { ...config, projectId: project.projectId, projectIds: [...projectIdentityKeys(project)], situation };
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const keywordIndex = await loadJson(vibeboxPath(root, 'index/keyword-index.json'), defaultKeywordIndex());
  const relationIndex = await loadJson(vibeboxPath(root, 'index/relation-index.json'), defaultRelationIndex());
  const relevant = selectRelevantMemories(indexedVisibleMemories(index, keywordIndex, relationIndex, task, project, retrievalConfig), task, retrievalConfig);
  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const conflicts = [
    ...pendingIndex.candidates
      .filter((candidate) => candidate.status === 'pending' && !['no_conflict', 'duplicate'].includes(candidate.conflictStatus))
      .filter((candidate) => isMemoryVisibleForProject(candidate, project))
      .filter((candidate) => scoreMemoryDetailed(candidate, task, retrievalConfig).matchScore > 0),
    ...findActiveMemoryConflicts(relevant)
  ].slice(0, 6);
  const broaderConflictIds = new Set(conflicts.map((conflict) => conflict.broaderMemoryId).filter(Boolean));

  const userSuccessCriteria = relevant.filter((memory) => memory.memoryRole === 'user_success_criteria');
  const aiFailureAvoidance = relevant.filter((memory) => memory.memoryRole === 'ai_failure_memory' || ['failure_memory', 'agent_failure_pattern'].includes(memory.type));
  const aiSuccessfulApproaches = relevant.filter((memory) => memory.memoryRole === 'ai_successful_approach' || ['success_pattern', 'agent_success_pattern'].includes(memory.type));
  const memoryContext = relevant.filter((memory) => !broaderConflictIds.has(memory.id) && ['user_preference', 'tooling_preference', 'technology_preference', 'coding_style', 'design_preference', 'workflow_rule', 'question_pattern', 'response_preference', 'communication_pattern', 'correction_pattern', 'decision_pattern', 'handoff_pattern'].includes(memory.type));
  const projectGuardrails = relevant.filter((memory) => ['avoid_rule', 'architecture_rule', 'project_decision'].includes(memory.type));
  const lines = [
    t(locale, 'pretaskTitle'),
    '',
    `${t(locale, 'userTask')}:`,
    redactSensitive(task),
    '',
    renderBriefSection(t(locale, 'userSuccessCriteria'), userSuccessCriteria, { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'aiFailureAvoidance'), aiFailureAvoidance, { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'aiSuccessfulApproaches'), aiSuccessfulApproaches, { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'relevantMemoryContext'), memoryContext, { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'relevantValidationPatterns'), relevant.filter((memory) => memory.type === 'validation_pattern'), { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'relevantProcessPatterns'), relevant.filter((memory) => memory.type === 'process_pattern'), { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'relevantDesignPhilosophy'), relevant.filter((memory) => memory.type === 'design_philosophy'), { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'projectGuardrails'), projectGuardrails, { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'knownFailureRisks'), relevant.filter((memory) => ['failure_memory', 'agent_failure_pattern'].includes(memory.type)), { locale, allMemories: relevant }),
    renderBriefSection(t(locale, 'knownSuccessPatterns'), relevant.filter((memory) => ['success_pattern', 'agent_success_pattern'].includes(memory.type)), { locale, allMemories: relevant }),
    renderConflictSection(conflicts, locale).trim(),
    '',
    `${t(locale, 'instructionForAgent')}:`,
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

function renderBriefSection(title, memories, options = {}) {
  return [
    `${title}:`,
    ...(memories.length > 0
      ? memories.map((memory) => formatMemoryLine(memory, options))
      : [`- ${t(options.locale || 'en-US', 'none')}`]),
    ''
  ].join('\n');
}

function executionFailureText(input = {}, event = {}) {
  return uniqueNonEmpty([
    input.command || event.command || '',
    input.commandResult || event.commandResult || '',
    ...(input.commandResults || []),
    ...(event.commandResults || []),
    ...(input.errors || []),
    ...(event.errors || []),
    input.aiActionSummary || input.summary || event.aiActionSummary || '',
    input.notes || event.notes || ''
  ]).join('\n');
}

function primaryExecutionFailureText(input = {}, event = {}) {
  const errors = uniqueNonEmpty([
    ...(input.errors || []),
    ...(event.errors || [])
  ]);
  if (errors.length > 0) return errors.join('\n');
  return uniqueNonEmpty([
    input.command || event.command || '',
    input.commandResult || event.commandResult || '',
    ...(input.commandResults || []),
    ...(event.commandResults || [])
  ]).join('\n');
}

function hasExecutionFailureSignal(input = {}, event = {}) {
  const text = executionFailureText(input, event);
  return event.technicalOutcome === 'failure'
    || input.technicalOutcome === 'failure'
    || (input.errors || []).length > 0
    || (event.errors || []).length > 0
    || textHasAny(text, [
      'permission denied',
      'access denied',
      'eperm',
      'eacces',
      'enoent',
      'command failed',
      'build failed',
      'test failed',
      'exit code',
      'not found',
      'tool failed',
      'api failed',
      'browser failed',
      'image generation failed'
    ]);
}

export async function afterTask(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const userRequestText = input.userRequest || input.request || '';
  const parsedStructuredCandidates = structuredCandidatesFromInput(input);
  const candidateDiagnostics = splitCandidateDiagnostics(parsedStructuredCandidates, input);
  const structuredCandidates = candidateDiagnostics.realCandidates;
  const hasStructuredCandidates = structuredCandidates.length > 0;
  const noCandidateReason = candidateDiagnostics.noCandidateReasons.join('; ');
  const hasNoReusableMemoryReason = Boolean(noCandidateReason);
  const noCandidateReasonMissing = candidateDiagnostics.noCandidateReasonMissing;
  const whyOnlyOneCandidate = candidateDiagnostics.whyOnlyOneCandidate;
  const hasRawActionSummary = Boolean(input.aiActionSummary || input.summary);
  const failureEvidencePresent = hasExecutionFailureSignal(input, {});
  const candidateContractWarning = hasStructuredCandidates
    && userRequestText.trim()
    && structuredCandidates.length === 1
    && !whyOnlyOneCandidate
    ? 'structured candidate contract warning: userRequest was captured with exactly one structured memory candidate, but whyOnlyOneCandidate is missing.'
    : '';
  const semanticExtractionWarning = hasStructuredCandidates
    ? candidateContractWarning
    : hasNoReusableMemoryReason
      ? ''
    : noCandidateReasonMissing
      ? 'no_reusable_memory_candidate is missing noCandidateReason'
    : userRequestText.trim()
      ? 'userRequest present but structured memory candidates missing'
      : hasRawActionSummary || failureEvidencePresent
        ? 'structured memory candidates missing; raw event preserved only'
        : 'structured memory candidates missing';
  const event = await captureEvent(root, {
    eventType: 'task_summary',
    userRequest: userRequestText,
    aiActionSummary: input.aiActionSummary || input.summary || '',
    command: input.command || '',
    commandResult: input.commandResult || '',
    commands: input.commands || [],
    commandResults: input.commandResults || [],
    errors: input.errors || [],
    changedFiles: input.changedFiles || input.files || [],
    userFeedback: input.userFeedback || input.feedback || '',
    outcome: input.outcome || 'unknown',
    technicalOutcome: input.technicalOutcome || input.technical_outcome,
    userAcceptance: input.userAcceptance || input.user_acceptance,
    finalOutcome: input.finalOutcome || input.final_outcome,
    semanticExtractionStatus: hasStructuredCandidates
      ? 'agent_candidates_provided'
      : hasNoReusableMemoryReason
        ? 'no_reusable_memory_candidate'
        : 'missing_agent_candidates',
    structuredCandidateCount: structuredCandidates.length,
    semanticExtractionWarning,
    noCandidateReason,
    noCandidateReasons: candidateDiagnostics.noCandidateReasons,
    noCandidateReasonMissing,
    whyOnlyOneCandidate,
    candidateContractWarning,
    notes: input.notes || ''
  });

  const hasFailureWithoutRequest = hasExecutionFailureSignal(input, event);
  if (!hasStructuredCandidates && (hasNoReusableMemoryReason || noCandidateReasonMissing)) {
    return {
      event,
      candidates: [],
      message: [
        `Captured blackbox event ${event.id}.`,
        hasNoReusableMemoryReason
          ? `No reusable memory candidate reason recorded: ${noCandidateReason}`
          : 'Warning: no_reusable_memory_candidate was provided without noCandidateReason.',
        'No active memory was created.',
        'VibeBox Core did not semantically interpret userRequest, action summaries, command output, or raw evidence.',
        hasFailureWithoutRequest
          ? 'Command/tool/environment failure evidence was preserved as raw event evidence; active AI failure memory requires an agent structured candidate.'
          : '',
        'Use `vibebox review` only for manual debug or override workflows.'
      ].filter(Boolean).join('\n')
    };
  }

  if (!hasStructuredCandidates) {
    const warnings = [
      userRequestText.trim()
        ? 'Warning: userRequest is present, but structured memory candidates are missing.'
        : 'Warning: structured memory candidates missing; no active memory was created.',
      userRequestText.trim()
        ? 'VibeBox Core does not semantically interpret userRequest, headings, bullets, keywords, or action summaries.'
        : 'VibeBox Core does not semantically interpret action summaries, command output, or raw evidence.',
      'No active memory was created.',
      hasFailureWithoutRequest
        ? 'Command/tool/environment failure evidence was preserved as raw event evidence; active AI failure memory requires an agent structured candidate.'
        : '',
      hasRawActionSummary && !userRequestText.trim()
        ? 'AI action summary alone is raw evidence only and cannot create active memory.'
        : '',
      'The AI Agent must provide a Structured memory candidates JSON block for reusable memory, including explicit memoryRole, type, modelClass, scope, primaryCategory, relatedCategories, localized display fields, evidence, confidence, and sourceType.',
      'If no reusable memory exists, include an explicit no_reusable_memory_candidate item with noCandidateReason.'
    ].filter(Boolean);
    return {
      event,
      candidates: [],
      message: [
        `Captured blackbox event ${event.id}.`,
        ...warnings,
        'Use `vibebox review` only for manual debug or override workflows.'
      ].join('\n')
    };
  }

  const demotedSuccessIds = [];

  const candidates = await extractMemoryCandidates(root, {
    structuredMemoryCandidates: structuredCandidates,
    manualReview: input.manualReview || input.reviewOnly || input.debugReview,
    source: {
      kind: 'aftertask',
      id: event.id,
      technicalOutcome: event.technicalOutcome,
      userAcceptance: event.userAcceptance,
      userFeedbackSignal: event.userFeedbackSignal,
      finalOutcome: event.finalOutcome,
      rejectionReason: event.rejectionReason,
      correctionDirection: event.correctionDirection,
      preventionRule: event.preventionRule
    }
  });

  const counts = candidates.reduce((accumulator, candidate) => {
    const status = candidate?.status || 'unknown';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});
  const summary = AUTO_CURATED_STATUSES.has(candidates[0]?.status)
    ? `Auto-curated ${candidates.length} candidate(s): ${Object.entries(counts).map(([status, count]) => `${status}=${count}`).join(', ') || 'none'}.`
    : `Created ${candidates.length} pending memory candidate(s).`;
  return {
    event,
    candidates,
    message: [
      `Captured blackbox event ${event.id}.`,
      candidateContractWarning ? `Warning: ${candidateContractWarning}` : '',
      whyOnlyOneCandidate && structuredCandidates.length === 1 ? `One-candidate contract note: reason provided by AI Agent: ${whyOnlyOneCandidate}` : '',
      demotedSuccessIds.length > 0 ? `Demoted rejected AI success memor${demotedSuccessIds.length === 1 ? 'y' : 'ies'}: ${demotedSuccessIds.join(', ')}.` : '',
      summary,
      input.manualReview || input.reviewOnly || input.debugReview
        ? 'Review pending memory with `vibebox review`, then approve or reject candidate ids.'
        : 'Use `vibebox review` only for manual debug or override workflows.'
    ].filter(Boolean).join('\n')
  };
}

export async function generateReport(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
  const project = await resolveProjectIdentityForRead(root);
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const pendingIndex = await loadJson(vibeboxPath(root, 'index/pending-index.json'), defaultPendingIndex());
  const events = (await readJsonl(vibeboxPath(root, 'logs/events.jsonl'))).filter((event) => event.projectId === project.projectId);
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
  const visiblePending = pendingIndex.candidates.filter((candidate) => candidate.status === 'pending' && isMemoryVisibleForProject(candidate, project));
  const conflicts = visiblePending.filter((candidate) => !['no_conflict', 'duplicate'].includes(candidate.conflictStatus));

  return redactSensitive([
    t(locale, 'reportTitle'),
    `${t(locale, 'project')}: ${project.projectId}`,
    `Global Store: ${vibeboxPath(root)}`,
    '',
    `${t(locale, 'activeMemory')}: ${active.length}`,
    `${t(locale, 'pendingCandidates')}: ${visiblePending.length}`,
    `${t(locale, 'recentBlackboxEvents')}: ${events.length}`,
    renderCandidateDiagnostics(t(locale, 'candidateDiagnostics'), t(locale, 'noReusableMemoryCandidate'), events),
    '',
    renderReportType(t(locale, 'relevantUserPreferences'), active, ['user_preference', 'coding_style', 'design_preference', 'response_preference', 'communication_pattern'], locale),
    renderReportType(t(locale, 'relevantValidationPatterns'), active, ['validation_pattern'], locale),
    renderReportType(t(locale, 'relevantProcessPatterns'), active, ['process_pattern', 'handoff_pattern'], locale),
    renderReportType(t(locale, 'relevantDesignPhilosophy'), active, ['design_philosophy'], locale),
    renderReportType(t(locale, 'relevantProjectDecisions'), active, ['project_decision', 'decision_pattern'], locale),
    renderReportType(t(locale, 'relevantArchitectureRules'), active, ['architecture_rule'], locale),
    renderReportType(t(locale, 'relevantAvoidRules'), active, ['avoid_rule'], locale),
    renderReportType(t(locale, 'relevantFailureMemory'), active, ['failure_memory', 'agent_failure_pattern'], locale),
    renderReportType(t(locale, 'relevantSuccessPatterns'), active, ['success_pattern', 'agent_success_pattern'], locale),
    renderReportType(t(locale, 'pageToolingPreferences'), active, ['tooling_preference', 'technology_preference'], locale),
    renderReportType(t(locale, 'pageWorkflowRules'), active, ['workflow_rule'], locale),
    `${t(locale, 'pendingCandidates')}:`,
    ...(visiblePending.slice(0, 12).map((candidate) => `- ${candidate.id} ${candidate.type}/${candidate.scope}: ${memoryDisplaySummary(candidate, locale)} [${candidate.conflictStatus}; ${candidate.recommendedAction || recommendCandidateAction(candidate).action}]`) || []),
    visiblePending.length === 0 ? `- ${t(locale, 'none')}` : '',
    '',
    `${t(locale, 'potentialConflicts')}:`,
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.id}: ${memoryDisplaySummary(candidate, locale)} [${candidate.conflictStatus}]`) : [`- ${t(locale, 'none')}`])
  ].filter((line) => line !== '').join('\n'));
}

function renderReportType(title, memories, types, locale = 'en-US') {
  const selected = memories.filter((memory) => types.includes(memory.type));
  return [
    `${title}:`,
    ...(selected.length > 0 ? selected.map((memory) => `- ${memoryDisplaySummary(memory, locale)} [${memory.id}; ${memory.scope}; ${memory.confidence}]`) : ['- None.']),
    ''
  ].join('\n');
}

function renderCandidateDiagnostics(title, noReusableLabel, events = []) {
  const diagnosticEvents = events.filter((event) => event.noCandidateReason || event.noCandidateReasonMissing || event.candidateContractWarning);
  return [
    `${title}:`,
    ...(diagnosticEvents.length > 0
      ? diagnosticEvents.slice(-8).map((event) => {
        if (event.noCandidateReason) {
          return `- ${event.createdAt}: ${noReusableLabel}: ${event.noCandidateReason}`;
        }
        if (event.noCandidateReasonMissing) {
          return `- ${event.createdAt}: no_reusable_memory_candidate is missing noCandidateReason`;
        }
        return `- ${event.createdAt}: ${event.candidateContractWarning}`;
      })
      : ['- None.'])
  ].join('\n');
}

export async function generateBlackboxReport(root = process.cwd(), input = {}) {
  await ensureStoreForRead(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
  const project = await resolveProjectIdentityForRead(root);
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
    t(locale, 'blackboxTitle'),
    `${t(locale, 'project')}: ${project.projectId}`,
    '',
    `${t(locale, 'taskTimeline')}:`,
    ...(events.length > 0 ? events.map((event) => `- ${event.createdAt} ${event.outcome || 'unknown'}: ${event.userRequest || event.aiActionSummary || event.id}`) : [`- ${t(locale, 'none')}`]),
    '',
    `${t(locale, 'failedApproaches')}:`,
    ...reportEventApproaches(events, 'failure', locale),
    '',
    `${t(locale, 'successfulApproaches')}:`,
    ...reportEventApproaches(events, 'success', locale),
    '',
    `${t(locale, 'rejectedDirections')}:`,
    ...events.filter((event) => event.userFeedbackSignal === 'rejection').map((event) => `- ${event.userFeedback || event.id}`),
    events.some((event) => event.userFeedbackSignal === 'rejection') ? '' : `- ${t(locale, 'none')}`,
    '',
    `${t(locale, 'confirmedDecisions')}:`,
    ...(active.filter((memory) => memory.type === 'project_decision').map((memory) => `- ${memoryDisplaySummary(memory, locale)}`) || []),
    active.some((memory) => memory.type === 'project_decision') ? '' : `- ${t(locale, 'none')}`,
    '',
    `${t(locale, 'recurringFailureTypes')}:`,
    ...formatCounts(recurringFailureTypes, locale),
    '',
    `${t(locale, 'frequentlyChangedFiles')}:`,
    ...formatCounts(changedFiles, locale),
    '',
    `${t(locale, 'preventionRules')}:`,
    ...(active.filter((memory) => ['failure_memory', 'avoid_rule', 'agent_failure_pattern'].includes(memory.type)).map((memory) => `- ${memoryDisplayField(memory, 'preventionRule', locale)}`) || []),
    active.some((memory) => ['failure_memory', 'avoid_rule', 'agent_failure_pattern'].includes(memory.type)) ? '' : `- ${t(locale, 'none')}`
  ].filter((line) => line !== '').join('\n'));
}

function reportEventApproaches(events, outcome, locale = 'en-US') {
  const selected = events.filter((event) => event.outcome === outcome);
  if (selected.length === 0) return [`- ${t(locale, 'none')}`];
  return selected.map((event) => `- ${event.aiActionSummary || event.commandResult || event.userRequest || event.id}`);
}

function countValues(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function formatCounts(counts, locale = 'en-US') {
  return counts.length > 0 ? counts.map(([value, count]) => `- ${value} (${count})`) : [`- ${t(locale, 'none')}`];
}

function hasAgentRuntime() {
  return Boolean(
    process.env.VIBEBOX_AGENT_RUNTIME
    || process.env.VIBEBOX_ADAPTER_RUNTIME
    || process.env.VIBEBOX_AGENT
  );
}

function requireAgentRuntime(commandName) {
  if (!hasAgentRuntime()) {
    throw new Error(`${commandName} requires an AI agent runtime. Set VIBEBOX_AGENT_RUNTIME from an adapter before running this semantic operation. No files were changed.`);
  }
}

function timestampLabel() {
  return nowIso().replace(/[:.]/gu, '-');
}

function resolveBackupPath(root, backupPathOrId = '') {
  if (!backupPathOrId) {
    return path.join(path.resolve(root), 'vibebox-backups', `vibebox-backup-${timestampLabel()}`);
  }
  if (path.isAbsolute(backupPathOrId)) return backupPathOrId;
  return path.join(path.resolve(root), 'vibebox-backups', backupPathOrId);
}

export async function backupVibeBox(root = process.cwd(), options = {}) {
  await ensureStoreForRead(root);
  const source = vibeboxPath(root);
  const target = resolveBackupPath(root, options.output || options.path || options.label || '');
  if (isPathInside(target, source)) {
    throw new Error('Backup target must not be inside the VibeBox store being backed up.');
  }
  if (await exists(target)) {
    throw new Error(`Backup target already exists: ${target}`);
  }
  const includeLogs = options.includeLogs !== false && options['include-logs'] !== false;
  await ensureDir(path.dirname(target));
  await cp(source, target, {
    recursive: true,
    filter: (sourcePath) => includeLogs || !isPathInside(sourcePath, path.join(source, 'logs'))
  });
  const manifest = {
    version: VIBEBOX_VERSION,
    createdAt: nowIso(),
    source,
    includeLogs,
    kind: 'vibebox-store-backup'
  };
  await saveJson(path.join(target, 'backup-manifest.json'), manifest);
  return { backupPath: target, manifest };
}

export async function restoreVibeBox(root = process.cwd(), options = {}) {
  const source = resolveBackupPath(root, options.from || options.path || options.backup || '');
  if (!source || !(await exists(source))) {
    throw new Error(`Backup not found: ${source}`);
  }
  const target = vibeboxPath(root);
  if (isPathInside(source, target) || isPathInside(target, source)) {
    throw new Error('Restore source must be outside the active VibeBox store to avoid deleting the backup or recursively restoring the store into itself.');
  }
  const targetExists = await exists(target);
  if (targetExists && !options.confirmReplace && !options.yes) {
    throw new Error(`Restore is a destructive replace of ${target}. Re-run with --confirm-replace or --yes to delete the existing store before restoring.`);
  }
  if (targetExists) {
    await rm(target, { recursive: true, force: true });
  }
  await ensureDir(path.dirname(target));
  await cp(source, target, {
    recursive: true,
    filter: (sourcePath) => path.basename(sourcePath) !== 'backup-manifest.json'
  });
  return { restoredFrom: source, storeRoot: target };
}

function normalizeMemoryLanguage(memory, targetLanguage, locale) {
  const normalized = { ...memory };
  normalized.docKey = normalized.docKey || docKeyForType(normalized.type);
  const targetLocale = normalizeConfigLanguageTag(locale || targetLanguage, BASE_MEMORY_LANGUAGE);
  if (normalized.displayLanguage && normalized.displayLanguage !== targetLocale) {
    normalized.displayLanguageDiagnostics = uniqueNonEmpty([
      ...(normalized.displayLanguageDiagnostics || []),
      `displayLanguage ${normalized.displayLanguage} does not match configured memoryLanguage ${targetLocale}; AI Agent must provide display fields in ${targetLocale}.`
    ]);
  }
  normalized.updatedAt = nowIso();
  return normalized;
}

async function cleanupStaleLocalizedWikiDocs(root, locale, staleDocFiles = []) {
  const wikiRoot = vibeboxPath(root, 'wiki');
  const activeFiles = new Set(currentWikiPages(locale));
  const registry = await loadJson(vibeboxPath(root, 'registry/wiki-docs.json'), { docs: [] }).catch(() => ({ docs: [] }));
  const registryFiles = (registry.docs || []).map((doc) => doc.fileName).filter(Boolean);
  const knownFiles = new Set(WIKI_DOCS.flatMap((doc) => [
    doc.canonicalFileName,
    ...registryFiles,
    ...staleDocFiles
  ]));
  for (const wikiFile of await listMarkdownFiles(wikiRoot)) {
    const relative = path.relative(wikiRoot, wikiFile);
    if (relative.includes(path.sep) || relative.includes(path.posix.sep)) continue;
    if (!knownFiles.has(relative) || activeFiles.has(relative)) continue;
    const text = await readFile(wikiFile, 'utf8');
    if (isManagedOnlyWikiText(text)) {
      await rm(wikiFile, { force: true });
    }
  }
}

function isManagedOnlyWikiText(text) {
  if (!text.includes('vibebox: true') || !text.includes(MANAGED_BEGIN)) return false;
  const withoutFrontmatter = text.replace(/^---[\s\S]*?---\s*/u, '');
  const withoutManaged = withoutFrontmatter.replace(new RegExp(`${escapeRegExp(MANAGED_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_END)}`, 'u'), '');
  const templatePacks = [BASE_DISPLAY_TEMPLATE, ...ACTIVE_DISPLAY_TEMPLATES.values()];
  const backLabels = new Set(templatePacks.map((pack) => pack.backTo).filter(Boolean));
  const homeDescriptions = new Set(templatePacks.map((pack) => pack.homeDescription).filter(Boolean));
  return withoutManaged.split(/\r?\n/u).every((line) => {
    const trimmed = line.trim();
    return trimmed === ''
      || trimmed.startsWith('#')
      || homeDescriptions.has(trimmed)
      || [...backLabels].some((label) => trimmed.startsWith(label));
  });
}

function localizedDisplayCandidatesFromOptions(options = {}) {
  return parseStructuredCandidateInput(
    options.localizedCandidates
      ?? options.localizedDisplayCandidates
      ?? options.displayCandidates
      ?? options.displayCandidateMap,
    'localized display candidates'
  );
}

function memoryIdFromLocalizedCandidate(candidate = {}) {
  return String(candidate.memoryId || candidate.id || candidate.candidateId || '').trim();
}

async function applyLocalizedDisplayCandidates(root, targetLocale, localizedCandidates = []) {
  const memoryIndexPath = vibeboxPath(root, 'index/global-memory-index.json');
  const memoryIndex = await loadJson(memoryIndexPath, defaultMemoryIndex());
  const activeMemoriesToRender = (memoryIndex.memories || []).filter((memory) => memory.status === 'active' && shouldWriteMemoryNote(memory));
  if (activeMemoriesToRender.length > 0 && localizedCandidates.length === 0) {
    throw new Error('convert-lang requires agent-provided localized display candidates for every active rendered memory. No files were changed.');
  }
  const localizedById = new Map();
  for (const raw of localizedCandidates) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('localized display candidates must be JSON objects.');
    }
    const id = memoryIdFromLocalizedCandidate(raw);
    if (!id) throw new Error('localized display candidate is missing memoryId/id.');
    const displayLanguage = assertSupportedMemoryLanguageTag(raw.displayLanguage || targetLocale, 'localized displayLanguage');
    if (displayLanguage !== targetLocale) {
      throw new Error(`localized display candidate ${id} uses ${displayLanguage}, expected ${targetLocale}.`);
    }
    if (!(raw.displayTitle || raw.fileTitle) || !raw.displaySummary || !raw.displayRule) {
      throw new Error(`localized display candidate ${id} must include displayTitle or fileTitle, plus displaySummary and displayRule.`);
    }
    localizedById.set(id, raw);
  }
  const missing = activeMemoriesToRender
    .filter((memory) => !localizedById.has(memory.id))
    .map((memory) => memory.id);
  if (missing.length > 0) {
    throw new Error(`convert-lang is missing localized display candidates for active rendered memories: ${missing.join(', ')}. No files were changed.`);
  }
  memoryIndex.memories = (memoryIndex.memories || []).map((memory) => {
    const localized = localizedById.get(memory.id);
    if (!localized) return memory;
    return {
      ...memory,
      displayTitle: localized.displayTitle || localized.fileTitle,
      displaySummary: localized.displaySummary,
      displayRule: localized.displayRule,
      displayLanguage: targetLocale,
      updatedAt: nowIso()
    };
  });
  memoryIndex.updatedAt = nowIso();
  await saveJson(memoryIndexPath, memoryIndex);
  return { updated: localizedById.size, required: activeMemoriesToRender.length };
}

function parseAgentSemanticData(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') {
    throw new Error('agent semantic data must be a JSON object.');
  }
  const text = stripJsonFence(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`agent semantic data must be valid JSON: ${error.message}`);
  }
}

export async function convertLanguage(root = process.cwd(), options = {}) {
  requireAgentRuntime('convert-lang');
  if (options.from) {
    assertSupportedMemoryLanguageTag(options.from, 'source language');
  }
  const targetLocale = assertSupportedMemoryLanguageTag(options.to || options.language || options.target || '', 'target language');
  await ensureStoreForRead(root);
  const configPath = vibeboxPath(root, 'config.json');
  const config = await loadJson(configPath, defaultConfig());
  const existingTemplates = activateDisplayTemplates(config);
  const optionTemplates = normalizeAgentDisplayTemplates(
    options.displayTemplates
      ?? options.displayTemplate
      ?? options.localizedDisplayTemplate
      ?? options.localizedDisplayTemplates
      ?? null,
    targetLocale,
    'convert-lang display template'
  );
  const displayTemplates = mergeDisplayTemplates(existingTemplates, optionTemplates);
  activateDisplayTemplates({ memoryLanguage: targetLocale, displayTemplates });
  requireDisplayTemplateForLocale(targetLocale, displayTemplates, 'convert-lang display template');
  const previousRegistry = await loadJson(vibeboxPath(root, 'registry/wiki-docs.json'), { docs: [] }).catch(() => ({ docs: [] }));
  const staleDocFiles = (previousRegistry.docs || []).map((doc) => doc.fileName).filter(Boolean);
  const localizedCandidates = localizedDisplayCandidatesFromOptions(options);
  const localizationResult = await applyLocalizedDisplayCandidates(root, targetLocale, localizedCandidates);
  const targetLanguage = languageFromLocale(targetLocale);
  const updatedConfig = {
    ...config,
    locale: targetLocale,
    memoryLanguage: targetLocale,
    outputLanguage: targetLocale,
    wikiLanguage: targetLocale,
    reportLanguage: targetLocale,
    contextLanguage: targetLocale,
    displayTemplates,
    updatedAt: nowIso()
  };
  await saveJson(configPath, updatedConfig);

  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(targetLocale));
  await rebuildIndexes(root);
  await rebuildWiki(root);
  await cleanupStaleLocalizedWikiDocs(root, targetLocale, staleDocFiles);
  return { language: targetLocale, primaryLanguage: targetLanguage, locale: targetLocale, storeRoot: vibeboxPath(root), localizedCandidates: localizationResult };
}

export async function rebuildVibeBox(root = process.cwd(), options = {}) {
  const semantic = options.semantic !== false && !options.indexOnly;
  if (semantic) {
    requireAgentRuntime('rebuild');
    const agentSemanticData = parseAgentSemanticData(options.agentSemanticData || null);
    const structuredCandidates = structuredCandidatesFromInput(options);
    const localizedCandidates = localizedDisplayCandidatesFromOptions(options);
    const hasSemanticData = Boolean(agentSemanticData)
      || structuredCandidates.length > 0
      || localizedCandidates.length > 0;
    if (!hasSemanticData) {
      throw new Error('semantic rebuild requires agent-provided semantic data. Use --index-only for structural rebuilds. No files were changed.');
    }
    const configPath = vibeboxPath(root, 'config.json');
    let existingConfig = {};
    if (await exists(configPath)) {
      existingConfig = await loadJson(configPath, {});
      configuredMemoryLocale(existingConfig);
    }
    await initVibeBox(root, {
      locale: existingConfig.locale || existingConfig.memoryLanguage,
      displayTemplates: existingConfig.displayTemplates
    });
    const config = await loadJson(configPath, defaultConfig());
    const locale = configuredMemoryLocale(config);
    if (localizedCandidates.length > 0) {
      await applyLocalizedDisplayCandidates(root, locale, localizedCandidates);
    }
    if (structuredCandidates.length > 0) {
      await extractMemoryCandidates(root, {
        structuredMemoryCandidates: structuredCandidates,
        source: { kind: 'semantic_rebuild', sourceType: 'agent_semantic_extraction' }
      });
    }
  } else {
    await ensureDir(vibeboxPath(root, 'index'));
  }
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = configuredMemoryLocale(config);
  const memoryIndexPath = vibeboxPath(root, 'index/global-memory-index.json');
  const memoryIndex = await loadJson(memoryIndexPath, defaultMemoryIndex());
  memoryIndex.memories = (memoryIndex.memories || [])
    .filter((memory) => memory.status === 'active')
    .map((memory) => toMemoryIndexEntry(memory));
  memoryIndex.updatedAt = nowIso();
  await saveJson(memoryIndexPath, memoryIndex);
  await rebuildIndexes(root, { syncNamespaceFiles: semantic });
  if (!semantic) {
    return { rebuilt: true, semantic, indexOnly: true, storeRoot: vibeboxPath(root) };
  }
  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(locale));
  await rebuildWiki(root);
  if (options.cleanup !== false) {
    await cleanupStaleLocalizedWikiDocs(root, locale);
  }
  return { rebuilt: true, semantic, storeRoot: vibeboxPath(root) };
}

export async function runDoctor(root = process.cwd()) {
  const errors = [];
  const warnings = [];
  const base = vibeboxPath(root);
  const rootPath = path.resolve(root);
  const projectRoot = (await findGitRoot(rootPath)) || rootPath;
  const legacyPath = path.join(projectRoot, '.vibebox');
  let detectedProject = null;
  try {
    detectedProject = isIgnoredProjectRoot(root) || !(await isRecognizedProjectRoot(root))
      ? virtualProjectIdentity(root)
      : await detectProjectIdentity(root);
  } catch (error) {
    warnings.push(`Current project identity could not be fully detected: ${error.message}`);
  }
  if ((await exists(legacyPath)) && path.resolve(legacyPath) !== path.resolve(base) && !isIgnoredProjectRoot(root)) {
    warnings.push('old project-local .vibebox detected; VibeBox now uses the global store. Migrate manually or wait for a future migration command.');
  }

  let registry = defaultRegistry();
  try {
    registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  } catch {
    // Missing or invalid registry is reported in the required-file pass below.
  }
  const currentProject = detectedProject
    && !detectedProject.virtual
    ? (registry.projects || []).find((project) => (
      (detectedProject.gitRemote && project.gitRemote === detectedProject.gitRemote)
      || (project.rootPath && path.resolve(project.rootPath) === detectedProject.rootPath)
      || project.projectId === detectedProject.projectId
    ))
    : null;
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig()).catch(() => defaultConfig());
  const locale = resolveLocale({}, config);
  const wikiDocRegistry = await loadJson(vibeboxPath(root, 'registry/wiki-docs.json'), { docs: [] }).catch(() => ({ docs: [] }));
  const registeredWikiPages = (wikiDocRegistry.docs || []).map((doc) => doc.fileName).filter(Boolean);
  const currentProjectId = currentProject?.projectId || detectedProject?.projectId || 'none';
  const requiredFiles = [
    'config.json',
    'registry/projects.json',
    'registry/wiki-docs.json',
    ...(registeredWikiPages.length > 0 ? registeredWikiPages : currentWikiPages(locale)).map((page) => `wiki/${page}`),
    'index/global-memory-index.json',
    'index/project-index.json',
    'index/keyword-index.json',
    'index/relation-index.json',
    'index/pending-index.json',
    'logs/events.jsonl',
    'pending/memory-candidates.jsonl'
  ];
  if (!detectedProject?.virtual) {
    requiredFiles.push(`wiki/projects/${currentProjectId}.md`);
    requiredFiles.push(`projects/${currentProjectId}/project.json`);
  }

  const validProjectIds = new Set();
  for (const registered of registry.projects || []) {
    if (isRegistryProject(registered)) {
      validProjectIds.add(registered.projectId);
      continue;
    }
    if (registered.projectId === 'global-store' || registered.status === 'virtual' || registered.virtual) {
      warnings.push(`Registry contains internal pseudo project ${registered.projectId || 'unknown'}; remove or rebuild the registry.`);
    } else if (registered.rootPath && isIgnoredProjectRoot(registered.rootPath)) {
      warnings.push(`Registry contains non-project root ${registered.rootPath}; remove or rebuild the registry.`);
    } else {
      warnings.push(`Registry contains non-project entry ${registered.projectId || registered.rootPath || 'unknown'}; remove or rebuild the registry.`);
    }
  }

  const projectWikiDir = vibeboxPath(root, 'wiki/projects');
  try {
    for (const entry of await readdir(projectWikiDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const projectId = pageTitle(entry.name);
      if (!validProjectIds.has(projectId)) {
        warnings.push(`Orphan project wiki page wiki/projects/${entry.name} has no active project registry entry.`);
      }
    }
  } catch {
    // Missing wiki/projects is handled by the required directory check below.
  }

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
    const activeMemories = memoryIndex.memories.filter((item) => item.status === 'active');
    const notePathMap = buildMemoryNotePathMap(activeMemories, locale);
    for (const memory of memoryIndex.memories) {
      for (const relatedId of [...(memory.related || []), ...(memory.supersedes || [])]) {
        if (!ids.has(relatedId)) {
          warnings.push(`Memory ${memory.id} references missing related memory ${relatedId}.`);
        }
      }
      if (memory.status === 'active') {
        const note = memoryNoteInfo(memory, locale, notePathMap);
        const notePath = vibeboxPath(root, 'wiki', note.fileName);
        if (shouldWriteMemoryNote(memory) && !(await exists(notePath))) {
          warnings.push(`Active memory ${memory.id} has no category-based wiki note at ${note.fileName}.`);
        } else if (shouldWriteMemoryNote(memory)) {
          const noteText = await readFile(notePath, 'utf8');
          if (!new RegExp(`^id:\\s*"?${escapeRegExp(memory.id)}"?\\s*$`, 'mu').test(noteText)) {
            warnings.push(`Memory note ${note.fileName} is missing frontmatter id ${memory.id}.`);
          }
          if (VISIBLE_MEMORY_ID_PATTERN.test(note.title) || VISIBLE_MEMORY_ID_PATTERN.test(path.basename(note.fileName))) {
            warnings.push(`Memory note ${note.fileName} exposes a memory id in its visible title or filename.`);
          }
          const categoryPage = localizedDocFileName(note.categoryDocKey, locale);
          const categoryPath = vibeboxPath(root, 'wiki', categoryPage);
          if (!(await exists(categoryPath))) {
            warnings.push(`Memory note ${note.fileName} has missing category page ${categoryPage}.`);
          } else {
            const categoryText = await readFile(categoryPath, 'utf8');
            if (!categoryText.includes(`[[${note.target}`)) {
              warnings.push(`Category page ${categoryPage} does not link to memory note ${note.target}.`);
            }
          }
          const sourceProjectId = memory.sourceProjectId || memory.projectId || '';
          if (sourceProjectId && validProjectIds.has(sourceProjectId)) {
            const projectPath = vibeboxPath(root, 'wiki', 'projects', `${sourceProjectId}.md`);
            if (!(await exists(projectPath))) {
              warnings.push(`Source project page projects/${sourceProjectId}.md is missing for memory ${memory.id}.`);
            } else {
              const projectText = await readFile(projectPath, 'utf8');
              if (!projectText.includes(`[[${note.target}`)) {
                warnings.push(`Project page projects/${sourceProjectId}.md does not link to source memory note ${note.target}.`);
              }
            }
          }
        } else {
          const wikiPage = memory.projectId && !memoryScopeUsesGlobalNamespace(memory)
            ? `projects/${memory.projectId}.md`
            : localizedDocFileName(memory.docKey || docKeyForType(memory.type), locale);
          if (!wikiPage || !(await exists(vibeboxPath(root, 'wiki', wikiPage)))) {
            warnings.push(`Active memory ${memory.id} has no known wiki page.`);
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
      for (const projectId of memoryObservedProjectIds(memory)) {
        if (!(keywordIndex.projects?.[normalizeText(projectId)] || []).includes(memory.id)) {
          warnings.push(`keyword-index missing project ${projectId} for memory ${memory.id}.`);
        }
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
      if (relation.active === false) continue;
      const fromIsMemory = String(relation.from || '').startsWith('mem_');
      const toIsMemory = String(relation.to || '').startsWith('mem_');
      if ((fromIsMemory && !ids.has(relation.from)) || (toIsMemory && !ids.has(relation.to))) {
        warnings.push(`relation-index references missing memory: ${relation.from} -> ${relation.to}.`);
      }
    }

    const wikiFiles = await listMarkdownFiles(vibeboxPath(root, 'wiki'));
    const wikiFileNames = new Set(wikiFiles.map((file) => path.basename(file, '.md')));
    const activeDocFiles = new Set(registeredWikiPages.length > 0 ? registeredWikiPages : currentWikiPages(locale));
    for (const doc of WIKI_DOCS) {
      const registeredDoc = (wikiDocRegistry.docs || []).find((item) => item.docKey === doc.docKey);
      const possibleFiles = [...new Set([
        doc.canonicalFileName,
        registeredDoc?.fileName,
        localizedDocFileName(doc.docKey, locale)
      ].filter(Boolean))];
      const present = [];
      for (const fileName of possibleFiles) {
        if (await exists(path.join(vibeboxPath(root, 'wiki'), fileName))) {
          present.push(fileName);
        }
      }
      if (present.length > 1) {
        warnings.push(`Duplicate localized wiki document for ${doc.docKey}: ${present.join(', ')}.`);
      }
      const expected = registeredDoc?.fileName || localizedDocFileName(doc.docKey, locale);
      if (!activeDocFiles.has(expected)) {
        warnings.push(`Wiki registry has unexpected document mapping for ${doc.docKey}.`);
      }
    }
    for (const wikiFile of wikiFiles) {
      const relativeWikiFile = path.relative(vibeboxPath(root, 'wiki'), wikiFile).replace(/\\/gu, '/');
      if (relativeWikiFile.startsWith('memories/')) {
        warnings.push(`Legacy ID-based memory note path remains under wiki/memories: ${relativeWikiFile}.`);
      }
      if (VISIBLE_MEMORY_ID_PATTERN.test(relativeWikiFile)) {
        warnings.push(`Wiki filename exposes memory id: ${relativeWikiFile}.`);
      }
      const text = await readFile(wikiFile, 'utf8');
      const frontmatterTitle = text.match(/^---[\s\S]*?\ntitle:\s*(.+?)\n[\s\S]*?---/u)?.[1] || '';
      const headingTitle = text.match(/^#\s+(.+)$/mu)?.[1] || '';
      if (VISIBLE_MEMORY_ID_PATTERN.test(frontmatterTitle) || VISIBLE_MEMORY_ID_PATTERN.test(headingTitle)) {
        warnings.push(`Wiki title exposes memory id in ${relativeWikiFile}.`);
      }
      for (const match of text.matchAll(/`(mem_[a-f0-9]+)`/giu)) {
        if (!ids.has(match[1])) {
          warnings.push(`Wiki file ${path.basename(wikiFile)} references missing memory ${match[1]}.`);
        }
      }
      const managedText = text.includes(MANAGED_BEGIN)
        ? text.slice(text.indexOf(MANAGED_BEGIN), text.indexOf(MANAGED_END) + MANAGED_END.length)
        : text;
      for (const match of managedText.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/gu)) {
        const target = match[1].trim();
        if (!target || target.startsWith('projects/')) continue;
        if (target.includes('/')) {
          if (!(await exists(path.join(vibeboxPath(root, 'wiki'), `${target}.md`)))) {
            warnings.push(`Wiki link target is missing: ${target}.`);
          }
          continue;
        }
        if (!wikiFileNames.has(target)) {
          warnings.push(`Wiki link target is missing: ${target}.`);
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

export function formatDoctorReport(report, input = {}) {
  const locale = resolveLocale(input, {});
  const lines = [t(locale, 'doctorTitle'), `${t(locale, 'status')}: ${report.ok ? 'ok' : 'error'}`];
  if (report.storeRoot) {
    lines.push(`${t(locale, 'globalStore')}: ${report.storeRoot}`);
  }
  if (report.currentProjectId || report.projectIdentity?.projectId) {
    lines.push(`${t(locale, 'currentProjectId')}: ${report.currentProjectId || report.projectIdentity.projectId}`);
  }
  if (report.errors.length > 0) {
    lines.push('', `${t(locale, 'errors')}:`, ...report.errors.map((error) => `- ${error}`));
  }
  if (report.warnings.length > 0) {
    lines.push('', `${t(locale, 'warnings')}:`, ...report.warnings.map((warning) => `- ${warning}`));
  }
  if (report.errors.length === 0 && report.warnings.length === 0) {
    lines.push('', t(locale, 'noIssuesFound'));
  }
  return lines.join('\n');
}
