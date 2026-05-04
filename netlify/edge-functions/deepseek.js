export default async (request, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = request.headers.get('authorization') || ''
    const body = await request.json()
    
    // Stream from DeepSeek and pipe directly to client
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
      return new Response(err, { status: response.status, headers: corsHeaders })
    }

    // Pipe the stream directly — no buffering, no timeout
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}
