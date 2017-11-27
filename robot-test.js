if (process.argv.length >= 3 && process.argv[2].toLowerCase() === 'mock') {
	console.log('Using Mocks');
}

var Robot = require('./robot.js');
var Constants = require('./constants');
var ExampleConfig = require('./example-config/example-config');

var robot = new Robot(ExampleConfig);

console.log('ports: ', robot.getPortList());

// Drive Forward for 5 seconds
robot.writePWM(0, -0.5);
robot.writePWM(1, -0.5);

setTimeout(() => {
	robot.writePWM(0, -0.5);
	robot.writePWM(1, 0.5);

	setTimeout(() => {
		robot.writePWM(0, 0);
		robot.writePWM(1, 0);
	}, 5000);
}, 5000);