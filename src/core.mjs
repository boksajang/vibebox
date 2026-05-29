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

export const VIBEBOX_VERSION = '0.1.0';

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

const SUPPORTED_MEMORY_LANGUAGE_TAGS = ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW', 'ar'];
const SUPPORTED_MEMORY_LANGUAGE_SET = new Set(SUPPORTED_MEMORY_LANGUAGE_TAGS);

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

function detectSystemLocale() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
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
  return tag || 'en-US';
}

function languageFromLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (normalized === 'auto') return 'auto';
  const match = normalized.match(/^([a-z]{2,3})(?:-|$)/iu);
  return match ? match[1].toLowerCase() : 'en';
}

function localeFromLanguage(language = 'en-US') {
  return normalizeLocale(language || 'en-US');
}

function languageValidationError(value, label = 'memoryLanguage') {
  return new Error(`${label} must be one of these supported BCP 47 tags: ${SUPPORTED_MEMORY_LANGUAGE_TAGS.join(', ')}. Short aliases such as ko, en, ja, zh, cn, tw, jp, kor, eng, jpn, korean, and english are not supported.`);
}

function assertSupportedMemoryLanguageTag(value, label = 'memoryLanguage') {
  const raw = String(value || '').trim();
  const canonical = normalizeLanguageTag(raw);
  if (!raw || raw.toLowerCase() === 'auto' || !canonical || canonical !== raw || !SUPPORTED_MEMORY_LANGUAGE_SET.has(canonical)) {
    throw languageValidationError(raw || '(empty)', label);
  }
  return canonical;
}

function defaultSupportedLanguageTag(value = '', fallback = 'en-US') {
  const canonical = normalizeLanguageTag(value);
  if (SUPPORTED_MEMORY_LANGUAGE_SET.has(canonical)) return canonical;
  const primary = languageFromLocale(canonical || '');
  if (primary === 'ko') return 'ko-KR';
  if (primary === 'en') return 'en-US';
  if (primary === 'ja') return 'ja-JP';
  if (primary === 'zh') return 'zh-CN';
  if (primary === 'ar') return 'ar';
  return fallback;
}

function normalizeConfigLanguageTag(value, fallback = 'en-US') {
  const raw = String(value || '').trim();
  return assertSupportedMemoryLanguageTag(raw || fallback, 'memoryLanguage');
}

function configuredMemoryLanguageTag(config = {}) {
  const explicit = config.memoryLanguage || config.outputLanguage || config.wikiLanguage || config.reportLanguage || config.contextLanguage;
  return normalizeConfigLanguageTag(explicit || config.locale || 'en-US', config.locale || 'en-US');
}

function configuredMemoryLanguage(config = {}) {
  const language = languageFromLocale(configuredMemoryLanguageTag(config));
  return language === 'auto' ? 'en' : language;
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
  if (counts.ko > 0) return 'ko-KR';
  if (counts.ja > 0) return 'ja-JP';
  if (counts.ar > 0) return 'ar';
  if (counts.zh >= Math.max(2, counts.latin)) return 'zh-CN';
  if (counts.latin > 0) return 'en-US';
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

function defaultConfig() {
  const timestamp = nowIso();
  const explicitLanguage = process.env.VIBEBOX_LANGUAGE || process.env.VIBEBOX_LOCALE || '';
  const outputLanguage = explicitLanguage
    ? assertSupportedMemoryLanguageTag(explicitLanguage, 'memoryLanguage')
    : defaultSupportedLanguageTag(detectSystemLocale(), 'en-US');
  const locale = outputLanguage;
  return {
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
}

const LOCALE_TEMPLATES = {
  'en-US': {
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
    notSpecified: 'Not specified'
  },
  'ko-KR': {
    homeTitle: 'VibeBox 홈',
    contextTitle: 'VibeBox 컨텍스트 팩',
    pretaskTitle: 'VibeBox 사전 작업 브리프',
    reportTitle: 'VibeBox 메모리 보고서',
    blackboxTitle: 'VibeBox 블랙박스 보고서',
    doctorTitle: 'VibeBox 진단',
    task: '작업',
    userTask: '작업',
    relevantMemoryContext: '관련 메모리 컨텍스트',
    relevantUserPreferences: '관련 사용자 성향',
    relevantUserPatterns: '관련 사용자 패턴',
    relevantProjectDecisions: '관련 프로젝트 결정',
    relevantArchitectureRules: '관련 아키텍처 규칙',
    relevantAvoidRules: '관련 금지 규칙',
    relevantFailureMemory: '관련 실패 메모리',
    knownFailureRisks: '알려진 실패 위험',
    knownSuccessPatterns: '관련 성공 패턴',
    relevantSuccessPatterns: '관련 성공 패턴',
    relevantValidationPatterns: '관련 검증 패턴',
    relevantProcessPatterns: '관련 처리 방식',
    relevantDesignPhilosophy: '관련 설계 철학',
    relevantAgentFailurePatterns: '관련 AI 실패 패턴',
    relevantAgentSuccessPatterns: '관련 AI 성공 패턴',
    relevantCorrectionPatterns: '관련 교정 패턴',
    relevantResponsePreferences: '관련 답변 선호',
    relevantCommunicationPatterns: '관련 대화 방식',
    relevantQuestionPatterns: '관련 질문 방식',
    relevantDecisionPatterns: '관련 판단 방식',
    relevantHandoffPatterns: '관련 인수인계 방식',
    projectGuardrails: '프로젝트 가드레일',
    potentialConflicts: '잠재적 충돌',
    guidanceForAgent: 'AI 에이전트 지침',
    instructionForAgent: 'AI 에이전트 지침',
    prevention: '예방',
    alternative: '대안',
    none: '없음.',
    pageUserPreferences: '사용자 성향',
    pageUserPatterns: '사용자 패턴',
    pageDesignPhilosophy: '설계 철학',
    pageValidationPatterns: '검증 패턴',
    pageProcessPatterns: '처리 방식',
    pageDecisionPatterns: '판단 방식',
    pageTechnologyPreferences: '기술 선호',
    pageAgentFailurePatterns: 'AI 실패 패턴',
    pageAgentSuccessPatterns: 'AI 성공 패턴',
    pagePreventionRules: '예방 규칙',
    pageGlobalAvoidRules: '전역 금지 규칙',
    pageFailureMemory: '실패 메모리',
    pageSuccessPatterns: '성공 패턴',
    pageToolingPreferences: '도구 선호',
    pageWorkflowRules: '워크플로 규칙',
    pageProjectIndex: '프로젝트 인덱스',
    activeMemory: '활성 메모리',
    pendingCandidates: '검토 대기 후보',
    recentBlackboxEvents: '최근 블랙박스 이벤트',
    taskTimeline: '작업 타임라인',
    failedApproaches: '실패한 접근',
    successfulApproaches: '성공한 접근',
    rejectedDirections: '거절된 방향',
    confirmedDecisions: '확정된 결정',
    recurringFailureTypes: '반복 실패 유형',
    frequentlyChangedFiles: '자주 변경된 파일',
    preventionRules: '예방 규칙',
    project: '프로젝트',
    status: '상태',
    globalStore: '전역 저장소',
    currentProjectId: '현재 projectId',
    errors: '오류',
    warnings: '경고',
    noIssuesFound: '문제 없음.',
    modelClass: '모델 계층',
    modelSubClass: '모델',
    idLabel: 'ID',
    scopeLabel: '범위',
    confidenceLabel: '신뢰도',
    topicLabel: '주제',
    summaryLabel: '요약',
    appliesToLabel: '적용 조건',
    failureTypeLabel: '실패 유형',
    preventionRuleLabel: '예방 규칙',
    reuseWhenLabel: '재사용 조건',
    patternTypeLabel: '패턴 유형',
    situationLabel: '상황',
    preferredBehaviorLabel: '선호 행동',
    forbiddenActionLabel: '금지 행동',
    severityLabel: '심각도',
    decisionLabel: '결정',
    alternativesRejectedLabel: '거절된 대안',
    notSpecified: '지정되지 않음'
  }
};

Object.assign(LOCALE_TEMPLATES, {
  'ja-JP': {
    ...LOCALE_TEMPLATES['en-US'],
    homeTitle: 'VibeBox ホーム',
    contextTitle: 'VibeBox コンテキストパック',
    pretaskTitle: 'VibeBox 事前作業ブリーフ',
    reportTitle: 'VibeBox メモリーレポート',
    blackboxTitle: 'VibeBox ブラックボックスレポート',
    doctorTitle: 'VibeBox 診断',
    task: 'タスク',
    userTask: 'ユーザータスク',
    userSuccessCriteria: 'ユーザー成功基準',
    aiFailureAvoidance: 'AI 失敗回避',
    aiSuccessfulApproaches: 'AI 成功アプローチ',
    none: 'なし。',
    pageUserPreferences: 'ユーザー傾向',
    pageUserPatterns: 'ユーザーパターン',
    pageDesignPhilosophy: '設計哲学',
    pageValidationPatterns: '検証パターン',
    pageProcessPatterns: '処理方式',
    pageDecisionPatterns: '判断方式',
    pageTechnologyPreferences: '技術選好',
    pageAgentFailurePatterns: 'AI 失敗パターン',
    pageAgentSuccessPatterns: 'AI 成功パターン',
    pagePreventionRules: '予防ルール',
    pageGlobalAvoidRules: 'グローバル禁止ルール',
    pageFailureMemory: '失敗メモリー',
    pageSuccessPatterns: '成功パターン',
    pageToolingPreferences: 'ツール選好',
    pageWorkflowRules: 'ワークフロールール',
    pageProjectIndex: 'プロジェクト索引',
    activeMemory: '有効メモリー',
    pendingCandidates: '保留候補',
    recentBlackboxEvents: '最近のブラックボックスイベント',
    preventionRules: '予防ルール',
    project: 'プロジェクト',
    status: '状態',
    errors: 'エラー',
    warnings: '警告',
    noIssuesFound: '問題はありません。'
  },
  'zh-CN': {
    ...LOCALE_TEMPLATES['en-US'],
    homeTitle: 'VibeBox 主页',
    contextTitle: 'VibeBox 上下文包',
    pretaskTitle: 'VibeBox 任务前简报',
    reportTitle: 'VibeBox 记忆报告',
    blackboxTitle: 'VibeBox 黑箱报告',
    doctorTitle: 'VibeBox 诊断',
    task: '任务',
    userTask: '用户任务',
    userSuccessCriteria: '用户成功标准',
    aiFailureAvoidance: 'AI 失败规避',
    aiSuccessfulApproaches: 'AI 成功做法',
    none: '无。',
    pageUserPreferences: '用户倾向',
    pageUserPatterns: '用户模式',
    pageDesignPhilosophy: '设计哲学',
    pageValidationPatterns: '验证模式',
    pageProcessPatterns: '处理方式',
    pageDecisionPatterns: '判断方式',
    pageTechnologyPreferences: '技术偏好',
    pageAgentFailurePatterns: 'AI 失败模式',
    pageAgentSuccessPatterns: 'AI 成功模式',
    pagePreventionRules: '预防规则',
    pageGlobalAvoidRules: '全局禁止规则',
    pageFailureMemory: '失败记忆',
    pageSuccessPatterns: '成功模式',
    pageToolingPreferences: '工具偏好',
    pageWorkflowRules: '工作流规则',
    pageProjectIndex: '项目索引',
    activeMemory: '活跃记忆',
    pendingCandidates: '待处理候选',
    recentBlackboxEvents: '最近黑箱事件',
    preventionRules: '预防规则',
    project: '项目',
    status: '状态',
    errors: '错误',
    warnings: '警告',
    noIssuesFound: '未发现问题。'
  },
  'zh-TW': {
    ...LOCALE_TEMPLATES['en-US'],
    homeTitle: 'VibeBox 首頁',
    contextTitle: 'VibeBox 脈絡包',
    pretaskTitle: 'VibeBox 任務前簡報',
    reportTitle: 'VibeBox 記憶報告',
    blackboxTitle: 'VibeBox 黑箱報告',
    doctorTitle: 'VibeBox 診斷',
    task: '任務',
    userTask: '使用者任務',
    userSuccessCriteria: '使用者成功標準',
    aiFailureAvoidance: 'AI 失敗避免',
    aiSuccessfulApproaches: 'AI 成功做法',
    none: '無。',
    pageUserPreferences: '使用者傾向',
    pageUserPatterns: '使用者模式',
    pageDesignPhilosophy: '設計哲學',
    pageValidationPatterns: '驗證模式',
    pageProcessPatterns: '處理方式',
    pageDecisionPatterns: '判斷方式',
    pageTechnologyPreferences: '技術偏好',
    pageAgentFailurePatterns: 'AI 失敗模式',
    pageAgentSuccessPatterns: 'AI 成功模式',
    pagePreventionRules: '預防規則',
    pageGlobalAvoidRules: '全域禁止規則',
    pageFailureMemory: '失敗記憶',
    pageSuccessPatterns: '成功模式',
    pageToolingPreferences: '工具偏好',
    pageWorkflowRules: '工作流程規則',
    pageProjectIndex: '專案索引',
    activeMemory: '活躍記憶',
    pendingCandidates: '待處理候選',
    recentBlackboxEvents: '最近黑箱事件',
    preventionRules: '預防規則',
    project: '專案',
    status: '狀態',
    errors: '錯誤',
    warnings: '警告',
    noIssuesFound: '未發現問題。'
  },
  ar: {
    ...LOCALE_TEMPLATES['en-US'],
    homeTitle: 'صفحة VibeBox الرئيسية',
    contextTitle: 'حزمة سياق VibeBox',
    pretaskTitle: 'موجز VibeBox قبل المهمة',
    reportTitle: 'تقرير ذاكرة VibeBox',
    blackboxTitle: 'تقرير الصندوق الأسود VibeBox',
    doctorTitle: 'تشخيص VibeBox',
    task: 'المهمة',
    userTask: 'مهمة المستخدم',
    userSuccessCriteria: 'معايير نجاح المستخدم',
    aiFailureAvoidance: 'تجنب فشل الذكاء الاصطناعي',
    aiSuccessfulApproaches: 'أساليب نجاح الذكاء الاصطناعي',
    none: 'لا يوجد.',
    pageUserPreferences: 'ميول المستخدم',
    pageUserPatterns: 'أنماط المستخدم',
    pageDesignPhilosophy: 'فلسفة التصميم',
    pageValidationPatterns: 'أنماط التحقق',
    pageProcessPatterns: 'أساليب المعالجة',
    pageDecisionPatterns: 'أساليب الحكم',
    pageTechnologyPreferences: 'تفضيلات التقنية',
    pageAgentFailurePatterns: 'أنماط فشل الذكاء الاصطناعي',
    pageAgentSuccessPatterns: 'أنماط نجاح الذكاء الاصطناعي',
    pagePreventionRules: 'قواعد الوقاية',
    pageGlobalAvoidRules: 'قواعد الحظر العامة',
    pageFailureMemory: 'ذاكرة الفشل',
    pageSuccessPatterns: 'أنماط النجاح',
    pageToolingPreferences: 'تفضيلات الأدوات',
    pageWorkflowRules: 'قواعد سير العمل',
    pageProjectIndex: 'فهرس المشاريع',
    activeMemory: 'الذاكرة النشطة',
    pendingCandidates: 'المرشحون المعلقون',
    recentBlackboxEvents: 'أحداث الصندوق الأسود الأخيرة',
    preventionRules: 'قواعد الوقاية',
    project: 'المشروع',
    status: 'الحالة',
    errors: 'الأخطاء',
    warnings: 'التحذيرات',
    noIssuesFound: 'لم يتم العثور على مشكلات.'
  }
});

function resolveLocale(input = {}, config = {}) {
  const explicit = input.locale
    || input.language;
  const configured = config.memoryLanguage
    || config.outputLanguage
    || config.contextLanguage
    || config.reportLanguage
    || config.wikiLanguage
    || config.locale;
  const selected = explicit || configured || process.env.VIBEBOX_LANGUAGE || process.env.VIBEBOX_LOCALE || detectLanguageFromText(languageDetectionText(input)) || detectSystemLocale();
  if (String(selected).toLowerCase() === 'auto') {
    return defaultSupportedLanguageTag(detectLanguageFromText(languageDetectionText(input)) || config.locale || detectSystemLocale(), 'en-US');
  }
  return normalizeConfigLanguageTag(selected, 'en-US');
}

function localeTemplateKey(locale) {
  const normalized = normalizeLocale(locale);
  if (LOCALE_TEMPLATES[normalized]) return normalized;
  return 'en-US';
}

function localeTemplates(locale) {
  return LOCALE_TEMPLATES[localeTemplateKey(locale)] || LOCALE_TEMPLATES['en-US'];
}

function t(locale, key) {
  return localeTemplates(locale)[key] || LOCALE_TEMPLATES['en-US'][key] || key;
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
  const localeTag = normalizeConfigLanguageTag(locale, 'en-US');
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

export async function initVibeBox(root = process.cwd()) {
  const base = vibeboxPath(root);
  const created = [];
  const config = await createDefaultConfig();
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
  const defaults = await createDefaultConfig();
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

function normalizeEnum(value, allowed, fallback = 'unknown') {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/gu, '_');
  return allowed.has(normalized) ? normalized : fallback;
}

function inferUserFeedbackSignal(feedback = '') {
  const text = normalizeText(feedback);
  if (!text) return 'none';
  if (textHasAny(text, ['reject', 'rejected', 'not the right direction', 'wrong direction', 'this is not', 'redo', 'start over', 'instead', '\uB9C8\uC74C\uC5D0 \uC548', '\uB2E4\uC2DC \uD574', '\uADF8\uAC70 \uC544\uB2C8', '\uBC29\uD5A5\uC774 \uD2C0'])) return 'rejection';
  if (textHasAny(text, ['confirmed', 'accepted', 'approved', 'keep this', 'looks good', 'good direction', 'works for me', 'reuse this', 'go with this', 'this is right', '\uC88B\uB2E4', '\uC774\uB300\uB85C', '\uC720\uC9C0', '\uC774\uAC8C \uB9DE'])) return 'acceptance';
  if (textHasAny(text, ['mixed', 'partly', 'partially', 'but', 'however'])) return 'mixed';
  return 'comment';
}

function inferUserAcceptance(input = {}) {
  const explicit = normalizeEnum(input.userAcceptance || input.user_acceptance, USER_ACCEPTANCE_VALUES, '');
  if (explicit) return explicit;
  const signal = inferUserFeedbackSignal(input.userFeedback || input.feedback || '');
  if (signal === 'rejection') return 'rejected';
  if (signal === 'acceptance') return 'accepted';
  if (signal === 'mixed') return 'mixed';
  return 'unknown';
}

function inferStatementAcceptance(statement = '', source = {}) {
  if (source.role === 'userFeedback') {
    return inferUserAcceptance({ userFeedback: statement });
  }
  return 'unknown';
}

function inferTechnicalOutcome(input = {}) {
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

function extractCorrectionDirection(feedback = '') {
  const text = String(feedback || '').trim();
  const negative = text.match(/\b(?:do not|don't|dont|never|avoid|must not|stop)\b\s+(.+)/iu);
  if (negative) return summarizeStatement(`${negative[0]}`);
  const match = text.match(/(?:^|[.;]\s*)\b(?:use|prefer)\b[:\s]+(.+)/iu)
    || text.match(/\binstead\b[:,\s]+(?:use|prefer)\b[:\s]+(.+)/iu)
    || text.match(/\binstead\b[:]\s+(.+)/iu);
  return summarizeStatement(match?.[1] || text);
}

function deriveOutcomeFields(input = {}) {
  const technicalOutcome = inferTechnicalOutcome(input);
  const userAcceptance = inferUserAcceptance(input);
  const finalOutcome = deriveFinalOutcome(technicalOutcome, userAcceptance, input.finalOutcome || input.final_outcome);
  const userFeedbackSignal = inferUserFeedbackSignal(input.userFeedback || input.feedback || '');
  const successEvidenceText = [
    input.userFeedback || input.feedback || '',
    input.aiActionSummary || input.summary || '',
    input.commandResult || '',
    ...(Array.isArray(input.commandResults) ? input.commandResults : []),
    input.notes || ''
  ].filter(Boolean).join('\n');
  const successEvidence = normalizeEnum(input.successEvidence || input.acceptanceBasis, SUCCESS_EVIDENCE_VALUES, inferSuccessEvidence(successEvidenceText, {
    ...input,
    technicalOutcome,
    userAcceptance,
    finalOutcome,
    userFeedbackSignal
  }));
  const rejectionReason = userAcceptance === 'rejected'
    ? summarizeStatement(input.userFeedback || input.feedback || input.aiActionSummary || input.summary || '')
    : '';
  const correctionDirection = userAcceptance === 'rejected' || userAcceptance === 'mixed'
    ? extractCorrectionDirection(input.userFeedback || input.feedback || input.notes || '')
    : '';
  const preventionRule = userAcceptance === 'rejected'
    ? `Do not repeat the rejected direction without confirmation. ${correctionDirection ? `Prefer: ${correctionDirection}` : ''}`.trim()
    : '';
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

function determineScope(statement, domains) {
  if (isTaskOnlyImplementationBoundary(statement) || isCurrentTaskChecklist(statement)) {
    return 'task';
  }
  if (textHasAny(statement, ['for this task only', 'this task only', 'temporarily', 'temporary', 'this once'])) {
    return textHasAny(statement, ['temporarily', 'temporary']) ? 'temporary' : 'task';
  }
  if (textHasAny(statement, ['subagent workflow', 'reference material', 'reference image', 'extract design principles', 'do not copy', 'final report should include', 'report changed files', 'do not assume the same design direction', 'different project type', 'project type'])) {
    return 'global';
  }
  if (textHasAny(statement, ['this project', 'we decided this project', 'in this repo', 'current project'])) {
    return 'project';
  }
  if (textHasAny(statement, ['i want to build', 'current tool', 'existing logo', 'preserve current', 'keep the page', 'one-page landing', 'internal company use'])) {
    return 'project';
  }
  if (domains.length > 0 && textHasAny(statement, [
    'for dashboard',
    'dashboard projects',
    'for app',
    'app projects',
    'backend services',
    'frontend',
    'landing page',
    'brand landing',
    'native app',
    'internal workflow',
    'internal company'
  ])) {
    return 'domain';
  }
  if (textHasAny(statement, ['always', 'do not', 'never', 'unless explicitly requested', 'i usually', 'i prefer'])) {
    return 'global';
  }
  return domains.length > 0 ? 'domain' : 'task';
}

function isTaskOnlyImplementationBoundary(statement) {
  const text = String(statement || '');
  if (textHasAny(text, ['use html/css/vanilla js only', 'npm/build tooling', 'unrelated files'])) return true;
  if (textHasAny(text, ['fake plugins', 'fake testimonials']) && textHasAny(text, ['do not add', 'unnecessary'])) return true;
  return textHasAny(text, ['do not add frameworks']) && textHasAny(text, ['backend code', 'build tooling']);
}

function isCurrentTaskChecklist(statement) {
  const text = String(statement || '');
  if (!textHasAny(text, ['before reporting completion', 'final report should include'])) return false;
  return textHasAny(text, [
    'logo.webp',
    'seo/head',
    'language switching',
    'hero was redesigned',
    'saas feeling',
    'concept image',
    'mobile layout',
    'overall atmosphere',
    'current tool'
  ]);
}

function normalizeCandidateScope(type, scope, statement) {
  if (!PATTERN_TYPES.has(type)) return scope;
  if (scope === 'temporary' || scope === 'project') return scope;
  if (scope === 'task' && textHasAny(statement, ['for this task only', 'this task only', 'this once'])) return scope;
  if (textHasAny(statement, ['for dashboard', 'dashboard projects', 'backend services', 'frontend', 'landing page', 'brand landing', 'native app', 'internal workflow'])) return scope;
  return scope === 'domain' ? 'domain' : 'global';
}

function determineConfidence(statement, type, scope) {
  if (type === 'agent_failure_pattern' && textHasAny(statement, ['permission denied', 'access denied', 'eperm', 'eacces', 'enoent', 'command failed', 'tool failed', 'api failed', 'browser failed', 'image generation failed'])) {
    return 'high';
  }
  if (textHasAny(statement, ['maybe', 'might', 'feels', 'try later', 'can try'])) {
    return 'low';
  }
  if (scope === 'task' || scope === 'temporary') {
    return 'low';
  }
  if (PATTERN_TYPES.has(type)) {
    if (textHasAny(statement, ['repeatedly', 'always', 'must', 'before claiming completion', '완료를 말하기 전에'])) {
      return 'high';
    }
    return 'medium';
  }
  if (type === 'avoid_rule' && textHasAny(statement, ['do not', 'never', 'must not', 'forbidden'])) {
    return 'high';
  }
  if (type === 'project_decision' && textHasAny(statement, ['decided', 'confirmed', 'uses', 'use echarts'])) {
    return 'high';
  }
  if (type === 'success_pattern' && textHasAny(statement, ['worked successfully', 'approved', 'confirmed', 'accepted', 'reuse', 'should be reused'])) {
    return 'high';
  }
  if (type === 'failure_memory' && textHasAny(statement, ['caused', 'failed', 'regression', 'rejected'])) {
    return 'medium';
  }
  if (type === 'design_preference' && textHasAny(statement, ['visual direction', 'catalog direction', 'saas style', 'color palette', 'landing page', 'brand landing', 'native app'])) {
    return 'medium';
  }
  if (['workflow_rule', 'process_pattern', 'response_preference'].includes(type) && textHasAny(statement, ['subagent workflow', 'before coding', 'create a concise plan', 'final report should include', 'report changed files'])) {
    return 'medium';
  }
  if (type === 'architecture_rule' && textHasAny(statement, ['simple', 'maintainable', 'preserve existing architecture'])) {
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
  const hasReusableSuccess = textHasAny(statement, ['worked successfully', 'successful', 'reuse', 'should be reused', 'keep this approach', 'accepted reusable approach']);
  const hasDecision = textHasAny(statement, ['we decided', 'decided this project', 'this project uses', 'uses echarts', 'after rejecting']);
  const hasPreference = textHasAny(statement, ['prefer', 'usually prefer', 'i prefer']);
  const hasDurableUseInstruction = textHasAny(statement, ['for dashboard projects, use', 'dashboard projects use', 'for app projects, use', 'app projects use', 'this project uses']);
  const hasWorkflow = textHasAny(statement, ['review first', 'approval', 'workflow', 'subagent workflow', 'before coding', 'before implementation', 'inspect the existing project structure', 'create a concise plan']);
  const hasArchitecture = textHasAny(statement, ['architecture', 'component-level', 'preserve existing behavior', 'simple maintainable architecture']);

  if (textHasAny(statement, ['do not repeat this failed approach', 'prevent this by checking'])) return 'prevention_rule';
  if (textHasAny(statement, ['user rejected a technically completed result', 'technical success did not match', 'ai failed because', 'failed from the ai perspective'])) return 'agent_failure_pattern';
  if (textHasAny(statement, ['ai execution failure', 'permission denied', 'access denied', 'eperm', 'eacces', 'enoent', 'command failed', 'tool failed', 'api failed', 'browser failed', 'image generation failed'])) return 'agent_failure_pattern';
  if (textHasAny(statement, ['recovered by', 'recovery approach', 'workaround', 'alternative command'])) return 'agent_success_pattern';

  if (textHasAny(statement, ['agent repeatedly fails', 'ai repeatedly fails', 'agent failed', 'ai failed', 'agent failure', 'repeatedly fails by', '에이전트가 반복적으로 실패'])) return 'agent_failure_pattern';
  if (textHasAny(statement, ['agent succeeded', 'ai succeeded', 'agent success', 'succeeded by', 'successfully handled by', '에이전트가 성공'])) return 'agent_success_pattern';
  if (isTaskOnlyImplementationBoundary(statement) || isCurrentTaskChecklist(statement)) return 'task_context';
  if (hasReusableSuccess && !hasRejection) return 'success_pattern';
  if (textHasAny(statement, ['reference material', 'reference image', 'extract design principles', 'do not copy', 'not copied literally'])) return 'user_preference';
  if (textHasAny(statement, ['final report should include', 'report changed files', 'remaining risks', 'remaining limitations'])) return 'response_preference';
  if (textHasAny(statement, ['when validating', 'validation pattern', 'verification pattern', 'verify changes', 'before claiming completion', 'run checks before', 'before reporting completion', 'validation result', 'build or type checks', 'manual flow', '검증할 때', '검증 방식', '완료를 말하기 전에'])) return 'validation_pattern';
  if (textHasAny(statement, ['work process', 'process pattern', 'inspect the repository first', 'inspect the existing project structure', 'small scoped edits', 'create a concise plan', 'plan before coding', '작업 진행', '처리 방식'])) return 'process_pattern';
  if (textHasAny(statement, ['design philosophy', '설계 철학', 'preserve existing architecture', 'anti-patch', 'full visual direction reset', 'whole direction reset'])) return 'design_philosophy';
  if (textHasAny(statement, ['question pattern', 'question style', 'when asking', '질문 방식'])) return 'question_pattern';
  if (textHasAny(statement, ['response preference', 'answer style', 'reply style', 'final report should include', 'report changed files', 'remaining risks', '답변 방식', '답변 선호'])) return 'response_preference';
  if (textHasAny(statement, ['communication pattern', 'conversation style', 'feedback style', '대화 방식'])) return 'communication_pattern';
  if (textHasAny(statement, ['correction pattern', 'user correction', 'when corrected', '교정 방식'])) return 'correction_pattern';
  if (textHasAny(statement, ['decision pattern', 'decision style', 'judgment style', '판단 방식'])) return 'decision_pattern';
  if (textHasAny(statement, ['handoff pattern', 'handoff', 'handover', '인수인계'])) return 'handoff_pattern';
  if (textHasAny(statement, ['allowed files', 'only edit', 'for this task', 'current section structure', 'current report checklist', 'receipt image attachment', 'trip request creation', 'approval status tracking'])) return 'task_context';
  if (textHasAny(statement, ['raw instruction text', 'one-off', 'exact text', 'generated logo', 'fake testimonials', 'pricing', 'login', 'analytics', 'cms', 'unrelated files'])) return hasRejection ? 'avoid_rule' : 'discarded_detail';
  if (hasPreference && textHasAny(statement, ['technology', 'stack', 'library', 'framework'])) return 'technology_preference';
  if (textHasAny(statement, ['visual direction', 'dark premium', 'cinematic', '3d hero', 'clean practical readable', 'business-like', 'card-heavy', 'dashboard-like', 'color palette', 'blue palette', 'violet palette', 'catalog direction', 'saas style'])) return 'design_preference';
  if (textHasAny(statement, ['project type', 'different project type', 'do not assume the same design direction', 'not a marketing landing page', 'not a saas product homepage'])) return 'user_preference';
  if (textHasAny(statement, ['i want to build', 'current tool', 'existing logo', 'preserve current', 'keep the page', 'one-page landing', 'internal company use'])) return 'project_decision';
  if (textHasAny(statement, ['except for', 'exception', 'only when', 'apart from']) && textHasAny(statement, ['use', 'prefer', 'instead of'])) return 'user_preference';
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
  if (textHasAny(statement, ['verification', 'validating', 'verify', 'npm.cmd test', '검증'])) {
    return 'verification process';
  }
  if (textHasAny(statement, ['work process', 'inspect the repository first', 'small scoped edits', '작업 진행', '처리 방식'])) {
    return 'work process';
  }
  if (textHasAny(statement, ['design philosophy', 'preserve existing architecture', '설계 철학'])) {
    return 'design philosophy';
  }
  if (textHasAny(statement, ['agent repeatedly fails', 'before claiming completion'])) {
    return 'agent verification failure';
  }
  if (textHasAny(statement, ['agent succeeded', 'focused tests'])) {
    return 'agent success process';
  }
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
  if (domains.includes('landing_page') || tags.includes('landing page')) return 'brand landing page design';
  if (domains.includes('native_internal_app')) return 'native internal app workflow';
  if (tags.includes('reference') || tags.includes('principles')) return 'reference handling';
  if (tags.includes('approval') || tags.includes('expense') || tags.includes('receipt')) return 'approval and expense workflow';
  if (tags.includes('3d') || tags.includes('hero') || tags.includes('cinematic')) return 'premium visual direction';
  if (tags.includes('touch targets') || tags.includes('data clarity')) return 'mobile workflow readability';
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

const METADATA_LABEL_PREFIX_PATTERN = /^(?:direct|english file|korean file|fixture|test fixture|test|example\s+[a-z0-9]+|user requested|user request|original request|original user request|ai action summary|action summary|summary|notes|source|parser|section|\uC0AC\uC6A9\uC790\s+\uC694\uCCAD|\uC6D0\s+\uC0AC\uC6A9\uC790\s+\uC694\uCCAD|\uC694\uCCAD|\uC694\uC57D)\s*[:\uFF1A]\s*/iu;
const EMBEDDED_METADATA_LABEL_PATTERN = /(^|[.;]\s*)(?:direct|english file|korean file|fixture|test fixture|test|example\s+[a-z0-9]+|user requested|user request|original request|original user request|ai action summary|action summary|summary|notes|source|parser|section|\uC0AC\uC6A9\uC790\s+\uC694\uCCAD|\uC6D0\s+\uC0AC\uC6A9\uC790\s+\uC694\uCCAD|\uC694\uCCAD|\uC694\uC57D)\s*[:\uFF1A]\s*/giu;
const GENERATED_STATEMENT_PREFIX_PATTERN = /^(?:accepted reusable approach|user accepted this approach|this approach was confirmed by the user and worked successfully|this task failed from the user's perspective|user rejected this direction|correction pattern|agent failure pattern|ai execution failure|agent success recovery approach|the approach failed|this task failed)\s*[:\uFF1A]\s*/iu;
const MEMORY_METADATA_LABEL_PATTERN = /(?:^|\b)(?:english file|korean file|fixture|test fixture|test|example\s+[a-z0-9]+|user request|original request|ai action summary|action summary|source|parser|section)\s*[:\uFF1A]/iu;

function stripMemoryMetadataLabels(value) {
  let text = String(value ?? '').replace(/\s+/gu, ' ').trim();
  for (let index = 0; index < 6; index += 1) {
    const before = text;
    text = text
      .replace(METADATA_LABEL_PREFIX_PATTERN, '')
      .replace(GENERATED_STATEMENT_PREFIX_PATTERN, '')
      .trim();
    if (text === before) break;
  }
  return text
    .replace(EMBEDDED_METADATA_LABEL_PATTERN, '$1')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([,.;:])/gu, '$1')
    .replace(/;+\s*\./gu, '.')
    .replace(/\.{2,}/gu, '.')
    .trim();
}

function normalizeStatementForMemory(statement) {
  return stripMemoryMetadataLabels(redactSensitive(statement));
}

function generatedSnippet(value) {
  return normalizeStatementForMemory(value)
    .replace(/[.!?]+(?=\s|$)/gu, ';')
    .replace(/;{2,}/gu, ';')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/;$/u, '');
}

function cleanRecoverySnippet(value) {
  const text = generatedSnippet(value)
    .replace(/^(?:recovered by|recovery approach|workaround|alternative command)\s*[:\s-]*/iu, '')
    .trim();
  return text || generatedSnippet(value);
}

function uniqueNonEmpty(values = []) {
  const seen = new Set();
  return values.filter(Boolean).filter((value) => {
    const key = String(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function correctionContextSnippet(value) {
  const text = generatedSnippet(value)
    .replace(/^(?:redesign|build|fix|update|implement|create)\s+/iu, '')
    .replace(/[.;:]+$/u, '')
    .trim();
  return text || 'the current task';
}

function containsMemoryMetadataLabel(value) {
  const text = String(value ?? '');
  return MEMORY_METADATA_LABEL_PATTERN.test(text)
    || /confirmed by the user and worked successfully/iu.test(text);
}

function summarizeStatement(statement) {
  const text = normalizeStatementForMemory(statement);
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function hasReusableSuccessSignal(statement = '') {
  return textHasAny(statement, [
    'should be reused',
    'reuse when',
    'reusable approach',
    'reusable pattern',
    'reuse this',
    'kept dependencies unchanged',
    'component-level wrapper',
    'wrapper-based',
    'focused tests',
    'ran checks',
    'verified'
  ]);
}

function hasTechnicalSuccessSignal(statement = '', source = {}) {
  if (normalizeEnum(source.technicalOutcome, TECHNICAL_OUTCOMES, 'unknown') === 'success') return true;
  return textHasAny(statement, [
    'worked successfully',
    'validation passed',
    'tests passed',
    'checks passed',
    'build passed',
    'type checks passed',
    'verified',
    'ran checks',
    'all tests passed'
  ]);
}

function inferSuccessEvidence(statement = '', source = {}) {
  const userAcceptance = normalizeEnum(source.userAcceptance, USER_ACCEPTANCE_VALUES, 'unknown');
  const finalOutcome = normalizeEnum(source.finalOutcome, FINAL_OUTCOMES, 'unknown');
  const feedbackSignal = source.userFeedbackSignal || 'none';
  if (userAcceptance === 'rejected' || finalOutcome === 'technical_success_user_rejected' || feedbackSignal === 'rejection') return 'rejected';
  if (userAcceptance === 'accepted' || finalOutcome === 'accepted_success' || feedbackSignal === 'acceptance') return 'confirmed';
  if (
    userAcceptance === 'unknown'
    && finalOutcome !== 'failed'
    && !textHasAny(statement, ['rejected', 'wrong direction', 'not the right direction', 'redo', 'start over'])
    && hasTechnicalSuccessSignal(statement, source)
    && hasReusableSuccessSignal(statement)
  ) {
    return 'inferred';
  }
  return 'unknown';
}

function sourceOutcomeFields(source = {}, statement = '') {
  const canUseStatementAsFeedback = source.role === 'userFeedback' || source.kind === 'userFeedback' || source.kind === 'user_feedback';
  const statementAcceptance = canUseStatementAsFeedback ? inferStatementAcceptance(statement, source) : 'unknown';
  const technicalOutcome = normalizeEnum(source.technicalOutcome, TECHNICAL_OUTCOMES, 'unknown');
  const userAcceptance = normalizeEnum(source.userAcceptance, USER_ACCEPTANCE_VALUES, statementAcceptance || 'unknown');
  const finalOutcome = normalizeEnum(source.finalOutcome, FINAL_OUTCOMES, deriveFinalOutcome(technicalOutcome, userAcceptance));
  const successEvidence = normalizeEnum(source.successEvidence || source.acceptanceBasis, SUCCESS_EVIDENCE_VALUES, inferSuccessEvidence(statement, {
    ...source,
    technicalOutcome,
    userAcceptance,
    finalOutcome
  }));
  return {
    technicalOutcome,
    userAcceptance,
    userFeedbackSignal: source.userFeedbackSignal || (statementAcceptance === 'unknown' ? 'none' : statementAcceptance === 'accepted' ? 'acceptance' : 'rejection'),
    finalOutcome,
    successEvidence,
    acceptanceBasis: successEvidence,
    rejectionReason: source.rejectionReason || '',
    correctionDirection: source.correctionDirection || '',
    preventionRule: source.preventionRule || ''
  };
}

function inferModelClass(candidate) {
  if (!candidate) return 'discarded_detail';
  if (candidate.type === 'discarded_detail') return 'discarded_detail';
  if (candidate.type === 'task_context' || ['task', 'temporary'].includes(candidate.scope)) return 'task_context';
  if (candidate.scope === 'project' || candidate.projectId || candidate.type === 'project_decision') return 'project_model';
  if (candidate.scope === 'domain') return 'domain_model';
  if (['avoid_rule', 'failure_memory', 'success_pattern'].includes(candidate.type) && (candidate.domains || []).length > 0) return 'domain_model';
  return 'user_model';
}

function inferModelSubClass(candidate) {
  if (!candidate) return 'discarded_detail';
  if (candidate.type === 'discarded_detail') return 'discarded_detail';
  if (candidate.type === 'task_context' || ['task', 'temporary'].includes(candidate.scope)) {
    if (textHasAny(candidate.summary, ['only edit', 'allowed files'])) return 'current_allowed_files';
    if (isTaskOnlyImplementationBoundary(candidate.summary)) return 'current_implementation_constraint';
    if (isCurrentTaskChecklist(candidate.summary)) return 'current_validation_checklist';
    if (textHasAny(candidate.summary, ['verify', 'checklist', 'before reporting completion', 'validation'])) return 'current_validation_checklist';
    if (textHasAny(candidate.summary, ['reference image', 'reference material'])) return 'current_reference_material';
    return 'current_task_scope';
  }
  if (candidate.scope === 'project' || candidate.projectId) {
    if (textHasAny(candidate.summary, ['preserve', 'do not replace', 'keep current'])) return 'project_preservation_rule';
    if (textHasAny(candidate.summary, ['asset', 'logo', 'image'])) return 'project_asset_rule';
    if (textHasAny(candidate.summary, ['language', 'toggle', 'localization', 'ko/en'])) return 'project_localization_rule';
    if (candidate.type === 'project_decision') return 'project_decision';
    return 'project_constraint';
  }
  if (candidate.scope === 'domain' || inferModelClass(candidate) === 'domain_model') {
    if (candidate.type === 'avoid_rule' || textHasAny(candidate.summary, ['avoid', 'do not', 'not a'])) return 'domain_avoidance';
    if (candidate.type === 'validation_pattern') return 'domain_validation';
    if (candidate.type === 'process_pattern') return 'domain_process';
    if (candidate.type === 'failure_memory') return 'domain_failure_prevention';
    if (candidate.type === 'success_pattern') return 'domain_success_criterion';
    return 'domain_preference';
  }
  const byType = {
    design_preference: 'visual_preference_model',
    response_preference: 'response_preference_model',
    process_pattern: 'process_preference_model',
    validation_pattern: 'validation_preference_model',
    communication_pattern: 'reporting_preference_model',
    design_philosophy: 'design_philosophy_model',
    avoid_rule: 'rejection_criteria_model',
    failure_memory: 'rejection_criteria_model',
    correction_pattern: 'rejection_criteria_model',
    user_preference: 'preference_model',
    workflow_rule: 'process_preference_model',
    decision_pattern: 'scope_control_preference_model'
  };
  if (textHasAny(candidate.summary, ['reference image', 'reference material', 'do not copy'])) return 'reference_handling_model';
  if (textHasAny(candidate.summary, ['project type', 'same design direction', 'implementation boundaries', 'only edit'])) return 'scope_control_preference_model';
  if (textHasAny(candidate.summary, ['final report', 'report changed files', 'remaining risks'])) return 'reporting_preference_model';
  return byType[candidate.type] || 'preference_model';
}

function sourceIndicatesFailure(source = {}, statement = '') {
  return normalizeEnum(source.userAcceptance, USER_ACCEPTANCE_VALUES, 'unknown') === 'rejected'
    || normalizeEnum(source.finalOutcome, FINAL_OUTCOMES, 'unknown') === 'technical_success_user_rejected'
    || normalizeEnum(source.technicalOutcome, TECHNICAL_OUTCOMES, 'unknown') === 'failure'
    || source.userFeedbackSignal === 'rejection'
    || textHasAny(statement, [
      'user rejected',
      'technically completed result',
      'ai execution failure',
      'agent failure',
      'approach failed',
      'failed approach',
      'command failed',
      'permission denied',
      'access denied',
      'tool failed',
      'api failed',
      'browser failed',
      'image generation failed'
    ]);
}

function inferMemoryRole(candidate, source = {}, statement = '') {
  if (!candidate) return 'discarded_detail';
  if (candidate.type === 'discarded_detail' || candidate.modelClass === 'discarded_detail') return 'discarded_detail';
  if (candidate.type === 'task_context' || candidate.modelClass === 'task_context' || ['task', 'temporary'].includes(candidate.scope)) return 'task_context';
  if (['success_pattern', 'agent_success_pattern'].includes(candidate.type)) return 'ai_successful_approach';
  if (['failure_memory', 'agent_failure_pattern', 'correction_pattern'].includes(candidate.type)) return 'ai_failure_memory';
  if (candidate.type === 'prevention_rule' && sourceIndicatesFailure(source, statement)) return 'ai_failure_memory';
  if (candidate.type === 'avoid_rule' && source?.role === 'userFeedback') return 'user_success_criteria';
  if (candidate.type === 'avoid_rule' && sourceIndicatesFailure(source, statement)) return 'ai_failure_memory';
  return 'user_success_criteria';
}

function inferAffectedContext(statement = '') {
  if (textHasAny(statement, ['permission denied', 'access denied', 'eperm', 'eacces'])) return 'filesystem permissions';
  if (textHasAny(statement, ['enoent', 'path', 'directory', 'folder'])) return 'filesystem path access';
  if (textHasAny(statement, ['command failed', 'npm', 'test', 'build', 'check'])) return 'command execution';
  if (textHasAny(statement, ['browser failed', 'browser access'])) return 'browser automation';
  if (textHasAny(statement, ['api failed', 'image generation failed', 'tool failed'])) return 'tool runtime';
  if (textHasAny(statement, ['visual', 'design', 'saas', 'catalog', 'direction'])) return 'visual direction';
  return 'current AI coding task';
}

function inferRecoveryApproach(statement = '') {
  const text = String(statement || '').trim();
  const match = text.match(/\b(?:recovered by|recovery approach|workaround|alternative command)\b[:\s-]*(.+)/iu);
  if (match) return summarizeStatement(match[1]);
  if (textHasAny(text, ['instead of'])) return summarizeStatement(text);
  return '';
}

function applyMemoryRoleFields(candidate, statement, source = {}) {
  candidate.memoryRole = normalizeEnum(candidate.memoryRole, MEMORY_ROLE_VALUES, inferMemoryRole(candidate, source, statement));
  if (candidate.memoryRole === 'user_success_criteria') {
    candidate.successCriterion = candidate.summary;
    candidate.successEvidence = candidate.successEvidence === 'rejected' ? 'unknown' : candidate.successEvidence;
    candidate.acceptanceBasis = candidate.acceptanceBasis === 'rejected' ? 'unknown' : candidate.acceptanceBasis;
    candidate.userAcceptance = candidate.userAcceptance === 'rejected' ? 'unknown' : candidate.userAcceptance;
    candidate.finalOutcome = candidate.finalOutcome === 'technical_success_user_rejected' ? 'unknown' : candidate.finalOutcome;
  }
  if (candidate.memoryRole === 'ai_failure_memory') {
    candidate.failureType = candidate.failureType || inferFailureType(statement);
    candidate.failureCategory = candidate.failureType;
    candidate.failedApproach = candidate.failedApproach || inferFailureApproach(statement);
    candidate.failureReason = candidate.failureReason || candidate.summary;
    candidate.preventionRule = candidate.preventionRule || inferPreventionRule(statement);
    candidate.affectedContext = candidate.affectedContext || inferAffectedContext(statement);
    candidate.recurrenceRisk = candidate.recurrenceRisk || (candidate.confidence === 'high' ? 'high' : 'medium');
  }
  if (candidate.memoryRole === 'ai_successful_approach') {
    candidate.successfulApproach = candidate.successfulApproach || candidate.summary;
    candidate.recoveryApproach = candidate.recoveryApproach || inferRecoveryApproach(statement);
    candidate.reuseWhen = candidate.reuseWhen || candidate.appliesTo;
  }
  return candidate;
}

function normalizeCandidateModel(candidate) {
  candidate.modelClass = candidate.modelClass || inferModelClass(candidate);
  candidate.modelSubClass = candidate.modelSubClass || inferModelSubClass(candidate);
  candidate.docKey = candidate.docKey || docKeyForType(candidate.type);
  return candidate;
}

function buildCandidate(statement, source, activeMemories) {
  if (containsSensitive(statement)) {
    return null;
  }

  const normalizedStatement = normalizeStatementForMemory(statement);
  if (!normalizedStatement) {
    return null;
  }

  let type = inferType(normalizedStatement);
  if (source?.role === 'userRequest' && ['success_pattern', 'agent_success_pattern'].includes(type)) {
    type = 'user_preference';
  }
  if (!type || !MEMORY_TYPES.has(type)) {
    return null;
  }
  if (source?.role === 'aiActionSummary' && !['accepted', 'rejected', 'mixed'].includes(source.userAcceptance || '') && !source.allowActionSummary) {
    return null;
  }

  const domains = extractDomains(normalizedStatement);
  const tags = extractTags(normalizedStatement);
  const scope = normalizeCandidateScope(type, determineScope(normalizedStatement, domains), normalizedStatement);
  const confidence = determineConfidence(normalizedStatement, type, scope);
  const topic = inferTopic(normalizedStatement, tags, domains);
  const timestamp = nowIso();
  const summary = summarizeStatement(normalizedStatement);
  const appliesTo = inferAppliesTo(normalizedStatement, scope, domains, topic);
  const outcomeFields = sourceOutcomeFields(source, normalizedStatement);
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
    sourceTextKind: source?.role || source?.kind || 'text',
    sourcePriority: source?.priority || 99,
    evidence: [{
      kind: source?.kind || 'text',
      role: source?.role || 'text',
      summary
    }],
    technicalOutcome: outcomeFields.technicalOutcome,
    userAcceptance: outcomeFields.userAcceptance,
    userFeedbackSignal: outcomeFields.userFeedbackSignal,
    successEvidence: outcomeFields.successEvidence,
    acceptanceBasis: outcomeFields.acceptanceBasis,
    finalOutcome: outcomeFields.finalOutcome,
    rejectionReason: outcomeFields.rejectionReason,
    correctionDirection: outcomeFields.correctionDirection,
    preventionRule: outcomeFields.preventionRule,
    confidence,
    status: 'pending',
    conflictStatus: 'no_conflict',
    supersedes: [],
    related: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: null
  };

  enrichTypedFields(candidate, normalizedStatement);
  normalizeCandidateModel(candidate);
  applyMemoryRoleFields(candidate, normalizedStatement, source);
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

function semanticNormalize(text = '') {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

function hasHangul(text = '') {
  return /[\uAC00-\uD7A3]/u.test(String(text || ''));
}

function semanticLanguage(text = '') {
  return hasHangul(text) ? 'ko' : 'en';
}

function semanticHasAny(text, phrases = []) {
  const normalized = semanticNormalize(text);
  return phrases.some((phrase) => normalized.includes(semanticNormalize(phrase)));
}

function cleanRequestLine(line = '') {
  return String(line || '')
    .replace(/^\s*[-*•]\s*/u, '')
    .replace(/^\s*\d+[.)]\s*/u, '')
    .replace(/^\s*\[[ x]\]\s*/iu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function shortSemanticText(text = '', maxLength = 180) {
  const clean = cleanRequestLine(text).replace(/[.;:\uFF1A]+$/u, '').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean;
}

function joinSemanticItems(items = [], maxItems = 4, maxLength = 180) {
  const unique = uniqueNonEmpty(items.map((item) => shortSemanticText(item, maxLength))).slice(0, maxItems);
  return unique.join('; ');
}

function parseRequestSections(text = '') {
  const sections = [];
  let current = { heading: '', lines: [] };
  for (const rawLine of String(text || '').split(/\r?\n/u)) {
    const line = cleanRequestLine(rawLine);
    if (!line) continue;
    const headingMatch = line.match(/^(.{1,48})[:\uFF1A]\s*$/u);
    if (headingMatch) {
      if (current.heading || current.lines.length > 0) sections.push(current);
      current = { heading: headingMatch[1].trim(), lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.heading || current.lines.length > 0) sections.push(current);
  return sections;
}

function shouldSemanticDecomposeUserRequest(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  const lines = value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const bulletCount = lines.filter((line) => /^\s*(?:[-*•]|\d+[.)])/u.test(line)).length;
  const headingCount = lines.filter((line) => /^.{1,48}[:\uFF1A]\s*$/u.test(cleanRequestLine(line))).length;
  return value.length >= 360 || lines.length >= 6 || bulletCount >= 2 || headingCount >= 2;
}

const SEMANTIC_CUES = {
  reference: [
    'basis',
    'baseline',
    'reference',
    'based on',
    'match',
    'standard',
    '기준',
    '참조',
    '바탕',
    '맞춰',
    '따라'
  ],
  consistency: [
    'consistent',
    'consistency',
    'same',
    'matching',
    'uniform',
    'unify',
    'standardize',
    'align',
    'common',
    'repeat',
    'reusable',
    '통일',
    '일관',
    '동일',
    '같은',
    '공통',
    '정렬',
    '반복'
  ],
  preservation: [
    'preserve',
    'keep',
    'do not',
    "don't",
    'must not',
    'only',
    'avoid unnecessary',
    'without changing',
    'scope',
    'unchanged',
    '보존',
    '유지',
    '건드리지',
    '불필요',
    '수정만',
    '만 수정',
    '바꾸지',
    '변경하지'
  ],
  validation: [
    'verify',
    'validate',
    'check',
    'after switching',
    'toggle',
    'mode',
    'language',
    'state',
    'responsive',
    '검증',
    '확인',
    '전환',
    '토글',
    '언어',
    '모드',
    '상태',
    '유지'
  ],
  ordering: [
    'before',
    'after',
    'first',
    'top',
    'above',
    'priority',
    'order',
    '먼저',
    '보다 먼저',
    '최상단',
    '상단',
    '순서',
    '우선'
  ],
  target: [
    'target',
    'targets',
    'apply to',
    'applies to',
    'scope',
    '대상',
    '적용',
    '범위'
  ],
  workflow: [
    'before implementation',
    'before coding',
    'after implementation',
    'workflow',
    'report',
    'plan',
    '구현 전',
    '코딩 전',
    '작업 전',
    '작업 후',
    '보고',
    '계획',
    '흐름'
  ],
  domainUi: [
    'ui',
    'ux',
    'visual',
    'style',
    'design',
    'layout',
    'component',
    'navigation',
    'screen',
    'table',
    'form',
    'page',
    'site',
    '디자인',
    '스타일',
    '위치',
    '정렬',
    '시각',
    '컴포넌트',
    '내비게이션',
    '화면',
    '표',
    '폼',
    '페이지',
    '사이트'
  ],
  technical: [
    'dependency',
    'package',
    'config',
    'command',
    'api',
    'database',
    'setting',
    '설정',
    '명령',
    '의존성',
    '패키지',
    '데이터',
    '인증'
  ]
};

function semanticDomainsForRequest(text = '') {
  const domains = new Set(extractDomains(text));
  if (semanticHasAny(text, SEMANTIC_CUES.domainUi)) {
    domains.add('frontend');
    domains.add('visual_design');
  }
  if (semanticHasAny(text, ['brand', 'landing', 'marketing', '브랜드', '랜딩'])) {
    domains.add('brand_design');
    domains.add('landing_page');
  }
  if (semanticHasAny(text, ['native', 'mobile', 'app', 'ios', 'android', '네이티브', '모바일', '앱'])) {
    domains.add('native_internal_app');
  }
  if (semanticHasAny(text, ['dashboard', 'table', 'reporting', '대시보드', '표', '리포트'])) {
    domains.add('dashboard');
  }
  if (semanticHasAny(text, ['document', 'docx', 'markdown', '문서'])) {
    domains.add('documentation');
  }
  if (semanticHasAny(text, SEMANTIC_CUES.technical)) {
    domains.add('tooling');
  }
  return [...domains];
}

function semanticTopicForRequest(text = '', domains = []) {
  if (domains.includes('visual_design') || domains.includes('frontend')) return 'consistent visual element handling';
  if (domains.includes('native_internal_app')) return 'native app workflow consistency';
  if (domains.includes('dashboard')) return 'dashboard interaction consistency';
  if (domains.includes('documentation')) return 'document output consistency';
  if (domains.includes('tooling')) return 'configuration and tooling preservation';
  return 'structured user success criteria';
}

function semanticAppliesTo(scope, domains, topic) {
  if (scope === 'project') return ['current project'];
  if (scope === 'task') return ['current task'];
  if (domains.length > 0) return domains.map((domain) => `${domain} work`);
  return [topic || 'all projects'];
}

function sectionLinesMatching(sections, cues) {
  return sections.flatMap((section) => (
    semanticHasAny(section.heading, cues)
      ? section.lines
      : section.lines.filter((line) => semanticHasAny(line, cues))
  ));
}

function firstMeaningLine(sections) {
  return sections.flatMap((section) => section.lines)
    .find((line) => !semanticHasAny(line, SEMANTIC_CUES.target) || semanticHasAny(line, [...SEMANTIC_CUES.consistency, ...SEMANTIC_CUES.reference]))
    || sections.flatMap((section) => section.lines)[0]
    || '';
}

function relatedCategoriesExcludingPrimary(primaryCategory, categories = []) {
  return uniqueNonEmpty(categories).filter((category) => category !== primaryCategory);
}

function primaryCategoryForProjectCriteria(pieces = {}, domains = []) {
  const combined = [
    pieces.goal,
    ...(pieces.basis || []),
    ...(pieces.consistency || []),
    ...(pieces.ordering || []),
    ...(pieces.validation || []),
    ...(pieces.preservation || [])
  ].filter(Boolean).join('\n');
  if (semanticHasAny(combined, ['language policy', 'generated content', 'userLanguage', 'design intent', 'source notes', 'spec narrative', '언어 정책', '사용자 언어', '설명문', '디자인 의도'])) {
    return 'design_philosophy';
  }
  if ((pieces.ordering || []).length > 0 || semanticHasAny(combined, SEMANTIC_CUES.workflow)) {
    return 'process_patterns';
  }
  if ((pieces.validation || []).length > 0 && (pieces.consistency || []).length === 0 && (pieces.basis || []).length === 0) {
    return 'validation_patterns';
  }
  if (domains.includes('visual_design') || domains.includes('frontend') || (pieces.consistency || []).length > 0) {
    return 'design_philosophy';
  }
  return 'decision_patterns';
}

function semanticSummaryForUnit(language, kind, pieces = {}) {
  const goal = shortSemanticText(pieces.goal || '');
  const basis = joinSemanticItems(pieces.basis || [], 2, 120);
  const consistency = joinSemanticItems(pieces.consistency || [], 3, 120);
  const ordering = joinSemanticItems(pieces.ordering || [], 2, 120);
  const validation = joinSemanticItems(pieces.validation || [], 2, 120);
  const targets = joinSemanticItems(pieces.targets || [], 4, 120);
  const preservation = joinSemanticItems(pieces.preservation || [], 3, 120);

  if (language === 'ko') {
    if (kind === 'projectCriteria') {
      return [
        goal ? `이 프로젝트에서는 ${goal}` : '이 프로젝트에서는 사용자가 지정한 성공 조건을 기준으로 구현한다',
        basis ? `기준: ${basis}.` : '',
        consistency ? `일관성: ${consistency}.` : '',
        ordering ? `순서와 위치: ${ordering}.` : '',
        validation ? `검증/보존: ${validation}.` : ''
      ].filter(Boolean).join(' ');
    }
    if (kind === 'consistencyPreference') {
      return '사용자는 같은 역할의 요소가 작업 전반에서 같은 기준과 위치/스타일로 일관되게 보이길 원한다.';
    }
    if (kind === 'referencePreference') {
      return '사용자는 마음에 든 기준이 있으면 새 요소를 임의로 만들기보다 그 기준에 맞춰 다른 요소를 통일하길 원한다.';
    }
    if (kind === 'domainPrinciple') {
      return '반복되는 시각/동작 요소는 같은 역할이면 하나의 컴포넌트처럼 기준, 위치, 간격, 동작을 일관되게 관리한다.';
    }
    if (kind === 'validationRule') {
      return validation
        ? `상태 전환이나 모드 변경 후에도 사용자가 지정한 결과가 유지되는지 확인한다. 검증 기준: ${validation}.`
        : '상태 전환이나 모드 변경 후에도 사용자가 지정한 위치, 스타일, 동작이 유지되는지 확인한다.';
    }
    if (kind === 'scopePrevention') {
      return preservation
        ? `요청 범위를 넘어 불필요한 구조나 주요 내용을 수정하지 않는다. 보존 기준: ${preservation}.`
        : '요청 범위를 넘어 큰 구조, 주요 내용, 주변 요소를 불필요하게 수정하지 않는다.';
    }
    if (kind === 'taskContext') {
      return [
        targets ? `이번 작업의 직접 대상은 ${targets}이다.` : '',
        preservation ? `이번 작업 범위 제한: ${preservation}.` : '',
        goal ? `현재 작업 목표: ${goal}.` : ''
      ].filter(Boolean).join(' ') || '이번 작업의 대상과 범위는 현재 사용자 요청에 한정된다.';
    }
  }

  if (kind === 'projectCriteria') {
    return [
      goal ? `In this project, satisfy this user success criterion: ${goal}.` : 'In this project, implement against the user-specified success criteria.',
      basis ? `Reference basis: ${basis}.` : '',
      consistency ? `Consistency requirements: ${consistency}.` : '',
      ordering ? `Ordering and placement: ${ordering}.` : '',
      validation ? `Validation/preservation: ${validation}.` : ''
    ].filter(Boolean).join(' ');
  }
  if (kind === 'consistencyPreference') {
    return 'The user wants elements with the same role to remain consistent in standard, placement, style, and behavior across the work.';
  }
  if (kind === 'referencePreference') {
    return 'When the user identifies an approved reference, align related elements to that reference instead of inventing a new variant.';
  }
  if (kind === 'domainPrinciple') {
    return 'Repeated visual or behavioral elements with the same role should be managed like one consistent component.';
  }
  if (kind === 'validationRule') {
    return validation
      ? `After state, mode, or language changes, verify that the requested result remains stable: ${validation}.`
      : 'After state, mode, or language changes, verify that the requested placement, style, and behavior remain stable.';
  }
  if (kind === 'scopePrevention') {
    return preservation
      ? `Do not modify major structure or content outside the requested scope. Preservation criteria: ${preservation}.`
      : 'Do not modify major structure, content, or surrounding elements outside the requested scope.';
  }
  if (kind === 'taskContext') {
    return [
      targets ? `Current task targets: ${targets}.` : '',
      preservation ? `Current task scope limits: ${preservation}.` : '',
      goal ? `Current task goal: ${goal}.` : ''
    ].filter(Boolean).join(' ') || 'Current task targets and scope are limited to the current user request.';
  }
  return goal || 'Structured user success criteria.';
}

function semanticUnitCandidate(unit, source, activeMemories) {
  if (!unit?.summary || containsSensitive(unit.summary)) return null;
  const domains = [...new Set([...(unit.domains || []), ...extractDomains(unit.summary)])];
  const tags = [...new Set([...(unit.tags || []), ...extractTags(unit.summary)])].slice(0, 16);
  const topic = unit.topic || inferTopic(unit.summary, tags, domains);
  const timestamp = nowIso();
  const candidate = {
    id: hashId('mem', `semantic|${unit.type}|${unit.scope}|${topic}|${unit.summary}`),
    type: unit.type,
    scope: unit.scope,
    topic,
    title: toTitle(unit.type, topic),
    rule: unit.summary,
    summary: unit.summary,
    details: unit.details || unit.summary,
    tags,
    domains,
    appliesTo: unit.appliesTo || semanticAppliesTo(unit.scope, domains, topic),
    source: source || { kind: 'semantic_user_request' },
    sourceTextKind: source?.role || source?.kind || 'userRequest',
    sourcePriority: source?.priority || 1,
    evidence: [{
      kind: source?.kind || 'semantic_user_request',
      role: source?.role || 'userRequest',
      summary: unit.summary
    }],
    technicalOutcome: 'unknown',
    userAcceptance: 'unknown',
    userFeedbackSignal: 'none',
    successEvidence: 'unknown',
    acceptanceBasis: 'unknown',
    finalOutcome: 'unknown',
    rejectionReason: '',
    correctionDirection: '',
    preventionRule: unit.preventionRule || '',
    confidence: unit.confidence || 'medium',
    status: 'pending',
    conflictStatus: 'no_conflict',
    supersedes: [],
    related: [],
    primaryCategory: unit.primaryCategory,
    relatedCategories: normalizeCategoryDocKeys(unit.relatedCategories || []),
    memoryRole: unit.memoryRole || 'user_success_criteria',
    modelClass: unit.modelClass,
    modelSubClass: unit.modelSubClass,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: null
  };

  normalizeCandidateModel(candidate);
  applyMemoryRoleFields(candidate, unit.summary, source);
  const conflict = classifyCandidateConflict(activeMemories, candidate);
  candidate.conflictStatus = conflict.status;
  candidate.related = [...new Set([...(candidate.related || []), ...(conflict.related || [])])];
  candidate.supersedes = [...new Set([...(candidate.supersedes || []), ...(conflict.supersedes || [])])];
  if (conflict.reason) candidate.conflictReason = conflict.reason;
  return candidate;
}

function semanticCandidatesFromUserRequest(text = '', source = {}, activeMemories = []) {
  if (!shouldSemanticDecomposeUserRequest(text)) return [];
  const sections = parseRequestSections(text);
  if (sections.length === 0) return [];

  const language = semanticLanguage(text);
  const domains = semanticDomainsForRequest(text);
  const topic = semanticTopicForRequest(text, domains);
  const allLines = sections.flatMap((section) => section.lines);
  const goal = firstMeaningLine(sections);
  const basis = sectionLinesMatching(sections, SEMANTIC_CUES.reference);
  const consistency = sectionLinesMatching(sections, SEMANTIC_CUES.consistency);
  const ordering = sectionLinesMatching(sections, SEMANTIC_CUES.ordering);
  const validation = sectionLinesMatching(sections, SEMANTIC_CUES.validation);
  const preservation = sectionLinesMatching(sections, SEMANTIC_CUES.preservation);
  const targets = sections.flatMap((section) => (
    semanticHasAny(section.heading, SEMANTIC_CUES.target)
      ? section.lines
      : []
  ));
  const hasReusableStructure = basis.length > 0 || consistency.length > 0 || ordering.length > 0 || validation.length > 0 || preservation.length > 0;
  if (!hasReusableStructure) return [];

  const common = { goal, basis, consistency, ordering, validation, preservation, targets };
  const projectPrimaryCategory = primaryCategoryForProjectCriteria(common, domains);
  const units = [];
  const pushUnit = (unit) => {
    if (!unit.summary || units.some((existing) => normalizeText(existing.summary) === normalizeText(unit.summary))) return;
    units.push(unit);
  };

  pushUnit({
    type: 'project_decision',
    scope: 'project',
    topic,
    modelClass: 'project_model',
    modelSubClass: validation.length > 0 ? 'project_validation_rule' : 'project_constraint',
    memoryRole: 'user_success_criteria',
    primaryCategory: projectPrimaryCategory,
    relatedCategories: relatedCategoriesExcludingPrimary(projectPrimaryCategory, ['success_patterns', 'user_patterns', 'design_philosophy', 'decision_patterns', 'process_patterns', validation.length > 0 ? 'validation_patterns' : 'success_patterns']),
    confidence: 'high',
    domains,
    summary: semanticSummaryForUnit(language, 'projectCriteria', common)
  });

  if (consistency.length > 0) {
    pushUnit({
      type: 'user_preference',
      scope: 'global',
      topic: 'same-role consistency',
      modelClass: 'user_model',
      modelSubClass: 'preference_model',
      memoryRole: 'user_success_criteria',
      primaryCategory: 'user_patterns',
      relatedCategories: ['user_preferences', 'design_philosophy', 'success_patterns', 'decision_patterns', 'process_patterns'],
      confidence: 'medium',
      domains,
      summary: semanticSummaryForUnit(language, 'consistencyPreference', common)
    });
  }

  if (basis.length > 0) {
    pushUnit({
      type: 'decision_pattern',
      scope: 'global',
      topic: 'reference-based alignment',
      modelClass: 'user_model',
      modelSubClass: 'scope_control_preference_model',
      memoryRole: 'user_success_criteria',
      primaryCategory: 'decision_patterns',
      relatedCategories: ['user_preferences', 'user_patterns', 'design_philosophy', 'success_patterns'],
      confidence: 'medium',
      domains,
      summary: semanticSummaryForUnit(language, 'referencePreference', common)
    });
  }

  if (domains.length > 0 && consistency.length > 0) {
    pushUnit({
      type: 'design_philosophy',
      scope: 'domain',
      topic,
      modelClass: 'domain_model',
      modelSubClass: 'domain_preference',
      memoryRole: 'user_success_criteria',
      primaryCategory: 'design_philosophy',
      relatedCategories: ['user_patterns', 'success_patterns', 'process_patterns', 'decision_patterns'],
      confidence: 'medium',
      domains,
      summary: semanticSummaryForUnit(language, 'domainPrinciple', common)
    });
  }

  if (validation.length > 0) {
    pushUnit({
      type: 'validation_pattern',
      scope: domains.length > 0 ? 'domain' : 'global',
      topic: 'state preservation validation',
      modelClass: domains.length > 0 ? 'domain_model' : 'user_model',
      modelSubClass: domains.length > 0 ? 'domain_validation' : 'validation_preference_model',
      memoryRole: 'user_success_criteria',
      primaryCategory: 'validation_patterns',
      relatedCategories: ['success_patterns', 'prevention_rules', 'process_patterns'],
      confidence: 'medium',
      domains,
      summary: semanticSummaryForUnit(language, 'validationRule', common)
    });
  }

  if (preservation.length > 0) {
    pushUnit({
      type: 'prevention_rule',
      scope: 'global',
      topic: 'scope control prevention',
      modelClass: 'user_model',
      modelSubClass: 'scope_control_preference_model',
      memoryRole: 'ai_failure_memory',
      primaryCategory: 'prevention_rules',
      relatedCategories: ['global_avoid_rules', 'process_patterns', 'decision_patterns', 'agent_failure_patterns', 'user_preferences'],
      confidence: 'high',
      domains,
      summary: semanticSummaryForUnit(language, 'scopePrevention', common),
      preventionRule: semanticSummaryForUnit(language, 'scopePrevention', common)
    });
  }

  if (targets.length > 0 || preservation.length > 0 || allLines.length > 8) {
    pushUnit({
      type: 'task_context',
      scope: 'task',
      topic: 'current task scope',
      modelClass: 'task_context',
      modelSubClass: 'current_task_scope',
      memoryRole: 'task_context',
      primaryCategory: 'process_patterns',
      relatedCategories: ['workflow_rules'],
      confidence: 'low',
      domains,
      appliesTo: ['current task'],
      summary: semanticSummaryForUnit(language, 'taskContext', common)
    });
  }

  return units.map((unit) => semanticUnitCandidate(unit, source, activeMemories)).filter(Boolean);
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
      : candidate.acceptanceBasis === 'confirmed'
        ? 'Confirmed by user acceptance or positive feedback.'
        : 'Validation or technical success suggests this approach is reusable.';
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

  if (candidate.type === 'prevention_rule') {
    candidate.preventionRule = candidate.summary;
    candidate.forbiddenAction = candidate.forbiddenAction || candidate.summary;
    candidate.reason = candidate.reason || 'Captured as a repeat-prevention rule for an AI failure.';
    candidate.severity = candidate.confidence === 'high' ? 'high' : 'medium';
  }

  if (candidate.type === 'project_decision') {
    candidate.decision = candidate.summary;
    candidate.reason = textHasAny(statement, ['because'])
      ? candidate.summary.split(/\bbecause\b/iu).slice(1).join('because').trim()
      : 'Captured from an explicit project decision statement.';
    candidate.alternativesRejected = inferRejectedAlternatives(statement);
  }

  if (PATTERN_TYPES.has(candidate.type)) {
    candidate.patternType = candidate.type;
    candidate.situation = inferPatternSituation(candidate.type, statement);
    candidate.trigger = inferTrigger(statement);
    candidate.observedBehavior = candidate.type.includes('failure') ? candidate.summary : '';
    candidate.preferredBehavior = inferPreferredBehavior(candidate, statement);
    candidate.preventionRule = candidate.type === 'agent_failure_pattern'
      ? inferPreventionRule(statement)
      : candidate.preventionRule;
    candidate.reuseWhen = candidate.type === 'agent_success_pattern' ? candidate.appliesTo : candidate.reuseWhen;
    candidate.relatedProjects = [];
    candidate.relatedPatterns = [];
    candidate.relatedFailures = [];
    candidate.relatedSuccesses = [];
    candidate.relatedDecisions = [];
    candidate.relatedPreferences = [];
  }
}

function inferPatternSituation(type, statement) {
  if (type === 'validation_pattern' || textHasAny(statement, ['test', 'check', 'verify', '검증'])) return 'verification';
  if (type === 'design_philosophy' || textHasAny(statement, ['architecture', 'design'])) return 'architecture';
  if (type === 'process_pattern' || type === 'handoff_pattern') return 'implementation';
  if (type === 'agent_failure_pattern') return 'debugging';
  if (type === 'agent_success_pattern') return 'implementation';
  if (type === 'response_preference' || type === 'communication_pattern' || type === 'question_pattern') return 'handoff';
  return 'general';
}

function inferTrigger(statement) {
  if (textHasAny(statement, ['when validating', '검증할 때'])) return 'validation work';
  if (textHasAny(statement, ['before claiming completion', '완료를 말하기 전에'])) return 'completion claim';
  if (textHasAny(statement, ['inspect the repository first'])) return 'starting repository work';
  if (textHasAny(statement, ['design philosophy'])) return 'architecture decisions';
  return summarizeStatement(statement);
}

function inferPreferredBehavior(candidate, statement) {
  if (candidate.type === 'agent_failure_pattern') {
    return inferPreventionRule(statement);
  }
  if (textHasAny(statement, ['prefer'])) {
    const parts = statement.split(/\bprefer\b/iu);
    return summarizeStatement(parts.slice(1).join('prefer') || statement);
  }
  return candidate.summary;
}

function inferFailureType(statement) {
  if (textHasAny(statement, ['permission denied', 'access denied', 'eperm', 'eacces'])) return 'permission_failure';
  if (textHasAny(statement, ['enoent', 'file not found', 'directory not found', 'path not found', 'file lock', 'locked'])) return 'environment_failure';
  if (textHasAny(statement, ['command failed', 'build failed', 'test failed', 'exit code', 'nonzero'])) return 'technical_failure';
  if (textHasAny(statement, ['tool failed', 'api failed', 'browser failed', 'image generation failed', 'plugin failed'])) return 'tool_failure';
  if (textHasAny(statement, ['wrong direction', 'not the right direction', 'generic', 'saas', 'card-heavy', 'visual direction'])) return 'preference_mismatch';
  if (textHasAny(statement, ['misread', 'missed instruction', 'did not follow', 'instruction'])) return 'instruction_misread';
  if (textHasAny(statement, ['overgeneralized', 'previous project', 'same design direction'])) return 'overgeneralization_failure';
  if (textHasAny(statement, ['hardcode', 'fixture', 'example overfit'])) return 'example_overfit_failure';
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

function inferActiveCondition(memory) {
  const text = [memory.rule, memory.summary, memory.details].filter(Boolean).join(' ');
  const exceptionMatch = text.match(/except\s+for\s+([^,.;]+)/iu)
    || text.match(/only\s+when\s+([^,.;]+)/iu)
    || text.match(/unless\s+([^,.;]+)/iu);
  if (!exceptionMatch) return null;
  const summary = summarizeStatement(exceptionMatch[1]);
  const keywords = memoryKeywords({ summary, tags: [], domains: [], appliesTo: [summary] }).slice(0, 8);
  return {
    kind: 'exception',
    summary,
    keywords
  };
}

function matchesActiveCondition(memory, task) {
  if (!memory.activeCondition?.keywords?.length) return true;
  const taskTokens = new Set(memoryKeywords({ summary: task, tags: [], domains: [], appliesTo: [] }));
  return memory.activeCondition.keywords.some((keyword) => taskTokens.has(keyword) || normalizeText(task).includes(keyword));
}

async function activeMemories(root) {
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const project = await resolveCurrentProjectIdentity(root);
  return index.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
}

function isMemoryVisibleForProject(memory, project) {
  if (!memory) return false;
  if (memory.scope === 'global') return true;
  if (memory.scope === 'domain') return !memory.projectId || memoryObservedInProject(memory, project.projectId);
  return memory.projectId === project.projectId;
}

function sourceFromEvent(event) {
  return {
    kind: 'event',
    id: event.id,
    technicalOutcome: event.technicalOutcome,
    userAcceptance: event.userAcceptance,
    userFeedbackSignal: event.userFeedbackSignal,
    finalOutcome: event.finalOutcome,
    rejectionReason: event.rejectionReason,
    correctionDirection: event.correctionDirection,
    preventionRule: event.preventionRule
  };
}

function extractionSegmentsFromEvent(event, baseSource = {}) {
  return [
    { role: 'userRequest', priority: 1, text: event.userRequest || '' },
    { role: 'userFeedback', priority: 2, text: event.userFeedback || '' },
    { role: 'commandResult', priority: 6, text: [...(event.commandResults || []), event.commandResult, ...(event.errors || [])].filter(Boolean).join('\n') },
    { role: 'notes', priority: 7, text: event.notes || '' },
    { role: 'aiActionSummary', priority: 8, text: event.aiActionSummary || '' }
  ].filter((segment) => segment.text).map((segment) => ({
    ...segment,
    source: {
      ...baseSource,
      role: segment.role,
      priority: segment.priority,
      ...(segment.role === 'userRequest'
        ? {
          technicalOutcome: 'unknown',
          userAcceptance: 'unknown',
          userFeedbackSignal: 'none',
          finalOutcome: 'unknown',
          successEvidence: 'unknown',
          acceptanceBasis: 'unknown'
        }
        : {})
    }
  }));
}

function extractionSegmentsFromInput(input = {}, baseSource = {}) {
  const segments = [];
  if (input.userRequest || input.request) {
    segments.push({ role: 'userRequest', priority: 1, text: input.userRequest || input.request });
  }
  if (input.userFeedback || input.feedback) {
    segments.push({ role: 'userFeedback', priority: 2, text: input.userFeedback || input.feedback });
  }
  if (input.text) {
    segments.push({ role: baseSource.role || 'text', priority: baseSource.priority || 3, text: input.text });
  }
  const commandText = [
    ...(input.commandResults || []),
    input.commandResult,
    ...(input.errors || [])
  ].filter(Boolean).join('\n');
  if (commandText) {
    segments.push({ role: 'commandResult', priority: 6, text: commandText });
  }
  if (input.notes) {
    segments.push({ role: 'notes', priority: 7, text: input.notes });
  }
  if (input.aiActionSummary || input.summary) {
    segments.push({ role: 'aiActionSummary', priority: 8, text: input.aiActionSummary || input.summary });
  }
  return segments.map((segment) => ({
    ...segment,
    source: {
      ...baseSource,
      role: segment.role,
      priority: segment.priority,
      ...(segment.role === 'userRequest'
        ? {
          technicalOutcome: 'unknown',
          userAcceptance: 'unknown',
          userFeedbackSignal: 'none',
          finalOutcome: 'unknown',
          successEvidence: 'unknown',
          acceptanceBasis: 'unknown'
        }
        : {})
    }
  }));
}

export async function extractMemoryCandidates(root = process.cwd(), input = {}) {
  if (isActionSummaryOnlyExtraction(input)) {
    return [];
  }
  await initVibeBox(root);
  const project = await resolveCurrentProjectIdentity(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  let segments = extractionSegmentsFromInput(input, input.source || { kind: 'manual_extract' });
  let source = input.source || { kind: 'manual_extract' };

  if (segments.length === 0 && input.eventId) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.find((item) => item.id === input.eventId && item.projectId === project.projectId);
    if (event) {
      source = sourceFromEvent(event);
      segments = extractionSegmentsFromEvent(event, source);
    }
  }

  if (segments.length === 0 && input.fromLastEvent) {
    const events = await readJsonl(vibeboxPath(root, 'logs/events.jsonl'));
    const event = events.filter((item) => item.projectId === project.projectId).at(-1);
    if (event) {
      source = sourceFromEvent(event);
      segments = extractionSegmentsFromEvent(event, source);
    }
  }

  const memories = await activeMemories(root);
  const existingPending = await readJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'));
  const existingIds = new Set(existingPending.map((candidate) => candidate.id));
  const newCandidates = [];

  for (const segment of segments.sort((left, right) => left.priority - right.priority)) {
    const segmentCandidates = [
      ...(segment.source?.role === 'userRequest'
        ? semanticCandidatesFromUserRequest(redactSensitive(segment.text), segment.source || source, memories)
        : []),
      ...splitStatements(redactSensitive(segment.text))
        .map((statement) => buildCandidate(statement, segment.source || source, memories))
        .filter(Boolean)
    ];
    for (const candidate of segmentCandidates) {
      if (candidate && !existingIds.has(candidate.id)) {
      if (['project', 'task', 'temporary'].includes(candidate.scope)) {
        candidate.projectId = project.projectId;
        candidate.id = hashId('mem', `${candidate.id}|${project.projectId}`);
        normalizeCandidateModel(candidate);
      }
      if (existingIds.has(candidate.id)) {
        if (!isManualReviewMode(input, config)) {
          const duplicateOf = candidate.id;
          candidate.id = hashId('mem', `${duplicateOf}|duplicate|${nowIso()}`);
          candidate.conflictStatus = 'duplicate';
          candidate.related = [...new Set([...(candidate.related || []), duplicateOf])];
        } else {
          continue;
        }
      }
      candidate.sourceProjectRoot = project.rootPath;
      candidate.sourceProjectId = project.projectId;
      candidate.repositoryName = project.repositoryName || project.projectName;
      newCandidates.push(candidate);
      existingIds.add(candidate.id);
      } else if (candidate && !isManualReviewMode(input, config)) {
        const duplicateOf = candidate.id;
        candidate.id = hashId('mem', `${duplicateOf}|duplicate|${nowIso()}`);
        candidate.conflictStatus = 'duplicate';
        candidate.related = [...new Set([...(candidate.related || []), duplicateOf])];
        candidate.sourceProjectRoot = project.rootPath;
        candidate.sourceProjectId = project.projectId;
        candidate.repositoryName = project.repositoryName || project.projectName;
        newCandidates.push(candidate);
        existingIds.add(candidate.id);
      }
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

function isActionSummaryOnlyExtraction(input = {}) {
  const hasActionSummary = Boolean(input.aiActionSummary || input.summary);
  if (!hasActionSummary || input.allowActionSummary || input.eventId || input.fromLastEvent) return false;
  if (['accepted', 'rejected', 'mixed'].includes(input.userAcceptance || '')) return false;
  return !(
    input.userRequest
    || input.request
    || input.userFeedback
    || input.feedback
    || input.text
    || input.commandResult
    || (Array.isArray(input.commandResults) && input.commandResults.length > 0)
    || (Array.isArray(input.errors) && input.errors.length > 0)
    || input.notes
  );
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
  const existingModelClass = existing.modelClass || inferModelClass(existing);
  const candidateModelClass = candidate.modelClass || inferModelClass(candidate);
  const existingModelSubClass = existing.modelSubClass || inferModelSubClass(existing);
  const candidateModelSubClass = candidate.modelSubClass || inferModelSubClass(candidate);
  if (!valuesCompatible(existingModelClass, candidateModelClass)) return false;
  if (!valuesCompatible(existingModelSubClass, candidateModelSubClass)) return false;
  if (!valuesCompatible(existing.type, candidate.type)) return false;
  if (!valuesCompatible(existing.scope, candidate.scope)) return false;
  if (!domainsCompatible(existing, candidate)) return false;
  if (!projectCompatibleForReplacement(existing, candidate)) return false;
  if (!valuesCompatible(existing.situation, candidate.situation)) return false;
  return hasSameActiveSubject(existing, candidate);
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
  const replaceableMemories = relatedMemories.filter((memory) => canReplaceMemory(memory, candidate));
  const replaceable = replaceableMemories.map((memory) => memory.id);

  for (const memory of replaceableMemories) {
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
    if (replaceable.length > 0) {
      return { status: 'supersedes', related, supersedes: replaceable, reason: 'Candidate explicitly replaces compatible active memory.' };
    }
    if (relatedMemories.some((memory) => hasOpposingChoice(memory, candidate))) {
      return { status: 'direct_conflict', related, supersedes: [], reason: 'Candidate conflicts with overlapping memory but is outside the safe replacement scope.' };
    }
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Candidate asks to replace memory outside the safe model, scope, domain, or project boundary.' };
  }

  if (relatedMemories.some((memory) => hasOpposingChoice(memory, candidate))) {
    return { status: 'direct_conflict', related, supersedes: [], reason: 'Candidate points to a different mutually exclusive technology choice.' };
  }

  if (candidate.confidence === 'low') {
    return { status: 'needs_user_review', related, supersedes: [], reason: 'Low-confidence candidate overlaps existing memory.' };
  }

  const refinable = replaceableMemories.filter((memory) => hasSameActiveSubject(memory, candidate) && isMoreSpecific(memory, candidate));
  if (refinable.length > 0) {
    return { status: 'refinement', related: refinable.map((memory) => memory.id), supersedes: refinable.map((memory) => memory.id), reason: 'Candidate adds a more specific condition to compatible active memory.' };
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
  if (candidate.type === 'agent_success_pattern' && textHasAny(candidate.summary, ['agent succeeded', 'ai succeeded', 'agent success', 'succeeded by', 'successfully handled by'])) return true;
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

function hasConcreteFailureOrRecoveryEvidence(candidate = {}) {
  const source = candidate.source || {};
  return normalizeEnum(source.userAcceptance, USER_ACCEPTANCE_VALUES, 'unknown') === 'rejected'
    || normalizeEnum(source.finalOutcome, FINAL_OUTCOMES, 'unknown') === 'technical_success_user_rejected'
    || normalizeEnum(source.technicalOutcome, TECHNICAL_OUTCOMES, 'unknown') === 'failure'
    || source.userFeedbackSignal === 'rejection'
    || ['aftertask', 'event'].includes(source.kind);
}

function isLatestUserCorrectionCriteria(candidate = {}) {
  const source = candidate.source || {};
  return candidate.memoryRole === 'user_success_criteria'
    && (source.role === 'userFeedback' || textHasAny(candidate.summary, ['latest user success criteria', 'latest success criteria']))
    && hasConcreteFailureOrRecoveryEvidence(candidate);
}

function canDemoteRejectedSuccessMemory(memory, contextText, project = {}) {
  if (!['success_pattern', 'agent_success_pattern'].includes(memory.type)) return false;
  if (memory.projectId && memory.projectId !== project.projectId) return false;
  const tags = extractTags(contextText);
  const domains = extractDomains(contextText);
  const topic = inferTopic(contextText, tags, domains);
  const scope = memory.scope || normalizeCandidateScope(memory.type, determineScope(contextText, domains), contextText);
  const candidate = normalizeCandidateModel({
    type: memory.type,
    scope,
    topic,
    summary: contextText,
    rule: contextText,
    details: contextText,
    tags,
    domains,
    appliesTo: inferAppliesTo(contextText, scope, domains, topic),
    projectId: memory.projectId ? project.projectId : null
  });
  return canReplaceMemory(memory, candidate);
}

function inferAutoCurationDecision(candidate) {
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
    const activeCondition = candidate.activeCondition || inferActiveCondition(candidate);
    if (activeCondition?.keywords?.length) {
      candidate.activeCondition = activeCondition;
      return { action: 'active', status: 'active', reason: 'Scoped exception has an active condition.' };
    }
    return { action: 'quarantine', status: 'quarantined', reason: 'Exception scope is unclear.' };
  }
  if (['supersedes', 'refinement'].includes(candidate.conflictStatus)) {
    return { action: 'replace', status: 'active', reason: `Candidate ${candidate.conflictStatus} existing active memory.` };
  }
  if (
    ['direct_conflict', 'needs_user_review'].includes(candidate.conflictStatus)
    && isLatestUserCorrectionCriteria(candidate)
    && ['medium', 'high'].includes(candidate.confidence)
  ) {
    return { action: 'active', status: 'active', reason: 'Latest user correction is an active success criterion.' };
  }
  if (
    ['direct_conflict', 'needs_user_review'].includes(candidate.conflictStatus)
    && ['ai_failure_memory', 'ai_successful_approach'].includes(candidate.memoryRole)
    && ['medium', 'high'].includes(candidate.confidence)
    && hasConcreteFailureOrRecoveryEvidence(candidate)
  ) {
    return { action: 'active', status: 'active', reason: `${candidate.memoryRole === 'ai_failure_memory' ? 'AI failure memory' : 'AI successful approach'} coexists with user success criteria.` };
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
    const decision = inferAutoCurationDecision(candidate);
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
    modelClass: memory.modelClass || inferModelClass(memory),
    modelSubClass: memory.modelSubClass || inferModelSubClass(memory),
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
    displayLanguage: memory.displayLanguage
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
  normalizeCandidateModel(memory);
  applyMemoryRoleFields(memory, memory.summary || memory.rule || memory.details || '', memory.source || {});
  memory = normalizeMemoryLanguage(memory, memoryLanguage, memoryLocale);
  const replaceIds = replacementIdsForMemory(memory, memoryIndex.memories);
  memory.replaces = [...new Set([...(memory.replaces || []), ...replaceIds])];
  memory.related = (memory.related || []).filter((id) => !replaceIds.includes(id));
  memory.supersedes = (memory.supersedes || []).filter((id) => !replaceIds.includes(id));
  if (memory.conflictStatus === 'exception' && !memory.activeCondition) {
    memory.activeCondition = inferActiveCondition(memory);
  }

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
        || (textHasAny(item.summary, ['scroll', 'overflow', 'layout']) && textHasAny(memory.summary, ['scroll', 'wrapper', 'layout']))
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

const WIKI_DISPLAY_TEXT = {
  en: {
    wiki: 'Wiki',
    recentActiveMemory: 'Recent Active Memory',
    storage: 'Storage',
    memoryNote: 'Memory note',
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
    userSuccessCriteria: 'User Success Criteria',
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
    relatedProjectMemory: 'Other Memory Observed In This Project'
  },
  ko: {
    wiki: '\uC704\uD0A4',
    recentActiveMemory: '\uCD5C\uADFC \uD65C\uC131 \uBA54\uBAA8\uB9AC',
    storage: '\uC800\uC7A5\uC18C',
    memoryNote: '\uBA54\uBAA8\uB9AC \uB178\uD2B8',
    projectSection: '\uD504\uB85C\uC81D\uD2B8',
    activePatternGraph: '\uD65C\uC131 \uD328\uD134 \uADF8\uB798\uD504',
    projectId: '\uD504\uB85C\uC81D\uD2B8 ID',
    repository: '\uC800\uC7A5\uC18C',
    primaryDomain: '\uC8FC\uC694 \uB3C4\uBA54\uC778',
    lastSeen: '\uB9C8\uC9C0\uB9C9 \uD655\uC778',
    category: '\uCE74\uD14C\uACE0\uB9AC',
    relatedMemory: '\uAD00\uB828 \uBA54\uBAA8\uB9AC',
    relatedSuccessfulApproaches: '\uAD00\uB828 AI \uC131\uACF5 \uC811\uADFC',
    relatedFailureAvoidance: '\uAD00\uB828 AI \uC2E4\uD328 \uD68C\uD53C',
    userSuccessCriteria: '\uC0AC\uC6A9\uC790 \uC131\uACF5 \uAE30\uC900',
    aiFailureMemory: 'AI \uC2E4\uD328 \uBA54\uBAA8\uB9AC',
    aiSuccessfulApproach: 'AI \uC131\uACF5 \uC811\uADFC',
    taskContext: '\uC791\uC5C5 \uCEE8\uD14D\uC2A4\uD2B8',
    discardedDetail: '\uD3D0\uAE30\uB41C \uC138\uBD80\uC0AC\uD56D',
    commandFailed: '\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328',
    aiSuccessApproach: 'AI \uC131\uACF5 \uC811\uADFC',
    doNotRepeat: '\uBC18\uBCF5 \uAE08\uC9C0',
    reviewPriorFailure: '\uAC19\uC740 \uC811\uADFC\uC744 \uBC18\uBCF5\uD558\uAE30 \uC804\uC5D0 \uC774\uC804 \uC2E4\uD328\uB97C \uD655\uC778\uD55C\uB2E4.',
    similarWork: '\uC720\uC0AC \uC791\uC5C5\uC5D0\uC11C \uC7AC\uC0AC\uC6A9\uD55C\uB2E4.',
    sameFailure: '\uAC19\uC740 \uC2E4\uD328\uAC00 \uB098\uD0C0\uB0A0 \uB54C',
    summarySection: '\uC694\uC57D',
    scopeSection: '\uC801\uC6A9 \uBC94\uC704',
    sourceSection: '\uAD00\uCC30 \uCD9C\uCC98',
    relatedCategories: '\uAD00\uB828 \uCE74\uD14C\uACE0\uB9AC',
    observedUserSuccessCriteria: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0\uC11C \uAD00\uCC30\uB41C \uC0AC\uC6A9\uC790 \uC131\uACF5 \uAE30\uC900',
    observedUserPatterns: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0\uC11C \uAD00\uCC30\uB41C \uC0AC\uC6A9\uC790 \uC131\uD5A5/\uD328\uD134',
    observedAiFailures: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0\uC11C \uBC1C\uC0DD\uD55C AI \uC2E4\uD328',
    observedAiSuccessfulApproaches: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0\uC11C \uC0AC\uC6A9\uB41C AI \uC131\uACF5 \uC811\uADFC',
    observedValidationPreservation: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC758 \uAC80\uC99D/\uBCF4\uC874 \uADDC\uCE59',
    projectSpecificMemory: '\uD504\uB85C\uC81D\uD2B8 \uC804\uC6A9 \uACB0\uC815\uACFC \uADDC\uCE59',
    relatedProjectMemory: '\uC774 \uD504\uB85C\uC81D\uD2B8\uC5D0\uC11C \uAD00\uCC30\uB41C \uAE30\uD0C0 \uBA54\uBAA8\uB9AC'
  }
};

Object.assign(WIKI_DISPLAY_TEXT, {
  ja: {
    wiki: 'Wiki',
    recentActiveMemory: '最近の有効メモリー',
    storage: 'ストレージ',
    memoryNote: 'メモリーノート',
    projectSection: 'プロジェクト',
    activePatternGraph: '有効パターングラフ',
    projectId: 'プロジェクト ID',
    repository: 'リポジトリ',
    primaryDomain: '主要ドメイン',
    lastSeen: '最終確認',
    category: 'カテゴリ',
    relatedMemory: '関連メモリー',
    relatedSuccessfulApproaches: '関連する AI 成功アプローチ',
    relatedFailureAvoidance: '関連する AI 失敗回避',
    userSuccessCriteria: 'ユーザー成功基準',
    aiFailureMemory: 'AI 失敗メモリー',
    aiSuccessfulApproach: 'AI 成功アプローチ',
    taskContext: 'タスクコンテキスト',
    discardedDetail: '破棄された詳細',
    commandFailed: 'コマンド失敗',
    aiSuccessApproach: 'AI 成功アプローチ',
    doNotRepeat: '繰り返し禁止',
    reviewPriorFailure: '同じ手法を繰り返す前に過去の失敗を確認する。',
    similarWork: '類似作業で再利用する。',
    sameFailure: '同じ失敗が出た場合',
    summarySection: '要約',
    scopeSection: '適用範囲',
    sourceSection: '観察元',
    relatedCategories: '関連カテゴリ',
    observedUserSuccessCriteria: 'このプロジェクトで観察されたユーザー成功基準',
    observedUserPatterns: 'このプロジェクトで観察されたユーザー傾向/パターン',
    observedAiFailures: 'このプロジェクトで発生した AI 失敗',
    observedAiSuccessfulApproaches: 'このプロジェクトで使われた AI 成功アプローチ',
    observedValidationPreservation: 'このプロジェクトの検証/保存ルール',
    projectSpecificMemory: 'プロジェクト固有の決定とルール',
    relatedProjectMemory: 'このプロジェクトで観察されたその他のメモリー'
  },
  'zh-CN': {
    wiki: 'Wiki',
    recentActiveMemory: '最近活跃记忆',
    storage: '存储',
    memoryNote: '记忆笔记',
    projectSection: '项目',
    activePatternGraph: '活跃模式图',
    projectId: '项目 ID',
    repository: '仓库',
    primaryDomain: '主要领域',
    lastSeen: '最后确认',
    category: '分类',
    relatedMemory: '相关记忆',
    relatedSuccessfulApproaches: '相关 AI 成功做法',
    relatedFailureAvoidance: '相关 AI 失败规避',
    userSuccessCriteria: '用户成功标准',
    aiFailureMemory: 'AI 失败记忆',
    aiSuccessfulApproach: 'AI 成功做法',
    taskContext: '任务上下文',
    discardedDetail: '已丢弃细节',
    commandFailed: '命令失败',
    aiSuccessApproach: 'AI 成功做法',
    doNotRepeat: '不要重复',
    reviewPriorFailure: '重复同一做法前先检查过去的失败。',
    similarWork: '在类似工作中复用。',
    sameFailure: '出现相同失败时',
    summarySection: '摘要',
    scopeSection: '适用范围',
    sourceSection: '观察来源',
    relatedCategories: '相关分类',
    observedUserSuccessCriteria: '此项目中观察到的用户成功标准',
    observedUserPatterns: '此项目中观察到的用户倾向/模式',
    observedAiFailures: '此项目中发生的 AI 失败',
    observedAiSuccessfulApproaches: '此项目中使用的 AI 成功做法',
    observedValidationPreservation: '此项目的验证/保留规则',
    projectSpecificMemory: '项目专用决策和规则',
    relatedProjectMemory: '此项目中观察到的其他记忆'
  },
  'zh-TW': {
    wiki: 'Wiki',
    recentActiveMemory: '最近活躍記憶',
    storage: '儲存',
    memoryNote: '記憶筆記',
    projectSection: '專案',
    activePatternGraph: '活躍模式圖',
    projectId: '專案 ID',
    repository: '儲存庫',
    primaryDomain: '主要領域',
    lastSeen: '最後確認',
    category: '分類',
    relatedMemory: '相關記憶',
    relatedSuccessfulApproaches: '相關 AI 成功做法',
    relatedFailureAvoidance: '相關 AI 失敗避免',
    userSuccessCriteria: '使用者成功標準',
    aiFailureMemory: 'AI 失敗記憶',
    aiSuccessfulApproach: 'AI 成功做法',
    taskContext: '任務脈絡',
    discardedDetail: '已捨棄細節',
    commandFailed: '命令失敗',
    aiSuccessApproach: 'AI 成功做法',
    doNotRepeat: '不要重複',
    reviewPriorFailure: '重複同一做法前先檢查過去的失敗。',
    similarWork: '在類似工作中重用。',
    sameFailure: '出現相同失敗時',
    summarySection: '摘要',
    scopeSection: '適用範圍',
    sourceSection: '觀察來源',
    relatedCategories: '相關分類',
    observedUserSuccessCriteria: '此專案中觀察到的使用者成功標準',
    observedUserPatterns: '此專案中觀察到的使用者傾向/模式',
    observedAiFailures: '此專案中發生的 AI 失敗',
    observedAiSuccessfulApproaches: '此專案中使用的 AI 成功做法',
    observedValidationPreservation: '此專案的驗證/保留規則',
    projectSpecificMemory: '專案專用決策和規則',
    relatedProjectMemory: '此專案中觀察到的其他記憶'
  },
  ar: {
    wiki: 'ويكي',
    recentActiveMemory: 'الذاكرة النشطة الأخيرة',
    storage: 'التخزين',
    memoryNote: 'ملاحظة ذاكرة',
    projectSection: 'المشروع',
    activePatternGraph: 'رسم الأنماط النشطة',
    projectId: 'معرف المشروع',
    repository: 'المستودع',
    primaryDomain: 'المجال الأساسي',
    lastSeen: 'آخر ظهور',
    category: 'الفئة',
    relatedMemory: 'ذاكرات مرتبطة',
    relatedSuccessfulApproaches: 'أساليب نجاح AI المرتبطة',
    relatedFailureAvoidance: 'تجنب فشل AI المرتبط',
    userSuccessCriteria: 'معايير نجاح المستخدم',
    aiFailureMemory: 'ذاكرة فشل AI',
    aiSuccessfulApproach: 'أسلوب نجاح AI',
    taskContext: 'سياق المهمة',
    discardedDetail: 'تفصيل مستبعد',
    commandFailed: 'فشل الأمر',
    aiSuccessApproach: 'أسلوب نجاح AI',
    doNotRepeat: 'لا تكرر',
    reviewPriorFailure: 'راجع الفشل السابق قبل تكرار هذا الأسلوب.',
    similarWork: 'يعاد استخدامه في عمل مشابه.',
    sameFailure: 'عند ظهور الفشل نفسه',
    summarySection: 'ملخص',
    scopeSection: 'نطاق التطبيق',
    sourceSection: 'مصدر الملاحظة',
    relatedCategories: 'فئات مرتبطة',
    observedUserSuccessCriteria: 'معايير نجاح المستخدم المرصودة في هذا المشروع',
    observedUserPatterns: 'ميول/أنماط المستخدم المرصودة في هذا المشروع',
    observedAiFailures: 'إخفاقات AI التي حدثت في هذا المشروع',
    observedAiSuccessfulApproaches: 'أساليب نجاح AI المستخدمة في هذا المشروع',
    observedValidationPreservation: 'قواعد التحقق/الحفظ لهذا المشروع',
    projectSpecificMemory: 'قرارات وقواعد خاصة بالمشروع',
    relatedProjectMemory: 'ذاكرات أخرى مرصودة في هذا المشروع'
  }
});

Object.assign(WIKI_DISPLAY_TEXT.en, {
  homeDescription: 'Global local-first memory store for AI coding agents.',
  backTo: 'Back to',
  storageJsonIndexes: 'JSON indexes live in `../index/`.',
  storageRawEvents: 'Raw blackbox events live in `../logs/events.jsonl`.',
  storagePendingCandidates: 'Pending memory candidates live in `../pending/memory-candidates.jsonl`.'
});

Object.assign(WIKI_DISPLAY_TEXT.ko, {
  homeDescription: 'AI \ucf54\ub529 \uc5d0\uc774\uc804\ud2b8\ub97c \uc704\ud55c \ub85c\uceec \uc6b0\uc120 \uc804\uc5ed \uba54\ubaa8\ub9ac \uc800\uc7a5\uc18c.',
  backTo: '\ub3cc\uc544\uac00\uae30',
  storageJsonIndexes: 'JSON \uc778\ub371\uc2a4\ub294 `../index/`\uc5d0 \uc800\uc7a5\ub41c\ub2e4.',
  storageRawEvents: '\uc6d0\uc2dc blackbox \uc774\ubca4\ud2b8\ub294 `../logs/events.jsonl`\uc5d0 \uc800\uc7a5\ub41c\ub2e4.',
  storagePendingCandidates: '\ub300\uae30 \uc911\uc778 \uba54\ubaa8\ub9ac \ud6c4\ubcf4\ub294 `../pending/memory-candidates.jsonl`\uc5d0 \uc800\uc7a5\ub41c\ub2e4.'
});

Object.assign(WIKI_DISPLAY_TEXT.ja, {
  wiki: '\u30a6\u30a3\u30ad',
  homeDescription: 'AI \u30b3\u30fc\u30c7\u30a3\u30f3\u30b0\u30a8\u30fc\u30b8\u30a7\u30f3\u30c8\u5411\u3051\u306e\u30ed\u30fc\u30ab\u30eb\u512a\u5148\u30b0\u30ed\u30fc\u30d0\u30eb\u30e1\u30e2\u30ea\u30fc\u30b9\u30c8\u30a2\u3002',
  backTo: '\u623b\u308b',
  storageJsonIndexes: 'JSON \u30a4\u30f3\u30c7\u30c3\u30af\u30b9\u306f `../index/` \u306b\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002',
  storageRawEvents: '\u751f\u306e blackbox \u30a4\u30d9\u30f3\u30c8\u306f `../logs/events.jsonl` \u306b\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002',
  storagePendingCandidates: '\u4fdd\u7559\u4e2d\u306e\u30e1\u30e2\u30ea\u30fc\u5019\u88dc\u306f `../pending/memory-candidates.jsonl` \u306b\u4fdd\u5b58\u3055\u308c\u307e\u3059\u3002'
});

Object.assign(WIKI_DISPLAY_TEXT['zh-CN'], {
  wiki: '\u7ef4\u57fa',
  homeDescription: '\u9762\u5411 AI \u7f16\u7801\u4ee3\u7406\u7684\u672c\u5730\u4f18\u5148\u5168\u5c40\u8bb0\u5fc6\u5b58\u50a8\u3002',
  backTo: '\u8fd4\u56de',
  storageJsonIndexes: 'JSON \u7d22\u5f15\u4fdd\u5b58\u5728 `../index/`\u3002',
  storageRawEvents: '\u539f\u59cb blackbox \u4e8b\u4ef6\u4fdd\u5b58\u5728 `../logs/events.jsonl`\u3002',
  storagePendingCandidates: '\u5f85\u5904\u7406\u8bb0\u5fc6\u5019\u9009\u4fdd\u5b58\u5728 `../pending/memory-candidates.jsonl`\u3002'
});

Object.assign(WIKI_DISPLAY_TEXT['zh-TW'], {
  wiki: '\u7dad\u57fa',
  homeDescription: '\u9762\u5411 AI \u7de8\u78bc\u4ee3\u7406\u7684\u672c\u5730\u512a\u5148\u5168\u57df\u8a18\u61b6\u5132\u5b58\u3002',
  backTo: '\u8fd4\u56de',
  storageJsonIndexes: 'JSON \u7d22\u5f15\u5132\u5b58\u5728 `../index/`\u3002',
  storageRawEvents: '\u539f\u59cb blackbox \u4e8b\u4ef6\u5132\u5b58\u5728 `../logs/events.jsonl`\u3002',
  storagePendingCandidates: '\u5f85\u8655\u7406\u8a18\u61b6\u5019\u9078\u5132\u5b58\u5728 `../pending/memory-candidates.jsonl`\u3002'
});

Object.assign(WIKI_DISPLAY_TEXT.ar, {
  homeDescription: '\u0645\u062e\u0632\u0646 \u0630\u0627\u0643\u0631\u0629 \u0639\u0627\u0645 \u0645\u062d\u0644\u064a \u0623\u0648\u0644\u0627 \u0644\u0648\u0643\u0644\u0627\u0621 \u0627\u0644\u0628\u0631\u0645\u062c\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a.',
  backTo: '\u0639\u0648\u062f\u0629 \u0625\u0644\u0649',
  storageJsonIndexes: '\u062a\u0648\u062c\u062f \u0641\u0647\u0627\u0631\u0633 JSON \u0641\u064a `../index/`.',
  storageRawEvents: '\u062a\u0648\u062c\u062f \u0623\u062d\u062f\u0627\u062b blackbox \u0627\u0644\u062e\u0627\u0645 \u0641\u064a `../logs/events.jsonl`.',
  storagePendingCandidates: '\u062a\u0648\u062c\u062f \u0645\u0631\u0634\u062d\u0627\u062a \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0641\u064a `../pending/memory-candidates.jsonl`.'
});

function wikiDisplayLanguage(locale = 'en-US') {
  const tag = normalizeLanguageTag(locale);
  if (tag === 'ko-KR') return 'ko';
  if (tag === 'en-US') return 'en';
  if (tag === 'ja-JP') return 'ja';
  if (tag === 'zh-CN') return 'zh-CN';
  if (tag === 'zh-TW') return 'zh-TW';
  if (tag === 'ar') return 'ar';
  return 'en';
}

function wd(locale, key) {
  const language = wikiDisplayLanguage(locale);
  return WIKI_DISPLAY_TEXT[language][key] || WIKI_DISPLAY_TEXT.en[key] || key;
}

const NON_EN_GENERIC_TEXT = {
  ja: {
    details: '詳細は canonical memory に保持されています。',
    user_success_criteria: 'ユーザーが指定した成功条件をこの文脈で満たす。',
    ai_failure_memory: '同じ AI 失敗を繰り返さない。',
    ai_successful_approach: '検証済みの成功アプローチを再利用する。'
  },
  'zh-CN': {
    details: '详细内容保留在 canonical memory 中。',
    user_success_criteria: '在此上下文中满足用户指定的成功条件。',
    ai_failure_memory: '不要重复相同的 AI 失败。',
    ai_successful_approach: '复用已验证的成功做法。'
  },
  'zh-TW': {
    details: '詳細內容保留在 canonical memory 中。',
    user_success_criteria: '在此脈絡中滿足使用者指定的成功條件。',
    ai_failure_memory: '不要重複相同的 AI 失敗。',
    ai_successful_approach: '重用已驗證的成功做法。'
  },
  ar: {
    details: 'تُحفظ التفاصيل في الذاكرة canonical.',
    user_success_criteria: 'تلبية معيار النجاح الذي حدده المستخدم في هذا السياق.',
    ai_failure_memory: 'لا تكرر فشل AI نفسه.',
    ai_successful_approach: 'أعد استخدام أسلوب النجاح المتحقق منه.'
  }
};

function localizedGenericText(locale, key = 'details') {
  const language = wikiDisplayLanguage(locale);
  return NON_EN_GENERIC_TEXT[language]?.[key] || NON_EN_GENERIC_TEXT[language]?.details || '';
}

function localizeWikiDisplayText(text, locale = 'en-US') {
  const value = stripVisibleMemoryIds(text);
  if (!value) return '';
  const language = wikiDisplayLanguage(locale);
  if (language === 'en') return normalizeUserFacingTextForLanguage(value, 'en');
  if (language !== 'ko') {
    return hasHangul(value) ? localizedGenericText(locale) : normalizeUserFacingTextForLanguage(value, 'en');
  }
  const recoveryMatch = value.match(/^Agent succeeded by\s+(.+?)\s+after the execution failure;?\s+reuse this recovery approach when the same failure appears:?\s*(.+?)\.?$/iu);
  if (recoveryMatch) {
    return `AI \uC131\uACF5 \uC811\uADFC: \uC2E4\uD589 \uC2E4\uD328 \uD6C4 ${localizeRecoveryPhraseKo(recoveryMatch[1])}. \uAC19\uC740 \uC2E4\uD328\uAC00 \uB098\uD0C0\uB098\uBA74 ${localizeRecoveryPhraseKo(recoveryMatch[2])}\uC744 \uC7AC\uC0AC\uC6A9\uD55C\uB2E4.`;
  }
  const actionSummary = localizeEnglishActionSummaryKo(value);
  if (actionSummary) return actionSummary;
  return normalizeUserFacingTextForLanguage(value, 'ko')
    .replace(/\bnpm test exited with code\s+(\d+)\s+because the npm shim was unavailable/giu, 'npm test\uAC00 code $1\uB85C \uC885\uB8CC\uB428 (npm shim \uC0AC\uC6A9 \uBD88\uAC00)')
    .replace(/\bCommand failed:\s*/giu, `${wd(locale, 'commandFailed')}: `)
    .replace(/^AI execution failure:\s*/iu, 'AI \uC2E4\uD589 \uC2E4\uD328: ')
    .replace(/^Do not repeat this failed approach:\s*/iu, `${wd(locale, 'doNotRepeat')}: `)
    .replace(/^Agent succeeded by\s*/iu, `${wd(locale, 'aiSuccessApproach')}: `)
    .replace(/\s+after the execution failure\.?/giu, ' \uC2E4\uD589 \uC2E4\uD328 \uD6C4.')
    .replace(/Reuse this recovery approach when the same failure appears\.?/giu, '\uAC19\uC740 \uC2E4\uD328\uAC00 \uB098\uD0C0\uB098\uBA74 \uC774 \uBCF5\uAD6C \uC811\uADFC\uC744 \uC7AC\uC0AC\uC6A9\uD55C\uB2E4.')
    .replace(/Review prior failure before repeating this approach\.?/giu, wd(locale, 'reviewPriorFailure'))
    .replace(/Similar work appears\.?/giu, wd(locale, 'similarWork'))
    .replace(/when the same failure appears\.?/giu, wd(locale, 'sameFailure'))
    .replace(/Prevent this by checking the command, path, permission, or tool state before repeating the same attempt\.?/giu, '\uAC19\uC740 \uC2DC\uB3C4\uB97C \uBC18\uBCF5\uD558\uAE30 \uC804\uC5D0 \uBA85\uB839, \uACBD\uB85C, \uAD8C\uD55C, \uB3C4\uAD6C \uC0C1\uD0DC\uB97C \uD655\uC778\uD55C\uB2E4.')
    .trim();
}

function localizeEnglishActionSummaryKo(text = '') {
  const value = String(text || '').trim();
  if (!/[A-Za-z]{3,}/u.test(value)) return '';
  const clauses = value.split(/;\s+|(?<=[.!?])\s+/u).map((clause) => clause.trim()).filter(Boolean);
  const localized = clauses.map((clause) => {
    const clean = clause.replace(/[.!?]+$/u, '').trim();
    const lower = clean.toLowerCase();
    if (!clean) return '';
    if (/^validation passed$/iu.test(clean) || /^checks passed$/iu.test(clean) || /^tests passed$/iu.test(clean)) {
      return '\uAC80\uC99D\uC744 \uD1B5\uACFC\uD588\uB2E4.';
    }
    if (/^this reusable approach should be reused$/iu.test(clean) || /^reuse this approach in similar tasks after validation passes$/iu.test(clean)) {
      return '\uC774 \uC7AC\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC811\uADFC\uC740 \uAC80\uC99D \uD6C4 \uC720\uC0AC \uC791\uC5C5\uC5D0 \uB2E4\uC2DC \uC0AC\uC6A9\uD55C\uB2E4.';
    }
    const action = clean.match(/^(Created|Built|Implemented|Updated|Adjusted|Moved|Preserved|Kept|Used|Reused|Verified|Ran|Fixed|Changed)\s+(.+)$/iu);
    if (!action) return '';
    const verb = action[1].toLowerCase();
    const object = action[2].replace(/\s+so\s+.+$/iu, '').trim();
    const verbKo = {
      created: '\uB9CC\uB4E4\uC5C8\uB2E4',
      built: '\uAD6C\uCD95\uD588\uB2E4',
      implemented: '\uAD6C\uD604\uD588\uB2E4',
      updated: '\uC5C5\uB370\uC774\uD2B8\uD588\uB2E4',
      adjusted: '\uC870\uC815\uD588\uB2E4',
      moved: '\uC774\uB3D9\uD588\uB2E4',
      preserved: '\uBCF4\uC874\uD588\uB2E4',
      kept: '\uC720\uC9C0\uD588\uB2E4',
      used: '\uC0AC\uC6A9\uD588\uB2E4',
      reused: '\uC7AC\uC0AC\uC6A9\uD588\uB2E4',
      verified: '\uAC80\uC99D\uD588\uB2E4',
      ran: '\uC2E4\uD589\uD588\uB2E4',
      fixed: '\uC218\uC815\uD588\uB2E4',
      changed: '\uBCC0\uACBD\uD588\uB2E4'
    }[verb] || '\uCC98\uB9AC\uD588\uB2E4';
    if (verb === 'moved' && lower.includes(' so ')) {
      return `${object}\uC744 ${verbKo}. \uC694\uCCAD\uD55C \uC21C\uC11C\uC640 \uC704\uCE58\uAC00 \uBA3C\uC800 \uBCF4\uC774\uB3C4\uB85D \uC815\uB9AC\uD588\uB2E4.`;
    }
    return `${object}\uC744 ${verbKo}.`;
  }).filter(Boolean);
  if (localized.length === 0) return '';
  return localized.join(' ');
}

function localizeRecoveryPhraseKo(text) {
  const value = String(text || '').trim().replace(/\.$/u, '');
  const commandSwap = value.match(/^using\s+(.+?)\s+instead of\s+(.+)$/iu);
  if (commandSwap) {
    return `${commandSwap[2]} \uB300\uC2E0 ${commandSwap[1]} \uC0AC\uC6A9`;
  }
  return normalizeUserFacingTextForLanguage(value, 'ko');
}

function memoryDisplayTitle(memory, locale = 'en-US') {
  const role = memory.memoryRole || '';
  if (role === 'user_success_criteria') return wd(locale, 'userSuccessCriteria');
  if (role === 'ai_failure_memory') return wd(locale, 'aiFailureMemory');
  if (role === 'ai_successful_approach') return wd(locale, 'aiSuccessfulApproach');
  if (role === 'task_context') return wd(locale, 'taskContext');
  if (role === 'discarded_detail') return wd(locale, 'discardedDetail');
  return localizedDocTitle(memory.docKey || docKeyForType(memory.type), locale);
}

function memoryDisplaySummary(memory, locale = 'en-US') {
  const value = memory.summary || memory.rule || memory.preferredBehavior || memory.details || memory.title || memory.id;
  const language = wikiDisplayLanguage(locale);
  if (!['en', 'ko'].includes(language)) {
    const generic = localizedGenericText(locale, memory.memoryRole || memory.type);
    const topic = stripVisibleMemoryIds(memory.topic || '').trim();
    return [generic || wd(locale, 'memoryNote'), topic && !hasHangul(topic) ? `(${topic})` : ''].filter(Boolean).join(' ');
  }
  return localizeWikiDisplayText(value, locale);
}

function memoryDisplayField(memory, field, locale = 'en-US', fallback = '') {
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
  if (memory.type === 'response_preference') return 'user_preferences';
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

const SHORT_MEMORY_TITLES = {
  language_user_generated_content: {
    en: 'AI-generated narrative follows user language',
    ko: 'AI 생성 설명문은 사용자 언어를 따른다',
    ja: 'AI生成説明文はユーザー言語に従う',
    'zh-CN': 'AI生成说明遵循用户语言',
    'zh-TW': 'AI生成說明遵循使用者語言',
    ar: 'وصف AI يتبع لغة المستخدم'
  },
  design_export_source_notes: {
    en: 'Check source notes before DESIGN export',
    ko: 'DESIGN export 전 source notes 확인',
    ja: 'DESIGN export前にsource notesを確認',
    'zh-CN': 'DESIGN导出前检查source notes',
    'zh-TW': 'DESIGN匯出前檢查source notes',
    ar: 'تحقق من source notes قبل DESIGN export'
  },
  ai_mapping_blocks_export: {
    en: 'Pause DESIGN export for AI organization',
    ko: 'AI 정리 요청 시 DESIGN export 보류',
    ja: 'AI整理依頼時はDESIGN exportを保留',
    'zh-CN': 'AI整理请求时暂停DESIGN导出',
    'zh-TW': 'AI整理請求時暫停DESIGN匯出',
    ar: 'أوقف DESIGN export عند طلب تنظيم AI'
  },
  same_role_consistency: {
    en: 'Keep same-role elements consistent',
    ko: '같은 역할의 요소를 일관되게 유지',
    ja: '同じ役割の要素を一貫させる',
    'zh-CN': '保持同角色元素一致',
    'zh-TW': '保持同角色元素一致',
    ar: 'حافظ على اتساق العناصر ذات الدور نفسه'
  }
};

function shortMemoryTitle(locale, key) {
  const language = wikiDisplayLanguage(locale);
  return SHORT_MEMORY_TITLES[key]?.[language] || SHORT_MEMORY_TITLES[key]?.en || '';
}

function memoryNoteTitle(memory, locale = 'en-US') {
  const rawDisplay = memoryDisplaySummary(memory, locale);
  const isPrevention = memory.type === 'prevention_rule'
    || /^Do not repeat this failed approach:/iu.test(rawDisplay)
    || /^\uBC18\uBCF5 \uAE08\uC9C0:/u.test(rawDisplay);
  const display = rawDisplay
    .replace(/\.$/u, '')
    .replace(/^AI \uC131\uACF5 \uC811\uADFC:\s*/u, '')
    .replace(/^\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328:\s*/u, '')
    .replace(/^\uBC18\uBCF5 \uAE08\uC9C0:\s*/u, '')
    .replace(/^AI successful approach:\s*/iu, '')
    .replace(/^Command failed:\s*/iu, '')
    .replace(/^Do not repeat:\s*/iu, '')
    .trim();
  const normalized = normalizeText(display);
  const lowerDisplay = display.toLowerCase();
  const rawMemoryText = [
    memory.summary,
    memory.rule,
    memory.details,
    memory.preventionRule,
    memory.topic,
    ...(memory.tags || [])
  ].filter(Boolean).join('\n');
  const rawNormalized = semanticNormalize(rawMemoryText);
  if (semanticHasAny(rawNormalized, ['generated content', 'ai-generated', 'userlanguage', '사용자 언어', '설명문', 'design intent', 'source notes', 'spec narrative'])) {
    return shortMemoryTitle(locale, 'language_user_generated_content');
  }
  if (semanticHasAny(rawNormalized, ['unmapped source content', 'sourcenotes', 'source notes', 'design.md export', 'design export', '미적용', '보존'])) {
    return shortMemoryTitle(locale, 'design_export_source_notes');
  }
  if (semanticHasAny(rawNormalized, ['ask ai to organize', 'ai organization request', 'ai 정리', 'export하지 않고', '보류'])) {
    return shortMemoryTitle(locale, 'ai_mapping_blocks_export');
  }
  if (semanticHasAny(rawNormalized, ['same role', 'same-role', '같은 역할', '일관', 'consistent'])) {
    return shortMemoryTitle(locale, 'same_role_consistency');
  }
  const language = wikiDisplayLanguage(locale);
  if (language === 'ko') {
    if (isPrevention && lowerDisplay.includes('npm test') && (lowerDisplay.includes('shim') || display.includes('\uC0AC\uC6A9 \uBD88\uAC00'))) return 'npm test shim \uC2E4\uD328 \uBC18\uBCF5 \uAE08\uC9C0';
    if (lowerDisplay.includes('npm.cmd test') && lowerDisplay.includes('npm test')) return 'npm.cmd test\uB85C \uAC80\uC99D \uC131\uACF5';
    if (lowerDisplay.includes('npm test') && (lowerDisplay.includes('shim') || display.includes('\uC0AC\uC6A9 \uBD88\uAC00'))) return 'npm test shim \uC2E4\uD328';
    if (normalized.includes('\uad6c\ud604') && normalized.includes('\uac04\uacb0') && normalized.includes('\uacc4\ud68d')) return '\uAD6C\uD604 \uC804 \uAC04\uACB0\uD55C \uACC4\uD68D \uC218\uB9BD';
    if (normalized.includes('\ucd5c\uc885') && normalized.includes('\ubcf4\uace0') && normalized.includes('\ubcc0\uacbd') && normalized.includes('\uac80\uc99d')) return '\uCD5C\uC885 \uBCF4\uACE0\uC5D0 \uBCC0\uACBD \uD30C\uC77C\uACFC \uAC80\uC99D \uACB0\uACFC \uD3EC\uD568';
    return display
      .replace(/^(사용자는|사용자가)\s*/u, '')
      .replace(/(한다|한다\.|원한다|원한다\.)$/u, '')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 44) || memoryDisplayTitle(memory, locale);
  }
  if (isPrevention && lowerDisplay.includes('npm test') && lowerDisplay.includes('shim')) return 'Do not repeat npm test shim failure';
  if (lowerDisplay.includes('npm.cmd test') && lowerDisplay.includes('npm test')) return 'Validate successfully with npm.cmd test';
  if (lowerDisplay.includes('npm test') && lowerDisplay.includes('shim')) return 'npm test shim failure';
  if (normalized.includes('before coding') && normalized.includes('concise plan')) return 'Create a concise plan before implementation';
  if (normalized.includes('final report') && normalized.includes('changed files') && normalized.includes('validation result')) return 'Include changed files and validation result';
  return display
    .replace(/^(the user|user)\s+/iu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 56) || memoryDisplayTitle(memory, locale);
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
    `- ${t(locale, 'modelClass')}: \`${memory.modelClass || inferModelClass(memory)}\``,
    `- ${t(locale, 'modelSubClass')}: \`${memory.modelSubClass || inferModelSubClass(memory)}\``,
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
    `modelClass: ${yamlScalar(memory.modelClass || inferModelClass(memory))}`,
    `modelSubClass: ${yamlScalar(memory.modelSubClass || inferModelSubClass(memory))}`,
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
    ...WIKI_DOCS.flatMap((doc) => SUPPORTED_MEMORY_LANGUAGE_TAGS.map((tag) => localizedDocTitle(doc.docKey, tag)))
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
  if (conceptDocKey(concept)) return true;
  return languageFromLocale(locale) === 'en';
}

function conceptWikiLink(concept, locale = 'en-US') {
  const docKey = conceptDocKey(concept);
  if (docKey) return wikiLinkForDocKey(docKey, locale);
  const conceptTitle = conceptNameForTerm(concept) || safeWikiPageName(concept);
  return shouldWriteConceptWikiPage(conceptTitle, locale) ? wikiLink(safeWikiPageName(conceptTitle)) : '';
}

function conceptDocKey(concept) {
  const normalized = normalizeText(concept);
  for (const doc of WIKI_DOCS) {
    const matches = [
      pageTitle(doc.canonicalFileName),
      ...SUPPORTED_MEMORY_LANGUAGE_TAGS.map((tag) => localizedDocTitle(doc.docKey, tag))
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
  if (memory.memoryRole === 'user_success_criteria' && textHasAny(memory.summary, ['latest user success criteria', 'latest success criteria'])) {
    score += 45;
    matchScore += 12;
  }
  if (memory.scope === 'project' && memory.projectId && memory.projectId === config.projectId) score += 25;
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

function selectRelevantMemories(memories, task, config) {
  const maxItems = config.maxContextItems || 8;
  const situation = config.situation || detectSituation(task);
  const taskDomains = extractDomains(task);
  const taskTags = extractTags(task);
  const scored = memories
    .filter((memory) => memory.status === 'active')
    .filter((memory) => matchesActiveCondition(memory, task))
    .filter((memory) => memoryMatchesTaskDomain(memory, { taskDomains, taskTags, task }, config.projectId))
    .map((memory) => ({ memory, ...scoreMemoryDetailed(memory, task, { ...config, situation }) }))
    .filter((item) => item.matchScore > 0)
    .sort((left, right) => right.score - left.score);
  const currentProject = scored.filter((item) => memoryBelongsToCurrentProject(item.memory, config.projectId));
  const broader = scored.filter((item) => !memoryBelongsToCurrentProject(item.memory, config.projectId));
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
  const domainScoped = memory.scope === 'domain' || (memory.modelClass || inferModelClass(memory)) === 'domain_model';
  if (!domainScoped) return true;
  if (setOverlap(memory.tags || [], taskTags) > 0) return true;
  if (memory.topic && normalizeText(task).includes(normalizeText(memory.topic))) return true;
  return setOverlap(memoryDomains, taskDomains) > 0;
}

function memoryBelongsToCurrentProject(memory, projectId) {
  return Boolean(projectId && memory.projectId === projectId);
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
  const retrievalConfig = { ...config, projectId: project.projectId, situation };
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const active = index.memories.filter((memory) => memory.status === 'active' && isMemoryVisibleForProject(memory, project));
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
    details.push(`${t(locale, 'prevention')}: ${localizeWikiDisplayText(memory.preventionRule, locale)}`);
    if (memory.affectedContext) {
      details.push(`Context: ${localizeWikiDisplayText(memory.affectedContext, locale)}`);
    }
    const alternative = (options.allMemories || []).find((candidate) => (
      ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
      && (
        hasTargetOverlap(memory, candidate)
        || setOverlap(memory.tags || [], candidate.tags || []) >= 1
        || (textHasAny(memory.summary, ['scroll', 'overflow', 'layout']) && textHasAny(candidate.summary, ['scroll', 'wrapper', 'layout']))
      )
    ));
    if (alternative) {
      details.push(`${t(locale, 'alternative')}: ${localizeWikiDisplayText(alternative.summary, locale)}`);
    }
  }
  if (memory.type === 'success_pattern' && (memory.reuseWhen || []).length > 0) {
    details.push(`Reuse when: ${localizeWikiDisplayText((memory.reuseWhen || []).join(', '), locale)}`);
  }
  if (memory.type === 'agent_success_pattern' && memory.recoveryApproach) {
    details.push(`Recovery: ${localizeWikiDisplayText(memory.recoveryApproach, locale)}`);
  }
  if (memory.patternType && memory.preferredBehavior && memory.preferredBehavior !== memory.summary) {
    details.push(`${t(locale, 'guidanceForAgent')}: ${localizeWikiDisplayText(memory.preferredBehavior, locale)}`);
  }
  const detailText = details.length > 0 ? ` ${details.join(' ')}` : '';
  return `- ${memory.confidence === 'low' ? '[low confidence] ' : ''}${localizeWikiDisplayText(memory.summary, locale)}${detailText} [${memory.id}; ${memory.scope}; ${memory.confidence}]`;
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
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.summary} [${candidate.id}; ${candidate.conflictStatus || 'active_conflict'}; ${candidate.confidence || 'medium'}]`) : [`- ${t(locale, 'none')}`]),
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
  const locale = resolveLocale(input, config);
  const project = await resolveProjectIdentityForRead(root);
  const task = input.task || input.text || '';
  const situation = detectSituation(task);
  const retrievalConfig = { ...config, projectId: project.projectId, situation };
  const index = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const relevant = selectRelevantMemories(index.memories.filter((memory) => isMemoryVisibleForProject(memory, project)), task, retrievalConfig);
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

async function demoteRejectedSuccessMemories(root, event = {}, input = {}) {
  if (!(event.userAcceptance === 'rejected' || event.finalOutcome === 'technical_success_user_rejected')) return [];
  const project = await resolveCurrentProjectIdentity(root);
  const contextText = [
    input.userRequest || input.request || event.userRequest || '',
    input.aiActionSummary || input.summary || event.aiActionSummary || '',
    event.userFeedback || input.userFeedback || input.feedback || '',
    event.rejectionReason || '',
    event.correctionDirection || ''
  ].filter(Boolean).join('\n');
  if (!contextText.trim()) return [];
  const memoryIndexPath = vibeboxPath(root, 'index/global-memory-index.json');
  const memoryIndex = await loadJson(memoryIndexPath, defaultMemoryIndex());
  const demoted = (memoryIndex.memories || []).filter((memory) => (
    memory.status === 'active'
    && canDemoteRejectedSuccessMemory(memory, contextText, project)
  ));
  if (demoted.length === 0) return [];
  const demotedIds = new Set(demoted.map((memory) => memory.id));
  memoryIndex.memories = memoryIndex.memories.filter((memory) => !demotedIds.has(memory.id));
  memoryIndex.updatedAt = nowIso();
  await saveJson(memoryIndexPath, memoryIndex);
  await rebuildIndexes(root);
  await rebuildWiki(root);
  return [...demotedIds];
}

export async function afterTask(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const userRequestText = input.userRequest || input.request || '';
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
    notes: input.notes || ''
  });

  const hasFailureWithoutRequest = hasExecutionFailureSignal(input, event);
  if (!userRequestText.trim() && !hasFailureWithoutRequest) {
    return {
      event,
      candidates: [],
      message: [
        `Captured blackbox event ${event.id}.`,
        'Warning: userRequest is missing; active user model extraction was skipped.',
        'Pass the original user request with --request to enable model extraction.',
        'Use `vibebox review` only for manual debug or override workflows.'
      ].join('\n')
    };
  }

  const wasRejected = event.userAcceptance === 'rejected' || event.finalOutcome === 'technical_success_user_rejected';
  const wasAccepted = event.userAcceptance === 'accepted' || event.finalOutcome === 'accepted_success';
  const actionSummaryText = input.aiActionSummary || input.summary || '';
  const validationEvidenceText = [
    actionSummaryText,
    input.commandResult || '',
    event.commandResult || '',
    ...(input.commandResults || []),
    ...(event.commandResults || [])
  ].filter(Boolean).join('\n');
  const canInferReusableSuccess = !wasRejected
    && !wasAccepted
    && hasTechnicalSuccessSignal(validationEvidenceText, event)
    && hasReusableSuccessSignal(validationEvidenceText);
  const demotedSuccessIds = wasRejected ? await demoteRejectedSuccessMemories(root, event, input) : [];
  const correctionText = generatedSnippet(event.correctionDirection || event.userFeedback) || 'confirming the direction with the user before repeating it';
  const recoveryText = cleanRecoverySnippet(actionSummaryText);
  const errorSnippets = (input.errors || []).map((error) => generatedSnippet(error)).filter(Boolean);
  const generatedExtractionText = [
    ...errorSnippets,
    ...errorSnippets.map((error) => `Do not repeat this failed approach: ${error}.`),
    hasFailureWithoutRequest && errorSnippets.length === 0
      ? `AI execution failure: ${generatedSnippet(primaryExecutionFailureText(input, event))}. Prevent this by checking the command, path, permission, or tool state before repeating the same attempt.`
      : '',
    hasFailureWithoutRequest && hasTechnicalSuccessSignal(validationEvidenceText, event) && actionSummaryText
      ? `Agent succeeded by ${recoveryText} after the execution failure; reuse this recovery approach when the same failure appears: ${recoveryText}.`
      : '',
    wasRejected
      ? [
        `User rejected a technically completed result; avoid repeating this approach: ${generatedSnippet(input.aiActionSummary || input.summary)}; prefer ${correctionText}.`,
        `When the user rejects a technically completed result, treat it as AI failure and follow this correction direction: ${event.correctionDirection || event.userFeedback}.`,
        `AI failed because technical success did not match the user's success criteria. Prevent this by treating the user's latest correction as the success criteria before repeating the work.`,
        `For ${correctionContextSnippet(event.userRequest)}, treat ${correctionText} as the latest user success criteria instead of the rejected direction.`,
        `This task failed from the AI perspective: ${input.aiActionSummary || input.summary}. Failure reason: ${event.rejectionReason || event.userFeedback || 'user rejection'}. Prevent this by ${event.correctionDirection || 'confirming the direction with the user before repeating it'}.`
      ].join('\n')
      : '',
    wasAccepted
      ? `Accepted reusable approach: ${generatedSnippet(actionSummaryText)}; should be reused in similar tasks.`
      : '',
    canInferReusableSuccess
      ? `${generatedSnippet(actionSummaryText)}. Reuse this approach in similar tasks after validation passes.`
      : '',
    event.finalOutcome === 'failed' || event.technicalOutcome === 'failure'
      ? `This task failed: ${actionSummaryText}. Failure reason: ${(input.errors || []).join('; ') || input.commandResult || 'unknown'}.`
      : '',
    input.notes || ''
  ].filter(Boolean).join('\n');

  const candidates = await extractMemoryCandidates(root, {
    userRequest: userRequestText.trim() ? userRequestText : '',
    userFeedback: event.userFeedback || '',
    text: generatedExtractionText,
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
      demotedSuccessIds.length > 0 ? `Demoted rejected AI success memor${demotedSuccessIds.length === 1 ? 'y' : 'ies'}: ${demotedSuccessIds.join(', ')}.` : '',
      summary,
      !userRequestText.trim() && hasFailureWithoutRequest
        ? 'Warning: userRequest is missing; user success criteria extraction was skipped, but AI failure memory extraction was allowed.'
        : '',
      input.manualReview || input.reviewOnly || input.debugReview
        ? 'Review pending memory with `vibebox review`, then approve or reject candidate ids.'
        : 'Use `vibebox review` only for manual debug or override workflows.'
    ].filter(Boolean).join('\n')
  };
}

export async function generateReport(root = process.cwd(), input = {}) {
  await initVibeBox(root);
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
  const project = await resolveCurrentProjectIdentity(root);
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
    '',
    renderReportType(t(locale, 'relevantUserPreferences'), active, ['user_preference', 'coding_style', 'design_preference', 'response_preference', 'communication_pattern']),
    renderReportType(t(locale, 'relevantValidationPatterns'), active, ['validation_pattern']),
    renderReportType(t(locale, 'relevantProcessPatterns'), active, ['process_pattern', 'handoff_pattern']),
    renderReportType(t(locale, 'relevantDesignPhilosophy'), active, ['design_philosophy']),
    renderReportType(t(locale, 'relevantProjectDecisions'), active, ['project_decision', 'decision_pattern']),
    renderReportType(t(locale, 'relevantArchitectureRules'), active, ['architecture_rule']),
    renderReportType(t(locale, 'relevantAvoidRules'), active, ['avoid_rule']),
    renderReportType(t(locale, 'relevantFailureMemory'), active, ['failure_memory', 'agent_failure_pattern']),
    renderReportType(t(locale, 'relevantSuccessPatterns'), active, ['success_pattern', 'agent_success_pattern']),
    renderReportType(t(locale, 'pageToolingPreferences'), active, ['tooling_preference', 'technology_preference']),
    renderReportType(t(locale, 'pageWorkflowRules'), active, ['workflow_rule']),
    `${t(locale, 'pendingCandidates')}:`,
    ...(visiblePending.slice(0, 12).map((candidate) => `- ${candidate.id} ${candidate.type}/${candidate.scope}: ${candidate.summary} [${candidate.conflictStatus}; ${candidate.recommendedAction || recommendCandidateAction(candidate).action}]`) || []),
    visiblePending.length === 0 ? `- ${t(locale, 'none')}` : '',
    '',
    `${t(locale, 'potentialConflicts')}:`,
    ...(conflicts.length > 0 ? conflicts.map((candidate) => `- ${candidate.id}: ${candidate.summary} [${candidate.conflictStatus}]`) : [`- ${t(locale, 'none')}`])
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
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = resolveLocale(input, config);
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
    ...events.filter((event) => textHasAny(event.userFeedback || '', ['reject', 'rejected', 'instead'])).map((event) => `- ${event.userFeedback}`),
    events.some((event) => textHasAny(event.userFeedback || '', ['reject', 'rejected', 'instead'])) ? '' : `- ${t(locale, 'none')}`,
    '',
    `${t(locale, 'confirmedDecisions')}:`,
    ...(active.filter((memory) => memory.type === 'project_decision').map((memory) => `- ${memory.summary}`) || []),
    active.some((memory) => memory.type === 'project_decision') ? '' : `- ${t(locale, 'none')}`,
    '',
    `${t(locale, 'recurringFailureTypes')}:`,
    ...formatCounts(recurringFailureTypes, locale),
    '',
    `${t(locale, 'frequentlyChangedFiles')}:`,
    ...formatCounts(changedFiles, locale),
    '',
    `${t(locale, 'preventionRules')}:`,
    ...(active.filter((memory) => ['failure_memory', 'avoid_rule', 'agent_failure_pattern'].includes(memory.type)).map((memory) => `- ${memory.preventionRule || memory.forbiddenAction || memory.summary}`) || []),
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

const SEMANTIC_GLOSSARY = {
  ko: [
    [/before coding,?\s+create a concise plan\.?/giu, '\uAD6C\uD604 \uC804\uC5D0 \uAC04\uACB0\uD55C \uACC4\uD68D\uC744 \uC138\uC6B4\uB2E4.'],
    [/final report should include changed files and validation result\.?/giu, '\uCD5C\uC885 \uBCF4\uACE0\uC5D0\uB294 \uBCC0\uACBD \uD30C\uC77C\uACFC \uAC80\uC99D \uACB0\uACFC\uB97C \uD3EC\uD568\uD55C\uB2E4.'],
    [/do not modify package\.json unless explicitly requested\.?/giu, '\uBA85\uC2DC \uC694\uCCAD \uC5C6\uC774 package.json\uC744 \uC218\uC815\uD558\uC9C0 \uC54A\uB294\uB2E4.'],
    [/when validating changes,?\s+report command results\.?/giu, '\uBCC0\uACBD \uC0AC\uD56D\uC744 \uAC80\uC99D\uD560 \uB54C \uBA85\uB839 \uACB0\uACFC\uB97C \uBCF4\uACE0\uD55C\uB2E4.'],
    [/validation passed and the approach appears reusable for similar tasks\.?/giu, '\uAC80\uC99D\uC744 \uD1B5\uACFC\uD588\uACE0 \uC720\uC0AC \uC791\uC5C5\uC5D0 \uC7AC\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC811\uADFC\uC73C\uB85C \uD310\uB2E8\uB41C\uB2E4.'],
    [/validation or technical success suggests this approach is reusable\.?/giu, '\uAC80\uC99D \uB610\uB294 \uAE30\uC220\uC801 \uC131\uACF5\uC744 \uD1B5\uD574 \uC774 \uC811\uADFC\uC744 \uC7AC\uC0AC\uC6A9\uD560 \uC218 \uC788\uB2E4\uACE0 \uD310\uB2E8\uB41C\uB2E4.'],
    [/reuse this approach in similar tasks after validation passes\.?/giu, '\uAC80\uC99D\uC744 \uD1B5\uACFC\uD55C \uACBD\uC6B0 \uC720\uC0AC \uC791\uC5C5\uC5D0 \uC774 \uC811\uADFC\uC744 \uC7AC\uC0AC\uC6A9\uD55C\uB2E4.'],
    [/used wrapper-based table scrolling and kept dependencies unchanged; should be reused in similar tasks\.?/giu, '\uC758\uC874\uC131\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uACE0 wrapper \uAE30\uBC18 \uD14C\uC774\uBE14 \uC2A4\uD06C\uB864\uC744 \uC801\uC6A9\uD55C \uBC29\uC2DD\uC740 \uC720\uC0AC \uC791\uC5C5\uC5D0 \uC7AC\uC0AC\uC6A9\uD560 \uC218 \uC788\uB2E4.'],
    [/used wrapper-based implementation, validation passed, and this reusable approach should be reused\.?/giu, 'wrapper \uAE30\uBC18 \uAD6C\uD604\uC774 \uAC80\uC99D\uC744 \uD1B5\uACFC\uD588\uACE0 \uC720\uC0AC \uC791\uC5C5\uC5D0 \uC7AC\uC0AC\uC6A9\uD560 \uC218 \uC788\uB2E4.'],
    [/plan before coding/giu, '코딩 전에 계획한다'],
    [/validate after coding/giu, '코딩 후 검증한다'],
    [/respect project type/giu, '프로젝트 유형을 기준으로 판단한다'],
    [/do not blindly reuse previous project direction/giu, '이전 프로젝트 방향을 맹목적으로 재사용하지 않는다'],
    [/changed files/giu, '변경 파일'],
    [/validation result/giu, '검증 결과'],
    [/remaining risks/giu, '남은 위험'],
    [/device-test needs/giu, '기기 테스트 필요 사항']
  ],
  en: [
    [/\uAD6C\uD604 \uC804\uC5D0 \uAC04\uACB0\uD55C \uACC4\uD68D\uC744 \uC138\uC6B4\uB2E4\.?/gu, 'Create a concise plan before implementation.'],
    [/\uCD5C\uC885 \uBCF4\uACE0\uC5D0\uB294 \uBCC0\uACBD \uD30C\uC77C\uACFC \uAC80\uC99D \uACB0\uACFC\uB97C \uD3EC\uD568\uD55C\uB2E4\.?/gu, 'Include changed files and validation result in final report.'],
    [/\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328:\s*npm test\uAC00 code (\d+)\uB85C \uC885\uB8CC\uB428 \(npm shim \uC0AC\uC6A9 \uBD88\uAC00\)\.?/gu, 'Command failed: npm test exited with code $1 because the npm shim was unavailable.'],
    [/\uBC18\uBCF5 \uAE08\uC9C0:\s*\uBA85\uB839 \uC2E4\uD589 \uC2E4\uD328:\s*npm test\uAC00 code (\d+)\uB85C \uC885\uB8CC\uB428 \(npm shim \uC0AC\uC6A9 \uBD88\uAC00\)\.?/gu, 'Do not repeat this failed approach: Command failed: npm test exited with code $1 because the npm shim was unavailable.'],
    [/AI \uC131\uACF5 \uC811\uADFC:\s*\uC2E4\uD589 \uC2E4\uD328 \uD6C4 npm test \uB300\uC2E0 npm\.cmd test \uC0AC\uC6A9\.\s*\uAC19\uC740 \uC2E4\uD328\uAC00 \uB098\uD0C0\uB098\uBA74 npm test \uB300\uC2E0 npm\.cmd test \uC0AC\uC6A9\uC744 \uC7AC\uC0AC\uC6A9\uD55C\uB2E4\.?/gu, 'Agent succeeded by using npm.cmd test instead of npm test after the execution failure; reuse this recovery approach when the same failure appears: using npm.cmd test instead of npm test.'],
    [/코딩 전에 계획한다/gu, 'plan before coding'],
    [/코딩 후 검증한다/gu, 'validate after coding'],
    [/프로젝트 유형을 기준으로 판단한다/gu, 'respect project type'],
    [/이전 프로젝트 방향을 맹목적으로 재사용하지 않는다/gu, 'do not blindly reuse previous project direction'],
    [/변경 파일/gu, 'changed files'],
    [/검증 결과/gu, 'validation result'],
    [/남은 위험/gu, 'remaining risks'],
    [/기기 테스트 필요 사항/gu, 'device-test needs']
  ]
};

function normalizeUserFacingTextForLanguage(text, targetLanguage) {
  let result = String(text || '');
  for (const [pattern, replacement] of SEMANTIC_GLOSSARY[targetLanguage] || []) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function normalizeMemoryLanguage(memory, targetLanguage, locale) {
  const normalized = { ...memory };
  normalized.docKey = normalized.docKey || docKeyForType(normalized.type);
  normalized.displayLanguage = normalizeConfigLanguageTag(locale || targetLanguage, 'en-US');
  normalized.updatedAt = nowIso();
  return normalized;
}

async function cleanupStaleLocalizedWikiDocs(root, locale) {
  const wikiRoot = vibeboxPath(root, 'wiki');
  const activeFiles = new Set(currentWikiPages(locale));
  const knownFiles = new Set(WIKI_DOCS.flatMap((doc) => [
    doc.canonicalFileName,
    ...SUPPORTED_MEMORY_LANGUAGE_TAGS.map((tag) => localizedDocFileName(doc.docKey, tag))
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
  const backLabels = new Set(['Back to', ...Object.values(WIKI_DISPLAY_TEXT).map((pack) => pack.backTo).filter(Boolean)]);
  const homeDescriptions = new Set(Object.values(WIKI_DISPLAY_TEXT).map((pack) => pack.homeDescription).filter(Boolean));
  return withoutManaged.split(/\r?\n/u).every((line) => {
    const trimmed = line.trim();
    return trimmed === ''
      || trimmed.startsWith('#')
      || homeDescriptions.has(trimmed)
      || [...backLabels].some((label) => trimmed.startsWith(label));
  });
}

export async function convertLanguage(root = process.cwd(), options = {}) {
  requireAgentRuntime('convert-lang');
  if (options.from) {
    assertSupportedMemoryLanguageTag(options.from, 'source language');
  }
  const targetLocale = assertSupportedMemoryLanguageTag(options.to || options.language || options.target || '', 'target language');
  await initVibeBox(root);
  const targetLanguage = languageFromLocale(targetLocale);
  const configPath = vibeboxPath(root, 'config.json');
  const config = await loadJson(configPath, defaultConfig());
  const updatedConfig = {
    ...config,
    locale: targetLocale,
    memoryLanguage: targetLocale,
    outputLanguage: targetLocale,
    wikiLanguage: targetLocale,
    reportLanguage: targetLocale,
    contextLanguage: targetLocale,
    updatedAt: nowIso()
  };
  await saveJson(configPath, updatedConfig);

  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(targetLocale));
  await rebuildIndexes(root);
  await rebuildWiki(root);
  await cleanupStaleLocalizedWikiDocs(root, targetLocale);
  return { language: targetLocale, primaryLanguage: targetLanguage, locale: targetLocale, storeRoot: vibeboxPath(root) };
}

export async function rebuildVibeBox(root = process.cwd(), options = {}) {
  const semantic = options.semantic !== false && !options.indexOnly;
  if (semantic) {
    requireAgentRuntime('rebuild');
    const configPath = vibeboxPath(root, 'config.json');
    if (await exists(configPath)) {
      const existingConfig = await loadJson(configPath, {});
      configuredMemoryLocale(existingConfig);
    }
    await initVibeBox(root);
  } else {
    await ensureDir(vibeboxPath(root, 'index'));
  }
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = configuredMemoryLocale(config);
  const memoryIndexPath = vibeboxPath(root, 'index/global-memory-index.json');
  const memoryIndex = await loadJson(memoryIndexPath, defaultMemoryIndex());
  memoryIndex.memories = (memoryIndex.memories || [])
    .filter((memory) => memory.status === 'active')
    .map((memory) => toMemoryIndexEntry(normalizeCandidateModel(memory)));
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
  const currentProjectId = currentProject?.projectId || detectedProject?.projectId || 'none';
  const requiredFiles = [
    'config.json',
    'registry/projects.json',
    'registry/wiki-docs.json',
    ...currentWikiPages(locale).map((page) => `wiki/${page}`),
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
    const activeDocFiles = new Set(currentWikiPages(locale));
    for (const doc of WIKI_DOCS) {
      const possibleFiles = [...new Set([
        doc.canonicalFileName,
        ...SUPPORTED_MEMORY_LANGUAGE_TAGS.map((tag) => localizedDocFileName(doc.docKey, tag))
      ])];
      const present = [];
      for (const fileName of possibleFiles) {
        if (await exists(path.join(vibeboxPath(root, 'wiki'), fileName))) {
          present.push(fileName);
        }
      }
      if (present.length > 1) {
        warnings.push(`Duplicate localized wiki document for ${doc.docKey}: ${present.join(', ')}.`);
      }
      const expected = localizedDocFileName(doc.docKey, locale);
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
