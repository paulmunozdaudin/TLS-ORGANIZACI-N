// LOCAL DEVELOPMENT ONLY — a small stand-in for a Supabase project so the app
// can be run and tested end to end without one:
//
//   /auth/v1/*        email + password sign-up / sign-in (subset of GoTrue)
//   /rest/v1/rpc/*    PostgREST-style RPC, executed as the signed-in user
//                     (role `authenticated`, RLS and grants enforced)
//   everything else   static files from --static <dir> (an `expo export` build)
//
// It runs the real migrations against local Postgres. Tokens are unsigned and
// passwords are only hashed with SHA-256: never expose this to a network.
//
//   node supabase/tests/dev-server.mjs --reset --seed --static dist --port 54321
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import pg from 'pg';

import { resetDatabase } from './bootstrap.mjs';
import { seedTestData } from './dev-seed.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const port = Number(option('port', 54321));
const staticDir = option('static', null);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://matchiq_test:matchiq_test@127.0.0.1:5432/matchiq_test', max: 8 });
const sql = (text, params) => pool.query(text, params).then((r) => r.rows);

if (flag('reset')) await resetDatabase(sql);
if (flag('seed')) await seedTestData(sql);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');
const token = (sub) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.dev`;
const subject = (req) => {
  try {
    const raw = (req.headers.authorization ?? '').replace(/^Bearer /i, '').split('.')[1];
    return JSON.parse(Buffer.from(raw, 'base64url').toString()).sub ?? null;
  } catch {
    return null;
  }
};
const userJson = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.raw_user_meta_data, app_metadata: { provider: 'email' }, created_at: u.created_at });
const session = (u) => ({ access_token: token(u.id), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: `dev-${u.id}`, user: userJson(u) });

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};
const send = (res, status, body) => {
  res.writeHead(status, { ...cors, 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const returnsSet = new Map();
async function rpc(fn, params, userId) {
  if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw Object.assign(new Error('bad function name'), { code: 'PGRST202' });
  if (!returnsSet.has(fn)) {
    const row = (await sql("select proretset from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = $1", [fn]))[0];
    if (!row) throw Object.assign(new Error(`function ${fn} not found`), { code: 'PGRST202' });
    returnsSet.set(fn, row.proretset);
  }
  const keys = Object.keys(params);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${userId ? 'authenticated' : 'anon'}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : {})]);
    const { rows } = await client.query(`select * from ${fn}(${keys.map((k, i) => `"${k.replace(/"/g, '')}" => $${i + 1}`).join(', ')})`, keys.map((k) => params[k]));
    await client.query('commit');
    if (returnsSet.get(fn)) return rows;
    const row = rows[0] ?? null;
    return row && Object.keys(row).length === 1 && fn in row ? row[fn] : row;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') return send(res, 204);
    try {
      if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
        const b = await readBody(req);
        if (!b.email || String(b.password ?? '').length < 6) return send(res, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
        if ((await sql('select 1 from auth.users where email = $1', [b.email])).length) return send(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
        const u = (await sql('insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning *', [b.email, hash(b.password), b.data ?? {}]))[0];
        return send(res, 200, session(u));
      }
      if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
        const b = await readBody(req);
        const u = url.searchParams.get('grant_type') === 'refresh_token'
          ? (await sql('select * from auth.users where id::text = $1', [String(b.refresh_token ?? '').replace(/^dev-/, '')]))[0]
          : (await sql('select * from auth.users where email = $1 and encrypted_password = $2', [b.email, hash(String(b.password ?? ''))]))[0];
        return u ? send(res, 200, session(u)) : send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      }
      if (url.pathname === '/auth/v1/user') {
        const u = (await sql('select * from auth.users where id::text = $1', [subject(req) ?? '']))[0];
        return u ? send(res, 200, userJson(u)) : send(res, 401, { code: 401, msg: 'invalid token' });
      }
      if (url.pathname === '/auth/v1/logout') return send(res, 204);
      if (url.pathname.startsWith('/rest/v1/rpc/') && req.method === 'POST') {
        try {
          return send(res, 200, await rpc(url.pathname.slice('/rest/v1/rpc/'.length), await readBody(req), subject(req)));
        } catch (e) {
          const status = e.code === '42501' ? 403 : e.code === 'PGRST202' ? 404 : 400;
          return send(res, status, { code: e.code ?? 'XX000', message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
        }
      }
      if (staticDir) {
        let file = path.join(staticDir, decodeURIComponent(url.pathname));
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(staticDir, 'index.html');
        res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
      send(res, 404, { message: 'not found' });
    } catch (e) {
      send(res, 500, { message: e.message });
    }
  })
  .listen(port, () => console.log(`MATCH.IQ local dev backend on http://localhost:${port} (not Supabase, not for production)`));
