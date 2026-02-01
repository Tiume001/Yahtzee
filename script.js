/**
 * YAHTZEE ENGINE & UI CONTROLLER
 */

// --- Constants & Config ---
const CONFIG = {
    MAX_ROLLS: 3,
    DICE_COUNT: 5,
    ANIMATION_DURATION: 600, // ms
    BONUS_THRESHOLD: 63,
    BONUS_POINTS: 35,
    STORAGE_KEY: 'yahtzee_state_v1'
};

const CATEGORIES = {
    ones: { name: 'Ones', type: 'upper', id: 'ones' },
    twos: { name: 'Twos', type: 'upper', id: 'twos' },
    threes: { name: 'Threes', type: 'upper', id: 'threes' },
    fours: { name: 'Fours', type: 'upper', id: 'fours' },
    fives: { name: 'Fives', type: 'upper', id: 'fives' },
    sixes: { name: 'Sixes', type: 'upper', id: 'sixes' },
    threeKind: { name: '3 of a Kind', type: 'lower', id: 'threeKind' },
    fourKind: { name: '4 of a Kind', type: 'lower', id: 'fourKind' },
    fullHouse: { name: 'Full House', type: 'lower', id: 'fullHouse' },
    smallStraight: { name: 'Small Straight', type: 'lower', id: 'smallStraight' },
    largeStraight: { name: 'Large Straight', type: 'lower', id: 'largeStraight' },
    yahtzee: { name: 'Yahtzee', type: 'lower', id: 'yahtzee' },
    chance: { name: 'Chance', type: 'lower', id: 'chance' }
};

// --- Game State ---
const State = {
    players: [], // Array of { name: '...', scores: { ... } }
    currentPlayerIndex: 0,
    currentRound: 1,
    dice: [1, 1, 1, 1, 1], // Values 1-6
    heldDice: [false, false, false, false, false], // booleans
    rollsLeft: CONFIG.MAX_ROLLS,
    gameActive: false,
    hasRolled: false, // New flag

    // Reset state for new turn
    startTurn() {
        this.rollsLeft = CONFIG.MAX_ROLLS;
        this.heldDice.fill(false);
        this.hasRolled = false;
        // Do not auto-roll here
    },

    // Basic roll logic (data only)
    rollDice(forceAll = false) {
        if (this.rollsLeft <= 0 && !forceAll) return;

        for (let i = 0; i < CONFIG.DICE_COUNT; i++) {
            if (!this.heldDice[i] || forceAll) {
                this.dice[i] = Math.floor(Math.random() * 6) + 1;
            }
        }
        if (!forceAll) this.rollsLeft--;
        this.hasRolled = true;

        saveGame(); // Save after roll
    }
};

// --- Persistence ---
function saveGame() {
    if (!State.gameActive) return;
    const data = {
        players: State.players,
        currentPlayerIndex: State.currentPlayerIndex,
        currentRound: State.currentRound,
        dice: State.dice,
        heldDice: State.heldDice,
        rollsLeft: State.rollsLeft,
        hasRolled: State.hasRolled,
        gameActive: State.gameActive
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        // Validate basic structure
        if (!data.gameActive || !data.players) return false;

        State.players = data.players;
        State.currentPlayerIndex = data.currentPlayerIndex;
        State.currentRound = data.currentRound;
        State.dice = data.dice;
        State.heldDice = data.heldDice;
        State.rollsLeft = data.rollsLeft;
        State.hasRolled = data.hasRolled;
        State.gameActive = data.gameActive;
        return true;
    } catch (e) {
        console.error("Failed to load save:", e);
        return false;
    }
}

function clearSave() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
}

// --- DOM Elements ---
const UI = {
    screens: {
        setup: document.getElementById('setup-screen'),
        game: document.getElementById('game-screen')
    },
    setup: {
        countDisplay: document.getElementById('player-count-display'),
        btnDecrease: document.getElementById('btn-decrease-players'),
        btnIncrease: document.getElementById('btn-increase-players'),
        namesContainer: document.getElementById('player-names-container'),
        btnStart: document.getElementById('btn-start-game')
    },
    game: {
        playerName: document.getElementById('current-player-name'),
        roundInfo: document.getElementById('current-round'),
        diceWrapper: document.querySelector('.dice-wrapper'),
        rollsLeft: document.getElementById('rolls-left'),
        btnRoll: document.getElementById('btn-roll'),
        suggestionBox: document.getElementById('ai-suggestion'),
        suggestionText: document.getElementById('suggestion-text'),
        // scoreOptions removed
        scoreboardHeader: document.getElementById('scoreboard-header-row'),
        scoreboardBody: document.getElementById('scoreboard-body'),
        btnShowScores: document.getElementById('btn-show-scores'), // Button logic to be removed or repurposed? Let's hide it if always visible.
        btnBackHome: document.getElementById('btn-back-home')
    },
    modal: {
        gameOver: document.getElementById('game-over-modal'),
        winnerName: document.getElementById('winner-name'),
        winnerScore: document.getElementById('winner-score'),
        btnRestart: document.getElementById('btn-restart')
    }
};

// --- Initialization ---
function init() {
    setupEventListeners();

    // Check for save game
    if (loadGame()) {
        // Restore UI
        UI.screens.setup.classList.add('hidden');
        UI.screens.setup.classList.remove('active-screen');
        UI.screens.game.classList.remove('hidden');

        renderDice();
        updateGameUI();
        renderScoreboard();
        generateSuggestion(); // Ensure advice is shown immediately
    } else {
        updatePlayerSetupUI(1);
    }

    // Hide old button if it exists (removed from HTML but let's be safe or just ignore)
    if (UI.game.btnShowScores) UI.game.btnShowScores.style.display = 'none';
}

function setupEventListeners() {
    // Setup Screen
    let playerCount = 1;
    UI.setup.btnDecrease.addEventListener('click', () => {
        if (playerCount > 1) {
            playerCount--;
            updatePlayerSetupUI(playerCount);
        }
    });

    UI.setup.btnIncrease.addEventListener('click', () => {
        if (playerCount < 6) { // Max 6 for now
            playerCount++;
            updatePlayerSetupUI(playerCount);
        }
    });

    UI.setup.btnStart.addEventListener('click', startGame);

    // Game Screen
    UI.game.btnRoll.addEventListener('click', handleRollClick);

    // Dice Click
    UI.game.diceWrapper.addEventListener('click', (e) => {
        const dieEl = e.target.closest('.die');
        if (dieEl) {
            const index = parseInt(dieEl.dataset.index);
            toggleHoldDie(index);
        }
    });

    UI.game.btnBackHome.addEventListener('click', () => {
        if (confirm('Tornare al menu? La partita verrà resettata.')) {
            clearSave();
            location.reload();
        }
    });

    UI.modal.btnRestart.addEventListener('click', () => {
        clearSave();
        location.reload();
    });
}

// ... (updatePlayerSetupUI remains same)
function updatePlayerSetupUI(count) {
    UI.setup.countDisplay.textContent = count;
    UI.setup.namesContainer.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Nome Giocatore ${i}`;
        input.value = `Player ${i}`;
        input.className = 'player-name-input';

        input.style.width = '100%';
        input.style.padding = '12px';
        input.style.marginBottom = '10px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid #334155';
        input.style.backgroundColor = '#0f172a';
        input.style.color = 'white';
        input.style.fontSize = '1rem';

        UI.setup.namesContainer.appendChild(input);
    }
}

// --- Game Logic ---

function startGame() {
    // Collect Names
    const inputs = UI.setup.namesContainer.querySelectorAll('input');
    const playerNames = [];
    inputs.forEach(input => {
        const name = input.value.trim() || input.placeholder;
        playerNames.push(name);
    });

    if (playerNames.length === 0) return;

    State.players = playerNames.map(name => ({
        name: name,
        scores: {}, // Map categoryId -> score
        totalScore: 0
    }));

    State.currentPlayerIndex = 0;
    State.currentRound = 1;
    State.gameActive = true;

    // Switch UI
    UI.screens.setup.classList.add('hidden');
    UI.screens.setup.classList.remove('active-screen');
    UI.screens.game.classList.remove('hidden');

    startTurn();
    saveGame(); // Save initial state
}

function startTurn() {
    State.startTurn();
    updateGameUI();

    // Visual reset to "Pulse" or "Ready" state?
    // Let's hide dice or dim them? Or just leave last state but invalid?
    // Better: Show '?' or make them look inactive.
    // For now, we just keep the previous values but they are not valid for scoring.
    // Or we reset them to 0 (which generates no dots).
    State.dice = [0, 0, 0, 0, 0]; // Reset visual

    renderDice();
    renderDice();
    renderScoreboard(); // Render Table (will be disabled)

    // Advice text removed
    // UI.game.suggestionBox.classList.remove('hidden');
    UI.game.btnRoll.textContent = "TIRA I DADI (3)";
    UI.game.btnRoll.disabled = false;
    UI.game.btnRoll.style.background = "";
}

function handleRollClick() {
    if (State.rollsLeft <= 0) return;

    // ... shake anim ...
    const diceEls = UI.game.diceWrapper.querySelectorAll('.die');
    diceEls.forEach(el => {
        if (!el.classList.contains('held')) {
            el.classList.add('shake-anim');
        }
    });

    setTimeout(() => {
        State.rollDice(); // This sets hasRolled = true
        diceEls.forEach(el => el.classList.remove('shake-anim'));
        renderDice();
        updateGameUI();
        renderScoreboard(); // Now interactive
        // generateSuggestion(); removed
        saveGame(); // Save after roll complete
    }, 500);
}

// ... (toggleHoldDie, renderDice, generateDots, updateGameUI remain mostly same, check button logic) 

function toggleHoldDie(index) {
    if (State.rollsLeft === 3) return;
    State.heldDice[index] = !State.heldDice[index];
    renderDice();
    // generateSuggestion(); removed
    saveGame(); // Save hold state
}

function renderDice() {
    UI.game.diceWrapper.innerHTML = '';
    State.dice.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = `die ${State.heldDice[index] ? 'held' : ''}`;
        if (value === 0) die.classList.add('empty-die'); // Add styling if needed or just blank
        die.dataset.index = index;
        die.dataset.value = value;

        if (value > 0) {
            die.innerHTML = generateDots(value);
        } else {
            die.innerHTML = ''; // Blank
        }
        UI.game.diceWrapper.appendChild(die);
    });
}

function generateDots(value) {
    let dots = '';
    for (let i = 0; i < value; i++) {
        dots += '<div class="dot"></div>';
    }
    return dots;
}

function updateGameUI() {
    const player = State.players[State.currentPlayerIndex];
    UI.game.playerName.textContent = player.name;
    UI.game.roundInfo.textContent = `Round ${State.currentRound}/13`;
    UI.game.roundInfo.textContent = `Round ${State.currentRound}/13`;
    // UI.game.rollsLeft.textContent removed

    UI.game.btnRoll.disabled = State.rollsLeft <= 0;
    if (State.rollsLeft <= 0) {
        UI.game.btnRoll.textContent = "Scegli Punteggio";
        UI.game.btnRoll.style.background = "#94a3b8";
    } else {
        UI.game.btnRoll.textContent = `TIRA I DADI (${State.rollsLeft})`;
        UI.game.btnRoll.style.background = "";
    }

    // Always keep scoreboard fresh
    renderScoreboard();
}

// --- Scoring Logic & Render Board ---
// ... (calculatePossibleScores remains same)
function calculatePossibleScores(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Index 1-6
    let sum = 0;
    dice.forEach(d => {
        counts[d]++;
        sum += d;
    });

    const possible = {};

    // Upper Section
    possible.ones = counts[1] * 1;
    possible.twos = counts[2] * 2;
    possible.threes = counts[3] * 3;
    possible.fours = counts[4] * 4;
    possible.fives = counts[5] * 5;
    possible.sixes = counts[6] * 6;

    // Lower Section
    const hasThreeOfKind = counts.some(c => c >= 3);
    const hasFourOfKind = counts.some(c => c >= 4);
    const hasYahtzee = counts.some(c => c === 5);

    possible.threeKind = hasThreeOfKind ? sum : 0;
    possible.fourKind = hasFourOfKind ? sum : 0;
    possible.yahtzee = hasYahtzee ? 50 : 0;
    possible.chance = sum;

    const hasFullHouse = (counts.includes(3) && counts.includes(2)) || hasYahtzee;
    possible.fullHouse = hasFullHouse ? 25 : 0;

    const uniques = dice.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    let consecutive = 0;
    let maxConsecutive = 0;
    for (let i = 0; i < uniques.length - 1; i++) {
        if (uniques[i + 1] === uniques[i] + 1) {
            consecutive++;
        } else {
            consecutive = 0;
        }
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    }

    possible.smallStraight = (maxConsecutive >= 3) ? 30 : 0;
    possible.largeStraight = (maxConsecutive >= 4) ? 40 : 0;

    return possible;
}

function renderScoreboard() {
    const headerRow = UI.game.scoreboardHeader;
    const body = UI.game.scoreboardBody;
    const possible = calculatePossibleScores(State.dice);

    // 1. Headers
    headerRow.innerHTML = '<th>Categorie</th>';
    State.players.forEach((p, idx) => {
        const th = document.createElement('th');
        th.textContent = p.name;
        if (idx === State.currentPlayerIndex) th.classList.add('current-player-col');
        headerRow.appendChild(th);
    });

    // 2. Body
    body.innerHTML = '';

    // Ordered categories array for consistency
    const catKeys = Object.keys(CATEGORIES); // Or defined order
    const orderedKeys = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'threeKind', 'fourKind', 'fullHouse', 'smallStraight', 'largeStraight', 'yahtzee', 'chance'];

    orderedKeys.forEach(catId => {
        const cat = CATEGORIES[catId];
        const tr = document.createElement('tr');

        // Label
        const tdLabel = document.createElement('td');
        tdLabel.textContent = cat.name;
        tr.appendChild(tdLabel);

        // Player cells
        State.players.forEach((p, pIdx) => {
            const td = document.createElement('td');
            td.className = 'score-cell';
            if (pIdx === State.currentPlayerIndex) {
                td.classList.add('current-player-col');
                // Logic: If filled, show value. If not, show preview relative to current dice
                if (p.scores[catId] !== undefined) {
                    td.textContent = p.scores[catId];
                    td.classList.add('score-filled');
                } else {
                    // Show preview ONLY if hasRolled is true
                    if (State.hasRolled) {
                        const score = possible[catId];
                        td.textContent = score;
                        td.classList.add('score-preview', 'selectable');
                        td.onclick = () => selectScore(catId, score);
                    } else {
                        td.textContent = '-'; // Placeholder waiting for roll
                        td.style.opacity = '0.5';
                    }
                }
            } else {
                // Other players: show score or empty
                if (p.scores[catId] !== undefined) {
                    td.textContent = p.scores[catId];
                } else {
                    td.textContent = '-';
                }
            }
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });

    // Totals Row
    const trTotal = document.createElement('tr');
    trTotal.innerHTML = '<td><strong>Totale</strong></td>';
    State.players.forEach(p => {
        let total = 0;
        Object.values(p.scores).forEach(val => total += val);
        // Bonus check (just rough estimate for live view)
        // Correct implementation requires separating upper/lower or checking properly.
        // Let's do a simple sum for now or robust sum?
        // Let's do robust:
        let upper = 0;
        orderedKeys.slice(0, 6).forEach(k => { if (p.scores[k]) upper += p.scores[k]; });
        if (upper >= 63) total += 35;

        const td = document.createElement('td');
        td.innerHTML = `<strong>${total}</strong>`;
        trTotal.appendChild(td);
    });
    body.appendChild(trTotal);
}

function selectScore(catId, score) {
    const player = State.players[State.currentPlayerIndex];
    player.scores[catId] = score;
    saveGame(); // Save before turn end logic
    endTurn();
}

function endTurn() {
    State.currentPlayerIndex++;
    if (State.currentPlayerIndex >= State.players.length) {
        State.currentPlayerIndex = 0;
        State.currentRound++;
    }

    if (State.currentRound > 13) {
        endGame();
    } else {
        // Alert is annoying every turn, let's just highlight the column
        // window.scrollTo(0, 0); // Scroll to top for mobile?
        startTurn();
        saveGame(); // Save new turn state
    }
}

function endGame() {
    // Show Modal with Winner
    let maxScore = -1;
    let winner = null;

    State.players.forEach(p => {
        let total = 0;
        // Calc proper total with bonus
        let upper = 0;
        ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].forEach(k => { if (p.scores[k]) upper += p.scores[k]; });
        let bonus = (upper >= 63) ? 35 : 0;
        Object.values(p.scores).forEach(s => total += s);
        total += bonus;

        if (total > maxScore) {
            maxScore = total;
            winner = p;
        }
    });

    UI.modal.winnerName.textContent = winner.name;
    UI.modal.winnerScore.textContent = `Punteggio Totale: ${maxScore}`;
    UI.modal.gameOver.classList.remove('hidden');
    clearSave(); // Game over, so clear save
}

// ... (calculatePossibleScores, generateSuggestion etc)



// --- AI / Suggestions ---

function generateSuggestion() {
    const dice = State.dice;
    const possible = calculatePossibleScores(dice);
    const rollsLeft = State.rollsLeft;

    // Simple Heuristic
    let msg = "Tira di nuovo!";

    // 1. Check for Yahtzee
    if (possible.yahtzee === 50) {
        msg = "YAHTZEE! Prendilo subito!";
        // Highlight Yahtzee button?
    }
    // 2. Check for Large Straight
    else if (possible.largeStraight === 40) {
        msg = "Scala Grande! Ottimo punteggio.";
    }
    // 3. Check for 4 of a Kind
    else if (possible.fourKind > 0 && possible.fourKind >= 20) {
        msg = "4 uguali! Buon punteggio.";
    }
    // 4. Full House
    else if (possible.fullHouse === 25) {
        msg = "Full House sicuro.";
    }
    // 5. Early game advice (Rolls left)
    else if (rollsLeft > 0) {
        // Count frequencies
        const counts = [0, 0, 0, 0, 0, 0, 0];
        dice.forEach(d => counts[d]++);
        const maxFreq = Math.max(...counts);
        const valWithMaxFreq = counts.indexOf(maxFreq);

        if (maxFreq === 4) {
            msg = `Tieni i ${valWithMaxFreq} e prova per lo Yahtzee!`;
        } else if (maxFreq === 3) {
            msg = `Tieni i ${valWithMaxFreq} per un 4 of a Kind o Yahtzee.`;
        } else {
            // Check straights possibility?
            msg = "Cerca combinazioni migliori...";
        }
    } else {
        // No rolls left, suggest max points
        let bestCat = '';
        let maxPoints = -1;
        const player = State.players[State.currentPlayerIndex];

        for (const [key, val] of Object.entries(possible)) {
            if (player.scores[key] === undefined && val > maxPoints) {
                maxPoints = val;
                bestCat = CATEGORIES[key].name;
            }
        }

        if (bestCat) {
            msg = `Prendi ${bestCat} per ${maxPoints} punti.`;
        } else {
            msg = "Scegli il male minore..."; // Should not happen often ideally
        }
    }

    UI.game.suggestionText.textContent = msg;
    UI.game.suggestionBox.classList.remove('hidden');
}

// Start
document.addEventListener('DOMContentLoaded', init);
