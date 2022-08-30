const socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
socket.onopen = () => console.log('Successfully connected!');
socket.onclose = event => {
    console.log('Socket closed connection: ', event);
    socket.send('Client closed!');
}

