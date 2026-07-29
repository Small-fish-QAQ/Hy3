'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');

const {
  EXPECTED_SLUGS,
  STATUS_VOCABULARY,
  TABLE_BEGIN,
  TABLE_END,
  renderIntegrationTable,
  validateEvidenceManifest,
  validateMediaManifest,
  verifyEvidence
} = require('../evidence_verifier');

function syntheticPng(width = 2, height = 3) {
  const buffer = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function makeManifest() {
  const integrations = EXPECTED_SLUGS.map((slug) => ({
    tool_slug: slug,
    display_name: `Synthetic ${slug}`,
    category: 'Synthetic CLI',
    guide_path: `docs/integrations/${slug}.md`,
    version: {
      tested_snapshot: '1.0.0',
      claim_scope: 'synthetic test fixture'
    },
    tested_environment: {
      status: 'live_verified',
      details: ['Synthetic operating environment']
    },
    endpoint: {
      provider: 'Synthetic provider',
      region: 'Synthetic region',
      base_url: 'https://example.test/v1'
    },
    model: 'hy3',
    protocol: 'Synthetic OpenAI-compatible protocol',
    authentication: {
      method: 'Synthetic secret reference',
      secret_source: 'Environment variable name only; no value'
    },
    first_conversation: {
      status: 'live_verified',
      evidence_paths: [`docs/integrations/assets/${slug}/${slug}-first.png`]
    },
    real_task: {
      status: 'live_verified',
      description: 'Synthetic complete task.',
      evidence_paths: [`docs/integrations/assets/${slug}/${slug}-task.png`]
    },
    overall_verification_status: 'live_verified',
    verification_scope: 'Synthetic executed evidence scope.',
    limitations: ['Synthetic limitation.'],
    unverified_variants: [
      {
        name: 'Synthetic unexecuted variant',
        status: 'documented_not_executed'
      }
    ],
    verification_date: '2026-07-01',
    notes: []
  }));
  return {
    schema_version: '1.0.0',
    status_vocabulary: [...STATUS_VOCABULARY],
    status_definitions: Object.fromEntries(STATUS_VOCABULARY.map((status) => [status, status])),
    issue: {
      url: 'https://github.com/Tencent-Hunyuan/Hy3/issues/2',
      target_branch: 'rhinobird2026',
      required_directory: 'docs/integrations/',
      minimum_tools: 5,
      hard_requirements: Array.from({ length: 7 }, (_value, index) => `Synthetic requirement ${index + 1}`)
    },
    integration_index: 'docs/integrations/README.md',
    acceptance_matrix: 'docs/integrations/acceptance-matrix.md',
    media_integrity_manifest: 'docs/integrations/media-integrity.json',
    integrations,
    shared_unverified_scope: [
      {
        name: 'Synthetic shared variant',
        status: 'documented_not_executed'
      }
    ],
    part_b: {
      repository_url: 'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer',
      repository_branch: 'main',
      package_version: '1.2.0',
      recommended_release_version: '1.2.0',
      node_support: '>=18',
      core_capability: 'Synthetic Hy3 reasoning.',
      product_forms: [
        { name: 'report-oriented CLI', status: 'live_verified' },
        { name: 'interactive loopback Web UI', status: 'live_verified' }
      ],
      modes: [
        { name: 'Live / Hy3', status: 'live_verified', scope: 'Synthetic Live scope.' },
        { name: 'Offline / Fake', status: 'offline_verified', scope: 'Synthetic Offline scope.' }
      ],
      primary_demo: {
        status: 'live_verified',
        url: 'https://example.test/current-demo.mp4',
        duration_seconds: 41.567,
        sha256: 'a'.repeat(64),
        relationship_to_live_report: 'separate_run'
      },
      live_report: {
        status: 'live_verified',
        tool_version: '1.1.0',
        markdown_url: 'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/live-report-2026-07-22.md',
        structured_json_url: 'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/blob/main/docs/evidence/live-report-2026-07-22.json',
        execution_record_url: 'https://example.test/live-record.md',
        relationship_to_primary_demo: 'A separate synthetic run.'
      },
      tests: {
        status: 'offline_verified',
        command: 'npm test',
        passed: 241,
        total: 241,
        network_required: false
      },
      deterministic_evaluation: {
        status: 'offline_verified',
        command: 'npm run eval:offline',
        fixture_count: 6,
        passed: 42,
        total: 42,
        network_required: false
      },
      evidence_verification: {
        status: 'offline_verified',
        command: 'npm run evidence:verify',
        network_required: false,
        credential_required: false
      },
      ci: {
        status: 'configuration_only',
        workflow_url: 'https://example.test/ci.yml',
        operating_systems: ['ubuntu-latest', 'windows-latest'],
        node_versions: ['18.x', '24.x'],
        package_smoke: 'npm pack --dry-run and npm run package:smoke on ubuntu-latest / Node 24.x',
        live_calls: false
      },
      limitations: ['Synthetic limitation.']
    }
  };
}

function makeMedia(manifest, png) {
  const hash = createHash('sha256').update(png).digest('hex');
  const assets = manifest.integrations.flatMap((integration) => [
    {
      path: integration.first_conversation.evidence_paths[0],
      associated_tool: integration.tool_slug,
      evidence_role: 'first_conversation',
      status: 'live_verified',
      file_type: 'png',
      size_bytes: png.length,
      sha256: hash,
      dimensions: { width: 2, height: 3 },
      duration_seconds: null,
      classification: 'primary'
    },
    {
      path: integration.real_task.evidence_paths[0],
      associated_tool: integration.tool_slug,
      evidence_role: 'real_task',
      status: 'live_verified',
      file_type: 'png',
      size_bytes: png.length,
      sha256: hash,
      dimensions: { width: 2, height: 3 },
      duration_seconds: null,
      classification: 'primary'
    }
  ]);
  return {
    schema_version: '1.0.0',
    hash_algorithm: 'sha256',
    classification_vocabulary: ['primary', 'secondary', 'historical'],
    integrity_scope: {
      proves: ['synthetic byte identity'],
      does_not_prove: ['synthetic authenticity']
    },
    inspection: {
      path_format: 'repository-relative POSIX paths'
    },
    assets
  };
}

function makeIndex(manifest) {
  const guideLinks = manifest.integrations
    .map((integration) => `[${integration.display_name}](${path.posix.basename(integration.guide_path)})`)
    .join('\n');
  const testMarker = `${manifest.part_b.tests.passed}/${manifest.part_b.tests.total}`;
  const deterministicMarker =
    `${manifest.part_b.deterministic_evaluation.passed}/${manifest.part_b.deterministic_evaluation.total}`;
  return [
    '# Synthetic index',
    guideLinks,
    '[Acceptance](acceptance-matrix.md)',
    '[Manifest](evidence-manifest.json)',
    '[Media](media-integrity.json)',
    'node docs/integrations/verify_evidence.js',
    'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer',
    '41.567',
    testMarker,
    deterministicMarker,
    `https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/releases/tag/v${manifest.part_b.package_version}`,
    `tool version \`${manifest.part_b.live_report.tool_version}\``,
    'live-report-2026-07-22.md',
    'live-report-2026-07-22.json'
  ].join('\n');
}

function makeAcceptance(manifest) {
  const testMarker = `${manifest.part_b.tests.passed}/${manifest.part_b.tests.total}`;
  const deterministicMarker =
    `${manifest.part_b.deterministic_evaluation.passed}/${manifest.part_b.deterministic_evaluation.total}`;
  return [
    '# Synthetic acceptance',
    '## Exact Issue #2 requirement mapping',
    TABLE_BEGIN,
    renderIntegrationTable(manifest),
    TABLE_END,
    'https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer',
    '41.567',
    testMarker,
    deterministicMarker,
    `https://github.com/Small-fish-QAQ/hy3-tokenhub-spec-diff-reviewer/releases/tag/v${manifest.part_b.package_version}`,
    `tool version \`${manifest.part_b.live_report.tool_version}\``,
    'node docs/integrations/verify_evidence.js',
    'live-report-2026-07-22.md',
    'live-report-2026-07-22.json'
  ].join('\n');
}

async function writeFile(root, relativePath, value) {
  const absolute = path.join(root, ...relativePath.split('/'));
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, value);
}

async function makeFixture(t, mutate = () => {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hy3-evidence-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const manifest = makeManifest();
  const png = syntheticPng();
  const media = makeMedia(manifest, png);
  const documents = {
    index: makeIndex(manifest),
    acceptance: makeAcceptance(manifest)
  };
  await mutate({ manifest, media, documents, png, root });
  await writeFile(root, 'docs/integrations/evidence-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(root, 'docs/integrations/media-integrity.json', `${JSON.stringify(media, null, 2)}\n`);
  await writeFile(root, 'docs/integrations/README.md', documents.index);
  await writeFile(root, 'docs/integrations/acceptance-matrix.md', documents.acceptance);
  for (const integration of manifest.integrations) {
    await writeFile(root, integration.guide_path, `# ${integration.display_name}\n`);
  }
  for (const asset of media.assets) {
    await writeFile(root, asset.path, png);
  }
  return { root, manifest, media };
}

test('valid complete synthetic manifests pass offline verification', async (t) => {
  const fixture = await makeFixture(t);
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.summary.integrations_checked, 9);
  assert.equal(result.summary.media_checked, 18);
});

test('malformed manifest fails with a file-specific JSON diagnostic', async (t) => {
  const fixture = await makeFixture(t);
  await writeFile(fixture.root, 'docs/integrations/evidence-manifest.json', '{broken');
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /malformed JSON/);
});

test('unsupported schema version is rejected', () => {
  const manifest = makeManifest();
  manifest.schema_version = '9.0.0';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => `${item.field} ${item.message}`).join('\n'),
    /schema_version.*unsupported/
  );
});

test('duplicate tool slug is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[1].tool_slug = manifest.integrations[0].tool_slug;
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /duplicate tool slug/
  );
});

test('duplicate media path is rejected', () => {
  const manifest = makeManifest();
  const media = makeMedia(manifest, syntheticPng());
  media.assets[1].path = media.assets[0].path;
  assert.match(
    validateMediaManifest(media, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /duplicate media path/
  );
});

test('missing guide is rejected', async (t) => {
  const fixture = await makeFixture(t);
  await fs.rm(path.join(fixture.root, 'docs', 'integrations', 'aider.md'));
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(result.errors.map((item) => item.message).join('\n'), /referenced file is missing.*aider\.md/);
});

test('missing media is rejected', async (t) => {
  const fixture = await makeFixture(t);
  await fs.rm(path.join(
    fixture.root,
    ...fixture.media.assets[0].path.split('/')
  ));
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(result.errors.map((item) => item.message).join('\n'), /asset is missing|referenced file is missing/);
});

test('SHA-256 mismatch is rejected', async (t) => {
  const fixture = await makeFixture(t);
  fixture.media.assets[0].sha256 = '0'.repeat(64);
  await writeFile(
    fixture.root,
    'docs/integrations/media-integrity.json',
    `${JSON.stringify(fixture.media, null, 2)}\n`
  );
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(result.errors.map((item) => item.message).join('\n'), /SHA-256 mismatch/);
});

test('invalid status is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].first_conversation.status = 'verified';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /invalid status/
  );
});

test('non-executed task statuses allow an explicit empty evidence list', () => {
  for (const status of ['documented_not_executed', 'not_applicable', 'unknown']) {
    const manifest = makeManifest();
    manifest.integrations[0].first_conversation.status = status;
    manifest.integrations[0].first_conversation.evidence_paths = [];
    manifest.integrations[0].real_task.status = status;
    manifest.integrations[0].real_task.evidence_paths = [];
    manifest.integrations[0].overall_verification_status = status;
    assert.deepEqual(
      validateEvidenceManifest(manifest, { enforceProduction: false }),
      [],
      `${status} should not require executed-task media`
    );
  }
});

test('missing required metadata is rejected with its field', () => {
  const manifest = makeManifest();
  delete manifest.integrations[0].category;
  const messages = validateEvidenceManifest(manifest, { enforceProduction: false })
    .map((item) => `${item.field}: ${item.message}`).join('\n');
  assert.match(messages, /category: must be a non-empty string/);
});

test('repository path traversal is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].guide_path = 'docs/integrations/../../outside.md';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /traversal/
  );
});

test('Windows absolute external path is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].guide_path = 'C:/external/guide.md';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /absolute path/
  );
});

test('POSIX absolute external path is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].guide_path = '/external/guide.md';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /absolute path/
  );
});

test('Windows separators in repository-relative paths are rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].guide_path = 'docs\\integrations\\aider.md';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /POSIX separators/
  );
});

test('secret-like value is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].notes.push('Bearer syntheticcredentialvalue123');
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /Bearer credential/
  );
});

test('private local path is rejected', () => {
  const manifest = makeManifest();
  manifest.integrations[0].notes.push('Stored under C:/Users/private-name/config');
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /private local path/
  );
});

test('unverified variant cannot be mislabeled Live', () => {
  const manifest = makeManifest();
  manifest.integrations[0].unverified_variants[0].status = 'live_verified';
  assert.match(
    validateEvidenceManifest(manifest, { enforceProduction: false })
      .map((item) => item.message).join('\n'),
    /unverified variant cannot be labelled verified/
  );
});

test('missing integration index reference is rejected', async (t) => {
  const fixture = await makeFixture(t, ({ documents }) => {
    documents.index = documents.index.replace('[Synthetic aider](aider.md)', '');
  });
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(result.errors.map((item) => item.message).join('\n'), /missing guide link for aider/);
});

test('acceptance matrix inconsistent with manifest is rejected', async (t) => {
  const fixture = await makeFixture(t, ({ documents }) => {
    documents.acceptance = documents.acceptance.replace('Synthetic aider', 'Changed aider');
  });
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(result.errors.map((item) => item.message).join('\n'), /does not match evidence-manifest/);
});

test('documentation result markers are obtained from the manifest', async (t) => {
  const fixture = await makeFixture(t, ({ manifest }) => {
    manifest.part_b.tests.passed = 242;
    manifest.part_b.tests.total = 242;
  });
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(
    result.errors.map((item) => item.message).join('\n'),
    /missing Fast Reviewer Path reference "242\/242"/
  );
});

test('stale current Part B result markers are rejected in documentation', async (t) => {
  const fixture = await makeFixture(t, ({ documents }) => {
    documents.index += '\nObsolete current result: 207/207\n';
    documents.acceptance += '\n- Local verification: **207/207 tests**\n';
  });
  const result = await verifyEvidence({ root: fixture.root, enforceProduction: false });
  assert.match(
    result.errors.map((item) => item.message).join('\n'),
    /stale current Part B test marker "207\/207"/
  );
});

test('Part B result counts and fixture count must be positive consistent integers', async (t) => {
  for (const [name, mutate, expected] of [
    [
      'missing passed',
      (manifest) => delete manifest.part_b.tests.passed,
      /tests\.passed.*positive integer/
    ],
    [
      'non-integer total',
      (manifest) => { manifest.part_b.tests.total = 241.5; },
      /tests\.total.*positive integer/
    ],
    [
      'non-positive passed',
      (manifest) => { manifest.part_b.tests.passed = 0; },
      /tests\.passed.*positive integer/
    ],
    [
      'inconsistent result',
      (manifest) => { manifest.part_b.tests.passed = 240; },
      /recorded result is not fully passing/
    ],
    [
      'invalid fixture count',
      (manifest) => { manifest.part_b.deterministic_evaluation.fixture_count = 0; },
      /fixture_count.*positive integer/
    ]
  ]) {
    await t.test(name, () => {
      const manifest = makeManifest();
      mutate(manifest);
      const messages = validateEvidenceManifest(manifest, { enforceProduction: false })
        .map((item) => `${item.field}: ${item.message}`).join('\n');
      assert.match(messages, expected);
    });
  }
});

test('invalid or excessive primary demo duration is rejected', async (t) => {
  await t.test('zero', () => {
    const manifest = makeManifest();
    manifest.part_b.primary_demo.duration_seconds = 0;
    assert.match(
      validateEvidenceManifest(manifest, { enforceProduction: false })
        .map((item) => item.message).join('\n'),
      /positive number/
    );
  });
  await t.test('over 60 seconds', () => {
    const manifest = makeManifest();
    manifest.part_b.primary_demo.duration_seconds = 60.001;
    assert.match(
      validateEvidenceManifest(manifest, { enforceProduction: false })
        .map((item) => item.message).join('\n'),
      /must not exceed/
    );
  });
});

test('optional media inspector unavailability is a warning, not a failure', async (t) => {
  const fixture = await makeFixture(t);
  const result = await verifyEvidence({
    root: fixture.root,
    enforceProduction: false,
    optionalMediaInspector: async () => {
      const error = new Error('synthetic optional tool is unavailable');
      error.code = 'UNAVAILABLE';
      throw error;
    }
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.warnings.length, fixture.media.assets.length);
});

test('media manifest requires valid status, dimensions, and digest metadata', () => {
  const manifest = makeManifest();
  const media = makeMedia(manifest, syntheticPng());
  media.assets[0].status = 'maybe';
  media.assets[0].dimensions.width = 0;
  media.assets[0].sha256 = 'not-a-hash';
  const messages = validateMediaManifest(media, { enforceProduction: false })
    .map((item) => `${item.field}: ${item.message}`).join('\n');
  assert.match(messages, /invalid status/);
  assert.match(messages, /positive integer width and height/);
  assert.match(messages, /SHA-256/);
});
