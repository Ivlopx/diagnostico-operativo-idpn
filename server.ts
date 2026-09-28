import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
import { Pool, PoolClient } from 'pg';
import type { z } from 'zod';
import { buildAuditPdfStream, PDFExportPayload } from './server/pdfGenerator.ts';
import { runMigrations } from './server/migrate.ts';
import { createAdminPassword, verifyAdminPassword } from './server/adminPassword.ts';
import {
  adminLoginSchema, adminPasswordChangeSchema, adminSetupSchema, areaCreateSchema, areaUpdateSchema, processCreateSchema,
  processUpdateSchema, workspaceAccessSchema, workspaceCreateSchema, workspaceNameSchema,
} from './server/validation.ts';
import { calculateWorkspaceSustainableScore, createEmptyPSMI, AreaDoc, ProcessDoc } from './src/types.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://dopyme:dopyme@127.0.0.1:5432/dopyme' });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(36).toString('base64url');
const id = (prefix: string) => `${prefix}_${randomBytes(12).toString('base64url')}`;
const expiry = () => new Date(Date.now() + 30 * 86400_000);
const cookieFlags = () => `HttpOnly; Path=/; SameSite=Strict; Max-Age=${30 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '8mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
const sensitiveLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

function cookies(req: Request) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}
function name(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : fallback; }
function validBody<T>(schema: z.ZodType<T>, req: Request, res: Response): T | null {
  const parsed = schema.safeParse(req.body);
  if (parsed.success) return parsed.data;
  res.status(400).json({ error: 'Datos inválidos.', details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  return null;
}
function area(row: any): AreaDoc { return { id: row.id, workspaceId: row.workspace_id, name: row.name, order: row.sort_order, createdAt: row.created_at, updatedAt: row.updated_at }; }
function processRow(row: any): ProcessDoc {
  return { id: row.id, workspaceId: row.workspace_id, areaId: row.area_id, name: row.name, order: row.sort_order,
    O: row.o, P: row.p, E: row.e, A: row.a, levelMBC: row.level_mbc, levelK: row.level_k,
    psmis: row.psmis || [], revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function session(req: Request, workspaceId: string) {
  const raw = cookies(req).dopyme_session;
  if (!raw) return null;
  const result = await pool.query(`SELECT s.role,s.generation FROM workspace_sessions s JOIN workspaces w ON w.id=s.workspace_id
    WHERE s.token_hash=$1 AND s.workspace_id=$2 AND s.expires_at>now() AND s.generation=w.invite_generation`, [hash(raw), workspaceId]);
  return result.rows[0] || null;
}
async function allow(req: Request, res: Response, workspaceId: string, owner = false) {
  const current = await session(req, workspaceId);
  if (!current || (owner && current.role !== 'owner')) { res.status(403).json({ error: 'Acceso denegado o invitación revocada.' }); return null; }
  return current;
}
async function admin(req: Request) {
  const raw = cookies(req).dopyme_admin_session;
  if (!raw) return false;
  return (await pool.query(`SELECT 1 FROM admin_sessions s
    WHERE s.token_hash=$1 AND s.expires_at>now()
    AND EXISTS (SELECT 1 FROM admin_credentials WHERE id=1)`, [hash(raw)])).rowCount === 1;
}
async function adminCredential() {
  return (await pool.query('SELECT password_hash,password_salt FROM admin_credentials WHERE id=1')).rows[0] || null;
}
async function createAdminSession(res: Response, db: Pool | PoolClient = pool) {
  const sessionToken = token();
  await db.query('INSERT INTO admin_sessions(token_hash,expires_at) VALUES($1,$2)', [hash(sessionToken), expiry()]);
  res.setHeader('Set-Cookie', `dopyme_admin_session=${sessionToken}; ${cookieFlags()}`);
}

app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.send('OK'); } catch { res.status(503).send('DATABASE_UNAVAILABLE'); }
});

app.post('/api/workspaces', async (req, res) => {
  const input = validBody(workspaceCreateSchema, req, res); if (!input) return;
  const workspaceId = id('ws'), inviteToken = token(), sessionToken = token();
  await transaction(async (db) => {
    await db.query('INSERT INTO workspaces(id,name,invite_token_hash) VALUES($1,$2,$3)', [workspaceId, input.companyName || 'Mi Empresa', hash(inviteToken)]);
    await db.query('INSERT INTO workspace_sessions(token_hash,workspace_id,role,generation,expires_at) VALUES($1,$2,$3,1,$4)', [hash(sessionToken), workspaceId, 'owner', expiry()]);
  });
  res.setHeader('Set-Cookie', `dopyme_session=${sessionToken}; ${cookieFlags()}`);
  res.status(201).json({ workspaceId, inviteToken });
});

app.post('/api/workspaces/:workspaceId/access', sensitiveLimit, async (req, res) => {
  const input = validBody(workspaceAccessSchema, req, res); if (!input) return;
  const current = await session(req, req.params.workspaceId);
  if (current) return res.json(current);
  const inviteToken = input.inviteToken;
  const ws = await pool.query('SELECT invite_generation FROM workspaces WHERE id=$1 AND invite_token_hash=$2', [req.params.workspaceId, hash(inviteToken)]);
  if (!inviteToken || !ws.rowCount) return res.status(403).json({ error: 'Enlace inválido o revocado.' });
  const sessionToken = token();
  await pool.query('INSERT INTO workspace_sessions(token_hash,workspace_id,role,generation,expires_at) VALUES($1,$2,$3,$4,$5)', [hash(sessionToken), req.params.workspaceId, 'editor', ws.rows[0].invite_generation, expiry()]);
  res.setHeader('Set-Cookie', `dopyme_session=${sessionToken}; ${cookieFlags()}`);
  res.json({ role: 'editor', generation: ws.rows[0].invite_generation });
});

app.get('/api/workspaces/:workspaceId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const found = await pool.query('SELECT id,name,created_at,updated_at FROM workspaces WHERE id=$1', [req.params.workspaceId]);
  if (!found.rowCount) return res.status(404).end();
  const row = found.rows[0]; res.json({ id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at });
});
app.patch('/api/workspaces/:workspaceId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const input = validBody(workspaceNameSchema, req, res); if (!input) return;
  await pool.query('UPDATE workspaces SET name=$1,updated_at=now() WHERE id=$2', [input.name, req.params.workspaceId]); res.status(204).end();
});
app.post('/api/workspaces/:workspaceId/invitation/regenerate', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId, true))) return;
  const inviteToken = token(), sessionToken = token();
  const generation = await transaction(async (db) => {
    const updated = await db.query('UPDATE workspaces SET invite_token_hash=$1,invite_generation=invite_generation+1,updated_at=now() WHERE id=$2 RETURNING invite_generation', [hash(inviteToken), req.params.workspaceId]);
    await db.query('DELETE FROM workspace_sessions WHERE workspace_id=$1', [req.params.workspaceId]);
    await db.query('INSERT INTO workspace_sessions(token_hash,workspace_id,role,generation,expires_at) VALUES($1,$2,$3,$4,$5)', [hash(sessionToken), req.params.workspaceId, 'owner', updated.rows[0].invite_generation, expiry()]);
    return updated.rows[0].invite_generation;
  });
  res.setHeader('Set-Cookie', `dopyme_session=${sessionToken}; ${cookieFlags()}`); res.json({ inviteToken, generation });
});

app.get('/api/workspaces/:workspaceId/areas', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  res.json((await pool.query('SELECT * FROM areas WHERE workspace_id=$1 ORDER BY sort_order,name', [req.params.workspaceId])).rows.map(area));
});
app.post('/api/workspaces/:workspaceId/areas', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return; const areaId = id('area');
  const input = validBody(areaCreateSchema, req, res); if (!input) return;
  await pool.query('INSERT INTO areas(id,workspace_id,name,sort_order) VALUES($1,$2,$3,$4)', [areaId, req.params.workspaceId, input.name || 'Nueva Área', input.order || 1]); res.status(201).json({ id: areaId });
});
app.patch('/api/workspaces/:workspaceId/areas/:areaId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const input = validBody(areaUpdateSchema, req, res); if (!input) return;
  await pool.query('UPDATE areas SET name=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3', [input.name, req.params.areaId, req.params.workspaceId]); res.status(204).end();
});
app.delete('/api/workspaces/:workspaceId/areas/:areaId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  await pool.query('DELETE FROM areas WHERE id=$1 AND workspace_id=$2', [req.params.areaId, req.params.workspaceId]); res.status(204).end();
});

app.post('/api/workspaces/:workspaceId/processes/:processId/psmis/:psmiId/lock', async (req, res) => {
  const current = await allow(req, res, req.params.workspaceId); if (!current) return;
  const raw = cookies(req).dopyme_session;
  const holder = hash(raw);
  const exists = await pool.query('SELECT 1 FROM processes WHERE id=$1 AND workspace_id=$2', [req.params.processId, req.params.workspaceId]);
  if (!exists.rowCount) return res.status(404).json({ error: 'El departamento ya no existe.' });
  const locked = await pool.query(`INSERT INTO psmi_edit_locks(workspace_id,process_id,psmi_id,holder_token_hash,expires_at)
    VALUES($1,$2,$3,$4,now()+interval '45 seconds')
    ON CONFLICT (workspace_id,process_id,psmi_id) DO UPDATE SET holder_token_hash=EXCLUDED.holder_token_hash,
      expires_at=EXCLUDED.expires_at,updated_at=now()
    WHERE psmi_edit_locks.expires_at<=now() OR psmi_edit_locks.holder_token_hash=EXCLUDED.holder_token_hash
    RETURNING expires_at`, [req.params.workspaceId, req.params.processId, req.params.psmiId, holder]);
  if (!locked.rowCount) {
    const active = await pool.query('SELECT expires_at FROM psmi_edit_locks WHERE workspace_id=$1 AND process_id=$2 AND psmi_id=$3', [req.params.workspaceId, req.params.processId, req.params.psmiId]);
    return res.status(423).json({ error: 'Otra persona está editando este departamento.', expiresAt: active.rows[0]?.expires_at });
  }
  res.json({ acquired: true, expiresAt: locked.rows[0].expires_at });
});

app.delete('/api/workspaces/:workspaceId/processes/:processId/psmis/:psmiId/lock', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const raw = cookies(req).dopyme_session;
  await pool.query('DELETE FROM psmi_edit_locks WHERE workspace_id=$1 AND process_id=$2 AND psmi_id=$3 AND holder_token_hash=$4',
    [req.params.workspaceId, req.params.processId, req.params.psmiId, hash(raw)]);
  res.status(204).end();
});

app.get('/api/workspaces/:workspaceId/processes', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  res.json((await pool.query('SELECT * FROM processes WHERE workspace_id=$1 ORDER BY sort_order,name', [req.params.workspaceId])).rows.map(processRow));
});
app.post('/api/workspaces/:workspaceId/processes', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const input = validBody(processCreateSchema, req, res); if (!input) return;
  const processId = id('proc'), processName = input.name;
  await pool.query('INSERT INTO processes(id,workspace_id,area_id,name,sort_order,psmis) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [processId, req.params.workspaceId, input.areaId, processName, input.order || 1, JSON.stringify([createEmptyPSMI(processName)])]); res.status(201).json({ id: processId });
});
app.patch('/api/workspaces/:workspaceId/processes/:processId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const input = validBody(processUpdateSchema, req, res); if (!input) return;
  if (input.psmis) {
    const raw = cookies(req).dopyme_session;
    const activeLock = input.lockPsmiId && raw ? await pool.query(`SELECT 1 FROM psmi_edit_locks
      WHERE workspace_id=$1 AND process_id=$2 AND psmi_id=$3 AND holder_token_hash=$4 AND expires_at>now()`,
      [req.params.workspaceId, req.params.processId, input.lockPsmiId, hash(raw)]) : null;
    if (!activeLock?.rowCount) return res.status(423).json({ error: 'Necesitas tomar la edición de este departamento antes de guardar.' });
  }
  const found = await pool.query('SELECT * FROM processes WHERE id=$1 AND workspace_id=$2', [req.params.processId, req.params.workspaceId]);
  if (!found.rowCount) return res.status(404).end(); const { lockPsmiId: _lockPsmiId, ...changes } = input; const next = { ...processRow(found.rows[0]), ...changes };
  const updated = await pool.query(`UPDATE processes SET name=$1,sort_order=$2,o=$3,p=$4,e=$5,a=$6,level_mbc=$7,level_k=$8,psmis=$9::jsonb,revision=revision+1,updated_at=now() WHERE id=$10 AND workspace_id=$11 AND revision=$12 RETURNING *`,
    [name(next.name), next.order, next.O, next.P, next.E, next.A, next.levelMBC, next.levelK, JSON.stringify(next.psmis || []), req.params.processId, req.params.workspaceId, input.revision]);
  if (!updated.rowCount) {
    const current = await pool.query('SELECT * FROM processes WHERE id=$1 AND workspace_id=$2', [req.params.processId, req.params.workspaceId]);
    return res.status(409).json({ error: 'El proceso cambió en otra sesión. Se conservaron los datos más recientes.', current: current.rowCount ? processRow(current.rows[0]) : null });
  }
  res.json(processRow(updated.rows[0]));
});
app.delete('/api/workspaces/:workspaceId/processes/:processId', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  await pool.query('DELETE FROM processes WHERE id=$1 AND workspace_id=$2', [req.params.processId, req.params.workspaceId]); res.status(204).end();
});
app.delete('/api/workspaces/:workspaceId/data', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return; await pool.query('DELETE FROM areas WHERE workspace_id=$1', [req.params.workspaceId]); res.status(204).end();
});
app.post('/api/workspaces/:workspaceId/processes/reset', async (req, res) => {
  if (!(await allow(req, res, req.params.workspaceId))) return;
  const rows = (await pool.query('SELECT id,name FROM processes WHERE workspace_id=$1', [req.params.workspaceId])).rows;
  await transaction(async (db) => { for (const row of rows) await db.query(`UPDATE processes SET o=0,p=0,e=0,a=0,level_mbc='NONE',level_k='NE',psmis=$1::jsonb,revision=revision+1,updated_at=now() WHERE id=$2`, [JSON.stringify([createEmptyPSMI(row.name)]), row.id]); }); res.status(204).end();
});

app.post('/api/admin/verify', sensitiveLimit, async (req, res) => {
  const input = validBody(adminLoginSchema, req, res); if (!input) return;
  const configured = await adminCredential();
  if (!configured) return res.status(409).json({ success: false, setupRequired: true, error: 'Completa primero la configuración inicial.' });
  if (!(await verifyAdminPassword(input.password, configured.password_hash, configured.password_salt))) return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
  await createAdminSession(res); res.json({ success: true });
});
app.post('/api/admin/setup', sensitiveLimit, async (req, res) => {
  const input = validBody(adminSetupSchema, req, res); if (!input) return;
  const credential = await createAdminPassword(input.password);
  const created = await transaction(async (db) => {
    const inserted = await db.query(`INSERT INTO admin_credentials(id,password_hash,password_salt) VALUES(1,$1,$2)
      ON CONFLICT (id) DO NOTHING RETURNING id`, [credential.hash, credential.salt]);
    if (!inserted.rowCount) return false;
    await db.query('DELETE FROM admin_sessions');
    await createAdminSession(res, db);
    return true;
  });
  if (!created) return res.status(409).json({ success: false, error: 'La configuración inicial ya fue completada.' });
  res.status(201).json({ success: true });
});
app.get('/api/admin/session', async (req, res) => {
  const setupRequired = !(await adminCredential());
  res.json({ authenticated: setupRequired ? false : await admin(req), setupRequired });
});
app.post('/api/admin/password', sensitiveLimit, async (req, res) => {
  if (!(await admin(req))) return res.status(401).json({ error: 'La sesión administrativa expiró.' });
  const input = validBody(adminPasswordChangeSchema, req, res); if (!input) return;
  const configured = await adminCredential();
  if (!configured || !(await verifyAdminPassword(input.currentPassword, configured.password_hash, configured.password_salt))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  const credential = await createAdminPassword(input.newPassword);
  await transaction(async (db) => {
    await db.query('UPDATE admin_credentials SET password_hash=$1,password_salt=$2,updated_at=now() WHERE id=1', [credential.hash, credential.salt]);
    await db.query('DELETE FROM admin_sessions');
    await createAdminSession(res, db);
  });
  res.json({ success: true });
});
app.post('/api/admin/logout', async (req, res) => { const raw = cookies(req).dopyme_admin_session; if (raw) await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1', [hash(raw)]); res.setHeader('Set-Cookie', 'dopyme_admin_session=; HttpOnly; Path=/; Max-Age=0'); res.status(204).end(); });
app.get('/api/admin/workspaces', async (req, res) => {
  if (!(await admin(req))) return res.status(401).end(); const workspaces = (await pool.query('SELECT * FROM workspaces ORDER BY created_at DESC')).rows;
  res.json(await Promise.all(workspaces.map(async (ws) => { const [ar, pr] = await Promise.all([pool.query('SELECT * FROM areas WHERE workspace_id=$1', [ws.id]), pool.query('SELECT * FROM processes WHERE workspace_id=$1', [ws.id])]); const areas = ar.rows.map(area), processes = pr.rows.map(processRow); return { id: ws.id, name: ws.name, createdAt: new Date(ws.created_at).getTime(), createdAtFormatted: new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ws.created_at)), areasCount: areas.length, processesCount: processes.length, sustainableScore: calculateWorkspaceSustainableScore(areas, processes).sustainableScore }; })));
});
app.get('/api/admin/workspaces/:workspaceId', async (req, res) => {
  if (!(await admin(req))) return res.status(401).end(); const [ws, ar, pr] = await Promise.all([pool.query('SELECT id,name,created_at,updated_at FROM workspaces WHERE id=$1', [req.params.workspaceId]), pool.query('SELECT * FROM areas WHERE workspace_id=$1 ORDER BY sort_order', [req.params.workspaceId]), pool.query('SELECT * FROM processes WHERE workspace_id=$1 ORDER BY sort_order', [req.params.workspaceId])]); if (!ws.rowCount) return res.status(404).end(); const row = ws.rows[0]; res.json({ workspace: { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at }, areas: ar.rows.map(area), processes: pr.rows.map(processRow) });
});
app.post('/api/admin/workspaces/:workspaceId/open', async (req, res) => {
  if (!(await admin(req))) return res.status(401).end();
  const ws = await pool.query('SELECT invite_generation FROM workspaces WHERE id=$1', [req.params.workspaceId]);
  if (!ws.rowCount) return res.status(404).end();
  const sessionToken = token();
  await pool.query('INSERT INTO workspace_sessions(token_hash,workspace_id,role,generation,expires_at) VALUES($1,$2,$3,$4,$5)', [hash(sessionToken), req.params.workspaceId, 'owner', ws.rows[0].invite_generation, expiry()]);
  res.setHeader('Set-Cookie', `dopyme_session=${sessionToken}; ${cookieFlags()}`); res.status(204).end();
});
app.delete('/api/admin/workspaces/:workspaceId', async (req, res) => { if (!(await admin(req))) return res.status(401).end(); await pool.query('DELETE FROM workspaces WHERE id=$1', [req.params.workspaceId]); res.status(204).end(); });

app.post('/api/generate-pdf', sensitiveLimit, async (req, res) => {
  const payload: PDFExportPayload & { workspaceId?: string } = req.body; if (!payload.workspaceId || !(await allow(req, res, payload.workspaceId))) return;
  const slug = (payload.companyName || 'Empresa').toLowerCase().replace(/[^a-z0-9]/g, '_'); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="Dopyme_PSMI_${slug}_${Date.now()}.pdf"`); const pdf = buildAuditPdfStream(payload); pdf.pipe(res); pdf.end();
});

const dist = path.resolve(root, 'dist'); app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
async function start() { await runMigrations(pool, path.join(root, 'migrations')); await pool.query('DELETE FROM workspace_sessions WHERE expires_at<=now()'); await pool.query('DELETE FROM admin_sessions WHERE expires_at<=now()'); app.listen(port, '0.0.0.0', () => console.log(`Dopyme server running on port ${port}`)); }
start().catch((error) => { console.error('Unable to start Dopyme:', error); process.exit(1); });
