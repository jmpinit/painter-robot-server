import log from 'winston';
import SerialPort from 'serialport';
import { EventEmitter } from 'events';

import SerialWire from './wire';
import * as gcode from './g-code';

class RobotController extends EventEmitter {
    initialized: boolean;
    txQueue: Array;
    rxQueue: Array;
    config: Object;
    wire: Object;

    constructor() {
        super();

        this.initialized = false;

        this.txQueue = [];
        this.rxQueue = [];

        this.config = {
            limit: {
                x: {
                    min: 0,
                    max: 600,
                },
                y: {
                    min: 0,
                    max: 600,
                },
            },
        };
    }

    // fulfills when the robot has actually reached the specified coordinates
    moveTo(x, y) {
        log.info(`Moving to (${x}, ${y})`);

        if (x >= this.config.limit.x.min &&
            x < this.config.limit.x.max &&
            y >= this.config.limit.y.min &&
            y < this.config.limit.y.max) {
            return Promise.all([
                this.send(gcode.absolute()),
                this.send(gcode.position(x, y, 0)),
            ]);
        }

        return Promise.reject(new Error(`Move to (${x}, ${y}) would violate motion limits`));
    }

    handleMessage(data) {
        const message = data.toString().trim();

        // questionable: ignore empty messages
        if (message.length === 0) {
            return;
        }

        log.info(`Handling message: "${message}"`);

        const handler = this.rxQueue.shift();

        if (!handler) {
            log.warn(`Not handling message: ${data}`);
        } if (handler.match(message)) {
            handler.handle(message);
        } else {
            this.emit('error', new Error(`Unexpected message: ${message}`));
        }

        if (this.txQueue.length !== 0) {
            const msg = this.txQueue.shift();
            this.wire.tx(msg);
        }
    }

    onMessage(match, handle) {
        this.rxQueue.push({ match, handle });
    }

    send(command) {
        const terminatedCommand = `${command}\r`;

        log.info(`Sending "${command}"`);

        return new Promise(fulfill => {
            if (this.rxQueue.length === 0) {
                this.wire.tx(terminatedCommand);
            } else {
                this.txQueue.push(terminatedCommand);
            }

            this.rxQueue.push({
                match: msg => msg === 'ok',
                handle: () => fulfill(),
            });
        });
    }

    plug(wire) {
        if (this.wire) {
            throw new Error('Wire already plugged into this controller');
        } else {
            wire.on('rx', data => this.handleMessage(data));
            this.wire = wire;
            log.info('Communications wire plugged in');
        }
    }

    // Promise to fulfill robot initialization
    initialize() {
        return new Promise((fulfill, reject) => {
            if (this.initialized) {
                reject(new Error('Already initialized'));
                return;
            }

            if (!this.wire) {
                reject(new Error('No wire plugged in'));
                return;
            }

            this.onMessage(msg => msg === 'Grbl 0.9j [\'$\' for help]', () => {
                this.initialized = true;
                log.info('Robot successfully initialized');
                fulfill();
            });

            this.wire.open().catch(err => reject(err));
        });
    }
}

function control(portPath) {
    // the plan here is to decouple the specific wire protocol (e.g. serial)
    // from the logical robot control commands (grbl & a custom scheme)

    const port = new SerialPort(portPath, {
        baudRate: 115200,
        parser: SerialPort.parsers.readline('\n'),
        autoOpen: false,
    });

    const wire = new SerialWire(port);
    const controller = new RobotController();

    // forward control data from the robot model to the actual robot
    controller.plug(wire);

    return controller.initialize()
        .then(() => Promise.resolve(controller));
}

function findRobots() {
    // TODO actually look at what's connected and find the robots
    return Promise.resolve(['/dev/tty.usbmodem14211']);
}

function connect() {
    return findRobots()
        .then(ports => {
            if (ports.length === 0) {
                return Promise.reject(new Error('No robots found!'));
            }

            return control(ports[0]);
        });
}

module.exports = { connect };
