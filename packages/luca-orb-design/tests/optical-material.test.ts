import { describe, expect, it } from 'vitest';
import { LucaOpticalVolumeMaterial } from '../src/material/glass';

describe('Luca optical volume material', () => {
  it('uses wavelength-selective absorption for a cool smoky transmission', () => {
    const [red, green, blue] = LucaOpticalVolumeMaterial.absorption;
    expect(red).toBeGreaterThan(green);
    expect(green).toBeGreaterThan(blue);
    expect(blue).toBeGreaterThan(0);
  });

  it('keeps transport controls inside stable renderer envelopes', () => {
    expect(LucaOpticalVolumeMaterial.opticalDensity).toBeGreaterThan(0.5);
    expect(LucaOpticalVolumeMaterial.opticalDensity).toBeLessThan(2);
    expect(LucaOpticalVolumeMaterial.scattering).toBeGreaterThanOrEqual(0);
    expect(LucaOpticalVolumeMaterial.scattering).toBeLessThanOrEqual(1);
    expect(LucaOpticalVolumeMaterial.sceneTransmission).toBeGreaterThan(0);
    expect(LucaOpticalVolumeMaterial.sceneTransmission).toBeLessThan(1);
    expect(LucaOpticalVolumeMaterial.pearlDensity).toBeGreaterThan(0.5);
    expect(LucaOpticalVolumeMaterial.pearlScatter).toBeGreaterThan(0.5);
    expect(LucaOpticalVolumeMaterial.pearlIridescence).toBeLessThan(0.4);
    expect(LucaOpticalVolumeMaterial.smokeDensity).toBeGreaterThan(0.4);
    expect(LucaOpticalVolumeMaterial.internalBloom).toBeGreaterThan(0.3);
    expect(LucaOpticalVolumeMaterial.internalBloom).toBeLessThan(0.6);
    expect(LucaOpticalVolumeMaterial.shellReflectivity).toBeGreaterThan(0.5);
  });
});
