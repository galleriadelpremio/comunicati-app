import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(express.json())

// Serve il frontend React compilato
app.use(express.static(join(__dirname, 'dist')))

// Proxy verso l'API Anthropic — la chiave non esce mai dal server
app.post('/api/genera', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Chiave API non configurata sul server.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: `Errore del server: ${err.message}` })
  }
})

// Tutte le altre route → React (sintassi Express 5)
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Erikator in ascolto sulla porta ${PORT}`)
})
