import { z } from 'zod';

const trimmedText = (max: number) => z.string().trim().min(1).max(max);
const score = z.union([z.literal(0), z.literal(5)]);

export const workspaceCreateSchema = z.object({ companyName: trimmedText(200).optional() }).strict();
export const workspaceAccessSchema = z.object({
  inviteToken: z.string().max(200).nullish().transform((value) => value || ''),
}).strict();
export const workspaceNameSchema = z.object({ name: trimmedText(200) }).strict();
export const areaCreateSchema = z.object({ name: trimmedText(200).optional(), order: z.coerce.number().int().min(1).max(10_000).optional() }).strict();
export const areaUpdateSchema = z.object({ name: trimmedText(200) }).strict();
export const processCreateSchema = z.object({
  areaId: trimmedText(100),
  name: z.string().trim().max(200).optional().default(''),
  order: z.coerce.number().int().min(1).max(10_000).optional(),
}).strict();
export const processUpdateSchema = z.object({
  revision: z.coerce.number().int().positive(),
  name: z.string().trim().max(200).optional(),
  order: z.coerce.number().int().min(1).max(10_000).optional(),
  O: score.optional(), P: score.optional(), E: score.optional(), A: score.optional(),
  levelMBC: z.enum(['NONE', 'M', 'B', 'C']).optional(),
  levelK: z.enum(['NE', 'E', 'D', 'I', 'U', 'MC']).optional(),
  psmis: z.array(z.unknown()).max(100).optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'revision'), 'No hay cambios para guardar.');
export const adminLoginSchema = z.object({ password: z.string().min(1).max(500) }).strict();
const adminPassword = z.string().min(12, 'La contraseña debe tener al menos 12 caracteres.').max(128);
export const adminSetupSchema = z.object({ password: adminPassword }).strict();
export const adminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: adminPassword,
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  message: 'La nueva contraseña debe ser diferente.',
  path: ['newPassword'],
});

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
