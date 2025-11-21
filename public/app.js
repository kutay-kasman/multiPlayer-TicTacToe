class TicTacToeApp {
    constructor() {
        this.token = localStorage.getItem('tictactoe_token');
        this.currentUser = localStorage.getItem('tictactoe_username');
        this.currentRoom = null;
        this.currentView = 'auth';
        this.rooms = [];
        this.lobbyUsers = [];
        this.lobbyMessages = [];
        this.roomMessages = [];
        this.gameState = null;
        this.myRole = null;
        this.isSpectator = false;
        this.socket = null;
        this.currentGameType = 'tic-tac-toe';
        this.rpsResult = null;
        this.rpsChoiceSent = false;
        this.ticTacToeGridInitialized = false;
        this.selectedLobbyGameType = 'tic-tac-toe';
        this.gameCards = [];
        this.cardActionButtons = [];

        this.bindDomElements();
        this.setCurrentGameType(this.currentGameType);
        this.setupEventListeners();
        this.checkStoredToken();
    }

    bindDomElements() {
        this.navContainer = document.getElementById('nav-container');
        this.lobbyNavBtn = document.getElementById('lobby-nav-btn');
        this.scoreboardNavBtn = document.getElementById('scoreboard-nav-btn');
        this.logoutBtn = document.getElementById('logout-btn');

        this.authContainer = document.getElementById('auth-container');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.authMessage = document.getElementById('auth-message');
        this.authTabs = document.querySelectorAll('.auth-tab');

        this.lobbyContainer = document.getElementById('lobby-container');
        this.roomNameInput = document.getElementById('room-name-input');
        this.scoreboardBtn = document.getElementById('scoreboard-btn');
        this.roomsList = document.getElementById('rooms-list');
        this.lobbyUsersList = document.getElementById('lobby-users');
        this.lobbyChatList = document.getElementById('lobby-chat-list');
        this.lobbyChatForm = document.getElementById('lobby-chat-form');
        this.lobbyChatInput = document.getElementById('lobby-chat-input');
        this.gameCards = document.querySelectorAll('.game-card');
        this.cardActionButtons = document.querySelectorAll('.game-card__action');

        this.gameContainer = document.getElementById('game-container');
        this.roomInfo = document.getElementById('room-info');
        this.roomGameTypeDisplay = document.getElementById('room-game-type');
        this.gameModeMessage = document.getElementById('game-mode-message');
        this.infoText = document.querySelector('.info .class-text');
        this.playAgainBtn = document.querySelector('.go-home');
        this.gameBoard = document.getElementById('tic-tac-toe-board') || document.querySelector('.game-board');
        this.roomChatList = document.getElementById('room-chat-list');
        this.roomChatForm = document.getElementById('room-chat-form');
        this.roomChatInput = document.getElementById('room-chat-input');
        this.rpsStage = document.getElementById('rps-stage');
        this.rpsControls = document.getElementById('rps-selection');
        this.rpsButtons = document.querySelectorAll('.rps-btn');
        this.rpsPlayerIcon = document.getElementById('rps-player-choice');
        this.rpsOpponentIcon = document.getElementById('rps-opponent-choice');
        this.rpsResultDisplay = document.getElementById('rps-result');
        this.rpsControls = document.getElementById('rps-controls');
        this.memoryStage = document.getElementById('memory-stage');
        this.memoryGrid = document.getElementById('memory-grid');
        this.memoryStatus = document.getElementById('memory-status');

        this.scoreboardContainer = document.getElementById('scoreboard-container');
        this.scoreboardList = document.getElementById('scoreboard-list');
        this.backToLobbyBtn = document.getElementById('back-to-lobby-btn');
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (event) => this.submitAuth('login', event));
        this.registerForm.addEventListener('submit', (event) => this.submitAuth('register', event));

        this.authTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.authTarget));
        });

        this.scoreboardBtn.addEventListener('click', () => this.showScoreboard());
        this.backToLobbyBtn.addEventListener('click', () => this.showLobby());
        this.lobbyNavBtn.addEventListener('click', () => this.showLobby());
        this.scoreboardNavBtn.addEventListener('click', () => this.showScoreboard());
        this.logoutBtn.addEventListener('click', () => this.logout());

        this.gameCards.forEach(card => {
            card.addEventListener('click', () => this.selectLobbyGame(card.dataset.game));
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.selectLobbyGame(card.dataset.game);
                }
            });
        });
        this.cardActionButtons.forEach(action => {
            action.addEventListener('click', (event) => {
                event.stopPropagation();
                const cardType = action.dataset.game;
                this.selectLobbyGame(cardType);
                this.createRoom(cardType);
            });
        });
        this.selectLobbyGame(this.selectedLobbyGameType);

        this.playAgainBtn.addEventListener('click', () => {
            if (this.currentRoom && this.socket) {
                this.socket.emit('restartRequest', this.currentRoom);
            }
        });

        this.lobbyChatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = this.lobbyChatInput.value.trim();
            if (message) {
                this.sendLobbyChat(message);
                this.lobbyChatInput.value = '';
            }
        });

        this.roomChatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = this.roomChatInput.value.trim();
            if (message) {
                this.sendRoomChat(message);
                this.roomChatInput.value = '';
            }
        });

        this.rpsButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.submitRpsChoice(button.dataset.choice);
            });
        });
        this.memoryGrid?.addEventListener('click', (event) => {
            const card = event.target.closest('.memory-card');
            if (!card) return;
            const cardId = Number(card.dataset.id);
            if (!Number.isFinite(cardId)) return;
            this.submitMemoryFlip(cardId);
        });
    }

    checkStoredToken() {
        if (this.token && this.currentUser) {
            this.initializeSocket();
            this.showLobby();
        } else {
            this.showView('auth');
        }
    }

    switchAuthTab(target) {
        this.authTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.authTarget === target);
        });
        this.loginForm.classList.toggle('hidden', target !== 'login');
        this.registerForm.classList.toggle('hidden', target !== 'register');
        this.showAuthMessage('');
    }

    async submitAuth(action, event) {
        event.preventDefault();
        const form = event.target;
        const username = form.querySelector('input[name="username"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;
        const confirmPassword = form.querySelector('input[name="confirmPassword"]')?.value;

        if (!username || !password) {
            this.showAuthMessage('Please fill out all fields.');
            return;
        }

        if (action === 'register' && password !== confirmPassword) {
            this.showAuthMessage('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch(`/api/auth/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (!response.ok) {
                this.showAuthMessage(data.error || 'Authentication failed.');
                return;
            }

            this.afterAuthentication(data);
        } catch (error) {
            console.error('Authentication error:', error);
            this.showAuthMessage('Unable to reach the server.');
        }
    }

    afterAuthentication(data) {
        this.token = data.token;
        this.currentUser = data.username;
        localStorage.setItem('tictactoe_token', this.token);
        localStorage.setItem('tictactoe_username', this.currentUser);
        this.showAuthMessage('');
        this.initializeSocket();
        this.showLobby();
    }

    logout() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.token = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.gameState = null;
        this.myRole = null;
        this.isSpectator = false;
        localStorage.removeItem('tictactoe_token');
        localStorage.removeItem('tictactoe_username');
        this.showView('auth');
    }

    initializeSocket() {
        if (!this.token) return;
        if (this.socket) {
            this.socket.off();
            this.socket.disconnect();
        }
        this.socket = io({ auth: { token: this.token } });
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('connect_error', (error) => {
            this.handleSocketError(error);
        });

        this.socket.on('lobbyUpdate', (data) => {
            this.rooms = data.rooms || [];
            this.lobbyUsers = data.users || [];
            this.updateLobbyUsers();
            this.updateRoomsList();
        });

        this.socket.on('lobbyMessages', (messages) => {
            this.lobbyMessages = messages || [];
            this.renderLobbyMessages();
        });

        this.socket.on('lobbyMessage', (message) => {
            this.lobbyMessages.push(message);
            if (this.lobbyMessages.length > 120) {
                this.lobbyMessages.shift();
            }
            this.renderLobbyMessages();
        });

        this.socket.on('roomsList', (rooms) => {
            this.rooms = rooms;
            this.updateRoomsList();
        });

        this.socket.on('roomCreated', (data) => {
            this.currentRoom = data.roomId;
            this.myRole = data.player.role;
            this.isSpectator = false;
            this.roomMessages = [];
            this.renderRoomMessages();
            this.setCurrentGameType(data.gameType);
            this.showGame();
        });

        this.socket.on('playersRole', (data) => {
            this.myRole = data.role;
            this.isSpectator = false;
            if (data.players) {
                this.updateRoomInfo(data.players);
            }
            this.setCurrentGameType(data.gameType);
            this.showGame();
        });

        this.socket.on('joinedAsSpectator', (data) => {
            this.isSpectator = true;
            this.currentRoom = data.room.roomId;
            this.roomMessages = [];
            this.renderRoomMessages();
            this.updateRoomInfo(data.room.players);
            this.setCurrentGameType(data.gameType);
            this.showGame();
        });

        this.socket.on('startGame', (data) => {
            this.updateRoomInfo(data.players);
            this.infoText.textContent = `Game started! First turn: ${data.firstTurn}`;
            this.setCurrentGameType(data.gameType);
        });

        this.socket.on('gameStateUpdate', (gameState) => {
            this.gameState = gameState;
            this.setCurrentGameType(gameState.gameType);
            this.updateGameBoard();
            this.updateGameInfo();
            if (gameState.gameType === 'memory-match') {
                this.renderMemoryBoard(gameState.memoryState);
            } else if (this.memoryStage) {
                this.memoryStage.classList.add('hidden');
            }
        });

        this.socket.on('restartGame', (data) => {
            this.updateRoomInfo(data.players);
            this.infoText.textContent = `New game! First turn: ${data.firstTurn}`;
            this.setCurrentGameType(data.gameType);
        });

        this.socket.on('playerDisconnected', (data) => {
            alert(`${data.username} disconnected from the game`);
        });

        this.socket.on('roomMessage', (message) => {
            if (message.roomId !== this.currentRoom) return;
            this.roomMessages.push(message);
            if (this.roomMessages.length > 100) {
                this.roomMessages.shift();
            }
            this.renderRoomMessages();
        });

        this.socket.on('memoryResult', ({ result }) => {
            if (!result) return;
            if (result.winnerRole) {
                this.memoryStatus.textContent = result.winnerRole === 'draw'
                    ? `Round ${result.round}: Draw!`
                    : `${result.winnerRole === this.myRole ? 'You' : 'Opponent'} won the match.`;
            } else if (result.match) {
                this.memoryStatus.textContent = 'Match found! Keep going.';
            } else if (result.flip) {
                this.memoryStatus.textContent = 'Not a match.';
            }
        });

        this.socket.on('rpsResult', (data) => {
            this.rpsResult = data;
            this.rpsChoiceSent = false;
            this.renderRpsResult();
            this.renderRpsControls();
        });

        this.socket.on('rpsStatus', (status) => {
            if (status.waiting && this.currentGameType === 'rock-paper-scissors') {
                if (this.rpsResultDisplay) {
                    this.rpsResultDisplay.textContent = 'Waiting for the opponent to choose...';
                }
            }
        });

        this.socket.on('scoreboardData', (data) => {
            this.updateScoreboard(data);
        });

        this.socket.on('error', (error) => {
            alert(error);
        });

        this.socket.on('moveError', (error) => {
            alert(error);
        });
    }

    handleSocketError(error) {
        if (error && error.message) {
            this.showAuthMessage(error.message);
        } else {
            this.showAuthMessage('Socket connection failed.');
        }
        this.logout();
    }

    createRoom(gameType) {
        const roomName = this.roomNameInput.value.trim() || `Room ${Math.floor(Math.random() * 1000)}`;
        const normalizedType = (gameType || this.selectedLobbyGameType || 'tic-tac-toe')
            .toLowerCase()
            .replace(/_/g, '-');
        if (this.socket) {
            this.socket.emit('createRoom', { roomName, gameType: normalizedType });
        }
        this.roomNameInput.value = '';
    }

    selectLobbyGame(type) {
        if (!type) return;
        const normalized = type.toLowerCase().replace(/_/g, '-');
        this.selectedLobbyGameType = normalized;
        this.gameCards.forEach(card => {
            const cardType = card.dataset.game;
            const isActive = cardType === normalized;
            card.classList.toggle('is-active', isActive);
            card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    joinRoom(roomId, asSpectator = false) {
        if (!this.socket || !roomId) return;
        this.currentRoom = roomId;
        this.socket.emit('joinRoom', { roomId, asSpectator }, (error) => {
            if (error) {
                alert(`Failed to join room: ${error}`);
                this.currentRoom = null;
            }
        });
    }

    makeMove(cellIndex) {
        if (
            !this.socket ||
            !this.currentRoom ||
            !this.gameState ||
            this.gameState.gameStatus !== 'in-progress' ||
            this.gameState.currentPlayer !== this.myRole ||
            this.isSpectator
        ) {
            return;
        }

        if (this.currentGameType !== 'tic-tac-toe') {
            return;
        }

        if (this.gameState.board[cellIndex]) {
            return;
        }

        this.socket.emit('makeMove', {
            roomId: this.currentRoom,
            cellId: cellIndex,
            move: this.myRole
        });
    }

    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
        const targetView = document.getElementById(`${viewName}-container`);
        if (targetView) {
            targetView.style.display = 'block';
        }
        this.currentView = viewName;
        this.updateNavigation();

        if (viewName === 'lobby') {
            this.socket && this.socket.emit('getRooms');
        } else if (viewName === 'scoreboard') {
            this.socket && this.socket.emit('getScoreboard');
        }
    }

    showLobby() {
        this.currentRoom = null;
        this.gameState = null;
        this.myRole = null;
        this.isSpectator = false;
        this.rpsResult = null;
        this.rpsChoiceSent = false;
        this.showView('lobby');
    }

    showGame() {
        this.roomMessages = [];
        this.renderRoomMessages();
        this.showView('game');
    }

    showScoreboard() {
        this.showView('scoreboard');
    }

    updateNavigation() {
        if (this.currentView === 'auth') {
            this.navContainer.style.display = 'none';
        } else {
            this.navContainer.style.display = 'flex';
        }
    }

    updateRoomsList() {
        this.roomsList.innerHTML = '';

        if (!this.rooms || this.rooms.length === 0) {
            this.roomsList.innerHTML = '<div class="no-rooms">No active rooms. Create one to get started!</div>';
            return;
        }

        this.rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            const canJoinAsPlayer = room.playerCount < 2 && room.gameStatus === 'waiting';
            const canSpectate = room.gameStatus === 'in-progress' || room.gameStatus === 'finished';

            roomElement.innerHTML = `
                <div class="room-info">
                    <h3>${room.roomName}</h3>
                    <p>Game: ${this.formatGameType(room.gameType)}</p>
                    <p>Players: ${room.playerCount}/2 | Spectators: ${room.spectatorCount}</p>
                    <p>Status: ${room.gameStatus}</p>
                    ${room.players.length ? `<p>Players: ${room.players.map(p => p.username).join(', ')}</p>` : ''}
                </div>
                <div class="room-actions">
                    ${canJoinAsPlayer ? `<button onclick="app.joinRoom(${room.roomId}, false)" class="join-btn">Join as Player</button>` : `<button disabled class="join-btn disabled">Room Full</button>`}
                    ${canSpectate ? `<button onclick="app.joinRoom(${room.roomId}, true)" class="spectate-btn">Watch as Spectator</button>` : ''}
                </div>
            `;

            this.roomsList.appendChild(roomElement);
        });
    }

    updateGameBoard() {
        if (!this.gameState || !this.gameBoard) return;
        if (this.currentGameType === 'tic-tac-toe') {
            this.renderTicTacToeGrid();
        }

        const cells = this.gameBoard.querySelectorAll('.cells');
        cells.forEach((cell, index) => {
            cell.textContent = this.gameState.board[index] || '';
        });
    }

    updateGameInfo() {
        if (!this.gameState) return;

        const statusMessages = {
            waiting: 'Waiting for players...',
            'in-progress': this.isSpectator ? `Watching game - Current turn: ${this.gameState.currentPlayer}` : (this.gameState.currentPlayer === this.myRole ? 'Your turn!' : 'Waiting for opponent...'),
            finished: this.gameState.winner === 'draw' ? 'Game ended in a draw!' : `Game over! Winner: ${this.gameState.winner}`
        };

        this.infoText.textContent = statusMessages[this.gameState.gameStatus] || 'Game in progress';
        this.playAgainBtn.style.display = (!this.isSpectator && this.gameState.gameStatus === 'finished') ? 'flex' : 'none';
    }

    updateRoomInfo(players) {
        if (!players || players.length === 0 || !this.roomInfo) return;
        this.roomInfo.innerHTML = `
            <h3>Room: ${this.currentRoom}</h3>
            <p>Players: ${players.map(p => `${p.username} (${p.role})`).join(', ')}</p>
            ${this.isSpectator ? '<p><em>You are spectating</em></p>' : ''}
        `;
    }

    sendLobbyChat(message) {
        if (!this.socket || !message) return;
        this.socket.emit('lobbyChatMessage', { message });
    }

    sendRoomChat(message) {
        if (!this.socket || !message || !this.currentRoom) return;
        this.socket.emit('roomChatMessage', { roomId: this.currentRoom, message });
    }

    updateLobbyUsers() {
        if (!this.lobbyUsersList) return;
        this.lobbyUsersList.innerHTML = '';
        this.lobbyUsers.forEach(username => {
            const userRow = document.createElement('div');
            userRow.className = 'user-item';
            userRow.textContent = username;
            this.lobbyUsersList.appendChild(userRow);
        });
    }

    renderLobbyMessages() {
        if (!this.lobbyChatList) return;
        this.lobbyChatList.innerHTML = '';
        this.lobbyMessages.forEach(({ username, message, timestamp }) => {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.innerHTML = `<strong>${username}</strong><span>${this.formatTimestamp(timestamp)}</span><p>${message}</p>`;
            this.lobbyChatList.appendChild(messageElement);
        });
        this.lobbyChatList.scrollTop = this.lobbyChatList.scrollHeight;
    }

    renderRoomMessages() {
        if (!this.roomChatList) return;
        this.roomChatList.innerHTML = '';
        this.roomMessages.forEach(({ username, message, timestamp }) => {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.innerHTML = `<strong>${username}</strong><span>${this.formatTimestamp(timestamp)}</span><p>${message}</p>`;
            this.roomChatList.appendChild(messageElement);
        });
        this.roomChatList.scrollTop = this.roomChatList.scrollHeight;
    }

    formatTimestamp(value) {
        const date = new Date(value || Date.now());
        return date.toLocaleTimeString();
    }

    formatGameType(type) {
        if (!type) return 'Tic Tac Toe';
        return type
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    setCurrentGameType(type) {
        const rawGameType = typeof type === 'string' ? type : 'tic-tac-toe';
        this.currentGameType = rawGameType.toLowerCase().replace(/_/g, '-');
        if (this.roomGameTypeDisplay) {
            this.roomGameTypeDisplay.textContent = `Game: ${this.formatGameType(this.currentGameType)}`;
        }
        this.renderGameModeMessage();
        this.renderActiveGameLayout();
    }

    renderGameModeMessage() {
        if (!this.gameModeMessage || !this.gameBoard) return;
        const isTicTacToe = this.currentGameType === 'tic-tac-toe';
        if (isTicTacToe) {
            this.gameModeMessage.textContent = 'Playing Tic Tac Toe';
        } else {
            this.gameModeMessage.textContent = `This room runs ${this.formatGameType(this.currentGameType)}. Tic Tac Toe controls are disabled until the selected game is implemented.`;
        }
        this.gameBoard.style.pointerEvents = isTicTacToe ? 'auto' : 'none';
        this.gameBoard.style.filter = isTicTacToe ? 'none' : 'grayscale(0.7)';
        this.renderRpsControls();
    }

    renderActiveGameLayout() {
        const type = this.currentGameType;
        switch (type) {
            case 'tic-tac-toe':
                this.setElementVisibility(this.gameBoard, true);
                this.setElementVisibility(this.rpsStage, false);
                this.setElementVisibility(this.rpsControls, false);
                this.setElementVisibility(this.rpsResultDisplay, false);
                this.setElementVisibility(this.memoryStage, false);
                this.renderTicTacToeGrid();
                break;
            case 'rock-paper-scissors':
                this.setElementVisibility(this.gameBoard, false);
                this.setElementVisibility(this.rpsStage, true);
                this.setElementVisibility(this.rpsControls, true);
                this.setElementVisibility(this.rpsResultDisplay, true);
                this.setElementVisibility(this.memoryStage, false);
                this.renderRpsControls();
                break;
            case 'memory-match':
                this.setElementVisibility(this.gameBoard, false);
                this.setElementVisibility(this.rpsStage, false);
                this.setElementVisibility(this.rpsControls, false);
                this.setElementVisibility(this.rpsResultDisplay, false);
                this.setElementVisibility(this.memoryStage, true);
                break;
            default:
                this.setElementVisibility(this.gameBoard, false);
                this.setElementVisibility(this.rpsStage, false);
                this.setElementVisibility(this.rpsControls, false);
                this.setElementVisibility(this.rpsResultDisplay, false);
                this.setElementVisibility(this.memoryStage, false);
        }
    }

    renderTicTacToeGrid() {
        if (!this.gameBoard || this.ticTacToeGridInitialized) return;
        this.gameBoard.innerHTML = '';
        let cellIdCounter = 0;

        for (let row = 0; row < 3; row++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'rows';

            for (let col = 0; col < 3; col++) {
                const currentCellId = cellIdCounter++;
                const cellEl = document.createElement('div');
                cellEl.className = 'cells';
                cellEl.id = `${currentCellId}`;
                cellEl.addEventListener('click', () => this.makeMove(currentCellId));
                rowElement.appendChild(cellEl);
            }

            this.gameBoard.appendChild(rowElement);
        }

        this.ticTacToeGridInitialized = true;
        this.updateGameBoard();
    }

    setElementVisibility(element, visible) {
        if (!element) return;
        element.classList.toggle('hidden', !visible);
        if (visible) {
            element.style.removeProperty('display');
        } else {
            element.style.display = 'none';
        }
    }

    renderRpsControls() {
        if (!this.rpsControls) return;
        const show = this.currentGameType === 'rock-paper-scissors';
        this.rpsControls.classList.toggle('hidden', !show);
        this.rpsButtons.forEach(button => {
            button.disabled = !show || this.rpsChoiceSent;
        });
        if (show) {
            this.renderRpsResult();
        } else if (this.rpsResultDisplay) {
            this.rpsResultDisplay.textContent = '';
        }
    }

    renderRpsResult() {
        if (!this.rpsResultDisplay) return;
        if (this.currentGameType !== 'rock-paper-scissors') {
            this.rpsResultDisplay.textContent = '';
            return;
        }

        if (!this.rpsResult) {
            this.rpsResultDisplay.textContent = this.rpsChoiceSent ? 'Choice sent. Waiting for opponent...' : 'Select your move';
            this.updateRpsIconsPlaceholder();
            return;
        }

        const { choices, winnerRole, winnerUsername, round } = this.rpsResult;
        const isPlayerX = this.myRole === 'X';
        const playerChoice = isPlayerX ? choices.X : choices.O;
        const opponentChoice = isPlayerX ? choices.O : choices.X;
        if (this.rpsPlayerIcon) {
            this.rpsPlayerIcon.textContent = this.formatRpsEmoji(playerChoice);
        }
        if (this.rpsOpponentIcon) {
            this.rpsOpponentIcon.textContent = this.formatRpsEmoji(opponentChoice);
        }

        this.clearRpsIcons();
        if (winnerRole === 'draw') {
            this.rpsPlayerIcon?.classList.add('draw');
            this.rpsOpponentIcon?.classList.add('draw');
            this.rpsResultDisplay.textContent = `Round ${round}: Draw!`;
        } else {
            const winnerIcon = winnerRole === this.myRole ? this.rpsPlayerIcon : this.rpsOpponentIcon;
            const loserIcon = winnerIcon === this.rpsPlayerIcon ? this.rpsOpponentIcon : this.rpsPlayerIcon;
            winnerIcon?.classList.add('win');
            loserIcon?.classList.add('lose');
            const resultText = winnerUsername
                ? `Round ${round}: ${winnerUsername} wins!`
                : `Round ${round}: ${this.formatGameType(winnerRole)} wins!`;
            this.rpsResultDisplay.textContent = resultText;
        }

        this.rpsChoiceSent = false;
        this.renderRpsControls();
    }

    renderMemoryBoard(state) {
        if (!this.memoryStage || !this.memoryGrid || !state) return;
        this.memoryStage.classList.toggle('hidden', this.currentGameType !== 'memory-match');
        this.memoryGrid.innerHTML = '';
        state.cards.forEach(card => {
            const cardEl = document.createElement('div');
            const classes = ['memory-card'];
            if (card.revealed || card.matched) classes.push('revealed');
            if (card.matched) classes.push('matched');
            cardEl.className = classes.join(' ');
            cardEl.dataset.id = card.id;
            cardEl.textContent = card.revealed || card.matched ? card.value : '';
            this.memoryGrid.appendChild(cardEl);
        });
        const playerScore = state.matches[this.myRole] || 0;
        const opponentRole = this.myRole === 'X' ? 'O' : 'X';
        const opponentScore = state.matches[opponentRole] || 0;
        if (this.memoryStatus) {
            this.memoryStatus.textContent = `Matches — You: ${playerScore} | Opponent: ${opponentScore}`;
        }
    }

    submitMemoryFlip(cardId) {
        if (!this.socket || !this.currentRoom || this.currentGameType !== 'memory-match') return;
        this.socket.emit('memoryFlip', { roomId: this.currentRoom, cardId });
    }

    submitRpsChoice(choice) {
        if (
            !this.socket ||
            !this.currentRoom ||
            this.currentGameType !== 'rock-paper-scissors' ||
            this.rpsChoiceSent
        ) {
            return;
        }

        this.rpsChoiceSent = true;
        if (this.rpsResultDisplay) {
            this.rpsResultDisplay.textContent = 'Choice sent. Waiting for opponent...';
        }
        this.renderRpsControls();
        this.socket.emit('rpsChoice', { roomId: this.currentRoom, choice });
    }

    updateScoreboard(data) {
        if (!this.scoreboardList) return;
        this.scoreboardList.innerHTML = '';
        if (!data || data.length === 0) {
            this.scoreboardList.innerHTML = '<div class="no-scores">No games played yet! Be the first to play.</div>';
            return;
        }

        data.forEach((player, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            const playerElement = document.createElement('div');
            playerElement.className = 'scoreboard-item';
            playerElement.innerHTML = `
                <div class="rank">${medal}</div>
                <div class="player-info">
                    <h3>${player.username}</h3>
                    <p>Games: ${player.totalGames} | Win Rate: ${player.winRate}%</p>
                </div>
                <div class="stats">
                    <div class="stat">
                        <span class="stat-label">Wins</span>
                        <span class="stat-value wins">${player.wins}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Losses</span>
                        <span class="stat-value losses">${player.losses}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Draws</span>
                        <span class="stat-value draws">${player.draws}</span>
                    </div>
                </div>
            `;
            this.scoreboardList.appendChild(playerElement);
        });
    }

    clearRpsIcons() {
        [this.rpsPlayerIcon, this.rpsOpponentIcon].forEach(icon => {
            icon?.classList.remove('win', 'lose', 'draw');
        });
    }

    updateRpsIconsPlaceholder() {
        if (this.rpsPlayerIcon) this.rpsPlayerIcon.textContent = '?';
        if (this.rpsOpponentIcon) this.rpsOpponentIcon.textContent = '?';
        this.clearRpsIcons();
    }

    formatRpsEmoji(choice) {
        const map = { rock: '🪨', paper: '📄', scissors: '✂️' };
        return map[choice] || '?';
    }

    showAuthMessage(message) {
        if (!this.authMessage) return;
        this.authMessage.textContent = message || '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TicTacToeApp();
});
