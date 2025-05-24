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

// room information
const rooms = new Map()

io.on("connection", (socket) => {
    console.log('New web socket connection!')

    socket.on('joinRoom', (roomId, callback) => {
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                gameStarted: false,
                restartVotes: new Set(),
                lastStarter: 'O'
            })
        }

        const room = rooms.get(roomId)

        // Check if room is full
        if (room.players.length >= 2) {
            if (callback) callback('Room is full')
            return
        }

        if (room.gameStarted) {
            if (callback) callback('Game has already started')
            return
        }

        // assign role 
        const role = room.players.length === 0 ? 'X' : 'O'
        room.players.push({ socketId: socket.id, role })
        
        // Join the room
        socket.join(roomId)
        socket.emit('playersRole', { role })

        // start the game
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
    // restart the game
    socket.on('startGame', ({ firstTurn }) => {
        currentRole = firstTurn
        restartGame()
    })
    
    socket.on('restartRequest', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) return;
    
        room.restartVotes.add(socket.id);
        
        // When both players click "Play Again"
        if (room.restartVotes.size === 2) {
            room.restartVotes.clear(); // Reset for next time
            room.gameStarted = true;
            
            const nextStarter = room.lastStarter === 'X' ? 'O' : 'X';
            room.lastStarter = nextStarter;
            io.to(roomId).emit('restartGame', { firstTurn: nextStarter });
        }
    });
    

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