import { describe, expect, it } from 'vitest';
import { isAdminEmail } from './auth';

describe('auth utilities - isAdminEmail', () => {
  it('validates default configured admin emails', () => {
    expect(isAdminEmail('admin@hormuzwatch.aburcloud.com')).toBe(true);
  });

  it('normalizes email with uppercase letters and spaces', () => {
    expect(isAdminEmail('  ADMIN@HormuzWatch.AburCloud.com  ')).toBe(true);
  });

  it('validates compliant email pattern matches', () => {
    expect(isAdminEmail('analyst@hormuzwatch.org')).toBe(true);
  });

  it('rejects invalid or empty email formats', () => {
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail('notanemail')).toBe(false);
    expect(isAdminEmail('@nodomain')).toBe(false);
  });
});
