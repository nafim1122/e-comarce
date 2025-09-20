const express = require('express')
const app = express()
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  if(email === 'admin@example.com' && password === 'admin123'){
    // send a minimal cookie simulation
    res.cookie('token', 'dev-token', { httpOnly: true })
    return res.json({ email })
  }
  res.status(401).json({ message: 'Invalid' })
})

app.get('/api/me', (req, res) => {
  const token = req.cookies && req.cookies.token
  if(token) return res.json({ user: { email: 'admin@example.com' } })
  res.status(401).json({})
})

app.listen(5000, () => console.log('dev server listening on 5000'))
