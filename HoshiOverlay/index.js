import { CountUp } from "./deps/countUp.js";

const leaderboardConfig = {
    slotHeight: 56,
    gap: 2
};

const scoreOptions = {
    duration: 0.25,
};

const comboOptions = {
    duration: 0.25,
}

/* --- */

const socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
socket.onopen = () => console.log('Successfully connected!');
socket.onclose = event => {
    console.log('Socket closed connection: ', event);
    socket.send('Client closed!');
}

const leaderboardContainer = document.getElementById('leaderboard-container');

const animation = {
}

/**
 * Beatmap's MD5 checksum to be updated in-game
 */
let leaderboardMD5;

socket.onmessage = event => {
    const data = JSON.parse(event.data);
    const menuState = data.menu.state;

    if (menuState === 2) {  // Playing in-game
        if (data.gameplay.leaderboard.hasLeaderboard) {
            if (leaderboardMD5 !== data.menu.bm.md5) {
                leaderboardMD5 = data.menu.bm.md5;
                // clearLeaderboardContainer();
                generateLeaderboard(data.gameplay.leaderboard);
                animation.leaderboardScore = new CountUp('lb-our-player-score', 0, scoreOptions);
                animation.leaderboardCombo = new CountUp('lb-our-player-combo', 0, comboOptions);
                updateLeaderboardPositions(data.gameplay.leaderboard);
            } else {
                updateLeaderboardPositions(data.gameplay.leaderboard);
                animation.leaderboardScore.update(data.gameplay.leaderboard.ourplayer.score);
                animation.leaderboardCombo.update(data.gameplay.leaderboard.ourplayer.maxCombo);
            }

            if (data.gameplay.leaderboard.isVisible) {
                leaderboardContainer.style.left = '-8px';
                leaderboardContainer.style.opacity = 0;
            } else {
                leaderboardContainer.style.left = '8px';
                leaderboardContainer.style.opacity = 1;
            }
        }
    }
}

/**
 * Remove all child nodes from the leaderboard container
 */
function clearLeaderboardContainer() {
    while (leaderboardContainer.lastChild) {
        leaderboardContainer.removeChild(leaderboardContainer.lastChild);
    }
}

/**
 * Fill leaderboard element with slot elements
 * @param {} leaderboard 
 */
function generateLeaderboard(leaderboard) {
    const ourPlayer = leaderboard.ourplayer;
    clearLeaderboardContainer();
    leaderboard.slots.forEach((slot, index) => {
        createLeaderboardSlotElement(slot, index, isOurPlayer(ourPlayer, slot));
    });
}

function updateLeaderboardPositions(leaderboard) {
    const ourPlayer = leaderboard.ourplayer;
    for (let i = 1; i < leaderboard.slots.length - 1; i++) {    // skip first because it's always visible
        document.getElementById(`lb-slot-${i}`).style.opacity = 0;
    }

    if (ourPlayer.position <= 6 && ourPlayer.position !== 0) {
        for (let i = 0; i < Math.min(6, leaderboard.slots.length); i++) {
            if (ourPlayer.position === i + 1) { // position is one-idexed
                document.getElementById('lb-our-player').style.top = `${i * (leaderboardConfig.slotHeight + leaderboardConfig.gap)}px`
                document.getElementById('lb-our-player').style.opacity = 1;
            } else {
                document.getElementById(`lb-slot-${i}`).style.top = `${i * (leaderboardConfig.slotHeight + leaderboardConfig.gap)}px`
                document.getElementById(`lb-slot-${i}`).style.opacity = 1;
            }
        }
    } else {
        document.getElementById('lb-slot-0').style.top = '0px';
        document.getElementById('lb-our-player').style.top = '290px';
        for (let i = 0; i < 4; i++) {
            let position;
            if (ourPlayer.position === 0) {
                position = leaderboard.slots.length;
            } else {
                position = ourPlayer.position;
            }
            const slotElement = document.getElementById(`lb-slot-${position - (i + 2)}`);
            if (slotElement) {
            slotElement.style.top = `${290 - ((i + 1) * (leaderboardConfig.slotHeight + leaderboardConfig.gap))}px`;
            slotElement.style.opacity = 1;
            }
        }
    }
}

/**
 * Creates html element for leaderboard slots
 * @param {LeaderboardSlot} slot 
 * @param {number} index 
 */
function createLeaderboardSlotElement(slot, index, isPlayer) {
    const containerElement = document.createElement('div');
    const nameElement = document.createElement('p');
    const scoreElement = document.createElement('p');
    const comboElement = document.createElement('p');
    
    comboElement.className = 'lb-max-combo';
    containerElement.style.top = '-64px';
    containerElement.className = 'lb-slot';
    
    nameElement.innerText  = `${slot.name} ${formatModString(slot.mods)}`;
    scoreElement.innerText = slot.score.toLocaleString();
    comboElement.innerText = slot.maxCombo;

    containerElement.appendChild(nameElement);
    containerElement.appendChild(scoreElement);
    containerElement.appendChild(comboElement);

    if (isPlayer) {
        containerElement.id = 'lb-our-player';
        scoreElement.id = 'lb-our-player-score';
        comboElement.id = 'lb-our-player-combo';
    } else {
        containerElement.id = `lb-slot-${index}`;
    }

    leaderboardContainer.appendChild(containerElement);
}

/**
 * Check if a leaderboard slot is our player
 * @param {LeaderboardSlot} ourPlayer 
 * @param {LeaderboardSlot} player 
 * @returns Boolean
 */
function isOurPlayer(ourPlayer, player) {
    if (ourPlayer.name === player.name) {
        return (ourPlayer.score === player.score);
    } else {
        return false;
    }
}

function formatModString(modString) {
    if (modString === 'NM') {
        return '';
    } else {
        return `+${modString}`;
    }
}

class LeaderboardSlot {
    name;
    score;
    combo;
    maxCombo;
    mods;
    h300;
    h100;
    h50;
    h0;
    team;
    position;
    isPassing;
}