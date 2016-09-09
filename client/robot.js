function connect() {
    return new WebSocket(`ws://${document.domain}:3001`);
}

function moveTo(sock, x, y) {
    sock.send(JSON.stringify({
        method: 'move',
        params: [{ x, y }],
        id: 'abc123', // TODO real UUID
    }));
}

module.exports = {
    moveTo,
    connect,
};
