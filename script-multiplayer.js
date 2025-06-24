class MultiplayerBlackjackGame {
    constructor() {
        this.socket = null;
        this.playerData = {
            id: null,
            username: '',
            bankroll: 100
        };
        this.gameMode = 'solo'; // solo or multiplayer
        this.tableId = null;
        this.gameState = null;
        this.soloGame = null;
        
        this.initializeGame();
        this.bindEvents();
    }

    initializeGame() {
        this.showScreen('titleScreen');
    }

    bindEvents() {
        // Title screen events
        document.querySelectorAll('.bankroll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playerData.bankroll = parseInt(e.target.dataset.amount);
                this.playerData.username = `Player${Math.floor(Math.random() * 1000)}`;
                this.showLobby();
            });
        });

        // Lobby events
        document.getElementById('soloModeBtn').addEventListener('click', () => this.startSoloMode());
        document.getElementById('browsePublicBtn').addEventListener('click', () => this.showPublicTablesBrowser());
        document.getElementById('createPrivateBtn').addEventListener('click', () => this.createPrivateTable());
        document.getElementById('joinPrivateBtn').addEventListener('click', () => this.joinPrivateTable());
        document.getElementById('copyInviteBtn').addEventListener('click', () => this.copyInviteCode());
        
        // Table browser events
        document.getElementById('refreshTablesBtn').addEventListener('click', () => this.refreshPublicTables());
        document.getElementById('createNewTableBtn').addEventListener('click', () => this.createNewPublicTable());
        document.getElementById('backToLobbyBtn').addEventListener('click', () => this.hidePublicTablesBrowser());

        // Game controls
        document.getElementById('dealBtn').addEventListener('click', () => this.dealHand());
        document.getElementById('hitBtn').addEventListener('click', () => this.hit());
        document.getElementById('standBtn').addEventListener('click', () => this.stand());
        document.getElementById('nextHandBtn').addEventListener('click', () => this.nextHand());
        document.getElementById('menuBtn').addEventListener('click', () => this.returnToMenu());
        document.getElementById('returnToMenuBtn').addEventListener('click', () => this.returnToMenu());

        // Betting controls
        document.querySelectorAll('.bet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bet = parseInt(e.target.dataset.bet);
                this.placeBet(bet);
            });
        });

        // Chat controls
        document.querySelectorAll('.chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const message = e.target.dataset.message;
                this.sendChatMessage(message);
            });
        });

        // Host controls
        document.getElementById('hostStartBtn').addEventListener('click', () => this.hostStartGame());
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showLobby() {
        document.getElementById('playerUsername').textContent = this.playerData.username;
        document.getElementById('playerBankroll').textContent = this.playerData.bankroll;
        this.showScreen('lobbyScreen');
        this.connectToServer();
    }

    connectToServer() {
        if (this.socket) return;

        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            this.updateConnectionStatus('Server not running - Solo mode only', false);
            console.warn('Socket.IO not available. Start the Node.js server for multiplayer features.');
            return;
        }

        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus('Connected', true);
            this.socket.emit('join_lobby', this.playerData);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus('Disconnected', false);
        });

        this.socket.on('connect_error', () => {
            console.log('Connection failed');
            this.updateConnectionStatus('Connection failed - Check server', false);
        });

        this.socket.on('lobby_joined', (data) => {
            this.playerData.id = data.playerId;
        });

        this.socket.on('table_joined', (data) => {
            this.tableId = data.tableId;
            this.gameMode = 'multiplayer';
            this.gameState = data.gameState;
            this.showGame();
            this.updateMultiplayerUI();
        });

        this.socket.on('private_table_created', (data) => {
            this.tableId = data.tableId;
            this.gameMode = 'multiplayer';
            this.gameState = data.gameState;
            this.showPrivateTableCode(data.inviteCode);
            this.showGame();
            this.updateMultiplayerUI();
        });

        this.socket.on('player_joined', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
            this.addChatMessage('System', `${data.player.username} joined the table`);
        });

        this.socket.on('player_left', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
        });

        this.socket.on('round_started', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
            this.showMessage('Place your bets!');
            this.showControls('bettingControls');
        });

        this.socket.on('bet_placed', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
        });

        this.socket.on('cards_dealt', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
            this.updateDisplay();
            this.showControls('gameControls');
        });

        this.socket.on('player_action_taken', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
            this.updateDisplay();
        });

        this.socket.on('round_finished', (data) => {
            this.gameState = data.gameState;
            this.updateMultiplayerUI();
            this.updateDisplay();
            this.showResults(data.results);
            this.showControls('nextHandControls');
        });

        this.socket.on('chat_message', (data) => {
            this.addChatMessage(data.username, data.message);
        });

        this.socket.on('public_tables_list', (tables) => {
            this.displayPublicTables(tables);
        });

        this.socket.on('public_tables_updated', (tables) => {
            if (document.getElementById('publicTablesBrowser').style.display !== 'none') {
                this.displayPublicTables(tables);
            }
        });

        this.socket.on('error', (data) => {
            alert(data.message);
        });
    }

    updateConnectionStatus(status, connected) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = status;
        statusElement.parentElement.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
    }

    startSoloMode() {
        this.gameMode = 'solo';
        this.soloGame = new SoloBlackjackGame(this.playerData.bankroll);
        this.showGame();
        this.updateSoloUI();
    }

    showPublicTablesBrowser() {
        if (this.socket && this.socket.connected) {
            document.getElementById('publicTablesBrowser').style.display = 'block';
            this.refreshPublicTables();
        } else {
            alert('Please make sure the multiplayer server is running!\n\nTo start the server:\n1. Install Node.js\n2. Run: npm install\n3. Run: npm start\n4. Open http://localhost:3000');
        }
    }

    hidePublicTablesBrowser() {
        document.getElementById('publicTablesBrowser').style.display = 'none';
    }

    refreshPublicTables() {
        if (this.socket && this.socket.connected) {
            document.getElementById('tablesList').innerHTML = '<div class="loading-tables">Loading tables...</div>';
            this.socket.emit('get_public_tables');
        }
    }

    createNewPublicTable() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('create_new_public_table');
        }
    }

    joinSpecificTable(tableId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_specific_table', tableId);
        }
    }

    displayPublicTables(tables) {
        const tablesList = document.getElementById('tablesList');
        
        if (tables.length === 0) {
            tablesList.innerHTML = `
                <div class="no-tables">
                    <h4>No Public Tables Available</h4>
                    <p>Be the first to create one!</p>
                </div>
            `;
            return;
        }

        tablesList.innerHTML = tables.map(table => {
            const isFull = table.playerCount >= table.maxPlayers;
            const timeAgo = this.getTimeAgo(table.createdAt);
            
            return `
                <div class="table-item ${isFull ? 'full' : ''}" onclick="game.joinSpecificTable('${table.id}')" ${isFull ? 'title="Table is full"' : ''}>
                    <div class="table-header">
                        <span class="table-id">Table ${table.id.slice(-6)}</span>
                        <span class="table-status ${table.gameState}">${this.formatGameState(table.gameState)}</span>
                    </div>
                    <div class="table-info">
                        <div class="table-players">
                            <span class="player-count">${table.playerCount}/${table.maxPlayers} players</span>
                            ${table.players.map(p => `<span title="${p.status}">${p.username}</span>`).join(', ')}
                        </div>
                        <div class="table-round">
                            ${table.round > 0 ? `Round ${table.round}` : 'New'} • ${timeAgo}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatGameState(state) {
        const states = {
            'waiting': 'Waiting',
            'betting': 'Betting',
            'playing': 'Playing',
            'dealer': 'Dealer Turn',
            'finished': 'Round Ended'
        };
        return states[state] || state;
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return `${seconds}s ago`;
        }
    }

    createPrivateTable() {
        document.getElementById('privateTableSection').style.display = 'block';
        if (this.socket && this.socket.connected) {
            this.socket.emit('create_private_table');
        } else {
            alert('Please make sure the multiplayer server is running!\n\nRun: npm start');
        }
    }

    joinPrivateTable() {
        const inviteCode = document.getElementById('inviteCodeInput').value.trim();
        if (inviteCode && this.socket) {
            this.socket.emit('join_private_table', inviteCode);
        }
    }

    showPrivateTableCode(inviteCode) {
        document.getElementById('generatedInviteCode').value = inviteCode;
        document.getElementById('inviteCodeDisplay').style.display = 'block';
    }

    copyInviteCode() {
        const codeInput = document.getElementById('generatedInviteCode');
        codeInput.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyInviteBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    placeBet(betAmount) {
        if (this.gameMode === 'solo') {
            this.soloGame.placeBet(betAmount);
        } else if (this.socket) {
            this.socket.emit('place_bet', betAmount);
        }
    }

    dealHand() {
        if (this.gameMode === 'solo') {
            this.soloGame.dealHand();
        }
    }

    hit() {
        if (this.gameMode === 'solo') {
            this.soloGame.hit();
        } else if (this.socket) {
            this.socket.emit('player_action', 'hit');
        }
    }

    stand() {
        if (this.gameMode === 'solo') {
            this.soloGame.stand();
        } else if (this.socket) {
            this.socket.emit('player_action', 'stand');
        }
    }

    nextHand() {
        if (this.gameMode === 'solo') {
            this.soloGame.nextHand();
        } else if (this.socket) {
            this.socket.emit('start_new_round');
        }
    }

    sendChatMessage(message) {
        if (this.socket && this.gameMode === 'multiplayer') {
            this.socket.emit('send_chat', message);
        }
    }

    hostStartGame() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('host_start_game');
        }
    }

    addChatMessage(username, message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `<span class="username">${username}:</span> ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showGame() {
        this.showScreen('gameScreen');
        
        if (this.gameMode === 'multiplayer') {
            document.getElementById('playersPanel').style.display = 'block';
            document.getElementById('chatSystem').style.display = 'block';
            document.getElementById('gameModeIndicator').textContent = 'Multiplayer';
            document.getElementById('gameModeIndicator').classList.add('multiplayer');
        } else {
            document.getElementById('playersPanel').style.display = 'none';
            document.getElementById('chatSystem').style.display = 'none';
            document.getElementById('gameModeIndicator').textContent = 'Solo';
            document.getElementById('gameModeIndicator').classList.remove('multiplayer');
        }
    }

    updateMultiplayerUI() {
        if (!this.gameState) return;

        // Update players panel
        this.updatePlayersPanel();
        
        // Update game info
        document.getElementById('roundInfo').textContent = `Round ${this.gameState.round}`;
        
        // Update turn indicator
        const currentPlayer = this.gameState.players.find(p => p.id === this.gameState.currentPlayer);
        if (currentPlayer) {
            document.getElementById('turnIndicator').textContent = `${currentPlayer.username}'s turn`;
        } else {
            document.getElementById('turnIndicator').textContent = '';
        }

        // Update own bankroll and bet
        const myPlayer = this.gameState.players.find(p => p.id === this.playerData.id);
        if (myPlayer) {
            document.getElementById('bankrollAmount').textContent = myPlayer.bankroll;
            document.getElementById('betAmount').textContent = myPlayer.currentBet || 0;
        }

        // Update host controls
        this.updateHostControls();
    }

    updateHostControls() {
        const isHost = this.gameState && this.gameState.hostId === this.playerData.id;
        
        if (isHost && this.gameState.gameState === 'waiting') {
            const playerCount = this.gameState.playerCount;
            const hostStatus = document.querySelector('.host-status');
            const hostStartBtn = document.getElementById('hostStartBtn');
            
            if (playerCount >= 2) {
                hostStatus.textContent = `${playerCount} players ready. Start when ready!`;
                hostStartBtn.disabled = false;
            } else {
                hostStatus.textContent = 'Waiting for more players to join...';
                hostStartBtn.disabled = true;
            }
            
            this.showControls('hostControls');
        } else if (!isHost && this.gameState && this.gameState.gameState === 'waiting') {
            // Show waiting message for non-hosts
            this.showMessage('Waiting for host to start the game...');
            this.showControls('none');
        }
    }

    updateSoloUI() {
        if (!this.soloGame) return;
        
        document.getElementById('bankrollAmount').textContent = this.soloGame.bankroll;
        document.getElementById('betAmount').textContent = this.soloGame.currentBet;
        document.getElementById('roundInfo').textContent = 'Solo Game';
        document.getElementById('turnIndicator').textContent = '';
    }

    updatePlayersPanel() {
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';

        if (!this.gameState || !this.gameState.players) return;

        this.gameState.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            if (player.id === this.gameState.currentPlayer) {
                playerCard.classList.add('current-turn');
            }
            
            if (player.status === 'finished' || player.status === 'bust') {
                playerCard.classList.add('finished');
            }

            playerCard.innerHTML = `
                <div class="player-name">${player.username}</div>
                <div class="player-bankroll">$${player.bankroll}</div>
                <div class="player-status ${player.status}">${player.status}</div>
            `;
            
            playersList.appendChild(playerCard);
        });
    }

    updateDisplay() {
        if (this.gameMode === 'solo' && this.soloGame) {
            this.soloGame.updateDisplay();
        } else if (this.gameMode === 'multiplayer' && this.gameState) {
            this.updateMultiplayerCards();
            this.updateMultiplayerScores();
        }
    }

    updateMultiplayerCards() {
        const playerCards = document.getElementById('playerCards');
        const dealerCards = document.getElementById('dealerCards');
        
        // Clear existing cards
        playerCards.innerHTML = '';
        dealerCards.innerHTML = '';
        
        // Find current player's hand
        const myPlayer = this.gameState.players.find(p => p.id === this.playerData.id);
        if (myPlayer && myPlayer.hand) {
            myPlayer.hand.forEach((card, index) => {
                setTimeout(() => {
                    const cardElement = this.createCardElement(card);
                    cardElement.classList.add('dealing');
                    playerCards.appendChild(cardElement);
                }, index * 200);
            });
        }
        
        // Add dealer cards
        if (this.gameState.dealer && this.gameState.dealer.hand) {
            this.gameState.dealer.hand.forEach((card, index) => {
                setTimeout(() => {
                    const cardElement = this.createCardElement(card, index === 0 && this.gameState.dealer.hiddenCard);
                    cardElement.classList.add('dealing');
                    dealerCards.appendChild(cardElement);
                }, index * 200);
            });
        }
    }

    updateMultiplayerScores() {
        const playerScore = document.getElementById('playerScore');
        const dealerScore = document.getElementById('dealerScore');
        
        const myPlayer = this.gameState.players.find(p => p.id === this.playerData.id);
        if (myPlayer) {
            playerScore.textContent = myPlayer.score || 0;
        }
        
        if (this.gameState.dealer) {
            dealerScore.textContent = this.gameState.dealer.score || 0;
        }
    }

    createCardElement(card, hidden = false) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.isRed ? 'red' : ''} ${hidden ? 'hidden' : ''}`;
        
        if (!hidden) {
            this.updateCardDisplay(cardElement, card);
        }
        
        return cardElement;
    }

    updateCardDisplay(cardElement, card) {
        cardElement.innerHTML = `
            <div style="font-size: 0.7rem; align-self: flex-start; margin: 2px;">${card.rank}</div>
            <div style="font-size: 1.5rem;">${card.suit}</div>
            <div style="font-size: 0.7rem; align-self: flex-end; margin: 2px; transform: rotate(180deg);">${card.rank}</div>
        `;
    }

    showResults(results) {
        const myResult = results.find(r => r.playerId === this.playerData.id);
        if (myResult) {
            let message = '';
            switch (myResult.result) {
                case 'blackjack':
                    message = `Blackjack! You win $${myResult.winAmount}!`;
                    break;
                case 'win':
                    message = `You win $${myResult.winAmount}!`;
                    break;
                case 'lose':
                    message = `You lose $${Math.abs(myResult.winAmount)}`;
                    break;
                case 'push':
                    message = "It's a tie!";
                    break;
            }
            this.showMessage(message);
        }
    }

    showControls(controlsId) {
        const controls = ['bettingControls', 'gameControls', 'nextHandControls', 'hostControls'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            element.style.display = id === controlsId ? 'flex' : 'none';
        });
    }

    showMessage(message) {
        document.getElementById('gameMessage').textContent = message;
    }

    returnToMenu() {
        if (this.socket) {
            this.socket.emit('leave_table');
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.gameMode = 'solo';
        this.tableId = null;
        this.gameState = null;
        this.soloGame = null;
        this.playerData.bankroll = 100;
        
        this.showScreen('titleScreen');
    }
}

// Solo game class (simplified version of original)
class SoloBlackjackGame {
    constructor(initialBankroll) {
        this.bankroll = initialBankroll;
        this.currentBet = 10;
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = 'betting';
        this.dealerHiddenCard = null;
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];

        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push({
                    rank: rank,
                    suit: suit,
                    value: this.getCardValue(rank),
                    isRed: suit === '♥' || suit === '♦'
                });
            }
        }
        
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getCardValue(rank) {
        if (rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            value += card.value;
            if (card.rank === 'A') aces++;
        }

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    placeBet(betAmount) {
        if (betAmount <= this.bankroll) {
            this.currentBet = betAmount;
            document.getElementById('betAmount').textContent = this.currentBet;
            this.updateBetButtons();
        }
    }

    updateBetButtons() {
        document.querySelectorAll('.bet-btn').forEach(btn => {
            const bet = parseInt(btn.dataset.bet);
            btn.classList.toggle('active', bet === this.currentBet);
            btn.disabled = bet > this.bankroll;
        });
    }

    dealHand() {
        if (this.currentBet > this.bankroll) return;

        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = 'playing';

        setTimeout(() => this.playerHand.push(this.deck.pop()), 100);
        setTimeout(() => {
            this.dealerHiddenCard = this.deck.pop();
            this.dealerHand.push(this.dealerHiddenCard);
        }, 300);
        setTimeout(() => this.playerHand.push(this.deck.pop()), 500);
        setTimeout(() => this.dealerHand.push(this.deck.pop()), 700);

        setTimeout(() => {
            this.updateDisplay();
            this.checkBlackjack();
            game.showControls('gameControls');
        }, 900);

        game.showMessage('Cards dealt! Hit or Stand?');
    }

    hit() {
        if (this.gameState !== 'playing') return;

        this.playerHand.push(this.deck.pop());
        this.updateDisplay();

        const playerValue = this.calculateHandValue(this.playerHand);
        if (playerValue > 21) {
            this.playerBust();
        }
    }

    stand() {
        if (this.gameState !== 'playing') return;
        this.gameState = 'dealer';
        this.dealerPlay();
    }

    dealerPlay() {
        game.showMessage('Dealer playing...');
        game.showControls('none');
        
        this.revealDealerCard();
        
        setTimeout(() => {
            this.dealerDrawCards();
        }, 1000);
    }

    revealDealerCard() {
        const dealerCards = document.getElementById('dealerCards');
        const hiddenCard = dealerCards.querySelector('.card.hidden');
        if (hiddenCard) {
            hiddenCard.classList.add('flipping');
            setTimeout(() => {
                hiddenCard.classList.remove('hidden', 'flipping');
                game.updateCardDisplay(hiddenCard, this.dealerHiddenCard);
                this.updateScores();
            }, 300);
        }
    }

    dealerDrawCards() {
        let dealerValue = this.calculateHandValue(this.dealerHand);
        
        if (dealerValue < 17) {
            this.dealerHand.push(this.deck.pop());
            this.updateDisplay();
            setTimeout(() => this.dealerDrawCards(), 800);
        } else {
            this.endHand();
        }
    }

    checkBlackjack() {
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (playerValue === 21) {
            if (dealerValue === 21) {
                this.endHand('push');
            } else {
                this.endHand('blackjack');
            }
            return true;
        }
        return false;
    }

    playerBust() {
        this.gameState = 'finished';
        game.showMessage('Bust! You lose!');
        this.bankroll -= this.currentBet;
        this.updateBankrollDisplay();
        this.checkGameOver();
        game.showControls('nextHandControls');
    }

    endHand(result = null) {
        this.gameState = 'finished';
        
        if (!result) {
            const playerValue = this.calculateHandValue(this.playerHand);
            const dealerValue = this.calculateHandValue(this.dealerHand);

            if (dealerValue > 21) {
                result = 'dealer_bust';
            } else if (playerValue > dealerValue) {
                result = 'player_wins';
            } else if (dealerValue > playerValue) {
                result = 'dealer_wins';
            } else {
                result = 'push';
            }
        }

        this.processResult(result);
        this.updateBankrollDisplay();
        this.checkGameOver();
        game.showControls('nextHandControls');
    }

    processResult(result) {
        switch (result) {
            case 'blackjack':
                this.bankroll += Math.floor(this.currentBet * 1.5);
                game.showMessage('Blackjack! You win!');
                break;
            case 'player_wins':
                this.bankroll += this.currentBet;
                game.showMessage('You win!');
                break;
            case 'dealer_bust':
                this.bankroll += this.currentBet;
                game.showMessage('Dealer bust! You win!');
                break;
            case 'dealer_wins':
                this.bankroll -= this.currentBet;
                game.showMessage('Dealer wins!');
                break;
            case 'push':
                game.showMessage('Push! It\'s a tie!');
                break;
        }
    }

    nextHand() {
        if (this.bankroll < 10) {
            game.showScreen('gameOverScreen');
            return;
        }
        this.resetHand();
    }

    resetHand() {
        this.playerHand = [];
        this.dealerHand = [];
        this.dealerHiddenCard = null;
        this.gameState = 'betting';
        
        if (this.currentBet > this.bankroll) {
            this.currentBet = Math.min(10, this.bankroll);
        }
        
        this.updateDisplay();
        this.updateBetButtons();
        game.showControls('bettingControls');
        game.showMessage('Place your bet to start');
    }

    checkGameOver() {
        if (this.bankroll < 10) {
            setTimeout(() => game.showScreen('gameOverScreen'), 2000);
        }
    }

    updateDisplay() {
        this.updateCards();
        this.updateScores();
    }

    updateCards() {
        const playerCards = document.getElementById('playerCards');
        const dealerCards = document.getElementById('dealerCards');
        
        playerCards.innerHTML = '';
        dealerCards.innerHTML = '';
        
        this.playerHand.forEach((card, index) => {
            setTimeout(() => {
                const cardElement = game.createCardElement(card);
                cardElement.classList.add('dealing');
                playerCards.appendChild(cardElement);
            }, index * 200);
        });
        
        this.dealerHand.forEach((card, index) => {
            setTimeout(() => {
                const cardElement = game.createCardElement(card, index === 0 && this.gameState === 'playing');
                cardElement.classList.add('dealing');
                dealerCards.appendChild(cardElement);
            }, index * 200);
        });
    }

    updateScores() {
        const playerScore = document.getElementById('playerScore');
        const dealerScore = document.getElementById('dealerScore');
        
        playerScore.textContent = this.calculateHandValue(this.playerHand);
        
        if (this.gameState === 'playing' && this.dealerHand.length > 0) {
            const visibleCards = this.dealerHand.slice(1);
            dealerScore.textContent = this.calculateHandValue(visibleCards);
        } else {
            dealerScore.textContent = this.calculateHandValue(this.dealerHand);
        }
    }

    updateBankrollDisplay() {
        document.getElementById('bankrollAmount').textContent = this.bankroll;
        game.updateSoloUI();
    }
}

// Initialize game when page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new MultiplayerBlackjackGame();
});
