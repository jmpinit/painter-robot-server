// @flow

import EventEmitter from 'events';

/*
class Wire {
    // send data down the wire
    // tx(data) { }

    // data has been received
    // .on('rx', data => {...})
}
*/

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

export default SerialWire;
