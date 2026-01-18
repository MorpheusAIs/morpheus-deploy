import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from '../../src/utils/duration';

describe('parseDuration', () => {
  it('parses years correctly', () => {
    expect(parseDuration('1y')).toBe(365 * 24);
    expect(parseDuration('2y')).toBe(2 * 365 * 24);
  });

  it('parses months correctly', () => {
    expect(parseDuration('1m')).toBe(30 * 24);
    expect(parseDuration('6m')).toBe(6 * 30 * 24);
  });

  it('parses weeks correctly', () => {
    expect(parseDuration('1w')).toBe(7 * 24);
    expect(parseDuration('2w')).toBe(14 * 24);
  });

  it('parses days correctly', () => {
    expect(parseDuration('1d')).toBe(24);
    expect(parseDuration('30d')).toBe(30 * 24);
  });

  it('throws on invalid formats', () => {
    expect(() => parseDuration('1h')).toThrow('Invalid duration format');
    expect(() => parseDuration('24h')).toThrow('Invalid duration format');
    expect(() => parseDuration('1')).toThrow('Invalid duration format');
    expect(() => parseDuration('year')).toThrow('Invalid duration format');
    expect(() => parseDuration('1x')).toThrow('Invalid duration format');
    expect(() => parseDuration('')).toThrow('Duration string cannot be empty');
  });
});

describe('formatDuration', () => {
  it('formats years', () => {
    expect(formatDuration(365 * 24)).toBe('1 year');
    expect(formatDuration(2 * 365 * 24)).toBe('2 years');
  });

  it('formats months', () => {
    expect(formatDuration(30 * 24)).toBe('1 month');
    expect(formatDuration(6 * 30 * 24)).toBe('6 months');
  });

  it('formats weeks', () => {
    expect(formatDuration(7 * 24)).toBe('1 week');
  });

  it('formats days', () => {
    expect(formatDuration(24)).toBe('1 day');
    expect(formatDuration(48)).toBe('2 days');
  });
});
