// @flow

import log from 'winston';
import SerialPort from 'serialport';
import { EventEmitter } from 'events';

import { SerialWire } from './wire';
import * as gcode from './g-code';

const ROBOT_FEEDRATE = '15000';

class RobotController extends EventEmitter {
    initialized: boolean;
    config: Object;
    wireXY: Object;

    constructor(wireXY, wireEffector) {
        super();

        this.wireXY = wireXY;
        this.wireEffector = wireEffector;

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

    setAttribute(attribute, value) {
        switch (attribute) {
        case 'feedrate':
            console.log('setting', attribute, 'to', value);
            this.wireXY.send(gcode.feedRate(value));
            break;
        default:
            throw new Error(`Unrecognized attribute "${attribute}"`);
        }
    }

    // fulfills when the robot has actually reached the specified coordinates
    moveTo(x, y) {
        log.info(`Moving to (${x}, ${y})`);

        if (x >= this.config.limit.x.min &&
            x < this.config.limit.x.max &&
            y >= this.config.limit.y.min &&
            y < this.config.limit.y.max) {
            return Promise.all([
                this.wireXY.send(gcode.position(x, y, 0)),
            ]);
        }

        return Promise.reject(new Error(`Move to (${x}, ${y}) would violate motion limits`));
    }

    spray(color, size) {
        if (size < 0 || size > 1) {
            throw new Error('Size must be between 0 and 1');
        }

        log.info(`Spraying ${color} spot of size ${size}`);

        const colors = [
            'blue', 'orange', 'red', 'green',
            'water', 'water', 'water', 'water',
        ];

        const colorIndex = colors.indexOf(color);

        if (colorIndex === -1) {
            throw new Error(`Unrecognized color "${color}"`);
        }

        const fullSize = Math.floor(1023 * size);

        this.wireEffector.send(`C${colorIndex + 1}`);
        this.wireEffector.send(`A${fullSize}`);
        this.wireEffector.send(size > 0 ? 'P1' : 'P0');
    }

    // Promise to fulfill robot initialization
    initialize() {
        return new Promise((fulfill, reject) => {
            if (this.initialized) {
                reject(new Error('Already initialized'));
                return;
            }

            if (!this.wireXY) {
                reject(new Error('No wireXY plugged in'));
                return;
            }

            this.wireXY.onMessage(msg => msg === 'Grbl 0.9j [\'$\' for help]', () => {
                this.initialized = true;
                log.info('Robot successfully initialized');
                fulfill();
            });

            this.wireXY.open()
                .then(() => (
                    this.wireXY.send(gcode.absolute())
                        .then(() => this.wireXY.send(gcode.feedRate(ROBOT_FEEDRATE)))
                        .then(() => this.wireXY.send(gcode.interpolate()))
                ))
                .catch(err => reject(err));

            this.wireEffector.open()
                .catch(err => reject(err));
        });
    }
}

function control(robotPorts) {
    // the plan here is to decouple the specific wireXY protocol (e.g. serial)
    // from the logical robot control commands (grbl & a custom scheme)

    const portXY = new SerialPort(robotPorts.xy, {
        baudRate: 115200,
        parser: SerialPort.parsers.readline('\n'),
        autoOpen: false,
    });

    const portEffector = new SerialPort(robotPorts.effector, {
        baudRate: 115200,
        parser: SerialPort.parsers.readline('\n'),
        autoOpen: false,
    });

    // to forward control data from the robot controller to the actual robot
    const wireXY = new SerialWire(portXY);
    const wireEffector = new SerialWire(portEffector);

    const controller = new RobotController(wireXY, wireEffector);

    return controller.initialize()
        .then(() => Promise.resolve(controller));
}

function findRobots(opts: Object) {
    // TODO actually look at what's connected and find the robots
    // instead of hardcoding
    console.log(opts);
    return Promise.resolve([opts]);
}

function connect(opts: Object) {
    return findRobots(opts)
        .then(ports => {
            if (ports.length === 0) {
                return Promise.reject(new Error('No robots found!'));
            }

            return control(ports[0]);
        });
}

module.exports = { connect };
