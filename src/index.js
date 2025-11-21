const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const SocketHandlers = require("./socketHandlers")
const authRoutes = require("./auth/authRoutes")
const { requireAuth } = require("./auth/authMiddleware")
const { verifyToken } = require("./auth/authUtils")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, "../public")
app.use(express.static(publicDirPath))
app.use(express.json());
app.use("/api/auth", authRoutes)

// Initialize socket handlers
const socketHandlers = new SocketHandlers(io)

io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
        return next(new Error("Authentication error"))
    }

    try {
        const payload = verifyToken(token)
        socket.user = payload
        next()
    } catch (err) {
        next(new Error("Authentication error"))
    }
})

// Handle socket connections
io.on("connection", (socket) => {
    socketHandlers.handleConnection(socket)
})

// API endpoint for scoreboard (protected)
app.get('/api/scoreboard', requireAuth, (req, res) => {
    const scoreboardData = socketHandlers.getScoreboardData()
    res.json(scoreboardData)
})

// Profile route for front-end
app.get('/api/profile', requireAuth, (req, res) => {
    res.json({ username: req.user.username })
})

server.listen(port, () => {
    console.log("Server is up on " + port)
})