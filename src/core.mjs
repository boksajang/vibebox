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

function normalizeLocale(locale) {
  const value = String(locale || '').trim();
  if (!value || value.toLowerCase() === 'auto') return 'auto';
  if (/^ko(?:-|$)/iu.test(value)) return 'ko-KR';
  if (/^en(?:-|$)/iu.test(value)) return 'en-US';
  return value || 'en-US';
}

function languageFromLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (normalized === 'auto') return 'auto';
  const match = normalized.match(/^([a-z]{2,3})(?:-|$)/iu);
  return match ? match[1].toLowerCase() : 'en';
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
  if (counts.zh >= Math.max(2, counts.latin)) return 'zh';
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
  const locale = normalizeLocale(process.env.VIBEBOX_LOCALE || process.env.VIBEBOX_LANGUAGE || detectSystemLocale());
  const outputLanguage = languageFromLocale(locale);
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

function resolveLocale(input = {}, config = {}) {
  const explicit = input.locale
    || input.language
    || process.env.VIBEBOX_LOCALE
    || process.env.VIBEBOX_LANGUAGE;
  const configured = config.outputLanguage
    || config.contextLanguage
    || config.reportLanguage
    || config.wikiLanguage
    || config.locale;
  const selected = explicit || configured || detectLanguageFromText(languageDetectionText(input)) || detectSystemLocale();
  if (String(selected).toLowerCase() === 'auto') {
    return normalizeLocale(detectLanguageFromText(languageDetectionText(input)) || config.locale || detectSystemLocale());
  }
  return normalizeLocale(selected);
}

function localeTemplates(locale) {
  return LOCALE_TEMPLATES[normalizeLocale(locale)] || LOCALE_TEMPLATES['en-US'];
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
  const language = languageFromLocale(locale);
  return {
    version: VIBEBOX_VERSION,
    language,
    locale: normalizeLocale(locale),
    updatedAt: nowIso(),
    docs: WIKI_DOCS.map((doc) => ({
      docKey: doc.docKey,
      canonicalFileName: doc.canonicalFileName,
      fileName: localizedDocFileName(doc.docKey, locale),
      title: localizedDocTitle(doc.docKey, locale),
      aliases: [...new Set([
        pageTitle(doc.canonicalFileName),
        localizedDocTitle(doc.docKey, locale)
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

  await ensureDir(vibeboxPath(root, 'registry'));
  await writeIfMissing(vibeboxPath(root, 'registry/projects.json'), `${JSON.stringify(defaultRegistry(), null, 2)}\n`);
  await writeIfMissing(vibeboxPath(root, 'registry/wiki-docs.json'), `${JSON.stringify(defaultWikiDocRegistry(config.locale), null, 2)}\n`);
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
    const page = localizedDocFileName(doc.docKey, config.locale);
    files.push([`wiki/${page}`, initialWikiDocPage(doc.docKey, config.locale)]);
  }
  if (hasProject) {
    files.push([`wiki/projects/${project.projectId}.md`, initialProjectWikiPage(project, config.locale)]);
  }

  for (const [relative, content] of files) {
    const didCreate = await writeIfMissing(vibeboxPath(root, relative), content);
    if (didCreate) {
      created.push(relative);
    }
  }

  await ensureConfigFields(root);
  const actualConfig = await loadJson(vibeboxPath(root, 'config.json'), config);
  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(actualConfig.locale || config.locale));
  if (hasProject) {
    await saveJson(vibeboxPath(root, `projects/${project.projectId}/project.json`), project);
  }
  await rebuildIndexes(root, { syncNamespaceFiles: false });
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  await writeManagedWikiDoc(root, 'project_index', renderProjectIndexShell(actualConfig.locale || config.locale), renderProjectIndexManaged((registry.projects || []).filter(isRegistryProject), actualConfig.locale || config.locale), actualConfig.locale || config.locale);

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

  for (const key of ['maxContextItems', 'maxContextChars', 'memoryMode', 'curationMode', 'legacyReviewMode', 'quarantineOnConflict', 'autoActivateConfidence', 'obsidianCompatible', 'locale', 'outputLanguage', 'wikiLanguage', 'reportLanguage', 'contextLanguage']) {
    if (existing[key] === undefined) {
      merged[key] = defaults[key];
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
  if (textHasAny(text, ['reject', 'rejected', 'not the right direction', 'wrong direction', 'this is not', 'redo', 'start over', 'instead'])) return 'rejection';
  if (textHasAny(text, ['confirmed', 'accepted', 'approved', 'keep this', 'looks good', 'good direction', 'works for me'])) return 'acceptance';
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
  const match = text.match(/\b(?:instead|use|prefer)\b[:\s]+(.+)/iu);
  return summarizeStatement(match?.[1] || text);
}

function deriveOutcomeFields(input = {}) {
  const technicalOutcome = inferTechnicalOutcome(input);
  const userAcceptance = inferUserAcceptance(input);
  const finalOutcome = deriveFinalOutcome(technicalOutcome, userAcceptance, input.finalOutcome || input.final_outcome);
  const userFeedbackSignal = inferUserFeedbackSignal(input.userFeedback || input.feedback || '');
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
    'premium',
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
  if (type === 'success_pattern' && textHasAny(statement, ['worked successfully', 'approved', 'confirmed'])) {
    return 'high';
  }
  if (type === 'failure_memory' && textHasAny(statement, ['caused', 'failed', 'regression', 'rejected'])) {
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
  const hasDecision = textHasAny(statement, ['we decided', 'decided this project', 'this project uses', 'uses echarts', 'after rejecting']);
  const hasPreference = textHasAny(statement, ['prefer', 'usually prefer', 'i prefer']);
  const hasDurableUseInstruction = textHasAny(statement, ['for dashboard projects, use', 'dashboard projects use', 'for app projects, use', 'app projects use', 'this project uses']);
  const hasWorkflow = textHasAny(statement, ['review first', 'approval', 'workflow', 'subagent workflow', 'before coding', 'before implementation', 'inspect the existing project structure', 'create a concise plan']);
  const hasArchitecture = textHasAny(statement, ['architecture', 'component-level', 'preserve existing behavior', 'simple maintainable architecture']);

  if (textHasAny(statement, ['agent repeatedly fails', 'ai repeatedly fails', 'agent failed', 'ai failed', 'agent failure', 'repeatedly fails by', '에이전트가 반복적으로 실패'])) return 'agent_failure_pattern';
  if (textHasAny(statement, ['agent succeeded', 'ai succeeded', 'agent success', 'succeeded by', 'successfully handled by', '에이전트가 성공'])) return 'agent_success_pattern';
  if (isTaskOnlyImplementationBoundary(statement) || isCurrentTaskChecklist(statement)) return 'task_context';
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
  if (textHasAny(statement, ['visual direction', 'dark premium', 'cinematic', '3d hero', 'clean practical readable', 'business-like', 'card-heavy', 'dashboard-like'])) return 'design_preference';
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

function summarizeStatement(statement) {
  const text = redactSensitive(statement).replace(/\s+/gu, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function sourceOutcomeFields(source = {}, statement = '') {
  const feedbackAcceptance = inferUserAcceptance({ userFeedback: statement });
  const technicalOutcome = normalizeEnum(source.technicalOutcome, TECHNICAL_OUTCOMES, 'unknown');
  const userAcceptance = normalizeEnum(source.userAcceptance, USER_ACCEPTANCE_VALUES, feedbackAcceptance || 'unknown');
  const finalOutcome = normalizeEnum(source.finalOutcome, FINAL_OUTCOMES, deriveFinalOutcome(technicalOutcome, userAcceptance));
  return {
    technicalOutcome,
    userAcceptance,
    userFeedbackSignal: source.userFeedbackSignal || inferUserFeedbackSignal(statement),
    finalOutcome,
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

  const type = inferType(statement);
  if (!type || !MEMORY_TYPES.has(type)) {
    return null;
  }
  if (source?.role === 'aiActionSummary' && !['accepted', 'rejected', 'mixed'].includes(source.userAcceptance || '') && !source.allowActionSummary) {
    return null;
  }

  const domains = extractDomains(statement);
  const tags = extractTags(statement);
  const scope = normalizeCandidateScope(type, determineScope(statement, domains), statement);
  const confidence = determineConfidence(statement, type, scope);
  const topic = inferTopic(statement, tags, domains);
  const timestamp = nowIso();
  const summary = summarizeStatement(statement);
  const appliesTo = inferAppliesTo(statement, scope, domains, topic);
  const outcomeFields = sourceOutcomeFields(source, statement);
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

  enrichTypedFields(candidate, statement);
  normalizeCandidateModel(candidate);
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
  if (memory.scope === 'domain') return !memory.projectId || memory.projectId === project.projectId;
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
      priority: segment.priority
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
      priority: segment.priority
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
    for (const statement of splitStatements(redactSensitive(segment.text))) {
      const candidate = buildCandidate(statement, segment.source || source, memories);
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

function hasSameActiveSubject(memory, candidate) {
  return memory.topic === candidate.topic
    || setOverlap(memory.tags, candidate.tags) >= 2
    || (memory.type === candidate.type && setOverlap(memory.appliesTo, candidate.appliesTo) >= 1);
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

  if (relatedMemories.some((memory) => hasSameActiveSubject(memory, candidate) && isMoreSpecific(memory, candidate))) {
    return { status: 'refinement', related, supersedes: [], reason: 'Candidate adds a more specific condition to existing memory.' };
  }

  return { status: 'needs_user_review', related, supersedes: [], reason: 'Candidate overlaps existing memory but relation is ambiguous.' };
}

function isManualReviewMode(input = {}, config = {}) {
  return Boolean(input.manualReview || input.reviewOnly || input.debugReview)
    || input.curationMode === 'review'
    || input.memoryMode === 'review'
    || (config.legacyReviewMode === true && (config.curationMode === 'review' || config.memoryMode === 'review'));
}

function isAcceptedSuccessCandidate(candidate) {
  if (candidate.type !== 'success_pattern') return true;
  if (candidate.userAcceptance === 'accepted' || candidate.finalOutcome === 'accepted_success') return true;
  return textHasAny(candidate.summary, ['worked successfully', 'successful', 'should be reused', 'approved', 'confirmed', 'accepted', 'keep this approach']);
}

function isRejectedSuccessCandidate(candidate) {
  return ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
    && (candidate.userAcceptance === 'rejected' || candidate.finalOutcome === 'technical_success_user_rejected');
}

function inferAutoCurationDecision(candidate) {
  if (containsSensitive(candidate)) {
    return { action: 'quarantine', status: 'quarantined', reason: 'Sensitive value suspected.' };
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
    return { action: 'quarantine', status: 'quarantined', reason: 'Success memory requires user acceptance or explicit confirmation.' };
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
  if (['direct_conflict', 'needs_user_review'].includes(candidate.conflictStatus)) {
    return { action: 'quarantine', status: 'quarantined', reason: `Ambiguous conflict: ${candidate.conflictStatus}.` };
  }
  if (candidate.confidence === 'low') {
    return { action: 'quarantine', status: 'quarantined', reason: 'Low-confidence candidate needs more evidence.' };
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
    docKey: candidate.docKey,
    projectId: candidate.projectId || null,
    sourceProjectRoot: candidate.sourceProjectRoot || null,
    confidence: candidate.confidence,
    status: candidate.status,
    curationDecision: candidate.curationDecision,
    curationReason: candidate.curationReason,
    discardReason: candidate.discardReason,
    quarantineReason: candidate.quarantineReason,
    rejectionReason: candidate.rejectionReason,
    technicalOutcome: candidate.technicalOutcome,
    userAcceptance: candidate.userAcceptance,
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
    docKey: memory.docKey || docKeyForType(memory.type),
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
    failedApproach: memory.failedApproach,
    failureReason: memory.failureReason,
    preventionRule: memory.preventionRule,
    technicalOutcome: memory.technicalOutcome,
    userAcceptance: memory.userAcceptance,
    userFeedbackSignal: memory.userFeedbackSignal,
    finalOutcome: memory.finalOutcome,
    rejectionReason: memory.rejectionReason,
    correctionDirection: memory.correctionDirection,
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

function replacementIdsForMemory(memory, existingMemories = []) {
  if (memory.conflictStatus === 'exception') return [];
  if (['supersedes', 'refinement'].includes(memory.conflictStatus)) {
    const candidateIds = [...new Set([...(memory.supersedes || []), ...(memory.related || [])])];
    return candidateIds.filter((id) => {
      const existing = existingMemories.find((item) => item.id === id);
      return !existing || hasSameActiveSubject(existing, memory);
    });
  }
  return [...new Set(memory.supersedes || [])];
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
  if (isRejectedSuccessCandidate(candidate)) {
    candidate.status = 'rejected';
    candidate.updatedAt = nowIso();
    candidate.rejectionReason = 'User rejected this outcome; cannot promote as success memory.';
    await writeJsonl(vibeboxPath(root, 'pending/memory-candidates.jsonl'), records);
    await updatePendingIndex(root);
    throw new Error(`Candidate was rejected by user feedback and cannot become success memory: ${candidateId}`);
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
    curationDecision: options.curationDecision || candidate.curationDecision || 'manual_approve',
    curationReason: options.curationReason || candidate.curationReason || 'Manual approval.',
    updatedAt: timestamp
  };
  normalizeCandidateModel(memory);
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
  const projectNode = memory.projectId ? `project:${memory.projectId}` : null;
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
        projectId: memory.projectId,
        strength: 0.9,
        evidence: memory.summary
      });
    }
    if (PATTERN_TYPES.has(memory.type)) {
      addRelation(relationIndex, {
        type: 'project_uses_pattern',
        from: projectNode,
        to: memory.id,
        projectId: memory.projectId,
        evidence: memory.summary
      });
      addRelation(relationIndex, {
        type: 'pattern_applies_to_project',
        from: memory.id,
        to: projectNode,
        projectId: memory.projectId,
        evidence: memory.summary
      });
    }
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
    if (memory.projectId) indexValue(keywordIndex.projects, memory.projectId, memory.id);
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

async function rebuildWiki(root) {
  const memoryIndex = await loadJson(vibeboxPath(root, 'index/global-memory-index.json'), defaultMemoryIndex());
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = normalizeLocale(config.locale || config.wikiLanguage || config.outputLanguage || 'en-US');
  const active = memoryIndex.memories.filter((memory) => memory.status === 'active');
  const registry = await loadJson(vibeboxPath(root, 'registry/projects.json'), defaultRegistry());
  const projects = (registry.projects || []).filter(isRegistryProject);

  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(locale));
  await writeManagedWikiDoc(root, 'home', renderHomeShell(locale), renderHomeManaged(active, locale), locale);
  await writeManagedWikiDoc(root, 'project_index', renderProjectIndexShell(locale), renderProjectIndexManaged(projects, locale), locale);
  for (const doc of WIKI_DOCS.filter((item) => !['home', 'project_index'].includes(item.docKey))) {
    const pageMemories = active.filter((memory) => (
      docKeyForType(memory.type) === doc.docKey
      && (['failure_memory', 'success_patterns'].includes(doc.docKey) || memoryScopeUsesGlobalNamespace(memory))
    ));
    await writeManagedWikiDoc(root, doc.docKey, renderMemoryShell(localizedDocFileName(doc.docKey, locale), locale), renderMemoryManaged(pageMemories, locale), locale);
  }
  for (const project of projects) {
    const projectMemories = active.filter((memory) => memory.projectId === project.projectId);
    await writeManagedWikiPage(root, `projects/${project.projectId}.md`, renderProjectShell(project, locale), renderProjectManaged(project, projectMemories, locale));
  }
  await writeConceptWikiPages(root, active, locale);
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

Global local-first memory store for AI coding agents.`;
}

function renderHomeManaged(memories, locale = 'en-US') {
  const counts = memories.reduce((acc, memory) => {
    acc[memory.type] = (acc[memory.type] || 0) + 1;
    return acc;
  }, {});
  return `## Wiki

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

## Recent Active Memory

${memories.slice(-10).map((memory) => `- ${wikiLinkForDocKey(docKeyForType(memory.type), locale)} ${memory.title}: ${memory.summary}`).join('\n') || '- No approved memory yet.'}

## Storage

- JSON indexes live in \`../index/\`.
- Raw blackbox events live in \`../logs/events.jsonl\`.
- Pending memory candidates live in \`../pending/memory-candidates.jsonl\`.
`;
}

function renderProjectIndexShell(locale = 'en-US') {
  return `${wikiFrontmatter(t(locale, 'pageProjectIndex'))}# ${t(locale, 'pageProjectIndex')}

Back to ${wikiLinkForDocKey('home', locale)}.`;
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

Back to ${wikiLinkForDocKey('project_index', locale)}.`;
}

function renderProjectManaged(project, memories, locale = 'en-US') {
  const lines = [
    '## Project',
    '',
    `- Project ID: \`${project.projectId}\``,
    `- Repository: ${project.repositoryName || 'Not detected'}`,
    `- Primary domain: \`${project.primaryDomain || 'general'}\``,
    `- Last seen: ${project.lastSeenAt || 'unknown'}`,
    '',
    '## Active Pattern Graph',
    ''
  ];
  if (memories.length === 0) {
    lines.push(`- ${t(locale, 'none')}`);
  } else {
    lines.push(...memories.map((memory) => `- \`${memory.id}\` ${wikiLinkForDocKey(memory.docKey || docKeyForType(memory.type), locale)} ${memory.title}: ${memory.summary}`));
  }
  return lines.join('\n');
}

function renderMemoryShell(pageName, locale = 'en-US') {
  const title = localizedPageTitle(pageName, locale);
  return `${wikiFrontmatter(title)}# ${title}

Back to ${wikiLinkForDocKey('home', locale)}.`;
}

function renderMemoryManaged(memories, locale = 'en-US') {
  return memories.length === 0 ? t(locale, 'none') : memories.map((memory) => renderMemoryMarkdown(memory, locale)).join('\n\n');
}

function renderMemoryMarkdown(memory, locale = 'en-US') {
  const concepts = conceptsForMemory(memory);
  const links = concepts.map((concept) => conceptWikiLink(concept, locale)).filter(Boolean).join(' ');

  const lines = [
    `## ${memory.title}`,
    '',
    `- ${t(locale, 'idLabel')}: \`${memory.id}\``,
    `- ${t(locale, 'modelClass')}: \`${memory.modelClass || inferModelClass(memory)}\``,
    `- ${t(locale, 'modelSubClass')}: \`${memory.modelSubClass || inferModelSubClass(memory)}\``,
    `- ${t(locale, 'scopeLabel')}: \`${memory.scope}\``,
    `- ${t(locale, 'confidenceLabel')}: \`${memory.confidence}\``,
    `- ${t(locale, 'topicLabel')}: ${conceptWikiLink(memory.topic, locale) || memory.topic}`,
    `- ${t(locale, 'summaryLabel')}: ${memory.summary}`,
    `- ${t(locale, 'appliesToLabel')}: ${(memory.appliesTo || []).map((item) => conceptWikiLink(item, locale) || item).join(', ') || t(locale, 'notSpecified')}`
  ];

  if (memory.type === 'failure_memory' || memory.type === 'agent_failure_pattern') {
    lines.push(`- ${t(locale, 'failureTypeLabel')}: \`${memory.failureType || 'unclear_requirement'}\``);
    lines.push(`- ${t(locale, 'preventionRuleLabel')}: ${memory.preventionRule || 'Review before repeating.'}`);
  }
  if (memory.type === 'success_pattern' || memory.type === 'agent_success_pattern') {
    lines.push(`- ${t(locale, 'reuseWhenLabel')}: ${(memory.reuseWhen || memory.appliesTo || []).join(', ') || 'Similar work appears.'}`);
  }
  if (memory.patternType) {
    lines.push(`- ${t(locale, 'patternTypeLabel')}: \`${memory.patternType}\``);
    lines.push(`- ${t(locale, 'situationLabel')}: \`${memory.situation || 'general'}\``);
    if (memory.preferredBehavior) lines.push(`- ${t(locale, 'preferredBehaviorLabel')}: ${memory.preferredBehavior}`);
  }
  if (memory.type === 'avoid_rule') {
    lines.push(`- ${t(locale, 'forbiddenActionLabel')}: ${memory.forbiddenAction || memory.rule}`);
    lines.push(`- ${t(locale, 'severityLabel')}: \`${memory.severity || 'medium'}\``);
  }
  if (memory.type === 'project_decision') {
    lines.push(`- ${t(locale, 'decisionLabel')}: ${memory.decision || memory.rule}`);
    if ((memory.alternativesRejected || []).length > 0) {
      lines.push(`- ${t(locale, 'alternativesRejectedLabel')}: ${memory.alternativesRejected.join(', ')}`);
    }
  }
  if (links) {
    lines.push('', '## Related', '', links);
  }
  return lines.join('\n');
}

async function writeConceptWikiPages(root, memories, locale = 'en-US') {
  const concepts = new Map();
  const reservedTitles = new Set([
    ...WIKI_PAGES.map(pageTitle),
    ...WIKI_DOCS.flatMap((doc) => [
      localizedDocTitle(doc.docKey, 'en-US'),
      localizedDocTitle(doc.docKey, 'ko-KR')
    ])
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

Back to ${wikiLinkForDocKey('home', locale)}.`;
    const managed = [
      '## Related memories',
      '',
      ...relatedMemories.map((memory) => `- \`${memory.id}\` ${wikiLinkForDocKey(memory.docKey || docKeyForType(memory.type), locale)}: ${memory.summary}`)
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

Back to ${wikiLinkForDocKey('home', locale)}.`;
    await writeManagedWikiPage(root, relative, shell, ['## Related memories', '', `- ${t(locale, 'none')}`].join('\n'));
  }
}

function shouldWriteConceptWikiPage(concept, locale = 'en-US') {
  if (conceptDocKey(concept)) return true;
  return languageFromLocale(locale) === 'en';
}

function conceptWikiLink(concept, locale = 'en-US') {
  const docKey = conceptDocKey(concept);
  if (docKey) return wikiLinkForDocKey(docKey, locale);
  return shouldWriteConceptWikiPage(concept, locale) ? wikiLink(concept) : '';
}

function conceptDocKey(concept) {
  const normalized = normalizeText(concept);
  for (const doc of WIKI_DOCS) {
    const matches = [
      pageTitle(doc.canonicalFileName),
      localizedDocTitle(doc.docKey, 'en-US'),
      localizedDocTitle(doc.docKey, 'ko-KR')
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
  const scored = memories
    .filter((memory) => memory.status === 'active')
    .filter((memory) => matchesActiveCondition(memory, task))
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
  const project = await resolveCurrentProjectIdentity(root);
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

  const sections = [
    t(locale, 'contextTitle'),
    '',
    `${t(locale, 'task')}:`,
    redactSensitive(task),
    '',
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
    details.push(`${t(locale, 'prevention')}: ${memory.preventionRule}`);
    const alternative = (options.allMemories || []).find((candidate) => (
      ['success_pattern', 'agent_success_pattern'].includes(candidate.type)
      && (
        hasTargetOverlap(memory, candidate)
        || setOverlap(memory.tags || [], candidate.tags || []) >= 1
        || (textHasAny(memory.summary, ['scroll', 'overflow', 'layout']) && textHasAny(candidate.summary, ['scroll', 'wrapper', 'layout']))
      )
    ));
    if (alternative) {
      details.push(`${t(locale, 'alternative')}: ${alternative.summary}`);
    }
  }
  if (memory.type === 'success_pattern' && (memory.reuseWhen || []).length > 0) {
    details.push(`Reuse when: ${(memory.reuseWhen || []).join(', ')}`);
  }
  if (memory.patternType && memory.preferredBehavior && memory.preferredBehavior !== memory.summary) {
    details.push(`${t(locale, 'guidanceForAgent')}: ${memory.preferredBehavior}`);
  }
  const detailText = details.length > 0 ? ` ${details.join(' ')}` : '';
  return `- ${memory.confidence === 'low' ? '[low confidence] ' : ''}${memory.summary}${detailText} [${memory.id}; ${memory.scope}; ${memory.confidence}]`;
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
  const project = await resolveCurrentProjectIdentity(root);
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

  const memoryContext = relevant.filter((memory) => !broaderConflictIds.has(memory.id) && ['user_preference', 'tooling_preference', 'technology_preference', 'coding_style', 'design_preference', 'workflow_rule', 'question_pattern', 'response_preference', 'communication_pattern', 'correction_pattern', 'decision_pattern', 'handoff_pattern'].includes(memory.type));
  const projectGuardrails = relevant.filter((memory) => ['avoid_rule', 'architecture_rule', 'project_decision'].includes(memory.type));
  const lines = [
    t(locale, 'pretaskTitle'),
    '',
    `${t(locale, 'userTask')}:`,
    redactSensitive(task),
    '',
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

  if (!userRequestText.trim()) {
    return {
      event,
      candidates: [],
      message: [
        `Captured blackbox event ${event.id}.`,
        'Warning: userRequest was empty, so active memory extraction was skipped.',
        'Use `vibebox review` only for manual debug or override workflows.'
      ].join('\n')
    };
  }

  const wasRejected = event.userAcceptance === 'rejected' || event.finalOutcome === 'technical_success_user_rejected';
  const wasAccepted = event.userAcceptance === 'accepted' || event.finalOutcome === 'accepted_success';
  const extractionText = [
    input.userRequest || input.request ? `User requested: ${input.userRequest || input.request}` : '',
    event.userFeedback ? `User feedback: ${event.userFeedback}` : '',
    ...(input.errors || []).map((error) => `The approach failed: ${error}. Prevent this by avoiding the failed approach unless the user explicitly asks for it.`),
    wasRejected
      ? [
        `User rejected this direction: ${event.userFeedback}. Do not repeat it without confirmation.`,
        `Correction pattern: when the user rejects a technically completed result, treat it as user rejection and follow this correction direction: ${event.correctionDirection || event.userFeedback}.`,
        `Agent failure pattern: technical success was not user accepted. Prevent this by separating technical success from user acceptance before storing success memory.`,
        `This task failed from the user's perspective: ${input.aiActionSummary || input.summary}. Failure reason: ${event.rejectionReason || event.userFeedback || 'user rejection'}. Prevent this by ${event.correctionDirection || 'confirming the direction with the user before repeating it'}.`
      ].join('\n')
      : '',
    wasAccepted
      ? `This approach was confirmed by the user and worked successfully: ${input.aiActionSummary || input.summary}. Reuse when the task is similar to: ${input.userRequest || input.request}.`
      : '',
    event.finalOutcome === 'failed' || event.technicalOutcome === 'failure'
      ? `This task failed: ${input.aiActionSummary || input.summary}. Failure reason: ${(input.errors || []).join('; ') || input.commandResult || 'unknown'}.`
      : '',
    input.notes || ''
  ].filter(Boolean).join('\n');

  const candidates = await extractMemoryCandidates(root, {
    text: extractionText,
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
      summary,
      input.manualReview || input.reviewOnly || input.debugReview
        ? 'Review pending memory with `vibebox review`, then approve or reject candidate ids.'
        : 'Use `vibebox review` only for manual debug or override workflows.'
    ].join('\n')
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
  for (const field of ['title', 'rule', 'summary', 'details', 'preferredBehavior', 'preventionRule', 'successfulApproach', 'failedApproach', 'forbiddenAction', 'decision']) {
    if (normalized[field]) {
      normalized[field] = normalizeUserFacingTextForLanguage(normalized[field], targetLanguage);
    }
  }
  normalized.docKey = normalized.docKey || docKeyForType(normalized.type);
  if (targetLanguage === 'ko' && normalized.title && /^[A-Z][A-Za-z_ ]+:/u.test(normalized.title)) {
    normalized.title = `${localizedDocTitle(normalized.docKey, locale)}: ${normalized.topic}`;
  }
  normalized.displayLanguage = targetLanguage;
  normalized.updatedAt = nowIso();
  return normalized;
}

async function cleanupStaleLocalizedWikiDocs(root, locale) {
  const wikiRoot = vibeboxPath(root, 'wiki');
  const activeFiles = new Set(currentWikiPages(locale));
  const knownFiles = new Set(WIKI_DOCS.flatMap((doc) => [
    doc.canonicalFileName,
    localizedDocFileName(doc.docKey, 'en-US'),
    localizedDocFileName(doc.docKey, 'ko-KR')
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
  return withoutManaged.split(/\r?\n/u).every((line) => line.trim() === '' || line.trim().startsWith('#') || line.trim().startsWith('Back to'));
}

export async function convertLanguage(root = process.cwd(), options = {}) {
  requireAgentRuntime('convert-lang');
  await initVibeBox(root);
  const targetLanguage = languageFromLocale(options.to || options.language || options.target || 'en');
  const targetLocale = targetLanguage === 'ko' ? 'ko-KR' : targetLanguage === 'en' ? 'en-US' : normalizeLocale(options.to || options.language || options.target);
  const configPath = vibeboxPath(root, 'config.json');
  const config = await loadJson(configPath, defaultConfig());
  const updatedConfig = {
    ...config,
    locale: targetLocale,
    outputLanguage: targetLanguage,
    wikiLanguage: targetLanguage,
    reportLanguage: targetLanguage,
    contextLanguage: targetLanguage,
    updatedAt: nowIso()
  };
  await saveJson(configPath, updatedConfig);

  const memoryIndexPath = vibeboxPath(root, 'index/global-memory-index.json');
  const memoryIndex = await loadJson(memoryIndexPath, defaultMemoryIndex());
  memoryIndex.memories = (memoryIndex.memories || []).map((memory) => normalizeMemoryLanguage(memory, targetLanguage, targetLocale));
  memoryIndex.updatedAt = nowIso();
  await saveJson(memoryIndexPath, memoryIndex);
  await saveJson(vibeboxPath(root, 'registry/wiki-docs.json'), defaultWikiDocRegistry(targetLocale));
  await rebuildIndexes(root);
  await rebuildWiki(root);
  await cleanupStaleLocalizedWikiDocs(root, targetLocale);
  return { language: targetLanguage, locale: targetLocale, storeRoot: vibeboxPath(root) };
}

export async function rebuildVibeBox(root = process.cwd(), options = {}) {
  const semantic = options.semantic !== false && !options.indexOnly;
  if (semantic) {
    requireAgentRuntime('rebuild');
    await initVibeBox(root);
  } else {
    await ensureDir(vibeboxPath(root, 'index'));
  }
  const config = await loadJson(vibeboxPath(root, 'config.json'), defaultConfig());
  const locale = normalizeLocale(config.locale || config.wikiLanguage || config.outputLanguage || 'en-US');
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
    for (const memory of memoryIndex.memories) {
      for (const relatedId of [...(memory.related || []), ...(memory.supersedes || [])]) {
        if (!ids.has(relatedId)) {
          warnings.push(`Memory ${memory.id} references missing related memory ${relatedId}.`);
        }
      }
      if (memory.status === 'active') {
        const wikiPage = memory.projectId && !memoryScopeUsesGlobalNamespace(memory)
          ? `projects/${memory.projectId}.md`
          : localizedDocFileName(memory.docKey || docKeyForType(memory.type), locale);
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
        localizedDocFileName(doc.docKey, 'en-US'),
        localizedDocFileName(doc.docKey, 'ko-KR')
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
      const text = await readFile(wikiFile, 'utf8');
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
