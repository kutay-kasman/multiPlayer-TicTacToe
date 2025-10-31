const socket = io()
const numRoom = document.getElementById('room-num')
const roomForm = document.getElementById('room-form')
const gameBoard = document.querySelector('.game-board')
const infoText = document.querySelector('.info')

let myRole = ''
let currentRole = ''
let roomId = null
let gameStarted = false

const playAgainBtn = document.querySelector('.go-home');
playAgainBtn.style.display = 'none'; // Hide initially
let restartConfirm = false; // Local flag

// Initialize game state
let board = Array(9).fill('')
const cells = document.querySelectorAll('.cells')

// Hide game board initially
gameBoard.style.display = 'none'

// Handle room joining
roomForm.addEventListener('submit', (e) => {
    e.preventDefault()
    roomId = parseInt(numRoom.value)
    
    if (isNaN(roomId)) {
        alert('Please enter a valid room number')
        return
    }

    socket.emit('joinRoom', roomId, (error) => {
        if (error) {
            alert(error)
            return
        }
        roomForm.style.display = 'none'
        gameBoard.style.display = 'flex'
    })
})

socket.on('playersRole', ({role}) => {
    myRole = role
    if(myRole == 'X') {
        infoText.style.display = 'flex'
        infoText.textContent = `You are X wait for the opponent`
    }
    else if(myRole == 'O') {
        infoText.style.display = 'flex'
        infoText.textContent = `You are O`
    }
})

socket.on('startGame', ({firstTurn}) => {
    gameStarted = true
    currentRole = firstTurn
    infoText.textContent =`You are O and the first turn is ${currentRole}`
    if (currentRole === myRole) {
        infoText.textContent =`Make your first move`
    }
})

socket.on('opponentMove', ({cellId, move}) => {
    const cell = document.getElementById(cellId)
    if (cell && cell.textContent === '') {
        cell.textContent = move
        board[cellId] = move
        currentRole = move === 'X' ? 'O' : 'X'
    }
})

socket.on('playerDisconnected', () => {
    alert('Opponent disconnected from the game')
    resetGame()
})

socket.on('result', winner => {
    gameStarted = false
    if (winner === 'draw') {
        infoText.textContent =`Game is a draw!`
    } else {
        infoText.textContent =`The winner is ${winner}`
    }
    playAgainBtn.style.display = 'flex'

})

const checkWinner = (board) => {
    const combos = [
        [0,1,2], [3,4,5], [6,7,8], // rows
        [0,3,6], [1,4,7], [2,5,8], // columns
        [0,4,8], [2,4,6]           // diagonals
    ]

    for (let [a,b,c] of combos) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            socket.emit('game-over', roomId, board[a])
            return
        }
    }

    if (board.every(cell => cell !== '')) {
        socket.emit('game-over', roomId, 'draw')
        return
    }
}
const restartGame = () => {
    board = Array(9).fill('')
    cells.forEach(cell => {
        cell.textContent = ''
    })
    gameStarted = true
    infoText.textContent = (currentRole === myRole) 
        ? 'Your turn!' 
        : 'Waiting for opponent...'
}

socket.on('restartGame', ({firstTurn}) => {
    restartGame(); // Clear board, reset infoText
    currentRole = firstTurn;
    gameStarted = true;

    infoText.textContent = (currentRole === myRole) 
        ? 'Your turn!' 
        : 'Waiting for opponent...';
});


// Cell click handler
cells.forEach(cell => {
    cell.addEventListener('click', function() {
        if (!gameStarted) return
        if (myRole !== currentRole) return

        const cellId = parseInt(cell.id)
        if (cell.textContent !== '') return

        cell.textContent = myRole
        board[cellId] = myRole
        
        socket.emit('makeMove', { roomId, cellId, move: myRole })
        checkWinner(board)
        if(myRole === 'X') {
            infoText.textContent = 'X'
        }
        else if(myRole === 'O') {
            infoText.textContent = 'O'
        }

        currentRole = myRole === 'X' ? 'O' : 'X'
    })
})


playAgainBtn.addEventListener('click', () => {
    playAgainBtn.style.display = 'none'; // Hide again
    restartConfirm = true;
    socket.emit('restartRequest', roomId);
});
