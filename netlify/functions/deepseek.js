export default async (request, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  try {
    const authHeader = request.headers.get('authorization') || ''
    const body = await request.json()
    body.stream = false

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
      return new Response(err, { status: response.status, headers })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    return new Response(
      JSON.stringify({ content: [{ type: 'text', text }] }),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    )
  }
}
