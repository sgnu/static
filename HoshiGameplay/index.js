const socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
socket.onopen = () => console.log('Successfully connected!');
socket.onclose = event => {
    console.log('Socket closed connection: ', event);
    socket.send('Client closed!');
}

const leaderboardContainer = document.getElementById('leaderboard-container');

/**
 * Beatmap's MD5 checksum to be updated in-game
 */
let leaderboardMD5;

socket.onmessage = event => {
    const data = JSON.parse(event.data);
    const menuState = data.menu.state;

    if (menuState === 2) {  // Playing in-game
        if (data.menu.bm.md5 !== leaderboardMD5) {
            leaderboardMD5 = data.menu.bm.md5;
            clearLeaderboardContainer();
            if (data.gameplay.leaderboard.hasLeaderboard) {
                generateLeaderboard(data.gameplay.leaderboard);
            }
        }
    }
}

/**
 * Remove all child nodes from the leaderboard container
 */
function clearLeaderboardContainer() {
    const leaderboardChildren = leaderboardContainer.children;
    for (let i = 0; i < leaderboardChildren.length; i++) {
        leaderboardChildren[i].remove();
    }
}

function generateLeaderboard(leaderboard) {
    const ourPlayer = leaderboard.ourplayer;
    leaderboard.slots.forEach((slot, index) => {
        const element = document.createElement('div');
        if (isOurPlayer(ourPlayer, slot)) {
            element.id = 'lb-our-player';
        } else {
            element.id = `lb-slot-${index}`;
        }
        leaderboardContainer.appendChild(element);
    });
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