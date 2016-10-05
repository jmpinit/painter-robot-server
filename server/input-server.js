// @flow

// accepts JSON RPC calls which provide input parameters

import log from 'winston';
import WebSocket from 'ws';

const ROBOT_MAX_X = 600;
const ROBOT_MAX_Y = 600;

// take input and generate control instructions for robot
function processInput(pos, attributes = {}) {
    const { x, y } = pos;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
        throw new Error('Position out of bounds. Expecting values between 0 and 1.');
    }

    const robX = x * ROBOT_MAX_X;
    const robY = y * ROBOT_MAX_Y;

    const { pressure } = attributes;

    const commands = [];

    commands.push({
        method: 'move',
        params: [{
            x: robX,
            y: robY,
        }],
    });

    if (pressure !== undefined) {
        if (pressure < 0 || pressure > 1) {
            throw new Error('Pressure must be between 0 and 1.');
        }

        console.log('spraying', pressure);

        commands.push({
            method: 'spray',
            params: [{
                color: 'blue',
                size: pressure,
            }],
        });
    }

    return commands;
}

function call(sock, method, params) {
    sock.send(JSON.stringify({
        method,
        params,
        id: 'abc123', // FIXME when we need to track responses
    }));
}

function sendResult(sock, id, result) {
    sock.send(JSON.stringify({
        result,
        error: null,
        id,
    }));
}

function sendError(sock, id, error) {
    if (!error.message) {
        throw new Error('Expecting Error');
    }

    sock.send(JSON.stringify({
        result: null,
        error: error.message,
        id,
    }));
}

function serve(inport: number, outport: number) {
    const wss = new WebSocket.Server({ port: inport });
    const outsock = new WebSocket(`ws://localhost:${outport}`);

    log.info('Input server is up');

    wss.on('connection', insock => {
        log.info('INPUT: new connection');

        insock.on('message', msg => {
            //console.log('processing', msg);

            const rpc = JSON.parse(msg);

            if (rpc.method === 'input') {
                const [{ x, y }, attributes] = rpc.params;

                if (x === undefined || y === undefined) {
                    const err = new Error('Please send position as the first argument in the form { x, y }.');
                    sendError(insock, msg.id, err);
                    return;
                }

                const attrNames = Object.keys(attributes);
                const malformedAttributes = attrNames.filter(name => (
                    !(typeof attributes[name] === 'number') &&
                    (attributes[name] < 0 || attributes[name] > 1)
                ));

                if (malformedAttributes.length > 0) {
                    const err = new Error('Found attribute with a value that is not a number between 0 and 1.');
                    sendError(insock, msg.id, err);
                    return;
                }

                try {
                    // collect rpcs and send them to paint control server
                    const rpcs = processInput({ x, y }, attributes);
                    rpcs.forEach(paintRPC => call(outsock, paintRPC.method, paintRPC.params));

                    // acknowledge success
                    sendResult(insock, msg.id, 'ok');
                } catch (err) {
                    sendError(insock, msg.id, err);
                }
            }
        });
    });
}

function listen(options: Object, done: Function) {
    try {
        serve(options.ports.input, options.ports.output);
        done();
    } catch (e) {
        done(e);
    }
}

module.exports = { listen };
