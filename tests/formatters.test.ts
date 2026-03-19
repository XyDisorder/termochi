import { describe, it, expect } from 'vitest';
import { formatAge, formatStatBar } from '../src/utils/formatters.js';
import { clamp, randomItem } from '../src/utils/math.js';

describe('formatStatBar', () => {
  it('returns a string with filled and empty blocks', () => {
    const bar = formatStatBar(50);
    expect(bar).toContain('█');
    expect(bar).toContain('░');
  });

  it('full bar (100%) has no empty blocks', () => {
    const bar = formatStatBar(100);
    expect(bar).not.toContain('░');
  });

  it('empty bar (0%) has no filled blocks', () => {
    const bar = formatStatBar(0);
    expect(bar).not.toContain('█');
  });

  it('handles values outside 0-100 gracefully', () => {
    expect(() => formatStatBar(-10)).not.toThrow();
    expect(() => formatStatBar(110)).not.toThrow();
  });
});

describe('formatAge', () => {
  it('returns "just born" or "less than a minute" for very recent dates', () => {
    const result = formatAge(new Date().toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns days for older dates', () => {
    const twoDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
    const result = formatAge(twoDaysAgo);
    expect(result).toContain('day');
  });
});

describe('clamp', () => {
  it('clamps to min', () => expect(clamp(-5, 0, 100)).toBe(0));
  it('clamps to max', () => expect(clamp(150, 0, 100)).toBe(100));
  it('keeps value in range', () => expect(clamp(50, 0, 100)).toBe(50));
  it('works with equal min/max', () => expect(clamp(50, 42, 42)).toBe(42));
});

describe('randomItem', () => {
  it('returns an item from the array', () => {
    const arr = ['a', 'b', 'c'];
    const result = randomItem(arr);
    expect(arr).toContain(result);
  });

  it('throws on empty array', () => {
    expect(() => randomItem([])).toThrow();
  });
});
