# Painter Robot Server

Framework for controlling a large XY plotter painting robot.

![the robot](https://pbs.twimg.com/media/Ctx_4AbWIAQ8ZoU.jpg:large)

## Running

I assume you have a robot.

1. Download this repository (git clone or download [the zip](https://github.com/jmptable/painter-robot-server/archive/master.zip))
2. Install [node.js (v6)](https://nodejs.org/en/download/current/).
3. Open a terminal window and verify that node works by running `node -v`.
4. In the terminal, navigate to where you downloaded the repository.
5. Run `npm install` to install the project's dependencies.
6. Run `npm run build` to build the application.
7. Plug in the robot.
8. Two new serial ports should become available. If you are on OSX then they will be of the form **/dev/tty.usbserial1345**.
7. Run `node build/server.js --xy /dev/tty.usbserial1 --effector /dev/tty.usbserial2`
(replace the port paths with the ones you found in the previous step) to start the application. If nothing works then you may need
to swap the ports in the command.
8. Open Chrome and navigate to the application. It should be located at [http://localhost:3000](http://localhost:3000).

# Headless Mode

Start with the `--headless` flag to not start the web UI and instead accept controldata via the remote API.

## Controls

Hit the enter key to take control of the robot.
The space or escape keys will relinquish control.
Clicking should cause paint to spray.
