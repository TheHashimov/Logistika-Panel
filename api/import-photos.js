const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b/';
const MASTER_KEY   = process.env.JSONBIN_MASTER_KEY;
const BIN_ID       = process.env.JSONBIN_BIN_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { vin, photos } = req.body || {};

  if (!vin || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'vin və photos tələb olunur' });
  }

  try {
    const r = await fetch(`${JSONBIN_BASE}${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY }
    });
    if (!r.ok) return res.status(500).json({ error: 'Baza oxunmadı' });

    const data = await r.json();
    const record = data.record || {};
    const cars = Array.isArray(record) ? record : (record.cars || []);

    const carIndex = cars.findIndex(c =>
      c.vin && c.vin.trim().toUpperCase() === vin.trim().toUpperCase()
    );

    if (carIndex === -1) {
      return res.status(404).json({
        error: 'VIN tapılmadı',
        vin: vin,
        hint: 'Bu maşın admin paneldə əlavə olunmayıb'
      });
    }

    const car = cars[carIndex];
    if (!car.photos) car.photos = {
      auction: { images: [], videos: [] },
      pikap: { images: [], videos: [] },
      anbar: { images: [], videos: [] },
      poti:  { images: [], videos: [] }
    };
    if (!car.photos.auction) car.photos.auction = { images: [], videos: [] };
    if (!car.photos.auction.images) car.photos.auction.images = [];

    const existingUrls = new Set(
      car.photos.auction.images.map(p => typeof p === 'string' ? p : p.url)
    );

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;

    let added = 0;
    for (const photo of photos) {
      const url = typeof photo === 'string' ? photo : photo.url;
      const publicId = typeof photo === 'object' ? photo.publicId : null;

      if (!url || existingUrls.has(url)) continue;

      car.photos.auction.images.push({
        url: url,
        thumb: url.replace('/image/upload/', '/image/upload/w_400/'),
        publicId: publicId || '',
        resourceType: 'image',
        mediaType: 'image',
        duration: null,
        date: dateStr
      });
      added++;
    }

    if (added === 0) {
      return res.json({
        ok: true,
        added: 0,
        total: car.photos.auction.images.length,
        message: 'Şəkillər artıq mövcuddur',
        car: { model: car.model, owner: car.owner, vin: car.vin }
      });
    }

    const updatedRecord = Array.isArray(record) ? cars : { ...record, cars };

    const saveResp = await fetch(`${JSONBIN_BASE}${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
      body: JSON.stringify(updatedRecord)
    });

    if (!saveResp.ok) {
      return res.status(500).json({ error: 'Bazaya yazıla bilmədi' });
    }

    return res.json({
      ok: true,
      added: added,
      total: car.photos.auction.images.length,
      car: { model: car.model, owner: car.owner, vin: car.vin }
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
