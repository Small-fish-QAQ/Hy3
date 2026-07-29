#!/usr/bin/env node
'use strict';

const { formatDiagnostics, verifyEvidence } = require('./evidence_verifier');

verifyEvidence()
  .then((result) => {
    (result.ok ? process.stdout : process.stderr).write(formatDiagnostics(result));
    if (!result.ok) process.exitCode = 1;
  })
  .catch((error) => {
    process.stderr.write(`Evidence verification failed safely: ${error?.message || String(error)}\n`);
    process.exitCode = 1;
  });
