const fs = require('fs')
const path = require('path')

class UserStore {
  constructor() {
    this.filePath = path.join(__dirname, 'users.json')
    this.users = this.loadUsers()
  }

  loadUsers() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8')
        return JSON.parse(raw)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
    return {}
  }

  saveUsers() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2))
    } catch (error) {
      console.error('Failed to save users:', error)
    }
  }

  addUser(username, passwordHash) {
    const key = username.toLowerCase()
    this.users[key] = {
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    }
    this.saveUsers()
  }

  hasUser(username) {
    return Boolean(this.users[username.toLowerCase()])
  }

  getUser(username) {
    return this.users[username.toLowerCase()] || null
  }
}

module.exports = new UserStore()

