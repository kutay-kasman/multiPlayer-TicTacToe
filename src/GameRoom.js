class GameRoom {
    constructor(roomId, roomName = null, gameType = 'tic-tac-toe') {
        this.roomId = roomId;
        this.roomName = roomName || `Room ${roomId}`;
        this.players = [];
        this.spectators = [];
        this.gameType = gameType;
        this.restartVotes = new Set();
        this.rpsChoices = {};
        this.rpsRound = 1;
        this.memoryState = null;
        this.gameState = {};
        this.resetGameState();
        this.createdAt = new Date();
    }

    setGameType(type) {
        this.gameType = type || 'tic-tac-toe';
        this.resetGameState();
    }

    resetGameState() {
        this.gameState = {
            board: Array(9).fill(''),
            currentPlayer: 'X',
            gameStatus: 'waiting',
            winner: null,
            lastStarter: 'X'
        };
        this.resetRpsChoices();
        if (this.gameType === 'memory-match') {
            this.initMemoryState();
        } else {
            this.memoryState = null;
        }
    }

    resetRpsChoices() {
        this.rpsChoices = {};
    }

    addPlayer(socketId, username) {
        if (this.players.length >= 2) {
            return { success: false, error: 'Room is full' };
        }

        if (this.gameState.gameStatus === 'in-progress') {
            return { success: false, error: 'Game has already started' };
        }

        const role = this.players.length === 0 ? 'X' : 'O';
        const player = { socketId, username, role };
        this.players.push(player);

        if (this.players.length === 2) {
            this.gameState.gameStatus = 'in-progress';
            if (this.gameType === 'tic-tac-toe') {
                this.gameState.currentPlayer = 'X';
            } else if (this.gameType === 'rock-paper-scissors') {
                this.resetRpsChoices();
            } else if (this.gameType === 'memory-match') {
                this.initMemoryState();
            }
        }

        return { success: true, player };
    }

    addSpectator(socketId, username) {
        const spectator = { socketId, username };
        this.spectators.push(spectator);
        return { success: true, spectator };
    }

    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            this.players.splice(playerIndex, 1);
            if (this.gameState.gameStatus === 'in-progress') {
                this.resetGame();
                this.gameState.gameStatus = 'waiting';
            }
            return { type: 'player', removed: true };
        }

        const spectatorIndex = this.spectators.findIndex(s => s.socketId === socketId);
        if (spectatorIndex !== -1) {
            this.spectators.splice(spectatorIndex, 1);
            return { type: 'spectator', removed: true };
        }

        return { removed: false };
    }

    makeMove(cellId, move, socketId) {
        if (this.gameType !== 'tic-tac-toe') {
            return { success: false, error: 'Room is not running Tic Tac Toe' };
        }

        if (this.gameState.gameStatus !== 'in-progress') {
            return { success: false, error: 'Game is not in progress' };
        }

        if (this.gameState.board[cellId] !== '') {
            return { success: false, error: 'Cell already occupied' };
        }

        const player = this.players.find(p => p.socketId === socketId);
        if (!player || player.role !== move) {
            return { success: false, error: 'Invalid move' };
        }

        if (move !== this.gameState.currentPlayer) {
            return { success: false, error: 'Not your turn' };
        }

        this.gameState.board[cellId] = move;
        const result = this.checkWin();
        if (result.winner) {
            this.gameState.gameStatus = 'finished';
            this.gameState.winner = result.winner;
            return { success: true, move, gameOver: true, winner: result.winner };
        } else if (result.draw) {
            this.gameState.gameStatus = 'finished';
            this.gameState.winner = 'draw';
            return { success: true, move, gameOver: true, winner: 'draw' };
        }

        this.gameState.currentPlayer = this.gameState.currentPlayer === 'X' ? 'O' : 'X';
        return { success: true, move, gameOver: false };
    }

    submitRpsChoice(socketId, choice) {
        if (this.gameType !== 'rock-paper-scissors') {
            return { error: 'Room is not running Rock Paper Scissors' };
        }

        const player = this.players.find(p => p.socketId === socketId);
        if (!player) {
            return { error: 'Player not found in room' };
        }

        this.rpsChoices[player.role] = choice;
        if (Object.keys(this.rpsChoices).length < 2) {
            return { waiting: true, choices: { ...this.rpsChoices } };
        }

        const choiceX = this.rpsChoices['X'];
        const choiceO = this.rpsChoices['O'];
        const winnerRole = this.evaluateRpsWinner(choiceX, choiceO);
        const winnerPlayer = this.players.find(p => p.role === winnerRole);
        const winnerUsername = winnerRole === 'draw' ? null : winnerPlayer?.username || null;

        this.resetRpsChoices();
        const round = this.rpsRound;
        this.rpsRound += 1;

        this.gameState.winner = winnerRole;

        return {
            choices: { X: choiceX, O: choiceO },
            winnerRole,
            winnerUsername,
            round
        };
    }

    initMemoryState() {
        const pairs = ['🍎','🍌','🍒','🥝','🍇','🍋'];
        const deck = [...pairs, ...pairs];
        for (let i = deck.length -1; i>0; i--) {
            const j = Math.floor(Math.random()* (i+1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        this.memoryState = {
            cards: deck.map((value,index) => ({
                id: index,
                value,
                revealed: false,
                matched: false
            })),
            turnRole: 'X',
            flipped: [],
            matches: { X:0, O:0 }
        };
        this.gameState.board = Array(deck.length).fill('');
        this.gameState.gameStatus = 'waiting';
    }

    flipMemoryCard(socketId, cardId) {
        if (this.gameType !== 'memory-match') {
            return { error: 'Wrong game' };
        }
        const player = this.players.find(p => p.socketId === socketId);
        if (!player) {
            return { error: 'Player not in room' };
        }
        if (this.memoryState.gameStatus === 'finished') {
            return { error: 'Game finished' };
        }
        const card = this.memoryState.cards[cardId];
        if (!card || card.revealed || card.matched) {
            return { invalid: true };
        }
        card.revealed = true;
        this.memoryState.flipped.push(card);
        if (this.memoryState.flipped.length === 2) {
            const [first, second] = this.memoryState.flipped;
            if (first.value === second.value) {
                first.matched = true;
                second.matched = true;
                this.memoryState.matches[player.role] +=1;
                this.memoryState.flipped = [];
                const totalMatches = this.memoryState.matches.X + this.memoryState.matches.O;
                if (totalMatches === this.memoryState.cards.length/2) {
                    this.gameState.gameStatus = 'finished';
                    const winnerRole = this.memoryState.matches.X === this.memoryState.matches.O
                        ? 'draw'
                        : this.memoryState.matches.X > this.memoryState.matches.O ? 'X' : 'O';
                    this.gameState.winner = winnerRole;
                    return { match: true, winnerRole };
                }
                return { match: true };
            }
            this.memoryState.gameStatus = 'in-progress';
            const pending = [first.id, second.id];
            this.memoryState.flipped = [];
            this.memoryState.turnRole = this.memoryState.turnRole === 'X' ? 'O' : 'X';
            return { flip: true, pendingCards: pending, turnRole: this.memoryState.turnRole };
        }
        return { flip: true };
    }

    hideMemoryCards(cardIds) {
        if (!this.memoryState) return;
        cardIds.forEach(id => {
            const card = this.memoryState.cards.find(c => c.id === id);
            if (card && !card.matched) {
                card.revealed = false;
            }
        });
    }

    evaluateRpsWinner(choiceX, choiceO) {
        if (choiceX === choiceO) {
            return 'draw';
        }
        const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
        if (beats[choiceX] === choiceO) {
            return 'X';
        }
        return 'O';
    }

    checkWin() {
        if (this.gameType !== 'tic-tac-toe') {
            return {};
        }

        const board = this.gameState.board;
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let [a, b, c] of winPatterns) {
            if (board[a] && board[a] === board[b] && board[b] === board[c]) {
                return { winner: board[a] };
            }
        }

        if (board.every(cell => cell !== '')) {
            return { draw: true };
        }

        return {};
    }

    requestRestart(socketId) {
        if (this.gameState.gameStatus !== 'finished') {
            return { success: false, error: 'Game is not finished' };
        }

        this.restartVotes.add(socketId);
        if (this.restartVotes.size === 2) {
            this.resetGame();
            this.restartVotes.clear();
            this.gameState.gameStatus = 'in-progress';
            this.gameState.lastStarter = this.gameState.lastStarter === 'X' ? 'O' : 'X';
            this.gameState.currentPlayer = this.gameState.lastStarter;
            return { success: true, restart: true, firstTurn: this.gameState.lastStarter };
        }
        return { success: true, restart: false };
    }

    resetGame() {
        this.gameState.board = Array(9).fill('');
        this.gameState.currentPlayer = 'X';
        this.gameState.winner = null;
        this.restartVotes.clear();
        this.resetRpsChoices();
    }

    getRoomInfo() {
        return {
            roomId: this.roomId,
            roomName: this.roomName,
            playerCount: this.players.length,
            spectatorCount: this.spectators.length,
            gameStatus: this.gameState.gameStatus,
            gameType: this.gameType,
            players: this.players.map(p => ({ username: p.username, role: p.role })),
            spectators: this.spectators.map(s => ({ username: s.username }))
        };
    }

    getGameState() {
        return {
            ...this.gameState,
            gameType: this.gameType,
            players: this.players.map(p => ({ username: p.username, role: p.role }))
            ,
            memoryState: this.memoryState ? {
                cards: this.memoryState.cards.map(card => ({
                    id: card.id,
                    value: card.value,
                    revealed: card.revealed,
                    matched: card.matched
                })),
                matches: this.memoryState.matches,
                turnRole: this.memoryState.turnRole,
                gameStatus: this.memoryState.gameStatus
            } : null
        };
    }

    isPlayer(socketId) {
        return this.players.some(p => p.socketId === socketId);
    }

    isSpectator(socketId) {
        return this.spectators.some(s => s.socketId === socketId);
    }

    isEmpty() {
        return this.players.length === 0 && this.spectators.length === 0;
    }
}

module.exports = GameRoom;


