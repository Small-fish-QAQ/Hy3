'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const SCHEMA_VERSION = '1.0.0';
const MANIFEST_PATH = 'docs/integrations/evidence-manifest.json';
const MEDIA_PATH = 'docs/integrations/media-integrity.json';
const ACCEPTANCE_PATH = 'docs/integrations/acceptance-matrix.md';
const INDEX_PATH = 'docs/integrations/README.md';
const EXPECTED_SLUGS = Object.freeze([
  'aider',
  'cline',
  'codex-cli',
  'continue',
  'dify',
  'roo-code',
  'kilo-code',
  'opencode',
  'codebuddy-code'
]);
const STATUS_VOCABULARY = Object.freeze([
  'live_verified',
  'offline_verified',
  'documented_not_executed',
  'configuration_only',
  'not_applicable',
  'unknown'
]);
const CLASSIFICATIONS = Object.freeze(['primary', 'secondary', 'historical']);
const EXPECTED_PART_B_REPOSITORY =
  'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer';
const EXPECTED_PART_B_REPORT =
  `${EXPECTED_PART_B_REPOSITORY}/blob/main/docs/evidence/live-report-2026-07-22.md`;
const EXPECTED_PART_B_JSON =
  `${EXPECTED_PART_B_REPOSITORY}/blob/main/docs/evidence/live-report-2026-07-22.json`;
const STALE_PART_B_TEST_MARKERS = Object.freeze([
  '192/192',
  '207/207',
  '229/229',
  '230/230',
  '234/234'
]);
const TABLE_BEGIN = '<!-- BEGIN GENERATED INTEGRATION TABLE -->';
const TABLE_END = '<!-- END GENERATED INTEGRATION TABLE -->';

const SECRET_PATTERNS = Object.freeze([
  { label: 'secret-like sk value', pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/i },
  { label: 'Bearer credential value', pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/i },
  {
    label: 'assigned API credential value',
    pattern: /\b(?:tokenhub[ _-]?api[ _-]?key|api[ _-]?key|apikey)\b["']?\s*[:=]\s*(?!(?:\[redacted\]|<[^>]+>|your_))[^\s,;&]{8,}/i
  }
]);
const PRIVATE_PATH_PATTERNS = Object.freeze([
  {
    label: 'Windows user-local path',
    pattern: /\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'`]*/i
  },
  {
    label: 'POSIX user-local path',
    pattern: /(?:^|[\s"'`])\/(?:Users|home|root)\/[^\s"'`]*/i
  }
]);

function diagnostic(file, field, message, severity = 'error') {
  return { file, field, message, severity };
}

function isObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeRelativePathError(value, requiredPrefix = null) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'must be a non-empty repository-relative path';
  }
  if (value.includes('\\')) return 'must use POSIX separators';
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    return 'must not be an absolute path';
  }
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch (_error) {
    return 'contains invalid percent encoding';
  }
  const normalized = path.posix.normalize(decoded);
  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized !== decoded ||
    decoded !== value
  ) {
    return 'must not contain traversal, encoded, redundant, or non-canonical segments';
  }
  if (requiredPrefix && !value.startsWith(requiredPrefix)) {
    return `must stay under ${requiredPrefix}`;
  }
  return null;
}

function requireString(value, file, field, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(diagnostic(file, field, 'must be a non-empty string'));
  }
}

function validateSemanticVersion(value, file, field, errors) {
  if (
    typeof value === 'string' &&
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)
  ) {
    errors.push(diagnostic(file, field, 'must be a semantic version without a leading v'));
  }
}

function validateStatus(value, file, field, errors) {
  if (!STATUS_VOCABULARY.includes(value)) {
    errors.push(diagnostic(
      file,
      field,
      `invalid status ${JSON.stringify(value)}; expected one of: ${STATUS_VOCABULARY.join(', ')}`
    ));
  }
}

function validateTextSafety(value, file, errors, field = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateTextSafety(item, file, errors, `${field}[${index}]`));
    return errors;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      validateTextSafety(child, file, errors, `${field}.${key}`);
    }
    return errors;
  }
  if (typeof value !== 'string') return errors;
  for (const entry of SECRET_PATTERNS) {
    if (entry.pattern.test(value)) {
      errors.push(diagnostic(file, field, `contains an obvious ${entry.label}`));
    }
  }
  for (const entry of PRIVATE_PATH_PATTERNS) {
    if (entry.pattern.test(value)) {
      errors.push(diagnostic(file, field, `contains a private local path (${entry.label})`));
    }
  }
  return errors;
}

function validateUrl(value, file, field, errors, expected = null) {
  if (typeof value !== 'string') return;
  let url;
  try {
    url = new URL(value);
  } catch (_error) {
    errors.push(diagnostic(file, field, 'must be a valid absolute URL'));
    return;
  }
  if (url.protocol !== 'https:') {
    errors.push(diagnostic(file, field, 'must use HTTPS'));
  }
  if (url.username || url.password || url.search || url.hash) {
    errors.push(diagnostic(file, field, 'must not contain credentials, a query, or a fragment'));
  }
  if (expected && value !== expected) {
    errors.push(diagnostic(file, field, `must equal ${expected}`));
  }
}

function validateEvidenceManifest(manifest, options = {}) {
  const file = options.file || MANIFEST_PATH;
  const enforceProduction = options.enforceProduction !== false;
  const errors = [];
  if (!isObject(manifest)) {
    return [diagnostic(file, '$', 'must be a JSON object')];
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    errors.push(diagnostic(
      file,
      '$.schema_version',
      `unsupported schema version ${JSON.stringify(manifest.schema_version)}; expected ${SCHEMA_VERSION}`
    ));
  }
  if (!sameSet(manifest.status_vocabulary, STATUS_VOCABULARY)) {
    errors.push(diagnostic(
      file,
      '$.status_vocabulary',
      `must contain exactly: ${STATUS_VOCABULARY.join(', ')}`
    ));
  }
  for (const [field, expected] of [
    ['integration_index', INDEX_PATH],
    ['acceptance_matrix', ACCEPTANCE_PATH],
    ['media_integrity_manifest', MEDIA_PATH]
  ]) {
    requireString(manifest[field], file, `$.${field}`, errors);
    const pathError = safeRelativePathError(manifest[field], 'docs/integrations/');
    if (pathError) errors.push(diagnostic(file, `$.${field}`, pathError));
    if (enforceProduction && manifest[field] !== expected) {
      errors.push(diagnostic(file, `$.${field}`, `must equal ${expected}`));
    }
  }
  validateIssue(manifest.issue, file, errors);
  validateIntegrations(manifest.integrations, file, errors, enforceProduction);
  validateSharedScope(manifest.shared_unverified_scope, file, errors);
  validatePartB(manifest.part_b, file, errors, enforceProduction);
  validateStatusesRecursively(manifest, file, '$', errors);
  validateTextSafety(manifest, file, errors);
  return errors;
}

function validateIssue(issue, file, errors) {
  if (!isObject(issue)) {
    errors.push(diagnostic(file, '$.issue', 'must be an object'));
    return;
  }
  requireString(issue.url, file, '$.issue.url', errors);
  requireString(issue.target_branch, file, '$.issue.target_branch', errors);
  requireString(issue.required_directory, file, '$.issue.required_directory', errors);
  if (!Number.isInteger(issue.minimum_tools) || issue.minimum_tools < 5) {
    errors.push(diagnostic(file, '$.issue.minimum_tools', 'must be an integer of at least 5'));
  }
  if (!Array.isArray(issue.hard_requirements) || issue.hard_requirements.length < 7) {
    errors.push(diagnostic(file, '$.issue.hard_requirements', 'must record the Issue #2 hard requirements'));
  }
}

function validateIntegrations(integrations, file, errors, enforceProduction) {
  if (!Array.isArray(integrations)) {
    errors.push(diagnostic(file, '$.integrations', 'must be an array'));
    return;
  }
  if (integrations.length !== 9) {
    errors.push(diagnostic(file, '$.integrations', `must contain exactly 9 integrations; found ${integrations.length}`));
  }
  const slugs = new Set();
  integrations.forEach((integration, index) => {
    const field = `$.integrations[${index}]`;
    if (!isObject(integration)) {
      errors.push(diagnostic(file, field, 'must be an object'));
      return;
    }
    for (const key of [
      'tool_slug',
      'display_name',
      'category',
      'guide_path',
      'model',
      'protocol',
      'overall_verification_status',
      'verification_scope'
    ]) {
      requireString(integration[key], file, `${field}.${key}`, errors);
    }
    if (slugs.has(integration.tool_slug)) {
      errors.push(diagnostic(file, `${field}.tool_slug`, `duplicate tool slug ${JSON.stringify(integration.tool_slug)}`));
    }
    slugs.add(integration.tool_slug);
    const guidePathError = safeRelativePathError(integration.guide_path, 'docs/integrations/');
    if (guidePathError) errors.push(diagnostic(file, `${field}.guide_path`, guidePathError));
    if (
      typeof integration.guide_path === 'string' &&
      !integration.guide_path.endsWith(`/${integration.tool_slug}.md`)
    ) {
      errors.push(diagnostic(file, `${field}.guide_path`, 'must end with the canonical tool slug and .md'));
    }
    if (!isObject(integration.version)) {
      errors.push(diagnostic(file, `${field}.version`, 'must be an object'));
    } else {
      requireString(integration.version.tested_snapshot, file, `${field}.version.tested_snapshot`, errors);
    }
    if (!isObject(integration.tested_environment)) {
      errors.push(diagnostic(file, `${field}.tested_environment`, 'must be an object'));
    } else {
      validateStatus(integration.tested_environment.status, file, `${field}.tested_environment.status`, errors);
      if (!Array.isArray(integration.tested_environment.details) || integration.tested_environment.details.length === 0) {
        errors.push(diagnostic(file, `${field}.tested_environment.details`, 'must contain supported details or an explicit unknown note'));
      }
    }
    validateEndpoint(integration.endpoint, file, `${field}.endpoint`, errors);
    if (!isObject(integration.authentication)) {
      errors.push(diagnostic(file, `${field}.authentication`, 'must be an object'));
    } else {
      requireString(integration.authentication.method, file, `${field}.authentication.method`, errors);
      requireString(integration.authentication.secret_source, file, `${field}.authentication.secret_source`, errors);
    }
    validateTaskEvidence(integration.first_conversation, file, `${field}.first_conversation`, errors);
    validateTaskEvidence(integration.real_task, file, `${field}.real_task`, errors, true);
    validateStatus(integration.overall_verification_status, file, `${field}.overall_verification_status`, errors);
    if (
      integration.overall_verification_status === 'live_verified' &&
      (
        integration.first_conversation?.status !== 'live_verified' ||
        integration.real_task?.status !== 'live_verified'
      )
    ) {
      errors.push(diagnostic(
        file,
        `${field}.overall_verification_status`,
        'cannot be live_verified unless first conversation and real task are live_verified'
      ));
    }
    if (!Array.isArray(integration.limitations) || integration.limitations.length === 0) {
      errors.push(diagnostic(file, `${field}.limitations`, 'must contain at least one limitation'));
    }
    if (!Array.isArray(integration.unverified_variants) || integration.unverified_variants.length === 0) {
      errors.push(diagnostic(file, `${field}.unverified_variants`, 'must contain explicit unverified boundaries'));
    } else {
      integration.unverified_variants.forEach((variant, variantIndex) => {
        const variantField = `${field}.unverified_variants[${variantIndex}]`;
        if (!isObject(variant)) {
          errors.push(diagnostic(file, variantField, 'must be an object'));
          return;
        }
        requireString(variant.name, file, `${variantField}.name`, errors);
        validateStatus(variant.status, file, `${variantField}.status`, errors);
        if (['live_verified', 'offline_verified'].includes(variant.status)) {
          errors.push(diagnostic(
            file,
            `${variantField}.status`,
            'an unverified variant cannot be labelled verified'
          ));
        }
      });
    }
    requireString(integration.verification_date, file, `${field}.verification_date`, errors);
    if (!Array.isArray(integration.notes)) {
      errors.push(diagnostic(file, `${field}.notes`, 'must be an array'));
    }
  });
  if (enforceProduction && !sameSet([...slugs], EXPECTED_SLUGS)) {
    errors.push(diagnostic(
      file,
      '$.integrations',
      `must contain exactly the intended slugs: ${EXPECTED_SLUGS.join(', ')}`
    ));
  }
}

function validateEndpoint(endpoint, file, field, errors) {
  if (!isObject(endpoint)) {
    errors.push(diagnostic(file, field, 'must be an object'));
    return;
  }
  for (const key of ['provider', 'region', 'base_url']) {
    requireString(endpoint[key], file, `${field}.${key}`, errors);
  }
  validateUrl(endpoint.base_url, file, `${field}.base_url`, errors);
}

function validateTaskEvidence(record, file, field, errors, requireDescription = false) {
  if (!isObject(record)) {
    errors.push(diagnostic(file, field, 'must be an object'));
    return;
  }
  validateStatus(record.status, file, `${field}.status`, errors);
  if (requireDescription) requireString(record.description, file, `${field}.description`, errors);
  if (!Array.isArray(record.evidence_paths)) {
    errors.push(diagnostic(file, `${field}.evidence_paths`, 'must be an array'));
    return;
  }
  record.evidence_paths.forEach((evidencePath, index) => {
    const pathError = safeRelativePathError(evidencePath, 'docs/integrations/assets/');
    if (pathError) errors.push(diagnostic(file, `${field}.evidence_paths[${index}]`, pathError));
  });
  if (
    ['live_verified', 'offline_verified', 'configuration_only'].includes(record.status) &&
    record.evidence_paths.length === 0
  ) {
    errors.push(diagnostic(
      file,
      `${field}.evidence_paths`,
      'verified or configuration-only evidence must contain at least one evidence path'
    ));
  }
  if (
    ['documented_not_executed', 'not_applicable', 'unknown'].includes(record.status) &&
    record.evidence_paths.length > 0
  ) {
    errors.push(diagnostic(
      file,
      `${field}.status`,
      'documented-only, not-applicable, or unknown evidence cannot carry executed-task media'
    ));
  }
}

function validateSharedScope(records, file, errors) {
  if (!Array.isArray(records) || records.length === 0) {
    errors.push(diagnostic(file, '$.shared_unverified_scope', 'must contain explicit shared boundaries'));
    return;
  }
  records.forEach((record, index) => {
    const field = `$.shared_unverified_scope[${index}]`;
    if (!isObject(record)) {
      errors.push(diagnostic(file, field, 'must be an object'));
      return;
    }
    requireString(record.name, file, `${field}.name`, errors);
    validateStatus(record.status, file, `${field}.status`, errors);
    if (['live_verified', 'offline_verified'].includes(record.status)) {
      errors.push(diagnostic(file, `${field}.status`, 'shared unverified scope cannot be labelled verified'));
    }
  });
}

function validatePartB(partB, file, errors, enforceProduction) {
  if (!isObject(partB)) {
    errors.push(diagnostic(file, '$.part_b', 'must be an object'));
    return;
  }
  for (const key of [
    'repository_url',
    'repository_branch',
    'package_version',
    'recommended_release_version',
    'node_support',
    'core_capability'
  ]) {
    requireString(partB[key], file, `$.part_b.${key}`, errors);
  }
  validateSemanticVersion(partB.package_version, file, '$.part_b.package_version', errors);
  validateSemanticVersion(
    partB.recommended_release_version,
    file,
    '$.part_b.recommended_release_version',
    errors
  );
  if (
    enforceProduction &&
    partB.package_version !== partB.recommended_release_version
  ) {
    errors.push(diagnostic(
      file,
      '$.part_b.package_version',
      'must match the current recommended release version'
    ));
  }
  validateUrl(
    partB.repository_url,
    file,
    '$.part_b.repository_url',
    errors,
    enforceProduction ? EXPECTED_PART_B_REPOSITORY : null
  );
  if (!Array.isArray(partB.product_forms) || partB.product_forms.length !== 2) {
    errors.push(diagnostic(file, '$.part_b.product_forms', 'must identify the CLI and loopback Web UI'));
  }
  if (!Array.isArray(partB.modes) || partB.modes.length !== 2) {
    errors.push(diagnostic(file, '$.part_b.modes', 'must distinguish Live / Hy3 from Offline / Fake'));
  }
  for (const [collectionName, records] of [
    ['product_forms', partB.product_forms],
    ['modes', partB.modes]
  ]) {
    if (!Array.isArray(records)) continue;
    records.forEach((record, index) => {
      const field = `$.part_b.${collectionName}[${index}]`;
      if (!isObject(record)) {
        errors.push(diagnostic(file, field, 'must be an object'));
        return;
      }
      requireString(record.name, file, `${field}.name`, errors);
      validateStatus(record.status, file, `${field}.status`, errors);
    });
  }
  if (!isObject(partB.primary_demo)) {
    errors.push(diagnostic(file, '$.part_b.primary_demo', 'must be an object'));
  } else {
    validateStatus(partB.primary_demo.status, file, '$.part_b.primary_demo.status', errors);
    validateUrl(partB.primary_demo.url, file, '$.part_b.primary_demo.url', errors);
    if (!Number.isFinite(partB.primary_demo.duration_seconds) || partB.primary_demo.duration_seconds <= 0) {
      errors.push(diagnostic(file, '$.part_b.primary_demo.duration_seconds', 'must be a positive number'));
    } else if (partB.primary_demo.duration_seconds > 60) {
      errors.push(diagnostic(
        file,
        '$.part_b.primary_demo.duration_seconds',
        'must not exceed the Issue #2 limit of 60 seconds'
      ));
    }
    if (!/^[a-f0-9]{64}$/.test(String(partB.primary_demo.sha256 || ''))) {
      errors.push(diagnostic(file, '$.part_b.primary_demo.sha256', 'must be a lowercase SHA-256 digest'));
    }
    if (!/separate/i.test(String(partB.primary_demo.relationship_to_live_report || ''))) {
      errors.push(diagnostic(
        file,
        '$.part_b.primary_demo.relationship_to_live_report',
        'must state that the primary video and Live report are separate runs'
      ));
    }
  }
  if (!isObject(partB.live_report)) {
    errors.push(diagnostic(file, '$.part_b.live_report', 'must be an object'));
  } else {
    validateStatus(partB.live_report.status, file, '$.part_b.live_report.status', errors);
    requireString(partB.live_report.tool_version, file, '$.part_b.live_report.tool_version', errors);
    validateSemanticVersion(
      partB.live_report.tool_version,
      file,
      '$.part_b.live_report.tool_version',
      errors
    );
    validateUrl(
      partB.live_report.markdown_url,
      file,
      '$.part_b.live_report.markdown_url',
      errors,
      enforceProduction ? EXPECTED_PART_B_REPORT : null
    );
    validateUrl(
      partB.live_report.structured_json_url,
      file,
      '$.part_b.live_report.structured_json_url',
      errors,
      enforceProduction ? EXPECTED_PART_B_JSON : null
    );
    validateUrl(partB.live_report.execution_record_url, file, '$.part_b.live_report.execution_record_url', errors);
    if (!/separate/i.test(String(partB.live_report.relationship_to_primary_demo || ''))) {
      errors.push(diagnostic(
        file,
        '$.part_b.live_report.relationship_to_primary_demo',
        'must state that the report and primary video are separate runs'
      ));
    }
  }
  validatePassingRecord(partB.tests, file, '$.part_b.tests', errors);
  validatePassingRecord(partB.deterministic_evaluation, file, '$.part_b.deterministic_evaluation', errors);
  if (
    isObject(partB.deterministic_evaluation) &&
    (
      !Number.isInteger(partB.deterministic_evaluation.fixture_count) ||
      partB.deterministic_evaluation.fixture_count < 1
    )
  ) {
    errors.push(diagnostic(
      file,
      '$.part_b.deterministic_evaluation.fixture_count',
      'must be a positive integer'
    ));
  }
  if (!isObject(partB.evidence_verification)) {
    errors.push(diagnostic(file, '$.part_b.evidence_verification', 'must be an object'));
  } else if (
    partB.evidence_verification.network_required !== false ||
    partB.evidence_verification.credential_required !== false
  ) {
    errors.push(diagnostic(
      file,
      '$.part_b.evidence_verification',
      'must be offline and credential-free'
    ));
  }
  if (!isObject(partB.ci)) {
    errors.push(diagnostic(file, '$.part_b.ci', 'must be an object'));
  } else {
    validateStatus(partB.ci.status, file, '$.part_b.ci.status', errors);
    if (partB.ci.live_calls !== false) {
      errors.push(diagnostic(file, '$.part_b.ci.live_calls', 'must be false'));
    }
    if (!sameSet(partB.ci.operating_systems, ['ubuntu-latest', 'windows-latest'])) {
      errors.push(diagnostic(
        file,
        '$.part_b.ci.operating_systems',
        'must contain exactly ubuntu-latest and windows-latest'
      ));
    }
    if (!sameSet(partB.ci.node_versions, ['18.x', '24.x'])) {
      errors.push(diagnostic(
        file,
        '$.part_b.ci.node_versions',
        'must contain exactly 18.x and 24.x'
      ));
    }
    if (
      typeof partB.ci.package_smoke !== 'string' ||
      !partB.ci.package_smoke.includes('npm pack --dry-run') ||
      !partB.ci.package_smoke.includes('package:smoke')
    ) {
      errors.push(diagnostic(
        file,
        '$.part_b.ci.package_smoke',
        'must record both npm pack --dry-run and the extracted package smoke'
      ));
    }
  }
  if (!Array.isArray(partB.limitations) || partB.limitations.length === 0) {
    errors.push(diagnostic(file, '$.part_b.limitations', 'must contain honest limitations'));
  }
}

function validatePassingRecord(record, file, field, errors) {
  if (!isObject(record)) {
    errors.push(diagnostic(file, field, 'must be an object'));
    return;
  }
  validateStatus(record.status, file, `${field}.status`, errors);
  requireString(record.command, file, `${field}.command`, errors);
  if (!Number.isInteger(record.passed) || record.passed < 1) {
    errors.push(diagnostic(file, `${field}.passed`, 'must be a positive integer'));
  }
  if (!Number.isInteger(record.total) || record.total < 1) {
    errors.push(diagnostic(file, `${field}.total`, 'must be a positive integer'));
  }
  if (record.passed !== record.total) {
    errors.push(diagnostic(file, field, `recorded result is not fully passing (${record.passed}/${record.total})`));
  }
  if (record.network_required !== false) {
    errors.push(diagnostic(file, `${field}.network_required`, 'must be false'));
  }
}

function validateStatusesRecursively(value, file, field, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateStatusesRecursively(item, file, `${field}[${index}]`, errors));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childField = `${field}.${key}`;
    if (
      (key === 'status' || key === 'overall_verification_status') &&
      !STATUS_VOCABULARY.includes(child)
    ) {
      errors.push(diagnostic(file, childField, `invalid status ${JSON.stringify(child)}`));
    }
    validateStatusesRecursively(child, file, childField, errors);
  }
}

function validateMediaManifest(manifest, options = {}) {
  const file = options.file || MEDIA_PATH;
  const enforceProduction = options.enforceProduction !== false;
  const errors = [];
  if (!isObject(manifest)) {
    return [diagnostic(file, '$', 'must be a JSON object')];
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    errors.push(diagnostic(
      file,
      '$.schema_version',
      `unsupported schema version ${JSON.stringify(manifest.schema_version)}; expected ${SCHEMA_VERSION}`
    ));
  }
  if (manifest.hash_algorithm !== 'sha256') {
    errors.push(diagnostic(file, '$.hash_algorithm', 'must equal "sha256"'));
  }
  if (!sameSet(manifest.classification_vocabulary, CLASSIFICATIONS)) {
    errors.push(diagnostic(
      file,
      '$.classification_vocabulary',
      `must contain exactly: ${CLASSIFICATIONS.join(', ')}`
    ));
  }
  if (!isObject(manifest.integrity_scope)) {
    errors.push(diagnostic(file, '$.integrity_scope', 'must document what hashes prove and do not prove'));
  }
  if (!Array.isArray(manifest.assets)) {
    errors.push(diagnostic(file, '$.assets', 'must be an array'));
    return errors;
  }
  if (enforceProduction && manifest.assets.length !== 20) {
    errors.push(diagnostic(file, '$.assets', `must contain exactly 20 tracked screenshots; found ${manifest.assets.length}`));
  }
  const paths = new Set();
  manifest.assets.forEach((asset, index) => {
    const field = `$.assets[${index}]`;
    if (!isObject(asset)) {
      errors.push(diagnostic(file, field, 'must be an object'));
      return;
    }
    for (const key of [
      'path',
      'associated_tool',
      'evidence_role',
      'status',
      'file_type',
      'sha256',
      'classification'
    ]) {
      requireString(asset[key], file, `${field}.${key}`, errors);
    }
    if (paths.has(asset.path)) {
      errors.push(diagnostic(file, `${field}.path`, `duplicate media path ${JSON.stringify(asset.path)}`));
    }
    paths.add(asset.path);
    const pathError = safeRelativePathError(asset.path, 'docs/integrations/assets/');
    if (pathError) errors.push(diagnostic(file, `${field}.path`, pathError));
    if (!EXPECTED_SLUGS.includes(asset.associated_tool)) {
      errors.push(diagnostic(file, `${field}.associated_tool`, 'must use one of the intended tool slugs'));
    }
    validateStatus(asset.status, file, `${field}.status`, errors);
    if (asset.file_type !== 'png') {
      errors.push(diagnostic(file, `${field}.file_type`, 'Part A evidence media must be PNG'));
    }
    if (!Number.isInteger(asset.size_bytes) || asset.size_bytes < 1) {
      errors.push(diagnostic(file, `${field}.size_bytes`, 'must be a positive integer'));
    }
    if (!/^[a-f0-9]{64}$/.test(String(asset.sha256 || ''))) {
      errors.push(diagnostic(file, `${field}.sha256`, 'must be a lowercase SHA-256 digest'));
    }
    if (
      !isObject(asset.dimensions) ||
      !Number.isInteger(asset.dimensions.width) ||
      asset.dimensions.width < 1 ||
      !Number.isInteger(asset.dimensions.height) ||
      asset.dimensions.height < 1
    ) {
      errors.push(diagnostic(file, `${field}.dimensions`, 'must contain positive integer width and height'));
    }
    if (asset.duration_seconds !== null) {
      errors.push(diagnostic(file, `${field}.duration_seconds`, 'must be null for a PNG'));
    }
    if (!CLASSIFICATIONS.includes(asset.classification)) {
      errors.push(diagnostic(file, `${field}.classification`, `must be one of: ${CLASSIFICATIONS.join(', ')}`));
    }
  });
  validateTextSafety(manifest, file, errors);
  return errors;
}

async function readJson(root, relativePath, errors) {
  const pathError = safeRelativePathError(relativePath);
  if (pathError) {
    errors.push(diagnostic(relativePath, '$', pathError));
    return null;
  }
  try {
    const content = await fs.readFile(resolveRelative(root, relativePath), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      errors.push(diagnostic(relativePath, '$', 'file does not exist'));
    } else if (error instanceof SyntaxError) {
      errors.push(diagnostic(relativePath, '$', `malformed JSON: ${error.message}`));
    } else {
      errors.push(diagnostic(relativePath, '$', `unable to read: ${safeError(error)}`));
    }
    return null;
  }
}

async function verifyEvidence(options = {}) {
  const root = path.resolve(options.root || path.resolve(__dirname, '..', '..'));
  const manifestPath = options.manifestPath || MANIFEST_PATH;
  const mediaPath = options.mediaPath || MEDIA_PATH;
  const acceptancePath = options.acceptancePath || ACCEPTANCE_PATH;
  const indexPath = options.indexPath || INDEX_PATH;
  const enforceProduction = options.enforceProduction !== false;
  const errors = [];
  const warnings = [];
  const manifest = await readJson(root, manifestPath, errors);
  const media = await readJson(root, mediaPath, errors);
  if (manifest) {
    errors.push(...validateEvidenceManifest(manifest, {
      file: manifestPath,
      enforceProduction
    }));
  }
  if (media) {
    errors.push(...validateMediaManifest(media, {
      file: mediaPath,
      enforceProduction
    }));
  }
  if (!manifest || !media || errors.length > 0) {
    return buildResult(errors, warnings, manifest, media);
  }

  await verifyGuidesAndEvidence(root, manifest, media, manifestPath, errors);
  await verifyMediaFiles(root, media, {
    file: mediaPath,
    errors,
    warnings,
    optionalMediaInspector: options.optionalMediaInspector
  });
  await verifyDocumentation(root, manifest, {
    acceptancePath,
    indexPath,
    errors
  });
  return buildResult(errors, warnings, manifest, media);
}

async function verifyGuidesAndEvidence(root, manifest, media, manifestFile, errors) {
  const mediaByPath = new Map(media.assets.map((asset) => [asset.path, asset]));
  const mediaPaths = new Set(mediaByPath.keys());
  const referencedMedia = new Set();
  for (let index = 0; index < manifest.integrations.length; index += 1) {
    const integration = manifest.integrations[index];
    await requireFile(root, integration.guide_path, manifestFile, `$.integrations[${index}].guide_path`, errors);
    for (const [recordName, record] of [
      ['first_conversation', integration.first_conversation],
      ['real_task', integration.real_task]
    ]) {
      for (let evidenceIndex = 0; evidenceIndex < record.evidence_paths.length; evidenceIndex += 1) {
        const evidencePath = record.evidence_paths[evidenceIndex];
        const field = `$.integrations[${index}].${recordName}.evidence_paths[${evidenceIndex}]`;
        referencedMedia.add(evidencePath);
        if (!mediaPaths.has(evidencePath)) {
          errors.push(diagnostic(manifestFile, field, `not found in ${MEDIA_PATH}: ${evidencePath}`));
        } else {
          const asset = mediaByPath.get(evidencePath);
          if (asset.associated_tool !== integration.tool_slug) {
            errors.push(diagnostic(
              MEDIA_PATH,
              '$.assets',
              `${evidencePath} is associated with ${asset.associated_tool}, expected ${integration.tool_slug}`
            ));
          }
          if (asset.status !== record.status) {
            errors.push(diagnostic(
              MEDIA_PATH,
              '$.assets',
              `${evidencePath} status ${asset.status} does not match ${recordName} status ${record.status}`
            ));
          }
          const expectedRolePrefix = recordName === 'first_conversation' ? 'first_conversation' : 'real_task';
          if (!asset.evidence_role.startsWith(expectedRolePrefix)) {
            errors.push(diagnostic(
              MEDIA_PATH,
              '$.assets',
              `${evidencePath} role ${asset.evidence_role} does not match ${recordName}`
            ));
          }
        }
        await requireFile(root, evidencePath, manifestFile, field, errors);
      }
    }
  }
  for (const asset of media.assets) {
    if (!referencedMedia.has(asset.path)) {
      errors.push(diagnostic(MEDIA_PATH, '$.assets', `unreferenced media asset: ${asset.path}`));
    }
  }
}

async function requireFile(root, relativePath, file, field, errors) {
  if (safeRelativePathError(relativePath)) return;
  try {
    await resolveExistingFileWithinRoot(root, relativePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      errors.push(diagnostic(file, field, `referenced file is missing: ${relativePath}`));
    } else if (error?.code === 'OUTSIDE_REPOSITORY') {
      errors.push(diagnostic(file, field, `referenced path resolves outside the repository: ${relativePath}`));
    } else if (error?.code === 'NOT_A_FILE') {
      errors.push(diagnostic(file, field, `${relativePath} is not a file`));
    } else {
      errors.push(diagnostic(file, field, `unable to inspect ${relativePath}: ${safeError(error)}`));
    }
  }
}

async function verifyMediaFiles(root, media, options = {}) {
  const errors = options.errors || [];
  const warnings = options.warnings || [];
  const file = options.file || MEDIA_PATH;
  for (let index = 0; index < media.assets.length; index += 1) {
    const asset = media.assets[index];
    const field = `$.assets[${index}]`;
    let buffer;
    let absolute;
    try {
      absolute = await resolveExistingFileWithinRoot(root, asset.path);
      buffer = await fs.readFile(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        errors.push(diagnostic(file, `${field}.path`, `asset is missing: ${asset.path}`));
      } else if (error?.code === 'OUTSIDE_REPOSITORY') {
        errors.push(diagnostic(file, `${field}.path`, `asset resolves outside the repository: ${asset.path}`));
      } else if (error?.code === 'NOT_A_FILE') {
        errors.push(diagnostic(file, `${field}.path`, `asset is not a file: ${asset.path}`));
      } else {
        errors.push(diagnostic(file, `${field}.path`, `unable to read asset: ${safeError(error)}`));
      }
      continue;
    }
    if (buffer.length !== asset.size_bytes) {
      errors.push(diagnostic(
        file,
        `${field}.size_bytes`,
        `expected ${asset.size_bytes}, found ${buffer.length} for ${asset.path}`
      ));
    }
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hash !== asset.sha256) {
      errors.push(diagnostic(
        file,
        `${field}.sha256`,
        `SHA-256 mismatch for ${asset.path}: expected ${asset.sha256}, found ${hash}`
      ));
    }
    try {
      const dimensions = parsePngDimensions(buffer);
      if (
        dimensions.width !== asset.dimensions.width ||
        dimensions.height !== asset.dimensions.height
      ) {
        errors.push(diagnostic(
          file,
          `${field}.dimensions`,
          `expected ${asset.dimensions.width}x${asset.dimensions.height}, found ${dimensions.width}x${dimensions.height}`
        ));
      }
    } catch (error) {
      errors.push(diagnostic(file, field, `unable to inspect ${asset.path}: ${safeError(error)}`));
    }
    if (typeof options.optionalMediaInspector === 'function') {
      try {
        await options.optionalMediaInspector(absolute, asset);
      } catch (error) {
        if (['ENOENT', 'ENOSYS', 'UNAVAILABLE'].includes(error?.code)) {
          warnings.push(diagnostic(
            file,
            field,
            `optional media inspector unavailable for ${asset.path}; standard-library checks completed`,
            'warning'
          ));
        } else {
          errors.push(diagnostic(
            file,
            field,
            `optional media inspector failed for ${asset.path}: ${safeError(error)}`
          ));
        }
      }
    }
  }
}

function parsePngDimensions(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!Buffer.isBuffer(buffer) || buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('invalid PNG signature or truncated IHDR');
  }
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('PNG does not begin with an IHDR chunk');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < 1 || height < 1) throw new Error('PNG dimensions must be positive');
  return { width, height };
}

async function verifyDocumentation(root, manifest, options) {
  const errors = options.errors;
  let acceptance;
  let index;
  try {
    acceptance = await fs.readFile(resolveRelative(root, options.acceptancePath), 'utf8');
  } catch (error) {
    errors.push(diagnostic(options.acceptancePath, '$', `unable to read: ${safeError(error)}`));
    return;
  }
  try {
    index = await fs.readFile(resolveRelative(root, options.indexPath), 'utf8');
  } catch (error) {
    errors.push(diagnostic(options.indexPath, '$', `unable to read: ${safeError(error)}`));
    return;
  }
  const expectedTable = renderIntegrationTable(manifest);
  const actualTable = extractGeneratedTable(acceptance);
  if (actualTable !== expectedTable) {
    errors.push(diagnostic(
      options.acceptancePath,
      '$.generated_integration_table',
      'does not match evidence-manifest.json; regenerate the marked table'
    ));
  }
  for (const integration of manifest.integrations) {
    const localGuide = path.posix.basename(integration.guide_path);
    if (!acceptance.includes(`](${localGuide})`)) {
      errors.push(diagnostic(options.acceptancePath, '$', `missing guide link for ${integration.tool_slug}`));
    }
    if (!index.includes(`](${localGuide})`)) {
      errors.push(diagnostic(options.indexPath, '$', `missing guide link for ${integration.tool_slug}`));
    }
  }
  const testMarker = `${manifest.part_b.tests.passed}/${manifest.part_b.tests.total}`;
  const deterministicMarker =
    `${manifest.part_b.deterministic_evaluation.passed}/${manifest.part_b.deterministic_evaluation.total}`;
  const releaseUrl =
    `${manifest.part_b.repository_url}/releases/tag/v${manifest.part_b.package_version}`;
  const retainedToolMarker = `tool version \`${manifest.part_b.live_report.tool_version}\``;
  for (const token of [
    'acceptance-matrix.md',
    'evidence-manifest.json',
    'media-integrity.json',
    'node docs/integrations/verify_evidence.js',
    EXPECTED_PART_B_REPOSITORY,
    String(manifest.part_b.primary_demo.duration_seconds),
    testMarker,
    deterministicMarker,
    releaseUrl,
    retainedToolMarker,
    'live-report-2026-07-22.md',
    'live-report-2026-07-22.json'
  ]) {
    if (!index.includes(token)) {
      errors.push(diagnostic(options.indexPath, '$', `missing Fast Reviewer Path reference ${JSON.stringify(token)}`));
    }
  }
  for (const token of [
    'Exact Issue #2 requirement mapping',
    EXPECTED_PART_B_REPOSITORY,
    String(manifest.part_b.primary_demo.duration_seconds),
    testMarker,
    deterministicMarker,
    releaseUrl,
    retainedToolMarker,
    'node docs/integrations/verify_evidence.js',
    'live-report-2026-07-22.md',
    'live-report-2026-07-22.json'
  ]) {
    if (!acceptance.includes(token)) {
      errors.push(diagnostic(options.acceptancePath, '$', `missing acceptance reference ${JSON.stringify(token)}`));
    }
  }
  for (const staleMarker of STALE_PART_B_TEST_MARKERS) {
    if (index.includes(staleMarker)) {
      errors.push(diagnostic(
        options.indexPath,
        '$',
        `contains stale current Part B test marker ${JSON.stringify(staleMarker)}`
      ));
    }
    if (acceptance.includes(`Local verification: **${staleMarker}`)) {
      errors.push(diagnostic(
        options.acceptancePath,
        '$',
        `contains stale current Part B test marker ${JSON.stringify(staleMarker)}`
      ));
    }
  }
  validateTextSafety(acceptance, options.acceptancePath, errors);
  validateTextSafety(index, options.indexPath, errors);
}

function renderIntegrationTable(manifest) {
  const lines = [
    '| Tool | Category | Tested snapshot | First conversation | Real task | Guide | Direct evidence |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];
  for (const integration of manifest.integrations) {
    const version = integration.version.compatibility_check
      ? `${integration.version.tested_snapshot}; ${integration.version.compatibility_check} check`
      : integration.version.tested_snapshot;
    const guide = path.posix.basename(integration.guide_path);
    const links = [];
    for (const [prefix, record] of [
      ['first', integration.first_conversation],
      ['task', integration.real_task]
    ]) {
      record.evidence_paths.forEach((evidencePath, index) => {
        const relative = evidencePath.replace(/^docs\/integrations\//, '');
        const label = record.evidence_paths.length === 1 ? prefix : `${prefix} ${index + 1}`;
        links.push(`[${label}](${relative})`);
      });
    }
    lines.push(
      `| ${escapeTable(integration.display_name)} | ${escapeTable(integration.category)} | \`${escapeTable(version)}\` | ${statusLabel(integration.first_conversation.status)} | ${statusLabel(integration.real_task.status)} | [guide](${guide}) | ${links.join(' · ')} |`
    );
  }
  return lines.join('\n');
}

function extractGeneratedTable(text) {
  const start = text.indexOf(TABLE_BEGIN);
  const end = text.indexOf(TABLE_END);
  if (start < 0 || end < 0 || end <= start) return null;
  return text.slice(start + TABLE_BEGIN.length, end).trim();
}

function statusLabel(status) {
  return {
    live_verified: 'Live verified',
    offline_verified: 'Offline verified',
    documented_not_executed: 'Documented only',
    configuration_only: 'Configuration only',
    not_applicable: 'N/A',
    unknown: 'Unknown'
  }[status] || status;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function resolveRelative(root, relativePath) {
  return path.join(root, ...relativePath.split('/'));
}

async function resolveExistingFileWithinRoot(root, relativePath) {
  const resolvedRoot = await fs.realpath(root);
  const resolvedTarget = await fs.realpath(resolveRelative(root, relativePath));
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    const error = new Error('Path resolves outside the repository.');
    error.code = 'OUTSIDE_REPOSITORY';
    throw error;
  }
  const stats = await fs.stat(resolvedTarget);
  if (!stats.isFile()) {
    const error = new Error('Path is not a file.');
    error.code = 'NOT_A_FILE';
    throw error;
  }
  return resolvedTarget;
}

function sameSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((value) => actual.includes(value));
}

function safeError(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'`]*/gi, '[local path]')
    .replace(/\/(?:Users|home|root)\/[^\s"'`]*/gi, '[local path]')
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gi, '[redacted]');
}

function buildResult(errors, warnings, manifest, media) {
  const sortedErrors = [...errors].sort(compareDiagnostics);
  const sortedWarnings = [...warnings].sort(compareDiagnostics);
  return {
    ok: sortedErrors.length === 0,
    errors: sortedErrors,
    warnings: sortedWarnings,
    summary: {
      schema_version: SCHEMA_VERSION,
      integrations_checked: manifest?.integrations?.length || 0,
      media_checked: media?.assets?.length || 0,
      errors: sortedErrors.length,
      warnings: sortedWarnings.length,
      network_required: false,
      credential_required: false
    }
  };
}

function compareDiagnostics(left, right) {
  return `${left.file}:${left.field}:${left.message}`
    .localeCompare(`${right.file}:${right.field}:${right.message}`);
}

function formatDiagnostics(result) {
  const lines = [];
  for (const item of result.errors) {
    lines.push(`ERROR ${item.file}:${item.field}: ${item.message}`);
  }
  for (const item of result.warnings) {
    lines.push(`WARN  ${item.file}:${item.field}: ${item.message}`);
  }
  lines.push(
    result.ok
      ? `Evidence verification passed: ${result.summary.integrations_checked} integrations, ${result.summary.media_checked} media assets, offline and credential-free.`
      : `Evidence verification failed: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s).`
  );
  return `${lines.join('\n')}\n`;
}

module.exports = {
  ACCEPTANCE_PATH,
  EXPECTED_SLUGS,
  INDEX_PATH,
  MANIFEST_PATH,
  MEDIA_PATH,
  SCHEMA_VERSION,
  STATUS_VOCABULARY,
  TABLE_BEGIN,
  TABLE_END,
  extractGeneratedTable,
  formatDiagnostics,
  parsePngDimensions,
  renderIntegrationTable,
  safeRelativePathError,
  validateEvidenceManifest,
  validateMediaManifest,
  validateTextSafety,
  verifyEvidence,
  verifyMediaFiles
};
