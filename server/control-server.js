// @flow

import log from 'winston';
import ws from 'ws';

import controller from './robot-controller';

function serve(robot, port: number) {
    const wss = new ws.Server({ port });

    log.info('Control server is up');

    wss.on('connection', sock => {
        sock.on('message', msg => {
            const rpc = JSON.parse(msg);

            if (rpc.method === 'move') {
                const [{ x, y }, opts] = rpc.params;

                Object.keys(opts).map(attr => robot.setAttribute(attr, opts[attr]));
                robot.moveTo(x, y).catch(err => log.error(err.trace));

                sock.send(JSON.stringify({
                    result: 'ok',
                    error: null,
                    id: msg.id,
                }));
            }
        });
    });
}

function listen(port: number, done: Function) {
    controller.connect()
        .then(robot => serve(robot, port))
        .then(() => done())
        .catch(err => done(err));
}

module.exports = { listen };
