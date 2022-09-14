import { CountUp } from "./deps/countUp.js";

const useUnicodeMetadata = true;

const leaderboardConfig = {
    enabled: false,
    slotHeight: 56,
    gap: 2
};

const accuracyOptions = {
    duration: 0.25,
    useGrouping: false,
    decimalPlaces: 2,
    suffix: '%',
};

const arOptions = {
    duration: 0.25,
    decimalPlaces: 1,
    prefix: 'AR',
};

const comboOptions = {
    duration: 0.25,
};

const hitOptions = {
    duration: 0.25,
    useGrouping: false,
};

const odOptions = {
    duration: 0.25,
    decimalPlaces: 1,
    prefix: 'OD',
};

const ppOptions = {
    duration: 0.25,
    useGrouping: false,
};

const resultsOptions = {
    duration: 1,
    useGrouping: false,
}

const scoreOptions = {
    duration: 0.25,
};

const starOptions = {
    duration: 0.25,
    decimalPlaces: 2,
    suffix: '★',
};

const urOptions = {
    duration: 0.25,
    useGrouping: false,
    decimalPlaces: 2,
};

const strainGraphSettings = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#ffffff'],
            borderColor: ['#ffffff'],
            fill: false,
            tension: 0.2,
            // parsing: false
        }]
    },
    options: {
        animation: {
            duration: 333,
        },
        scales: {
            x: {
                display: false,
            },
            y: {
                display: false
            }
        },
        elements: {
            point: {
                radius: 0,
            },
        },
        plugins : {
            legend: {
                display: false,
            }
        }
    }
}

/* --- */

const socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
socket.onopen = () => console.log('Successfully connected!');
socket.onclose = event => {
    console.log('Socket closed connection: ', event);
    socket.send('Client closed!');
};

const animation = {
    unstableRate: new CountUp('unstable-rate', 0, urOptions),
    playerCombo: new CountUp('player-combo', 0, comboOptions),
    hits100: new CountUp('hits-100', 0, hitOptions),
    hits50: new CountUp('hits-50', 0, hitOptions),
    hits0: new CountUp('hits-0', 0, hitOptions),
    score: new CountUp('score', 0, scoreOptions),
    accuracy: new CountUp('accuracy', 0, accuracyOptions),
    pp: new CountUp('pp', 0, ppOptions),
    ppForFC: new CountUp('pp-for-fc', 0, ppOptions),
    stars: new CountUp('beatmap-stars', 0, starOptions),
    ar: new CountUp('beatmap-ar', 0, arOptions),
    od: new CountUp('beatmap-od', 0, odOptions),
    resultsPp: new CountUp('results-pp', 0, resultsOptions),
};

const elements = {
    hpBar: document.getElementById('hp-bar'),
    beatmapMetadata: document.getElementById('beatmap-metadata'),
    beatmapID: document.getElementById('beatmap-id'),
    beatmapStatsContainer: document.getElementById('beatmap-stats-container'),
    unstableRate: document.getElementById('unstable-rate'),
    comboHitsContainer: document.getElementById('combo-hits-container'),
    maxCombo: document.getElementById('player-max-combo'),
    hitsSB: document.getElementById('hits-sb'),
    score: document.getElementById('score'),
    accuracy: document.getElementById('accuracy'),
    pp: document.getElementById('pp'),
    ppForFC: document.getElementById('pp-for-fc'),
    leaderboardContainer: document.getElementById('leaderboard-container'),
    results: document.getElementById('results'),
    timeline: document.getElementById('timeline'),
};

const ctx = document.getElementById('strain-graph').getContext('2d');
const strainGraph = new Chart(ctx, strainGraphSettings);

/**
 * Beatmap's MD5 checksum to be updated in-game
 */
let leaderboardMD5;

let timelineCreated = false;

let missCount = 0;
const missArr = [];

let fiftyCount = 0;
const fiftyArr = [];

let hundredCount = 0;
const hundredArr = [];

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
                if (leaderboardConfig.enabled) {
                    animation.leaderboardScore.update(data.gameplay.leaderboard.ourplayer.score);
                    animation.leaderboardCombo.update(data.gameplay.leaderboard.ourplayer.maxCombo);
                }
            }

            if (data.gameplay.leaderboard.isVisible) {
                transitionElement(elements.leaderboardContainer, false, 'left', 8);
            } else {
                transitionElement(elements.leaderboardContainer, true);
            }

            if (data.gameplay.hits['0'] > 0 || data.gameplay.hits.sliderBreaks > 0) {   // not FCing
                transitionElement(elements.ppForFC, true);
                animation.ppForFC.update(data.gameplay.pp.fc);
            } else {
                transitionElement(elements.ppForFC, false, 'bottom', 8);
                animation.ppForFC.update(0);
            }

            if (missCount !== data.gameplay.hits[0]) {
                if (data.gameplay.hits[0] === 0) {
                    missCount = 0;
                    missArr.length = 0;
                } else {
                    missArr.push(data.menu.bm.time.current);
                    missCount = data.gameplay.hits[0];
                }
            }

            if (fiftyCount !== data.gameplay.hits[50]) {
                if (data.gameplay.hits[50] === 0) {
                    fiftyCount = 0;
                    fiftyArr.length = 0;
                } else {
                    fiftyArr.push(data.menu.bm.time.current);
                    fiftyCount = data.gameplay.hits[50];
                }
            }

            if (hundredCount !== data.gameplay.hits[100]) {
                if (data.gameplay.hits[100] === 0) {
                    hundredCount = 0;
                    hundredArr.length = 0;
                } else {
                    hundredArr.push(data.menu.bm.time.current);
                    hundredCount = data.gameplay.hits[100];
                }
            }

            transitionElement(elements.hpBar, true);
            transitionElement(elements.beatmapMetadata, true);
            transitionElement(elements.beatmapID, true);
            transitionElement(elements.beatmapStatsContainer, true);
            transitionElement(elements.unstableRate, true);
            transitionElement(elements.comboHitsContainer, true);
            transitionElement(elements.score, true);
            transitionElement(elements.accuracy, true);
            transitionElement(elements.pp, true);

            animation.unstableRate.update(data.gameplay.hits.unstableRate);
            animation.playerCombo.update(data.gameplay.combo.current);
            animation.hits100.update(data.gameplay.hits['100']);
            animation.hits50.update(data.gameplay.hits['50']);
            animation.hits0.update(data.gameplay.hits['0']);
            animation.score.update(data.gameplay.score);
            animation.accuracy.update(data.gameplay.accuracy);
            animation.pp.update(data.gameplay.pp.current);
            animation.stars.update(data.menu.bm.stats.SR);
            animation.ar.update(data.menu.bm.stats.AR);
            animation.od.update(data.menu.bm.stats.OD);

            elements.hpBar.style.width = `${240 * (Math.min(data.gameplay.hp.normal, 180) / 180)}px`;

            elements.beatmapMetadata.innerText = createMetadataString(data.menu.bm.metadata, data.menu.mods.str);
            elements.beatmapID.innerText = (data.menu.bm.id ? `/b/${data.menu.bm.id}` : '');

            hideSmallRankings();
            if (data.gameplay.hits.grade.current === '') {
                transitionElement(document.getElementById('small-rank-SS'), true); // display SS as placeholder
            } else {
                transitionElement(document.getElementById(`small-rank-${data.gameplay.hits.grade.current}`), true);
            }

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
    } else {
            transitionElement(elements.hpBar, false, 'top', 16);
            transitionElement(elements.beatmapMetadata, false, 'top', 16);
            transitionElement(elements.beatmapID, false, 'top', 16);
            transitionElement(elements.beatmapStatsContainer, false, 'top', 16);
            transitionElement(elements.unstableRate, false, 'bottom', 16);
            transitionElement(elements.comboHitsContainer, false, 'bottom', 16);
            transitionElement(elements.maxCombo, false, 'bottom', 16);
            transitionElement(elements.hitsSB, false, 'bottom', 16);
            transitionElement(elements.score, false, 'top', 16);
            transitionElement(elements.accuracy, false, 'top', 16);
            transitionElement(elements.pp, false, 'top', 16);
            transitionElement(elements.ppForFC, false, 'top', 16)
            transitionElement(elements.leaderboardContainer, false, 'left', 16);
            hideSmallRankings();
    }

    if (data.menu.state === 7) {    // results screen
        if (data.resultsScreen.name === data.gameplay.name) {   // data.gameplay is kept in memory when going from playing to results screen
            if (!timelineCreated) {
                transitionElement(elements.results, true);

                while (elements.timeline.lastChild) {
                    elements.timeline.removeChild(elements.timeline.lastChild);
                }
                updateStrainGraph(data.menu.pp.strains);
                createTimelineObjects(missArr, 'miss', data.menu.bm.time.mp3);
                createTimelineObjects(fiftyArr, 'fifty', data.menu.bm.time.mp3);
                createTimelineObjects(hundredArr, 'hundred', data.menu.bm.time.mp3);
                animation.resultsPp.update(data.gameplay.pp.current);
                timelineCreated = true;
            }
        }
    } else {
        transitionElement(elements.results, false, 'bottom', 64);
        animation.resultsPp.update(0);
        timelineCreated = false;
    }
};


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

function hideSmallRankings() {
    const smallRanks = document.getElementsByClassName('small-rank');
    for (let i = 0; i < smallRanks.length; i++) {
        transitionElement(smallRanks[i], false, 'right', 8);
    }
}

function createMetadataString(metadata, mods) {
    let artist, title;
    if (useUnicodeMetadata) {
        artist = metadata.artistOriginal;
        title = metadata.titleOriginal;
    } else {
        artist = metadata.artist;
        title = metadata.title;
    }

    return `${artist} - ${title} [${metadata.difficulty}] ${formatModString(mods)} by ${metadata.mapper}`;
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

    if (leaderboard.ourplayer.team !== 0) {
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

    if (leaderboard.ourplayer.team !== 0) {
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

function updateStrainGraph(strains) {
    const strainArray = [];
    const indecises = [];
    strains.forEach((strain, index) => {
        strainArray.push({ x: index, y: strain });
        indecises.push(index);
    });
    if (strainArray !== strainGraph.data.datasets[0].data) {
        strainGraph.data.datasets[0].data = strainArray;
        strainGraph.data.labels = indecises;
        strainGraph.update();
    }
}

function createTimelineObjects(hitArray, type, maxTime) {
    console.log(hitArray);
    hitArray.forEach((time) => {
        const hitObject = document.createElement('div');
        hitObject.classList.add('timeline-hit-object');
        hitObject.classList.add(type);
        hitObject.style.left = `${(time / maxTime) * 400}px`;
        elements.timeline.appendChild(hitObject);
    });
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