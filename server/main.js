import log from 'winston';

import app from './app-server';
import control from './control-server';

const APP_PORT = 3000;
const CONTROL_PORT = 3001;

control.listen(CONTROL_PORT, err => {
    if (err) {
        log.error('Cannot start control server:', err.stack);
        return;
    }

    log.info(`control: ws://localhost:${CONTROL_PORT}`);
});

app.listen(APP_PORT, () => log.info(`app: http://localhost:${APP_PORT}`));
