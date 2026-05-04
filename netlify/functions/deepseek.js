exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || ''
    const body = JSON.parse(event.body)
    body.stream = false  // Non-streaming to get full response

    // Use background function approach - just proxy directly
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000) // 55s timeout

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.text()
      return { statusCode: response.status, headers, body: err }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    // Return in Claude format so app parser works
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text }]
      })
    }
  } catch (error) {
    const isTimeout = error.name === 'AbortError'
    return {
      statusCode: isTimeout ? 504 : 500,
      headers,
      body: JSON.stringify({ 
        error: isTimeout ? 'DeepSeek took too long. Try again - it varies.' : error.message 
      })
    }
  }
}
