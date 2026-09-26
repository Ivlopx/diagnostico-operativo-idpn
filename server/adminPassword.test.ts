import { describe, expect, it } from 'vitest';
import { createAdminPassword, verifyAdminPassword } from './adminPassword';

describe('admin password storage', () => {
  it('verifies the original password and rejects a different one', async () => {
    const stored = await createAdminPassword('una-clave-muy-segura');
    expect(await verifyAdminPassword('una-clave-muy-segura', stored.hash, stored.salt)).toBe(true);
    expect(await verifyAdminPassword('otra-clave-muy-segura', stored.hash, stored.salt)).toBe(false);
  });

  it('uses a new salt for each credential', async () => {
    const first = await createAdminPassword('una-clave-muy-segura');
    const second = await createAdminPassword('una-clave-muy-segura');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });
});
