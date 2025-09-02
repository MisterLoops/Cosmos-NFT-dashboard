// netlify/functions/skip-proxy.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Remove the Netlify function prefix and original Skip base
    const skipApiPath = event.path.replace(/^.*skip-proxy/, '');
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';

    const skipApiUrl = `https://go.skip.build/api/skip${skipApiPath}${queryString}`;
    console.log('Proxying to:', skipApiUrl);

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(skipApiUrl, {
      method: event.httpMethod,
      headers: {
        ...(event.headers.authorization && { Authorization: event.headers.authorization }),
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : event.body,
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: responseText,
    };
  } catch (err) {
    console.error('Skip proxy error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Proxy request failed', message: err.message }),
    };
  }
};
