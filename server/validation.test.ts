import { describe, expect, it } from 'vitest';
import { adminPasswordChangeSchema, adminSetupSchema, processUpdateSchema, workspaceAccessSchema, workspaceNameSchema } from './validation';

describe('API validation', () => {
  it('trims valid workspace names and rejects empty ones', () => {
    expect(workspaceNameSchema.parse({ name: '  Empresa Norte  ' })).toEqual({ name: 'Empresa Norte' });
    expect(workspaceNameSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('only accepts supported process scores and fields', () => {
    expect(processUpdateSchema.safeParse({ revision: 1, O: 5, levelK: 'MC' }).success).toBe(true);
    expect(processUpdateSchema.safeParse({ revision: 1, O: 3 }).success).toBe(false);
    expect(processUpdateSchema.safeParse({ revision: 1, unexpected: true }).success).toBe(false);
    expect(processUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('allows an authenticated workspace request without an invite token', () => {
    expect(workspaceAccessSchema.parse({ inviteToken: null })).toEqual({ inviteToken: '' });
    expect(workspaceAccessSchema.parse({})).toEqual({ inviteToken: '' });
  });

  it('requires a strong-length admin password and a different replacement', () => {
    expect(adminSetupSchema.safeParse({ password: 'demasiado-corta' }).success).toBe(true);
    expect(adminSetupSchema.safeParse({ password: 'corta' }).success).toBe(false);
    expect(adminPasswordChangeSchema.safeParse({ currentPassword: 'una-clave-segura', newPassword: 'otra-clave-segura' }).success).toBe(true);
    expect(adminPasswordChangeSchema.safeParse({ currentPassword: 'misma-clave-segura', newPassword: 'misma-clave-segura' }).success).toBe(false);
  });
});
