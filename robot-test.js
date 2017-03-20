if (process.argv.length >= 3 && process.argv[2].toLowerCase() === 'mock') {
	console.log('Using Mocks');
}

var Robot = require('./index.js');
var Constants = require('./constants');

var robot = new Robot({
    devices: [
        {
            id: 'main-board',
            type: 'PololuAstarBoard',
        }
    ],
    portMap: {
        'D-0': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'RED'
        },
        'D-1': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'YELLOW'
        },
        'D-2': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-LED',
            devicePort: 'GREEN'
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
            devicePort: 'A'
        },
        'D-7': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BUTTON',
            devicePort: 'B'
        },
        'D-8': {
            deviceId: 'main-board',
            devicePortType: 'ASTAR-BUTTON',
            devicePort: 'C'
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
});

// Drive Forward for 5 seconds
robot.setPWM(0, -0.5);
robot.setPWM(1, -0.5);

setTimeout(() => {
	robot.setPWM(0, -0.5);
	robot.setPWM(1, 0.5);

	setTimeout(() => {
		robot.setPWM(0, 0);
		robot.setPWM(1, 0);
	}, 5000);
}, 5000);