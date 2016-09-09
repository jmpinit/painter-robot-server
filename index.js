const express = require('express');
const SerialPort = require('serialport');
const ws = require('ws');

const app = express();

app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Example app listening on port 3000!');
});

const port = new SerialPort('/dev/tty.usbmodem14211', {
    baudRate: 115200,
    parser: SerialPort.parsers.readline('\n'),
    autoOpen: false,
});

// === TODO make class

const robot = {
    ready: false,
    messageQueue: [],
    waiting: false,
};

function sendNext(rob) {
    if (rob.messageQueue.length > 0) {
        const msg = rob.messageQueue.shift();
        console.log(`sending: ${msg}`);
        setTimeout(() => {
            port.write(msg);
            rob.waiting = true;
        }, 10);
    }
}

port.on('data', data => {
    console.log(`got data: ${data}`);

    if (data.toString().trim() === 'Grbl 0.9j [\'$\' for help]') {
        robot.ready = true;
        console.log('ready');
        sendNext(robot);
    } else if (data.toString().trim() === 'ok') {
        robot.waiting = false;
        sendNext(robot);
    }
});

function moveTo(x, y) {
    if (x >= 0 && x < 600 && y >= 0 && y < 600) {
        return ['G90\n', `G0X${x}Y${y}Z0\n`];
    } else {
        console.error(`refusing to move out of bounds to (${x}, ${y})`);
    }
}

function sendToRobot(msgs) {
    msgs.forEach(msg => robot.messageQueue.push(msg));

    if (!robot.waiting) {
        sendNext(robot);
    }
}

port.open(err => {
    if (err) {
        console.log('Error opening port: ', err.message);
    } else {
        console.log('homing...');
        sendToRobot(moveTo(0, 0));
    }
});

port.on('open', () => {
    console.log('port opened');
});

const wss = new ws.Server({ port: 8080 });

wss.on('connection', sock => {
    sock.on('message', msg => {
        console.log(`received: ${msg}`);

        const rpc = JSON.parse(msg);

        if (rpc.method === 'move') {
            const { x, y } = rpc.params[0];

            sendToRobot(moveTo(x, y));

            sock.send(JSON.stringify({
                result: 'ok',
                error: null,
                id: msg.id,
            }));
        }
    });
});