# Quick Blackjack Game - Multiplayer Edition

A web-based Blackjack game with both solo and multiplayer modes, built according to the Product Requirements Document specifications.

## Project Structure

- `index.html` - Main HTML structure with lobby, game, and multiplayer UI
- `styles.css` - CSS styling with bird's eye view table design and multiplayer components
- `script.js` - Original solo game logic (preserved)
- `script-multiplayer.js` - Enhanced multiplayer game logic with WebSocket integration
- `server.js` - Node.js WebSocket server for multiplayer functionality
- `package.json` - Node.js dependencies and scripts
- `README.md` - Comprehensive setup and usage documentation

## Features Implemented

✅ **Title Screen**
- Game logo and bankroll selection ($100, $500, $1000)
- Smooth transitions between screens

✅ **Game Interface** 
- Bird's eye view of oval Blackjack table
- Dealer area (top) and player area (bottom)
- Real-time bankroll and bet displays
- Visual card deck in center

✅ **Game Logic**
- Standard Blackjack rules (dealer hits on 16, stands on 17+)
- Blackjack pays 3:2
- Ace handling (11 or 1)
- Bust detection for both player and dealer

✅ **Card System**
- Full 52-card deck with shuffling
- Animated card dealing with delays
- Hidden dealer card with flip animation
- Visual card representations with suits and ranks

✅ **Betting System**
- $10 minimum bet requirement
- Bet selection buttons ($10, $25, $50, $100)
- Bankroll validation and updates
- Bet button state management

✅ **Game Controls**
- Hit/Stand buttons during gameplay
- Deal button to start new hand
- Next Hand button after hand completion
- Menu button to return to title screen

✅ **Animations**
- Card dealing animations with staggered timing
- Card flip animation for revealing dealer's hidden card
- Smooth transitions and hover effects

✅ **Game Over Handling**
- "You Lose" screen when bankroll drops below $10
- Return to main menu functionality
- Bankroll reset on menu return

✅ **Multiplayer Features**
- Real-time multiplayer with up to 5 players per table
- Public table matchmaking and private table creation
- Turn-based gameplay with visual turn indicators
- Quick chat system with emote buttons
- Player panels showing all participants
- Shared dealer with individual player decisions
- WebSocket-based real-time synchronization

## How to Run

### Solo Mode Only (Static Files)
1. Start a local web server:
   ```bash
   python3 -m http.server 8000
   ```
2. Open http://localhost:8000 in your browser
3. Use original `script.js` by changing the script tag in HTML

### Multiplayer Mode (Full Features)
1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Start the multiplayer server:
   ```bash
   npm start
   ```
3. Open http://localhost:3000 in your browser

## Game Rules

- Minimum bet: $10
- Dealer hits on 16, stands on 17
- Blackjack (21 with 2 cards) pays 3:2
- Regular wins pay 1:1
- Ties (pushes) return the bet
- Game ends when bankroll < $10

## Technical Details

- Pure HTML5, CSS3, and JavaScript (no external dependencies)
- Responsive design for mobile and desktop
- CSS animations and transitions
- Object-oriented JavaScript with ES6 classes
- Local storage not implemented (session-based gameplay)

## Testing Status

All major features have been implemented and are ready for testing. The game follows the PRD specifications and includes all required functionality.
