const { Readable } = require('stream')

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

    // Use streaming to avoid timeout
    body.stream = true

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const err = await response.text()
      return { statusCode: response.status, headers, body: err }
    }

    // Collect all chunks and return as one response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      accumulated += chunk
      
      // Parse SSE chunks to extract text
      for (const line of accumulated.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6))
            const delta = data.choices?.[0]?.delta?.content
            if (delta) fullText += delta
          } catch {}
        }
      }
      // Keep only unparsed remainder
      const lines = accumulated.split('\n')
      accumulated = lines[lines.length - 1]
    }

    // Return as a proper non-streaming response
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: [{ type: 'text', text: fullText }]
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
