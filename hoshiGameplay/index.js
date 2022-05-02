let socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');

socket.onopen = () => console.log('Successfully conencted');

socket.onclose = event => {
    console.log('Socked closed connection: ', event);
    socket.send("Clinet closed!");
}

const settings = {
    useOriginalMetadata: false,             // Use the original language for metadata
    showCombo: true,                        // Show combo counter in overlay
    showScore: true,
}

// Elements
const bmInfo = document.getElementById('bm-info');
const bmStats = document.getElementById('bm-stats');
const bmAR = document.getElementById('ar');
const bmOD = document.getElementById('od');
const timer = document.getElementById('timer');
const hp = document.getElementById('hp');
const accuracy = document.getElementById('accuracy');
const pp = document.getElementById('current-pp');
const fcPP = document.getElementById('fc-pp');
const score = document.getElementById('score');
const combo = document.getElementById('combo');
const unstableRate = document.getElementById('unstable-rate');
const sliderBreaks = document.getElementById('slider-breaks');
const hits = document.getElementById('hits');
const rankingPanel = document.querySelector('#ranking-panel');
const rankingUR = document.querySelector('#ranking-ur');
const rankingMean = document.querySelector('#ranking-mean');
const rankingPP = document.querySelector('#ranking-pp');
const rankingFCPP = document.querySelector('#ranking-fc-pp');

const topElements = [bmInfo, bmStats, timer, hp, accuracy, pp, fcPP, score, hits];
const bottomElements = [combo, unstableRate];

if (!settings.showCombo) {
    combo.style.visibility = 'hidden';
}

if (!settings.showScore) {
    score.style.visibility = 'hidden';
}


timer.width = 16;
timer.height = 16;
const timerContext = timer.getContext('2d');
timerContext.lineWidth = 8;
timerContext.strokeStyle = '#ffffff80'

socket.onerror = error => console.error(error);

const animation = {
    pp: new CountUp('current-pp', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
    fcPP: new CountUp('fc-pp', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
    combo: new CountUp('combo', 0, 0, 0.1, { useEasing: false, useGrouping: false }),
    score: new CountUp('score', 0, 0, 0, 0.5, {useEasing: true, useGrouping: true, separator: ','}),
    accuracy: new CountUp('accuracy', 0, 0, 2, 0.5, { useEasing: true, useGrouping: false }),
    stars: new CountUp('stars', 0, 0, 2, 0.5, { useEasing: true, useGrouping: false, suffix: '★' }),
    unstableRate: new CountUp('unstable-rate', 0, 0, 2, 0.5, { useEasing: true, useGrouping: false }),
    sliderBreaks: new CountUp('slider-breaks', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
    hundreds: new CountUp('hundreds', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
    fifties: new CountUp('fifties', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
    misses: new CountUp('misses', 0, 0, 0, 0.25, { useEasing: true, useGrouping: false }),
}

socket.onmessage = event => {
    const data = JSON.parse(event.data);
    const menuState = data.menu.state;
    const metadata = data.menu.bm.metadata

    animation.stars.update(data.menu.bm.stats.SR);
    bmAR.innerText = `AR${roundDecimal(data.menu.bm.stats.AR)}`;
    bmOD.innerText = `OD${roundDecimal(data.menu.bm.stats.OD)}`;

    switch (menuState) {
        case 2:     // Playing
            animation.pp.update(data.gameplay.pp.current);
            animation.fcPP.update(data.gameplay.pp.fc);
            animation.combo.update(data.gameplay.combo.current);
            animation.score.update(data.gameplay.score);
            animation.accuracy.update(data.gameplay.accuracy);
            animation.unstableRate.update(data.gameplay.hits.unstableRate);
            animation.sliderBreaks.update(data.gameplay.hits.sliderBreaks);
            animation.hundreds.update(data.gameplay.hits['100']);
            animation.fifties.update(data.gameplay.hits['50']);
            animation.misses.update(data.gameplay.hits['0']);

            bmInfo.innerText = buildMetadata(metadata, data.menu.mods.str);
            
            topElements.forEach(element => {
                element.style.transform = 'translateY(0)';
                element.style.opacity = 1;
            });
            
            bottomElements.forEach(element => {
                element.style.transform = 'translateY(0)';
                element.style.opacity = 1;
            });

            rankingPanel.style.transform = 'translateY(16px)';
            rankingPanel.style.opacity = 0;

            hp.style.width = `${(data.gameplay.hp.normal / 200) * 320}px`;

            if (data.gameplay.hits.sliderBreaks > 0) {
                sliderBreaks.style.transform = 'translateY(0)';
                sliderBreaks.style.opacity = 1;
            } else {
                sliderBreaks.style.transform = 'translateY(8px)';
                sliderBreaks.style.opacity = 0;
            }

            if (data.gameplay.hits.sliderBreaks > 0 || data.gameplay.hits['0'] > 0) { // not FCing 
                fcPP.style.transform = 'translateY(0)';
                fcPP.style.opacity = 1;
            } else { 
                fcPP.style.transform = 'translateY(8px)';
                fcPP.style.opacity = 0;
            }

            if (data.menu.bm.time.current < data.menu.bm.time.firstObj) {
                timerContext.strokeStyle = '#ffffff00';
            } else {
                timerContext.strokeStyle = '#ffffff80';
            }

            timerContext.clearRect(0, 0, timer.width, timer.height);
            let circle = new Path2D();
            circle.arc(8, 8, 4, -0.5 * Math.PI, timeToRadians(data.menu.bm.time));
            timerContext.stroke(circle);
            break;
        case 7:     // Results screen
            topElements.forEach(element => {
                element.style.transform = 'translateY(-8px)';
                element.style.opacity = 0;
            });
            bottomElements.forEach(element => {
                element.style.transform = 'translateY(8)';
                element.style.opacity = 0;
            });
            if (data.gameplay.hits.hitErrorArray !== null) {
                rankingUR.innerText = `${roundDecimal(data.gameplay.hits.unstableRate)} UR`;
                rankingMean.innerText = `${roundDecimal(data.gameplay.hits.hitErrorArray.reduce((total, num) => { return total + num }) / data.gameplay.hits.hitErrorArray.length)}ms mean`;
                rankingPP.innerText = `${data.gameplay.pp.current}pp`;
                if (data.gameplay.hits.sliderBreaks > 0 || data.gameplay.hits['0'] > 0) {
                    rankingFCPP.innerText = `${data.gameplay.pp.maxThisPlay}pp max / ${data.gameplay.pp.fc}pp if FC`;
                }
                rankingPanel.style.transform = 'translateY(0)';
                rankingPanel.style.opacity = 1;
            }
            break;
        case 4:     // Edit song select
        case 5:     // Song select
            animation.pp.update(data.menu.pp[100]);
            topElements.forEach(element => {
                element.style.transform = 'translateY(-8px)';
                element.style.opacity = 0;
            });
            bottomElements.forEach(element => {
                element.style.transform = 'translateY(8)';
                element.style.opacity = 0;
            });
            bmStats.style.transform = 'translateY(0)';
            bmStats.style.opacity = 1;

            rankingPanel.style.transform = 'translateY(16px)';
            rankingPanel.style.opacity = 0;
    }
}

function roundDecimal(decimal) {
    if (decimal % 1 === 0) {
        return decimal;
    } else {
        return (Math.round(decimal * 10) / 10)
    }
}

function timeToRadians(time) {
    const total = time.full - time.firstObj;
    const endAngle = (1 - ((total - (time.current - time.firstObj)) / total)) * 2 * Math.PI - 0.5 * Math.PI;
    return endAngle
}

function buildMetadata(metadata, mods) {
    let metaString = '';
    if (settings.useOriginalMetadata) {
        if (metadata.artistOriginal === '' || metadata.artistOriginal === null) {
            metaString += `${metadata.artist} - `;
        } else {
            metaString += `${metadata.artistOriginal} - `;
        }

        if (metadata.titleOriginal === '' || metadata.titleOriginal === null) {
            metaString += `${metadata.title}`;
        } else {
            metaString += `${metadata.titleOriginal}`;
        }
    } else {
        metaString += `${metadata.artist} - ${metadata.title}`;
    }
    metaString += ` [${metadata.difficulty}]${mods === 'NM'? '' : ' +' + mods}`;
    return metaString;
}