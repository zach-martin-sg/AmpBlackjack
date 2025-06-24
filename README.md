# Quick Blackjack - Multiplayer Edition

A web-based Blackjack game with both solo and multiplayer modes, built according to PRD specifications.

## Features

### Solo Mode
- Complete Blackjack game against AI dealer
- Bankroll selection ($100, $500, $1000)
- Standard Blackjack rules
- Animated card dealing

### Multiplayer Mode
- Real-time multiplayer with up to 5 players
- Public and private table matchmaking
- Shared dealer with individual player decisions
- Quick chat system with emotes
- Turn-based gameplay with visual indicators

## Prerequisites

To run the multiplayer server, you need:

1. **Node.js** (v14 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Or install via package manager:
     ```bash
     # macOS (with Homebrew)
     brew install node
     
     # Ubuntu/Debian
     sudo apt-get install nodejs npm
     
     # CentOS/RHEL
     sudo yum install nodejs npm
     ```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/zach-martin-sg/AmpBlackjack.git
   cd AmpBlackjack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the multiplayer server**
   ```bash
   npm start
   ```

4. **Open the game**
   - Navigate to http://localhost:3000
   - The server serves both the game files and WebSocket connections

## How to Play

### Solo Mode
1. Choose starting bankroll on title screen
2. Select "Solo Play" from lobby
3. Place bets ($10 minimum)
4. Hit or Stand to play your hand
5. Game ends when bankroll drops below $10

### Multiplayer Mode
1. Choose starting bankroll on title screen
2. Select "Join Public Table" or "Create Private Table"
3. Wait for other players (or invite friends with private code)
4. Place individual bets when round starts
5. Take turns making Hit/Stand decisions
6. Use quick chat to communicate with other players

## Game Rules

- Minimum bet: $10
- Dealer hits on 16, stands on 17
- Blackjack (21 with 2 cards) pays 3:2
- Regular wins pay 1:1
- Ties (pushes) return the bet
- Player turn timeout: 15 seconds
- Game kicks inactive players after 2 rounds

## Development

### Project Structure
```
├── index.html              # Main game HTML
├── styles.css              # Game styling and animations
├── script.js               # Original solo game logic
├── script-multiplayer.js   # Enhanced multiplayer game logic
├── server.js               # Node.js WebSocket server
├── package.json            # Node.js dependencies
└── README.md               # This file
```

### API Endpoints (WebSocket Events)

**Client to Server:**
- `join_lobby` - Join the multiplayer lobby
- `join_public_table` - Join a public game table
- `create_private_table` - Create a private table
- `join_private_table` - Join with invite code
- `place_bet` - Place bet for current round
- `player_action` - Send Hit/Stand action
- `send_chat` - Send chat message
- `start_new_round` - Start next hand
- `leave_table` - Leave current table

**Server to Client:**
- `lobby_joined` - Confirmed lobby join
- `table_joined` - Joined a game table
- `player_joined` - Another player joined
- `round_started` - New round began
- `cards_dealt` - Initial cards dealt
- `player_action_taken` - Player took action
- `round_finished` - Round ended with results
- `chat_message` - Chat message received

### Testing Multiplayer

1. Open multiple browser tabs/windows
2. Join the same public table or use private invite codes
3. Play simultaneous games to test real-time sync
4. Test disconnection scenarios

## Deployment

### Local Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
The game can be deployed to any Node.js hosting service:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS/GCP/Azure

Set `PORT` environment variable for custom port (default: 3000).

## Technical Details

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express and Socket.IO
- **Real-time Communication**: WebSocket via Socket.IO
- **Game State**: In-memory (resets on server restart)
- **No Database**: Session-based gameplay only

## Future Enhancements

- [ ] Persistent user accounts and statistics
- [ ] Tournament mode with brackets
- [ ] Spectator mode for watching games
- [ ] Enhanced chat with text input
- [ ] Leaderboards and achievements
- [ ] Mobile app versions

## License

MIT License - see the full project for details.
