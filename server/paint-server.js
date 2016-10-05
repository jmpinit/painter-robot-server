// @flow

// accepts JSON RPC calls which directly tell the robot to move and paint

import log from 'winston';
import ws from 'ws';

import controller from './robot-controller';

function serve(robot, port: number) {
    const wss = new ws.Server({ port });

    wss.on('connection', sock => {
        sock.on('message', msg => {
            const rpc = JSON.parse(msg);

            if (rpc.method === 'move') {
                const [{ x, y }, opts] = rpc.params;

                if (opts !== undefined) {
                    Object.keys(opts).map(attr => robot.setAttribute(attr, opts[attr]));
                }
                
                robot.moveTo(x, y).catch(err => log.error(err.trace));

                sock.send(JSON.stringify({
                    result: 'ok',
                    error: null,
                    id: msg.id,
                }));
            } else if (rpc.method === 'spray') {
                const [{ color, size }] = rpc.params;

                try {
                    robot.spray(color, size);

                    sock.send(JSON.stringify({
                        result: 'ok',
                        error: null,
                        id: msg.id,
                    }));
                } catch (e) {
                    console.error(e.stacktrace);

                    sock.send(JSON.stringify({
                        result: null,
                        error: e.message,
                        id: msg.id,
                    }));
                }
            }
        });
    });
}

function listen(options: Object, done: Function) {
    const { xy, effector } = options;

    controller.connect({ xy, effector })
        .then(robot => serve(robot, options.port))
        .then(() => done())
        .catch(err => done(err));
}

module.exports = { listen };
