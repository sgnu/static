import { CountUp } from "./deps/countUp.js";

const leaderboardConfig = {
    enabled: false,
    slotHeight: 56,
    gap: 2
};

const scoreOptions = {
    duration: 0.25,
};

const comboOptions = {
    duration: 0.25,
}

const hitOptions = {
    duration: 0.25,
    useGrouping: false,
}

/* --- */

const socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
socket.onopen = () => console.log('Successfully connected!');
socket.onclose = event => {
    console.log('Socket closed connection: ', event);
    socket.send('Client closed!');
}

const animation = {
    playerCombo: new CountUp('player-combo', 0, comboOptions),
    hits100: new CountUp('hits-100', 0, hitOptions),
    hits50: new CountUp('hits-50', 0, hitOptions),
    hits0: new CountUp('hits-0', 0, hitOptions),
}

const elements = {
    maxCombo: document.getElementById('player-max-combo'),
    hitsSB: document.getElementById('hits-sb'),
    leaderboardContainer: document.getElementById('leaderboard-container'),
    hpBar: document.getElementById('hp-bar'),
};

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
                clearLeaderboardContainer();
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
                transitionElement(elements.leaderboardContainer, false, 'left', 8);
            } else {
                transitionElement(elements.leaderboardContainer, true);
            }

            animation.playerCombo.update(data.gameplay.combo.current);
            animation.hits100.update(data.gameplay.hits['100']);
            animation.hits50.update(data.gameplay.hits['50']);
            animation.hits0.update(data.gameplay.hits['0']);

            elements.hpBar.style.width = `${240 * (Math.min(data.gameplay.hp.normal, 180) / 180)}px`;

            if (data.gameplay.combo.current < data.gameplay.combo.max) {
                transitionElement(elements.maxCombo, true);
                elements.maxCombo.innerText = `Max: ${data.gameplay.combo.max}x`;
            } else {
                transitionElement(elements.maxCombo, false, 'bottom', 8);
            }

            if (data.gameplay.hits.sliderBreaks > 0) {
                transitionElement(elements.hitsSB, true);
                elements.hitsSB.innerText = `${data.gameplay.hits.sliderBreaks} SB`;
            } else {
                transitionElement(elements.hitsSB, false, 'bottom', 8);
            }
        }
    }
}


/**
 * 
 * @param {HTMLElement} element 
 * @param {Boolean} fadeIn 
 * @param {String} directionTo direction to move element: top, right, bottom, left
 * @param {Number} distance 
 */
function transitionElement(element, fadeIn, directionTo, distance) {
    if (fadeIn) {
        element.style.opacity = 1;
        element.style.transform = 'translate(0)';
    } else {
        element.style.opacity = 0;
        let translateValue;
        if (directionTo === 'top') {
            translateValue = `0, -${distance}px`;
        } else if (directionTo === 'right') {
            translateValue = `${distance}px, 0`;
        } else if (directionTo === 'bottom') {
            translateValue = `0, ${distance}px`;
        } else if (directionTo === 'left') {
            translateValue = `-${distance}px, 0`;
        } else {
            translateValue = '0';
        }
        element.style.transform = `translate(${translateValue})`;
    }
}

/**
 * Remove all child nodes from the leaderboard container
 */
function clearLeaderboardContainer() {
    while (elements.leaderboardContainer.lastChild) {
        elements.leaderboardContainer.removeChild(elements.leaderboardContainer.lastChild);
    }
}

/**
 * Fill leaderboard element with slot elements
 * @param {} leaderboard 
 */
function generateLeaderboard(leaderboard) {
    if (!leaderboardConfig.enabled) {
        return;
    }

    const ourPlayer = leaderboard.ourplayer;
    clearLeaderboardContainer();
    leaderboard.slots.forEach((slot, index) => {
        createLeaderboardSlotElement(slot, index, ourPlayer);
    });
}

function updateLeaderboardPositions(leaderboard) {
    if (!leaderboardConfig.enabled) {
        return;
    }

    const ourPlayer = leaderboard.ourplayer;
    for (let i = 0; i < leaderboard.slots.length - 1; i++) {
        transitionElement(document.getElementById(`lb-slot-${i}`), false, 'bottom', 32);
        // document.getElementById(`lb-slot-${i}`).style.opacity = 0;
    }

    if (ourPlayer.position <= 6 && ourPlayer.position !== 0) {
        for (let i = 0; i < Math.min(6, leaderboard.slots.length); i++) {
            if (ourPlayer.position === i + 1) { // position is one-idexed
                document.getElementById('lb-our-player').style.top = `${i * (leaderboardConfig.slotHeight + leaderboardConfig.gap)}px`
                transitionElement(document.getElementById('lb-our-player'), true);
                // document.getElementById('lb-our-player').style.opacity = 1;
            } else {
                document.getElementById(`lb-slot-${i}`).style.top = `${i * (leaderboardConfig.slotHeight + leaderboardConfig.gap)}px`
                transitionElement(document.getElementById(`lb-slot-${i}`), true);
                // document.getElementById(`lb-slot-${i}`).style.opacity = 1;
            }
        }
    } else {
        document.getElementById('lb-slot-0').style.top = '0px';
        transitionElement(document.getElementById('lb-slot-0'), true);
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
            transitionElement(slotElement, true);
            // slotElement.style.opacity = 1;
            }
        }
    }
}

/**
 * Creates html element for leaderboard slots
 * @param {LeaderboardSlot} slot 
 * @param {number} index 
 * @param {ourPlayer}
 */
function createLeaderboardSlotElement(slot, index, ourPlayer) {
    const containerElement = document.createElement('div');
    const nameElement = document.createElement('p');
    const scoreElement = document.createElement('p');
    const comboElement = document.createElement('p');
    const isPlayer = isOurPlayer(ourPlayer, slot);
    
    comboElement.className = 'lb-max-combo';
    containerElement.style.top = '-64px';
    containerElement.className = 'lb-slot';
    
    nameElement.innerText = `${slot.position} // ${slot.name} ${formatModString(slot.mods)}`;
    scoreElement.innerText = slot.score.toLocaleString();
    comboElement.innerText = slot.maxCombo;

    containerElement.appendChild(nameElement);
    containerElement.appendChild(scoreElement);
    containerElement.appendChild(comboElement);

    if (isPlayer) {
        containerElement.id = 'lb-our-player';
        scoreElement.id = 'lb-our-player-score';
        comboElement.id = 'lb-our-player-combo';
        nameElement.innerText = `${slot.name} ${formatModString(ourPlayer.mods)}`;
    } else {
        containerElement.id = `lb-slot-${index}`;
    }

    elements.leaderboardContainer.appendChild(containerElement);
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