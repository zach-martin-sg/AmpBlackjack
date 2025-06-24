const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state management
class GameTable {
    constructor(id, isPrivate = false, hostId = null) {
        this.id = id;
        this.isPrivate = isPrivate;
        this.hostId = hostId;
        this.players = new Map();
        this.dealer = {
            hand: [],
            hiddenCard: null,
            score: 0
        };
        this.deck = [];
        this.gameState = 'waiting'; // waiting, betting, playing, dealer, finished
        this.currentPlayerIndex = 0;
        this.round = 0;
        this.turnTimer = null;
        this.maxPlayers = 5;
        this.createdAt = Date.now();
    }

    addPlayer(playerId, playerData) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        this.players.set(playerId, {
            id: playerId,
            username: playerData.username,
            bankroll: playerData.bankroll,
            currentBet: 0,
            hand: [],
            score: 0,
            status: 'waiting', // waiting, betting, playing, finished
            isReady: false,
            joinedAt: Date.now()
        });
        
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.players.size === 0) {
            return true; // Table should be destroyed
        }
        return false;
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
        
        // Shuffle deck
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

    startNewRound() {
        if (this.players.size < 1) return false;
        
        this.createDeck();
        this.dealer.hand = [];
        this.dealer.hiddenCard = null;
        this.dealer.score = 0;
        this.currentPlayerIndex = 0;
        this.gameState = 'betting';
        this.round++;

        // Reset all players for new round
        for (let player of this.players.values()) {
            player.hand = [];
            player.score = 0;
            player.status = 'betting';
            player.isReady = false;
            player.currentBet = 0;
        }

        return true;
    }

    allPlayersBetPlaced() {
        for (let player of this.players.values()) {
            if (player.status === 'betting' && player.currentBet === 0) {
                return false;
            }
        }
        return true;
    }

    dealInitialCards() {
        // Deal 2 cards to each player and dealer
        const playerIds = Array.from(this.players.keys());
        
        // First card to each player
        for (let playerId of playerIds) {
            const player = this.players.get(playerId);
            player.hand.push(this.deck.pop());
        }
        
        // First card to dealer (hidden)
        this.dealer.hiddenCard = this.deck.pop();
        this.dealer.hand.push(this.dealer.hiddenCard);
        
        // Second card to each player
        for (let playerId of playerIds) {
            const player = this.players.get(playerId);
            player.hand.push(this.deck.pop());
            player.score = this.calculateHandValue(player.hand);
        }
        
        // Second card to dealer (visible)
        this.dealer.hand.push(this.deck.pop());
        this.dealer.score = this.calculateHandValue(this.dealer.hand.slice(1)); // Only visible card
        
        this.gameState = 'playing';
        this.currentPlayerIndex = 0;
    }

    getCurrentPlayer() {
        const playerIds = Array.from(this.players.keys());
        if (this.currentPlayerIndex < playerIds.length) {
            return this.players.get(playerIds[this.currentPlayerIndex]);
        }
        return null;
    }

    nextPlayer() {
        this.currentPlayerIndex++;
        const playerIds = Array.from(this.players.keys());
        
        // Skip players who are finished
        while (this.currentPlayerIndex < playerIds.length) {
            const player = this.players.get(playerIds[this.currentPlayerIndex]);
            if (player.status === 'playing') {
                return player;
            }
            this.currentPlayerIndex++;
        }
        
        // All players finished, start dealer play
        this.gameState = 'dealer';
        return null;
    }

    getGameState() {
        return {
            id: this.id,
            isPrivate: this.isPrivate,
            gameState: this.gameState,
            round: this.round,
            hostId: this.hostId,
            players: Array.from(this.players.values()).map(player => ({
                ...player,
                hand: player.hand,
                score: player.score
            })),
            dealer: {
                hand: this.gameState === 'playing' ? [this.dealer.hand[1]] : this.dealer.hand, // Hide first card during play
                score: this.gameState === 'playing' ? this.calculateHandValue([this.dealer.hand[1]]) : this.dealer.score,
                hiddenCard: this.gameState === 'playing'
            },
            currentPlayer: this.getCurrentPlayer()?.id || null,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers
        };
    }

    getTableInfo() {
        return {
            id: this.id,
            isPrivate: this.isPrivate,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            gameState: this.gameState,
            round: this.round,
            createdAt: this.createdAt,
            players: Array.from(this.players.values()).map(player => ({
                username: player.username,
                status: player.status
            }))
        };
    }
}

// Global state
const tables = new Map();
const players = new Map();
const publicLobby = [];

// Helper functions
function findPublicTable() {
    for (let table of tables.values()) {
        if (!table.isPrivate && table.players.size < table.maxPlayers && table.gameState === 'waiting') {
            return table;
        }
    }
    return null;
}

function getPublicTables() {
    const publicTables = [];
    for (let table of tables.values()) {
        if (!table.isPrivate) {
            publicTables.push(table.getTableInfo());
        }
    }
    return publicTables.sort((a, b) => b.createdAt - a.createdAt); // Newest first
}

function createTable(isPrivate = false, hostId = null) {
    const tableId = uuidv4();
    const table = new GameTable(tableId, isPrivate, hostId);
    tables.set(tableId, table);
    return table;
}

// Socket.IO handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    socket.on('join_lobby', (playerData) => {
        players.set(socket.id, {
            id: socket.id,
            username: playerData.username || `Player${Math.floor(Math.random() * 1000)}`,
            bankroll: playerData.bankroll || 100,
            tableId: null
        });
        
        socket.emit('lobby_joined', {
            playerId: socket.id,
            player: players.get(socket.id)
        });
    });

    socket.on('get_public_tables', () => {
        const publicTables = getPublicTables();
        socket.emit('public_tables_list', publicTables);
    });

    socket.on('join_specific_table', (tableId) => {
        const player = players.get(socket.id);
        const table = tables.get(tableId);
        
        if (!player || !table || table.isPrivate) {
            socket.emit('error', { message: 'Invalid table' });
            return;
        }

        if (table.addPlayer(socket.id, player)) {
            player.tableId = table.id;
            socket.join(table.id);
            
            io.to(table.id).emit('player_joined', {
                player: players.get(socket.id),
                gameState: table.getGameState()
            });

            socket.emit('table_joined', {
                tableId: table.id,
                gameState: table.getGameState()
            });

            // Don't auto-start, let host decide when to start
            // (Remove auto-start logic for multiplayer)
        } else {
            socket.emit('error', { message: 'Table is full' });
        }
    });

    socket.on('create_new_public_table', () => {
        const player = players.get(socket.id);
        if (!player) return;

        const table = createTable(false, socket.id); // Set creator as host
        table.addPlayer(socket.id, player);
        player.tableId = table.id;
        socket.join(table.id);

        socket.emit('table_joined', {
            tableId: table.id,
            gameState: table.getGameState()
        });

        // Broadcast table list update to all lobby users
        io.emit('public_tables_updated', getPublicTables());
    });

    socket.on('host_start_game', () => {
        const player = players.get(socket.id);
        if (!player || !player.tableId) return;

        const table = tables.get(player.tableId);
        if (!table || table.hostId !== socket.id) {
            socket.emit('error', { message: 'Only the host can start the game' });
            return;
        }

        if (table.players.size < 2) {
            socket.emit('error', { message: 'Need at least 2 players to start' });
            return;
        }

        if (table.gameState === 'waiting') {
            table.startNewRound();
            io.to(table.id).emit('round_started', {
                gameState: table.getGameState()
            });
        }
    });

    socket.on('join_public_table', () => {
        const player = players.get(socket.id);
        if (!player) return;

        let table = findPublicTable();
        if (!table) {
            table = createTable(false);
        }

        if (table.addPlayer(socket.id, player)) {
            player.tableId = table.id;
            socket.join(table.id);
            
            io.to(table.id).emit('player_joined', {
                player: players.get(socket.id),
                gameState: table.getGameState()
            });

            socket.emit('table_joined', {
                tableId: table.id,
                gameState: table.getGameState()
            });

            // Start game if enough players
            if (table.players.size >= 1 && table.gameState === 'waiting') {
                table.startNewRound();
                io.to(table.id).emit('round_started', {
                    gameState: table.getGameState()
                });
            }
        } else {
            socket.emit('error', { message: 'Table is full' });
        }
    });

    socket.on('create_private_table', () => {
        const player = players.get(socket.id);
        if (!player) return;

        const table = createTable(true, socket.id);
        table.addPlayer(socket.id, player);
        player.tableId = table.id;
        socket.join(table.id);

        socket.emit('private_table_created', {
            tableId: table.id,
            inviteCode: table.id,
            gameState: table.getGameState()
        });
    });

    socket.on('join_private_table', (inviteCode) => {
        const player = players.get(socket.id);
        const table = tables.get(inviteCode);
        
        if (!player || !table) {
            socket.emit('error', { message: 'Invalid invite code' });
            return;
        }

        if (table.addPlayer(socket.id, player)) {
            player.tableId = table.id;
            socket.join(table.id);
            
            io.to(table.id).emit('player_joined', {
                player: players.get(socket.id),
                gameState: table.getGameState()
            });

            socket.emit('table_joined', {
                tableId: table.id,
                gameState: table.getGameState()
            });
        } else {
            socket.emit('error', { message: 'Table is full' });
        }
    });

    socket.on('place_bet', (betAmount) => {
        const player = players.get(socket.id);
        if (!player || !player.tableId) return;

        const table = tables.get(player.tableId);
        const tablePlayer = table.players.get(socket.id);
        
        if (tablePlayer && table.gameState === 'betting' && betAmount >= 10 && betAmount <= tablePlayer.bankroll) {
            tablePlayer.currentBet = betAmount;
            tablePlayer.status = 'ready';
            
            io.to(table.id).emit('bet_placed', {
                playerId: socket.id,
                betAmount: betAmount,
                gameState: table.getGameState()
            });

            // Check if all players have bet
            if (table.allPlayersBetPlaced()) {
                table.dealInitialCards();
                io.to(table.id).emit('cards_dealt', {
                    gameState: table.getGameState()
                });
            }
        }
    });

    socket.on('player_action', (action) => {
        const player = players.get(socket.id);
        if (!player || !player.tableId) return;

        const table = tables.get(player.tableId);
        const currentPlayer = table.getCurrentPlayer();
        
        if (!currentPlayer || currentPlayer.id !== socket.id) return;

        if (action === 'hit') {
            currentPlayer.hand.push(table.deck.pop());
            currentPlayer.score = table.calculateHandValue(currentPlayer.hand);
            
            if (currentPlayer.score > 21) {
                currentPlayer.status = 'bust';
                table.nextPlayer();
            }
        } else if (action === 'stand') {
            currentPlayer.status = 'stand';
            table.nextPlayer();
        }

        io.to(table.id).emit('player_action_taken', {
            playerId: socket.id,
            action: action,
            gameState: table.getGameState()
        });

        // Check if all players finished
        if (table.gameState === 'dealer') {
            // Dealer plays
            setTimeout(() => {
                table.dealer.score = table.calculateHandValue(table.dealer.hand);
                
                while (table.dealer.score < 17) {
                    table.dealer.hand.push(table.deck.pop());
                    table.dealer.score = table.calculateHandValue(table.dealer.hand);
                }
                
                table.gameState = 'finished';
                
                // Calculate results
                const results = [];
                for (let [playerId, tablePlayer] of table.players) {
                    let result = 'lose';
                    let winAmount = 0;
                    
                    if (tablePlayer.status === 'bust') {
                        result = 'lose';
                        winAmount = -tablePlayer.currentBet;
                    } else if (table.dealer.score > 21) {
                        result = 'win';
                        winAmount = tablePlayer.currentBet;
                    } else if (tablePlayer.score > table.dealer.score) {
                        result = 'win';
                        winAmount = tablePlayer.currentBet;
                    } else if (tablePlayer.score < table.dealer.score) {
                        result = 'lose';
                        winAmount = -tablePlayer.currentBet;
                    } else {
                        result = 'push';
                        winAmount = 0;
                    }
                    
                    // Check for blackjack
                    if (tablePlayer.hand.length === 2 && tablePlayer.score === 21 && result === 'win') {
                        result = 'blackjack';
                        winAmount = Math.floor(tablePlayer.currentBet * 1.5);
                    }
                    
                    tablePlayer.bankroll += winAmount;
                    results.push({
                        playerId: playerId,
                        result: result,
                        winAmount: winAmount,
                        newBankroll: tablePlayer.bankroll
                    });
                }
                
                io.to(table.id).emit('round_finished', {
                    gameState: table.getGameState(),
                    results: results
                });
            }, 2000);
        }
    });

    socket.on('start_new_round', () => {
        const player = players.get(socket.id);
        if (!player || !player.tableId) return;

        const table = tables.get(player.tableId);
        if (table && table.gameState === 'finished') {
            table.startNewRound();
            io.to(table.id).emit('round_started', {
                gameState: table.getGameState()
            });
        }
    });

    socket.on('send_chat', (message) => {
        const player = players.get(socket.id);
        if (!player || !player.tableId) return;

        io.to(player.tableId).emit('chat_message', {
            playerId: socket.id,
            username: player.username,
            message: message,
            timestamp: Date.now()
        });
    });

    socket.on('leave_table', () => {
        leaveTable(socket.id);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        leaveTable(socket.id);
        players.delete(socket.id);
    });

    function leaveTable(playerId) {
        const player = players.get(playerId);
        if (!player || !player.tableId) return;

        const table = tables.get(player.tableId);
        if (table) {
            const shouldDestroy = table.removePlayer(playerId);
            
            if (shouldDestroy) {
                tables.delete(table.id);
            } else {
                io.to(table.id).emit('player_left', {
                    playerId: playerId,
                    gameState: table.getGameState()
                });
            }
        }
        
        if (player) {
            player.tableId = null;
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Game available at http://localhost:${PORT}`);
});
