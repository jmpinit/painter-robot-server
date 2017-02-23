// @flow

import log from 'winston';
import minimist from 'minimist';

import app from './app-server';
import paintServer from './paint-server';
import inputServer from './input-server';

const APP_PORT = 3000;
const PAINT_PORT = 3001;
const INPUT_PORT = 3002;

function startServer(name: string, server: Object, options: ?Object) {
    return new Promise((fulfill, reject) => {
        server.listen(options, err => {
            if (err) {
                log.error(`Cannot start ${name} server: ${err.stack}`);
                reject();
                return;
            }

            log.info(`Started ${name} server`);
            fulfill();
        });
    });
}

function main() {
    const argv = minimist(process.argv.slice(2));

    const xyPort = argv.xy;
    const effectorPort = argv.effector;

    if (xyPort === undefined || effectorPort === undefined) {
        console.log('Please specify robot ports');
        process.exit(1);
        return;
    }

    const paintPromise = startServer('paint', paintServer, {
        port: PAINT_PORT,
        xy: xyPort,
        effector: effectorPort,
    });

    if (argv.headless) {
        // the input will be coming from somewhere outside
        paintPromise.then(() => startServer('input', inputServer, {
            ports: {
                input: INPUT_PORT,
                output: PAINT_PORT,
            },
        }));
    } else {
        // to be self-contained we serve a web app
        paintPromise.then(() => startServer('app', app, {
            port: APP_PORT,
        }));
    }
}

main();
