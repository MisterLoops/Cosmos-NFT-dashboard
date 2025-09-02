// netlify/functions/skip-proxy.js
// This handles ALL Skip API requests securely through your own Netlify function

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  const headers = {
    'Access-Control-Allow-Origin': '*', // You can restrict this to your domain
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Extract the Skip API path from the request
    // URL format: /.netlify/functions/skip-proxy/v2/info/chains
    const functionPath = '/.netlify/functions/skip-proxy';
    const skipApiPath = event.path.replace(functionPath, '') || '';
    const queryString = event.rawQuery ? `?${event.rawQuery}` : '';
    
    // Construct the full Skip API URL
    const skipApiUrl = `https://go.skip.build/api/skip${skipApiPath}${queryString}`;
    
    console.log('Proxying request to:', skipApiUrl);

    // Prepare request options
    const requestOptions = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'YourApp-Netlify-Proxy/1.0',
        // Forward any authorization headers from the original request
        ...(event.headers.authorization && {
          'Authorization': event.headers.authorization
        })
      }
    };

    // Add body for POST, PUT requests
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body) {
      requestOptions.body = event.body;
    }

    // Make the request to Skip API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(skipApiUrl, requestOptions);
    
    // Get response data
    const responseText = await response.text();
    
    // Return the response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
      body: responseText
    };

  } catch (error) {
    console.error('Skip API proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Proxy request failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};