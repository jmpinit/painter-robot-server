#include "DynamixelMotor.h"

/*
C - set color (0 to 8)
A - set airflow (0 to 1023)
P - set paint flow (0 or 1)
S - set configuration

example:
    C6
    A500
    P1
    A0
    P0
 */

const String versionString = "0.8.0";

// max length of time paint will be sprayed
// (for safety / convenience)
#define PAINTING_TIMEOUT 1000

#define AIRFLOW_RESOLUTION 1024

// motor max speed
#define MAX_SPEED 256

enum Command {
    CMD_COLOR,
    CMD_AIRFLOW,
    CMD_PAINTFLOW,
    CMD_CONFIG
};

typedef struct AngleLimit {
    int min;
    int max;
} AngleLimit;

AngleLimit colorLimit = { 28, 851 };
AngleLimit airFlowLimit = { 920, 932 };
AngleLimit paintFlowLimit = { 575, 1023 };

DynamixelInterface &motorInterface = *createSerialInterface(Serial1);

DynamixelMotor colorChooserMotor(motorInterface, 1);
DynamixelMotor airFlowMotor(motorInterface, 2);
DynamixelMotor paintFlowMotor(motorInterface, 3);

// TODO make circular
char commandBuffer[16];
int commandIndex = 0;

// true if air or paint is flowing
bool painting = false;

// timers
long timeStartedPainting = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("Effector Spraypaint " + versionString);

    motorInterface.begin(250000);

    initializeMotor(colorChooserMotor, &colorLimit);
    initializeMotor(airFlowMotor, &airFlowLimit);
    initializeMotor(paintFlowMotor, &paintFlowLimit);
}

void loop() {
    // manage timers

    if (painting && millis() - timeStartedPainting > PAINTING_TIMEOUT) {
        stopPainting();
    }

    // handle serial communication

    while (Serial.available() > 0) {
        char c = Serial.read();

        if (c == '\n') {
            // we only watch for carriage return
            // so we ignore newlines
            continue;
        }

        if (c == '\r') {
            // check if there is a command in the buffer 
            switch (parse(commandBuffer)) {
                case CMD_COLOR:
                    setColor(atoi(commandBuffer+1));
                    Serial.println("ok");
                    break;
                case CMD_AIRFLOW:
                    setAirflow(atoi(commandBuffer+1));
                    Serial.println("ok");
                    break;
                case CMD_PAINTFLOW:
                    setPaintflow(atoi(commandBuffer+1));
                    Serial.println("ok");
                    break;
                case CMD_CONFIG:
                    // TODO
                    Serial.println("unimplemented");
                    break;
                default:
                    Serial.println("error: unrecognized command");
            }

            clearBuffer();
        } else {
            if (commandIndex >= sizeof(commandBuffer)) {
                Serial.println("error: command buffer filled");
                clearBuffer();
            } else {
                commandBuffer[commandIndex++] = c;
            }
        }
    }
}

void maybeStartPainting() {
    if (!painting) {
        timeStartedPainting = millis();
        painting = true;
    }
}

void stopPainting() {
    setAirflow(0);
    setPaintflow(0);
    painting = false;
}

int setColor(int color) {
    if (color < 1 || color > 9) {
        // error
        return -1;
    }

    int colorIndex = color - 1;
    int newPos = colorLimit.min + (colorIndex / 8.0 * (colorLimit.max - colorLimit.min));
    colorChooserMotor.goalPosition(newPos);

    return 0;
}

int setAirflow(int airflow) {
    if (airflow >= AIRFLOW_RESOLUTION) {
        // error
        return -1;
    }

    float airflowNorm = ((float)airflow) / ((float)AIRFLOW_RESOLUTION);
    int newPos = airFlowLimit.min + (airflowNorm * (airFlowLimit.max - airFlowLimit.min));
    airFlowMotor.goalPosition(newPos);

    maybeStartPainting();

    return 0;
}

void setPaintflow(int paintflow) {
    if (!(paintflow == 0 || paintflow == 1)) {
        // error
        return -1;
    }

    if (paintflow) {
        paintFlowMotor.goalPosition(paintFlowLimit.max);
        maybeStartPainting();
    } else {
        paintFlowMotor.goalPosition(paintFlowLimit.min);
    }

    return 0;
}

int parse(char *buffer) {
    switch (buffer[0]) {
        case 'C':
            return CMD_COLOR;
        case 'A':
            return CMD_AIRFLOW;
        case 'P':
            return CMD_PAINTFLOW;
        case 'S':
            return CMD_CONFIG;
        default:
            return -1;
    }
}

void clearBuffer() {
    for (int i = 0; i < sizeof(commandBuffer); i++) {
        commandBuffer[i] = 0;
    }

    commandIndex = 0;
}

void initializeMotor(DynamixelMotor motor, AngleLimit *limits){
    motor.init();
    motor.enableTorque();
    motor.speed(MAX_SPEED);
    motor.jointMode(limits->min, limits->max);
}
