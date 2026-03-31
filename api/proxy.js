module.exports = async function(req, res) {
  const path = req.url.replace(/^\/api\//, '');
  const url = `https://escolares-backend.onrender.com/api/${path}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  // Pass authorization header
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  // Pass DolarVzla API key header
  if (req.headers['x-dolarvzla-key']) headers['x-dolarvzla-key'] = req.headers['x-dolarvzla-key'];
  // Pass cookies for session management
  if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;
  // Pass origin for CORS
  if (req.headers.origin) headers['Origin'] = req.headers.origin;
  if (req.headers.referer) headers['Referer'] = req.headers.referer;

  try {
    const fetchOptions = {
      method: req.method || 'GET',
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    
    // Pass Set-Cookie headers back to client
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
