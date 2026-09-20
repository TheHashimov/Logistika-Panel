const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b/';
const MASTER_KEY   = process.env.JSONBIN_MASTER_KEY;
const BIN_ID       = process.env.JSONBIN_BIN_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  /* ───── GET — hər kəs oxuya bilər ───── */
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${JSONBIN_BASE}${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY }
      });
      if (!r.ok) return res.status(500).json({ error: 'Baza oxunmadı' });
      const data = await r.json();
      const record = data.record || {};
      return res.json({ companies: record.trackingCompanies || [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ───── PUT — yalnız admin ───── */
  if (req.method === 'PUT') {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Token yoxdur' });

    const { companies } = req.body || {};
    if (!Array.isArray(companies)) return res.status(400).json({ error: 'Format yanlışdır' });

    try {
      const r = await fetch(`${JSONBIN_BASE}${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY }
      });
      const data = await r.json();
      const record = data.record || {};
      record.trackingCompanies = companies;

      const saveResp = await fetch(`${JSONBIN_BASE}${BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
        body: JSON.stringify(record)
      });
      if (!saveResp.ok) return res.status(500).json({ error: 'Yazma alınmadı' });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'method' });
}
