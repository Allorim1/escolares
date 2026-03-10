export default async function handler(req: any, res: any) {
  const path = req.url?.replace('/api/', '') || '';
  const url = `https://escolares-backend.onrender.com/api/${path}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if (req.headers['x-dolarvzla-key']) {
      headers['x-dolarvzla-key'] = req.headers['x-dolarvzla-key'] as string;
    }

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Proxy error' });
  }
}
