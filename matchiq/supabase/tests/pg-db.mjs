const JSONB_ARGS = new Set(['p', 'p_default', 'p_meta']);

/** The jobs' `Db` interface on top of node-postgres (Edge Functions use supabase-js instead). */
export function pgDb(sql) {
  return {
    async rpc(fn, args = {}) {
      const keys = Object.keys(args);
      const call = keys.map((k, i) => `${k} => $${i + 1}${JSONB_ARGS.has(k) ? '::jsonb' : ''}`).join(', ');
      const rows = await sql(`select * from ${fn}(${call})`, keys.map((k) => (JSONB_ARGS.has(k) ? JSON.stringify(args[k]) : args[k])));
      return rows.length === 1 && Object.keys(rows[0]).length === 1 && fn in rows[0] ? rows[0][fn] : rows;
    },
  };
}
