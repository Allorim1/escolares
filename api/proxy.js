module.exports = async function(req, res) {
  const path = req.url.replace(/^\/api\//, '');
  const url = `https://escolares-backend.onrender.com/api/${path}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  if (req.headers['x-dolarvzla-key']) headers['x-dolarvzla-key'] = req.headers['x-dolarvzla-key'];

  try {
    const fetchOptions = {
      method: req.method || 'GET',
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
