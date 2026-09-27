import { describe, it, expect } from 'vitest';
import { INITIAL_ARTIFACTS, INITIAL_GNOMIE_USER, SCHOOL_LESSONS } from '../data/mockData';

describe('SLAY.LLC Ecosystem Core Model Tests', () => {
  it('should have initial artifacts populated with valid market & provenance data', () => {
    expect(INITIAL_ARTIFACTS.length).toBeGreaterThan(0);
    
    const voidGnome = INITIAL_ARTIFACTS.find((a) => a.id === 'void-gnome-01');
    expect(voidGnome).toBeDefined();
    expect(voidGnome?.ticker).toBe('$VOID');
    expect(voidGnome?.market.priceUsd).toBeGreaterThan(0);
    expect(voidGnome?.provenance.length).toBeGreaterThan(0);
    expect(voidGnome?.signals.length).toBeGreaterThan(0);
  });

  it('should enforce transparent creator economics across all artifacts', () => {
    INITIAL_ARTIFACTS.forEach((art) => {
      expect(art.economics.creatorRewardSharePct).toBeGreaterThanOrEqual(0.5);
      expect(art.economics.platformFeePct).toBeLessThanOrEqual(1.0);
      expect(art.economics.liquidityLockedPct).toBeGreaterThanOrEqual(95);
      expect(art.economics.disclaimer).toBeTruthy();
    });
  });

  it('should have complete Gnomie School curriculum with risk disclosures', () => {
    expect(SCHOOL_LESSONS.length).toBeGreaterThanOrEqual(4);
    SCHOOL_LESSONS.forEach((lesson) => {
      expect(lesson.title).toBeTruthy();
      expect(lesson.keyTakeaway).toBeTruthy();
      expect(lesson.content.length).toBeGreaterThan(0);
    });
  });

  it('should have valid initial Gnomie User identity and participation signals', () => {
    expect(INITIAL_GNOMIE_USER.id).toBe('GNOMIE #48291');
    expect(INITIAL_GNOMIE_USER.reputationScore).toBeGreaterThan(0);
    expect(INITIAL_GNOMIE_USER.signals.learningProgress).toBeGreaterThan(0);
    expect(INITIAL_GNOMIE_USER.badges.length).toBeGreaterThan(0);
  });
});
