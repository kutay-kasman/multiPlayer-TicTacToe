const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, "../public")
app.use(express.static(publicDirPath))
app.use(express.json());

// Store room information
const rooms = new Map()

io.on("connection", (socket) => {
    console.log('New web socket connection!')

    socket.on('joinRoom', (roomId, callback) => {
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameStarted: false
            })
        }

        const room = rooms.get(roomId)

        // Check if room is full
        if (room.players.length >= 2) {
            if (callback) callback('Room is full')
            return
        }

        // Check if game has already started
        if (room.gameStarted) {
            if (callback) callback('Game has already started')
            return
        }

        // Assign role based on room state
        const role = room.players.length === 0 ? 'X' : 'O'
        room.players.push({ socketId: socket.id, role })
        
        // Join the room
        socket.join(roomId)
        socket.emit('playersRole', { role })

        // If room is full, start the game
        if (room.players.length === 2) {
            room.gameStarted = true
            const firstTurn = 'X'
            io.to(roomId).emit('startGame', { firstTurn })
        }

        if (callback) callback(null)
    })

    socket.on('makeMove', ({roomId, cellId, move}) => {
        socket.to(roomId).emit('opponentMove', {cellId, move})
    })

    socket.on('game-over', (roomId, winner) => {
        io.to(roomId).emit('result', winner)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        // Find and remove player from their room
        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id)
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1)
                if (room.players.length === 0) {
                    rooms.delete(roomId)
                } else {
                    io.to(roomId).emit('playerDisconnected')
                }
                break
            }
        }
    })
})

server.listen(port, () => {
    console.log("Server is up on " + port)
})