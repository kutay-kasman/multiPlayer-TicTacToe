# 🎮 Multiplayer Tic Tac Toe

A modern, feature-rich multiplayer Tic Tac Toe game built with Node.js, Socket.IO, and vanilla JavaScript.

## ✨ Features

### 🎯 Core Game Features
- **Username Support**: Players must enter a unique username before playing
- **Spectator Mode**: Watch ongoing games when rooms are full
- **Real-time Multiplayer**: Play with friends using Socket.IO
- **Game State Persistence**: All game states are synchronized across players and spectators

### 🔐 Authentication
- **Register & Login**: Use the new forms to create an account (`POST /api/auth/register`) or authenticate (`POST /api/auth/login`)
- **JWT Tokens**: Tokens are stored in `localStorage` and automatically sent with Socket.IO handshakes and protected API requests
- **Protected Views**: Lobby, game, and scoreboard views require a valid token and the logout button clears the session

### 🕹️ Mini-Games
- **Tic Tac Toe**: The flagship two-player game now runs inside authenticated rooms.
- **Rock Paper Scissors**: Pick this mode when creating rooms to play quick rounds.
- **Memory Match**: Coming soon—server-controlled card flips and turn tracking.

### 🏠 Live Room Lobby
- **Room Browser**: View all active rooms with player counts and game status
- **Smart Joining**: Join as a player (if space available) or as a spectator
- **Room Creation**: Create custom-named rooms or use auto-generated room IDs
- **Live Updates**: Real-time updates when players join/leave rooms

### 🏆 Scoreboard System
- **Win/Loss/Draw Tracking**: Automatic tracking of all game results
- **Player Statistics**: View wins, losses, draws, total games, and win rate
- **Top Players Ranking**: See the best players ranked by wins and win rate
- **Persistent Storage**: Scores are saved to JSON file (easily upgradeable to database)

### 🎨 Modern UI/UX
- **Beautiful Design**: Modern gradient background with glassmorphism effects
- **Responsive Layout**: Works perfectly on desktop and mobile devices
- **Smooth Animations**: Hover effects and transitions for better user experience
- **Multi-view Navigation**: Easy navigation between lobby, game, and scoreboard

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multiPlayer-TicTacToe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart:
```bash
npm run dev
```
*(Requires nodemon: `npm install -g nodemon`)*

## 🎮 How to Play

### First Time Setup
1. **Register or Login**: Use the authentication view to create an account or log in
2. **Token is Saved**: Your JWT token is stored locally for future sessions

### Playing a Game
1. **View Lobby**: See all available rooms and their status
2. **Create Room**: Click "Create Room" to start a new game room
3. **Join Room**: Click "Join as Player" on any room with available space
4. **Watch Games**: Click "Watch as Spectator" to observe ongoing games
5. **Make Moves**: Click on empty cells to place your X or O
6. **Play Again**: After a game ends, click "Play Again" to restart

### Viewing Scores
1. **In-Game**: Click "View Scoreboard" from the lobby
2. **Dedicated Page**: Visit `/scoreboard` for a full-page scoreboard view (requires login)
3. **Statistics**: See wins, losses, draws, total games, and win rate for each player

## 🏗️ Architecture

### Backend Structure
```
src/
├── index.js           # Main server file with Express and Socket.IO setup
├── GameRoom.js        # GameRoom class managing individual game instances
├── SocketHandlers.js  # Modular socket event handling
└── Scoreboard.js      # Score tracking and statistics management
```

### Frontend Structure
```
public/
├── index.html         # Main application with multi-view structure
├── scoreboard.html    # Dedicated scoreboard page
├── app.js            # Main application logic and socket handling
└── style.css         # Modern styling with responsive design
```

### Key Classes

#### GameRoom Class
- Manages individual game rooms
- Handles player and spectator management
- Tracks game state and validates moves
- Implements win detection and game restart logic

#### SocketHandlers Class
- Centralized socket event management
- Room creation and joining logic
- Real-time game state broadcasting
- Score tracking integration

#### Scoreboard Class
- Persistent score storage (JSON file)
- Statistics calculation and ranking
- API endpoint for scoreboard data

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3000)

### Customization
- **Room ID Generation**: Modify `generateRoomId()` in SocketHandlers.js
- **Score Storage**: Replace JSON file storage with database in Scoreboard.js
- **UI Themes**: Customize colors and styling in style.css

## 🌟 Features in Detail

### Spectator Mode
- Spectators can watch games in real-time
- No interference with gameplay
- Full game state visibility
- Automatic updates when players join/leave

### Room Management
- Automatic room cleanup when empty
- Real-time room list updates
- Player capacity management (2 players + unlimited spectators)
- Game status tracking (waiting, in-progress, finished)

### Score System
- Automatic game result recording
- Win rate calculations
- Player ranking algorithms
- Persistent storage with JSON backup

## 🔮 Future Enhancements

- **Database Integration**: Replace JSON storage with MongoDB/PostgreSQL
- **User Authentication**: Add login/logout functionality
- **Tournament Mode**: Organize tournaments with brackets
- **Custom Game Rules**: Allow custom board sizes or win conditions
- **Chat System**: Add in-game chat for players and spectators
- **Replay System**: Save and replay completed games
- **Mobile App**: React Native or Flutter mobile application

## 🐛 Troubleshooting

### Common Issues

1. **Username Already Taken**
   - Choose a different username
   - Refresh the page to clear cached usernames

2. **Room Not Found**
   - Room may have been deleted due to inactivity
   - Create a new room or join an existing one

3. **Connection Issues**
   - Check your internet connection
   - Ensure the server is running
   - Try refreshing the page

### Server Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port 3000
   npx kill-port 3000
   # Or use a different port
   PORT=3001 npm start
   ```

2. **Dependencies Issues**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Enjoy playing Multiplayer Tic Tac Toe! 🎉**


