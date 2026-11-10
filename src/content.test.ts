import { describe, expect, it } from 'vitest';
import { dataTypes, issues, levels, projects, recoveryScenarios, sources } from './content';

describe('atlas content integrity', () => {
  it('keeps every selectable content identifier unique', () => {
    for (const collection of [levels, projects, issues, dataTypes, recoveryScenarios]) {
      const ids = collection.map(item => item.id);
      expect(ids.every(Boolean)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(levels.map(level => level.id)).toEqual(['cpu', 'server', 'cluster', 'multicloud']);
    expect(issues).toHaveLength(10);
  });

  it('makes each data-model project shortcut resolve through the atlas search', () => {
    for (const dataType of dataTypes) {
      for (const shortcut of dataType.projects) {
        const matches = projects.filter(project => `${project.name} ${project.kind} ${project.summary} ${project.algorithm}`.toLowerCase().includes(shortcut.toLowerCase()));
        expect(matches.length, `${dataType.name} → ${shortcut} should find a system`).toBeGreaterThan(0);
      }
    }
  });

  it('provides valid HTTPS references for projects, issues and research sources', () => {
    const links = [...projects.map(project => project.source), ...issues.map(issue => issue.source), ...sources.map(source => source.url)];
    for (const link of links) {
      const url = new URL(link);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toContain('.');
      expect(url.username).toBe('');
      expect(url.password).toBe('');
    }
  });
});
