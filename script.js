class BlackjackGame {
    constructor() {
        this.bankroll = 100;
        this.currentBet = 10;
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = 'betting'; // betting, playing, dealer, finished
        this.dealerHiddenCard = null;
        
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
                this.bankroll = parseInt(e.target.dataset.amount);
                this.startGame();
            });
        });

        // Betting controls
        document.querySelectorAll('.bet-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bet = parseInt(e.target.dataset.bet);
                if (bet <= this.bankroll) {
                    this.currentBet = bet;
                    this.updateBetDisplay();
                    this.updateBetButtons();
                }
            });
        });

        // Game controls
        document.getElementById('dealBtn').addEventListener('click', () => this.dealHand());
        document.getElementById('hitBtn').addEventListener('click', () => this.hit());
        document.getElementById('standBtn').addEventListener('click', () => this.stand());
        document.getElementById('nextHandBtn').addEventListener('click', () => this.nextHand());
        document.getElementById('menuBtn').addEventListener('click', () => this.returnToMenu());
        document.getElementById('returnToMenuBtn').addEventListener('click', () => this.returnToMenu());
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    startGame() {
        this.updateBankrollDisplay();
        this.updateBetDisplay();
        this.updateBetButtons();
        this.showScreen('gameScreen');
        this.resetHand();
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

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    dealCard() {
        return this.deck.pop();
    }

    dealHand() {
        if (this.currentBet > this.bankroll) {
            this.showMessage('Insufficient funds!');
            return;
        }

        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameState = 'playing';

        // Deal initial cards with animation delay
        setTimeout(() => this.playerHand.push(this.dealCard()), 100);
        setTimeout(() => {
            this.dealerHiddenCard = this.dealCard();
            this.dealerHand.push(this.dealerHiddenCard);
        }, 300);
        setTimeout(() => this.playerHand.push(this.dealCard()), 500);
        setTimeout(() => this.dealerHand.push(this.dealCard()), 700);

        setTimeout(() => {
            this.updateDisplay();
            this.checkBlackjack();
            this.showControls('gameControls');
        }, 900);

        this.showMessage('Cards dealt! Hit or Stand?');
    }

    hit() {
        if (this.gameState !== 'playing') return;

        this.playerHand.push(this.dealCard());
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
        this.showMessage('Dealer playing...');
        this.showControls('none');
        
        // Reveal hidden card with flip animation
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
                this.updateCardDisplay(hiddenCard, this.dealerHiddenCard);
                this.updateScores();
            }, 300);
        }
    }

    dealerDrawCards() {
        let dealerValue = this.calculateHandValue(this.dealerHand);
        
        if (dealerValue < 17) {
            this.dealerHand.push(this.dealCard());
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
        this.showMessage('Bust! You lose!');
        this.bankroll -= this.currentBet;
        this.updateBankrollDisplay();
        this.checkGameOver();
        this.showControls('nextHandControls');
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
        this.showControls('nextHandControls');
    }

    processResult(result) {
        switch (result) {
            case 'blackjack':
                this.bankroll += Math.floor(this.currentBet * 1.5);
                this.showMessage('Blackjack! You win!');
                break;
            case 'player_wins':
                this.bankroll += this.currentBet;
                this.showMessage('You win!');
                break;
            case 'dealer_bust':
                this.bankroll += this.currentBet;
                this.showMessage('Dealer bust! You win!');
                break;
            case 'dealer_wins':
                this.bankroll -= this.currentBet;
                this.showMessage('Dealer wins!');
                break;
            case 'push':
                this.showMessage('Push! It\'s a tie!');
                break;
        }
    }

    nextHand() {
        if (this.bankroll < 10) {
            this.gameOver();
            return;
        }
        this.resetHand();
    }

    resetHand() {
        this.playerHand = [];
        this.dealerHand = [];
        this.dealerHiddenCard = null;
        this.gameState = 'betting';
        
        // Ensure bet doesn't exceed bankroll
        if (this.currentBet > this.bankroll) {
            this.currentBet = Math.min(10, this.bankroll);
        }
        
        this.updateDisplay();
        this.updateBetDisplay();
        this.updateBetButtons();
        this.showControls('bettingControls');
        this.showMessage('Place your bet to start');
    }

    checkGameOver() {
        if (this.bankroll < 10) {
            setTimeout(() => this.gameOver(), 2000);
        }
    }

    gameOver() {
        this.showScreen('gameOverScreen');
    }

    returnToMenu() {
        this.bankroll = 100;
        this.currentBet = 10;
        this.showScreen('titleScreen');
    }

    updateDisplay() {
        this.updateCards();
        this.updateScores();
    }

    updateCards() {
        const playerCards = document.getElementById('playerCards');
        const dealerCards = document.getElementById('dealerCards');
        
        // Clear existing cards
        playerCards.innerHTML = '';
        dealerCards.innerHTML = '';
        
        // Add player cards
        this.playerHand.forEach((card, index) => {
            setTimeout(() => {
                const cardElement = this.createCardElement(card);
                cardElement.classList.add('dealing');
                playerCards.appendChild(cardElement);
            }, index * 200);
        });
        
        // Add dealer cards
        this.dealerHand.forEach((card, index) => {
            setTimeout(() => {
                const cardElement = this.createCardElement(card, index === 0 && this.gameState === 'playing');
                cardElement.classList.add('dealing');
                dealerCards.appendChild(cardElement);
            }, index * 200);
        });
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

    updateScores() {
        const playerScore = document.getElementById('playerScore');
        const dealerScore = document.getElementById('dealerScore');
        
        playerScore.textContent = this.calculateHandValue(this.playerHand);
        
        if (this.gameState === 'playing' && this.dealerHand.length > 0) {
            // Only show visible dealer card value
            const visibleCards = this.dealerHand.slice(1);
            dealerScore.textContent = this.calculateHandValue(visibleCards);
        } else {
            dealerScore.textContent = this.calculateHandValue(this.dealerHand);
        }
    }

    updateBankrollDisplay() {
        document.getElementById('bankrollAmount').textContent = this.bankroll;
    }

    updateBetDisplay() {
        document.getElementById('betAmount').textContent = this.currentBet;
    }

    updateBetButtons() {
        document.querySelectorAll('.bet-btn').forEach(btn => {
            const bet = parseInt(btn.dataset.bet);
            btn.classList.toggle('active', bet === this.currentBet);
            btn.disabled = bet > this.bankroll;
        });
    }

    showControls(controlsId) {
        const controls = ['bettingControls', 'gameControls', 'nextHandControls'];
        controls.forEach(id => {
            const element = document.getElementById(id);
            element.style.display = id === controlsId ? 'flex' : 'none';
        });
    }

    showMessage(message) {
        document.getElementById('gameMessage').textContent = message;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});
