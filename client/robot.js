// @flow

import Path from './path';

class RobotCommunicator {
    timeOfLastUpdate: number;
    tickTimer: ?number;
    batch: Array<Object>;
    sock: Object;

    rate: number;

    constructor() {
        this.timeOfLastUpdate = 0;
        this.batch = [];
    }

    connect() {
        if (this.sock) {
            throw new Error('Already connected');
        }

        this.sock = new WebSocket(`ws://${document.domain}:3001`);
    }

    addPoint(x: number, y: number) {
        this.batch.push({
            time: Date.now(),
            pos: { x, y },
        });
    }

    moveTo(x: number, y: number, opts: Object = {}) {
        this.sock.send(JSON.stringify({
            method: 'move',
            params: [{ x, y }, opts],
            id: 'abc123', // TODO real UUID
        }));
    }

    spray(color: string, size: number) {
        this.sock.send(JSON.stringify({
            method: 'spray',
            params: [{ color, size }],
            id: 'abc123', // TODO real UUID
        }));
    }

    tick() {
        const points = this.batch.map(pt => [pt.pos.x, pt.pos.y]);
        const path = new Path(points);
        const sparsePath = path.sparsify(2 * (Math.PI / 8));

        sparsePath.points.forEach(pt => {
            this.moveTo(pt[0], pt[1], { feedrate: this.rate });
        });

        this.batch = [];
    }

    stopTicking() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = undefined;
        }
    }

    startTicking(delay: ?number) {
        if (this.tickTimer) {
            throw new Error('Already ticking');
        }

        this.tickTimer = setInterval(() => {
            this.tick();
        }, delay || 100);
    }
}

export default RobotCommunicator;
