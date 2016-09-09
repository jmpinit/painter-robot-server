// @flow

import EventEmitter from 'events';

class NullWire extends EventEmitter {
    tx(data: any) {
        console.log(`NullWire: ${data}`);
    }

    open() {
        return Promise.resolve();
    }
}

class SerialWire extends EventEmitter {
    port: Object;

    constructor(port: Object) {
        super();

        port.on('data', data => this.emit('rx', data));
        port.on('open', () => this.emit('open'));
        port.on('close', () => this.emit('close'));

        this.port = port;
    }

    tx(data: any) {
        this.port.write(data);
    }

    open() {
        return new Promise((fulfill, reject) => {
            this.port.open(err => {
                if (err) {
                    reject(err);
                } else {
                    fulfill();
                }
            });
        });
    }
}

export { SerialWire, NullWire };
