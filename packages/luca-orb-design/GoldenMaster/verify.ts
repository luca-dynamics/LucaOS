// Legacy V1 parameter-envelope check.
// This renders no pixels and cannot certify a visual Golden Master.

import { DEFAULT_LUCA_IDENTITY_DNA, evaluateEmbodimentState } from '../src';

export interface VerificationResult {
  passed: boolean;
  certificationStatus: 'invalidated';
  totalSnapshots: number;
  totalProfiles: number;
  errors: string[];
}

export function verifyGoldenMaster(): VerificationResult {
  const errors: string[] = [];
  const sizes = [380, 256, 128, 96, 64, 48, 32, 24];
  const profiles = ['idle', 'listening', 'thinking', 'speaking', 'executing', 'success', 'error', 'sleeping'] as const;

  let snapshotCount = 0;

  // 1. Validate 64 Snapshot Targets Matrix
  for (const profile of profiles) {
    for (const size of sizes) {
      snapshotCount++;
      const state = evaluateEmbodimentState(profile, 0.42, 1.0);
      if (!state || typeof state.blobRadius !== 'number') {
        errors.push(`Invalid state for profile ${profile} at size ${size}px`);
      }
    }
  }

  // 2. Validate Identity DNA Envelopes
  const dna = DEFAULT_LUCA_IDENTITY_DNA;
  if (dna.motion.breathingPeriod < 3.8 || dna.motion.breathingPeriod > 4.6) {
    errors.push(`breathingPeriod ${dna.motion.breathingPeriod} out of envelope [3.8s, 4.6s]`);
  }
  if (dna.shape.organicAsymmetry < 0.22 || dna.shape.organicAsymmetry > 0.26) {
    errors.push(`organicAsymmetry ${dna.shape.organicAsymmetry} out of envelope [0.22, 0.26]`);
  }

  return {
    passed: false,
    certificationStatus: 'invalidated',
    totalSnapshots: snapshotCount,
    totalProfiles: profiles.length,
    errors,
  };
}

// Executable entrypoint
if (require.main === module) {
  const res = verifyGoldenMaster();
  console.log(`\n======================================================`);
  console.log(`  LUCA EMBODIMENT V1 PARAMETER CHECK (NOT CERTIFICATION) `);
  console.log(`======================================================`);
  console.log(`  Snapshots Validated: ${res.totalSnapshots} (64 Targets)`);
  console.log(`  Behavior Profiles:   ${res.totalProfiles} Profiles`);
  console.log(`  Certification:       INVALIDATED`);
  console.log(`  Parameter Errors:    ${res.errors.length}`);
  if (res.errors.length > 0) {
    console.error(`  Errors:`, res.errors);
  }
  process.exit(1);
}
