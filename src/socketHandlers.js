const GameRoom = require('./GameRoom');
const Scoreboard = require('./Scoreboard');

class SocketHandlers {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.scoreboard = new Scoreboard();
        this.socketToRoom = new Map(); // Track which room a socket is in
        this.onlineUsers = new Map();
        this.lobbyMessages = [];
        this.maxLobbyMessages = 120;
    }

    handleConnection(socket) {
        console.log('New web socket connection!');

        // Clean up any stale references for this socket ID
        this.cleanupSocket(socket.id);
        this.registerOnlineUser(socket);

        socket.on('getRooms', () => {
            const roomsList = Array.from(this.rooms.values()).map(room => room.getRoomInfo());
            socket.emit('roomsList', roomsList);
        });

        socket.on('lobbyChatMessage', ({ message }) => {
            const username = socket.user?.username;
            if (!username || !message || !message.trim()) return;
            const chatMessage = {
                username,
                message: message.trim(),
                timestamp: Date.now()
            };
            this.lobbyMessages.push(chatMessage);
            if (this.lobbyMessages.length > this.maxLobbyMessages) {
                this.lobbyMessages.shift();
            }
            this.io.emit('lobbyMessage', chatMessage);
        });

        socket.on('roomChatMessage', ({ roomId, message }) => {
            const username = socket.user?.username;
            if (!username || !message || !roomId) return;
            const chatMessage = {
                roomId,
                username,
                message: message.trim(),
                timestamp: Date.now()
            };
            this.io.to(roomId).emit('roomMessage', chatMessage);
        });

        socket.on('memoryFlip', ({ roomId, cardId }) => {
            const room = this.rooms.get(roomId);
            if (!room || room.gameType !== 'memory-match') return;
            const result = room.flipMemoryCard(socket.id, cardId);
            this.broadcastGameState(roomId);
            this.io.to(roomId).emit('memoryResult', {
                roomId,
                result
            });
            if (result && result.winnerRole) {
                this.scoreboard.recordGameResult(result.winnerRole, room.players);
            }
            if (result && result.pendingCards) {
                setTimeout(() => {
                    room.hideMemoryCards(result.pendingCards);
                    this.broadcastGameState(roomId);
                }, 1200);
            }
        });

        socket.on('createRoom', (data) => {
            const username = socket.user?.username;
            if (!username) {
                socket.emit('error', 'Authentication failed');
                return;
            }

            const roomId = data.roomId || this.generateRoomId();
            const roomName = data.roomName || `Room ${roomId}`;
            const gameType = data.gameType || 'tic-tac-toe';

            if (this.rooms.has(roomId)) {
                socket.emit('error', 'Room already exists');
                return;
            }

            const room = new GameRoom(roomId, roomName, gameType);
            const result = room.addPlayer(socket.id, username);

            if (result.success) {
                this.rooms.set(roomId, room);
                this.socketToRoom.set(socket.id, roomId);
                socket.join(roomId);
                socket.emit('roomCreated', { roomId, player: result.player, gameType: room.gameType });
                this.broadcastRoomsList();
            } else {
                socket.emit('error', result.error);
            }
        });

        socket.on('joinRoom', (data, callback) => {
            const username = socket.user?.username;
            if (!username) {
                if (callback) callback('Authentication failed');
                return;
            }

            const { roomId, asSpectator = false } = data;

            if (!this.rooms.has(roomId)) {
                if (callback) callback('Room does not exist');
                return;
            }

            const room = this.rooms.get(roomId);
            
            console.log(`User ${username} trying to join room ${roomId} as ${asSpectator ? 'spectator' : 'player'}`);
            console.log(`Room has ${room.players.length} players and ${room.spectators.length} spectators`);
            console.log(`Game status: ${room.gameState.gameStatus}`);
            
            // Check if user is already in this room
            const existingPlayer = room.players.find(p => p.socketId === socket.id);
            const existingSpectator = room.spectators.find(s => s.socketId === socket.id);
            
            if (existingPlayer || existingSpectator) {
                if (callback) callback('You are already in this room');
                return;
            }

            // Check room availability BEFORE joining
            if (!asSpectator) {
                if (room.players.length >= 2) {
                    if (callback) callback('Room is full');
                    return;
                }
                if (room.gameState.gameStatus === 'in-progress') {
                    if (callback) callback('Game has already started');
                    return;
                }
            }

            // Now join the room
            this.socketToRoom.set(socket.id, roomId);
            socket.join(roomId);

            if (asSpectator) {
                const result = room.addSpectator(socket.id, username);
                if (result.success) {
                    socket.emit('joinedAsSpectator', { room: room.getRoomInfo(), gameType: room.gameType });
                    this.broadcastGameState(roomId);
                    this.broadcastRoomsList();
                } else {
                    // This shouldn't happen since we checked above, but just in case
                    socket.leave(roomId);
                    this.socketToRoom.delete(socket.id);
                    if (callback) callback(result.error);
                    return;
                }
            } else {
                const result = room.addPlayer(socket.id, username);
                if (result.success) {
                    socket.emit('playersRole', { 
                        role: result.player.role,
                        players: room.players.map(p => ({ username: p.username, role: p.role })),
                        gameType: room.gameType
                    });
                    
                    if (room.players.length === 2) {
                        room.gameState.gameStatus = 'in-progress';
                        room.gameState.currentPlayer = 'X';
                        this.io.to(roomId).emit('startGame', { 
                            firstTurn: 'X',
                            players: room.players.map(p => ({ username: p.username, role: p.role })),
                            gameType: room.gameType
                        });
                    }
                    
                    this.broadcastGameState(roomId);
                    this.broadcastRoomsList();
                } else {
                    // This shouldn't happen since we checked above, but just in case
                    socket.leave(roomId);
                    this.socketToRoom.delete(socket.id);
                    if (callback) callback(result.error);
                    return;
                }
            }

            if (callback) callback(null);
        });

        socket.on('makeMove', ({ roomId, cellId, move }) => {
            const room = this.rooms.get(roomId);
            if (!room || room.gameType !== 'tic-tac-toe') return;

            const result = room.makeMove(cellId, move, socket.id);
            
            if (result.success) {
                this.broadcastGameState(roomId);
                if (result.gameOver) {
                    this.scoreboard.recordGameResult(result.winner, room.players);
                    this.broadcastRoomsList();
                }
            } else {
                socket.emit('moveError', result.error);
            }
        });

        socket.on('rpsChoice', ({ roomId, choice }) => {
            const room = this.rooms.get(roomId);
            if (!room || room.gameType !== 'rock-paper-scissors') return;
            const result = room.submitRpsChoice(socket.id, choice);
            if (result.error) {
                socket.emit('moveError', result.error);
                return;
            }
            if (result.waiting) {
                socket.emit('rpsStatus', { waiting: true });
                return;
            }
            this.io.to(roomId).emit('rpsResult', result);
            this.scoreboard.recordGameResult(result.winnerRole, room.players);
        });

        socket.on('restartRequest', (roomId) => {
            const room = this.rooms.get(roomId);
            if (!room) return;

            const result = room.requestRestart(socket.id);
            
            if (result.success && result.restart) {
                this.io.to(roomId).emit('restartGame', { 
                    firstTurn: result.firstTurn,
                    players: room.players.map(p => ({ username: p.username, role: p.role })),
                    gameType: room.gameType
                });
                this.broadcastGameState(roomId);
                this.broadcastRoomsList();
            }
        });

        socket.on('getScoreboard', () => {
            const topPlayers = this.scoreboard.getTopPlayers(20);
            socket.emit('scoreboardData', topPlayers);
        });

        socket.on('disconnect', () => {
            const roomId = this.socketToRoom.get(socket.id);
            const username = socket.user?.username;

            if (roomId && this.rooms.has(roomId)) {
                const room = this.rooms.get(roomId);
                const result = room.removePlayer(socket.id);

                if (result.removed) {
                    if (result.type === 'player' && room.players.length === 1) {
                        // Notify remaining player about disconnection
                        this.io.to(roomId).emit('playerDisconnected', { 
                            username,
                            remainingPlayers: room.players.length 
                        });
                    }

                    // If room is empty, remove it
                    if (room.isEmpty()) {
                        this.rooms.delete(roomId);
                    } else {
                        this.broadcastGameState(roomId);
                    }

                    this.broadcastRoomsList();
                }
            }

            this.socketToRoom.delete(socket.id);
            this.onlineUsers.delete(socket.id);
            this.broadcastLobbyUpdate();
        });
    }

    broadcastGameState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const gameState = room.getGameState();
        this.io.to(roomId).emit('gameStateUpdate', gameState);
    }

    broadcastRoomsList() {
        const roomsList = Array.from(this.rooms.values()).map(room => room.getRoomInfo());
        this.io.emit('roomsList', roomsList);
        this.broadcastLobbyUpdate();
    }

    broadcastLobbyUpdate() {
        this.io.emit('lobbyUpdate', this.getLobbyState());
    }

    getLobbyState() {
        const rooms = Array.from(this.rooms.values()).map(room => room.getRoomInfo());
        const users = Array.from(this.onlineUsers.values());
        return { rooms, users };
    }

    generateRoomId() {
        return Math.floor(100000 + Math.random() * 900000);
    }

    getScoreboardData() {
        return this.scoreboard.getTopPlayers(20);
    }

    cleanupSocket(socketId) {
        // Remove from any rooms
        const roomId = this.socketToRoom.get(socketId);
        if (roomId && this.rooms.has(roomId)) {
            const room = this.rooms.get(roomId);
            room.removePlayer(socketId);
            
            if (room.isEmpty()) {
                this.rooms.delete(roomId);
            } else {
                this.broadcastGameState(roomId);
            }
        }

        // Clean up mappings
        this.socketToRoom.delete(socketId);
        this.onlineUsers.delete(socketId);
        
        // Broadcast updated room list
        this.broadcastRoomsList();
    }

    registerOnlineUser(socket) {
        const username = socket.user?.username;
        if (!username) return;
        this.onlineUsers.set(socket.id, username);
        socket.emit('lobbyMessages', this.lobbyMessages);
        this.broadcastLobbyUpdate();
    }
}

module.exports = SocketHandlers;
