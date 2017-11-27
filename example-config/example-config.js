const Constants = require('../constants');
const MockI2C = require('./mock-i2c');

var config = {
    interfaces: [
        {
            id: 'i2c',
            type: Constants.InterfaceTypes.I2C,
            implementation: new MockI2C(true)
        }
    ],
    devices: [
        {
            id: 'main-board',
            type: 'PololuAstarBoard',
            interfaceId: 'i2c',
            config: {
                addr: 20
            }
        }
    ],
    portMap: {
        'D-0': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'RED',
            direction: Constants.PortDirections.OUTPUT_ONLY
        },
        'D-1': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'YELLOW',
            direction: Constants.PortDirections.OUTPUT_ONLY
        },
        'D-2': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'GREEN',
            direction: Constants.PortDirections.OUTPUT_ONLY
        },
        'D-3': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 0
        },
        'D-4': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 1
        },
        'D-5': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 2
        },
        // Virtual digital ports for buttons
        'D-6': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BUTTON',
            devicePort: 'A',
            direction: Constants.PortDirections.INPUT_ONLY
        },
        'D-7': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BUTTON',
            devicePort: 'B',
            firection: Constants.PortDirections.INPUT_ONLY
        },
        'D-8': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BUTTON',
            devicePort: 'C',
            direction: Constants.PortDirections.INPUT_ONLY
        },
        'A-0': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.ANALOG,
            devicePort: 0
        },
        'A-1': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.ANALOG,
            devicePort: 1
        },
        'A-2': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.ANALOG,
            devicePort: 2
        },
        'A-3': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.ANALOG,
            devicePort: 3
        },
        'A-4': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.ANALOG,
            devicePort: 4
        },
        'batt': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BATT',
            devicePort: 'batt'
        },
        'PWM-0': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.PWM,
            devicePort: 0
        },
        'PWM-1': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.PWM,
            devicePort: 1
        },
    }
}

module.exports = config;