const express = require('express')
const bcrypt = require('bcryptjs')
const UserStore = require('./UserStore')
const { generateToken } = require('./authUtils')
const { requireAuth } = require('./authMiddleware')

const authRouter = express.Router()

authRouter.post('/register', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  if (UserStore.hasUser(username)) {
    return res.status(400).json({ error: 'Username is already registered' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  UserStore.addUser(username, passwordHash)
  const token = generateToken({ username })

  res.json({ username, token })
})

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const user = UserStore.getUser(username)
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = generateToken({ username: user.username })
  res.json({ username: user.username, token })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username })
})

module.exports = authRouter

