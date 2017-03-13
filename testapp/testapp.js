'use strict';

var mockery = require('mockery');
var mockI2c = require('../mocks/mock-i2c');

mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false
});

mockery.registerMock('i2c-bus', mockI2c);

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const Robot = require('../index');
const Constants = require('../constants');

const I2C = require('i2c-bus');
var s_i2c = I2C.openSync(1);

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
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 0
        },
        'D-1': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 1
        },
        'D-2': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 2
        },
        'D-3': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 3
        },
        'D-4': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 4
        },
        'D-5': {
            deviceId: 'main-board',
            devicePortType: Constants.PortTypes.DIGITAL,
            devicePort: 5
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

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

s_i2c.on('bufferModified', function () {
    var arrBuf = [];
    var nBuf = s_i2c.rawBuf;
    for (var i = 0; i < 23; i++) {
        arrBuf.push(nBuf[i]);
    }
    io.sockets.emit('incomingBuffer', arrBuf);
});

setInterval(function() {
    // Generate the display JSON
    var hostThings = {
        dinVals: [
            robot.readDigital(0),
            robot.readDigital(1),
            robot.readDigital(2),
            robot.readDigital(3),
            robot.readDigital(4),
            robot.readDigital(5),
        ],
        ainVals: [
            robot.readAnalog(0),
            robot.readAnalog(1),
            robot.readAnalog(2),
            robot.readAnalog(3),
            robot.readAnalog(4),
        ],
        battMV: robot.readBattMV(),
        buttonA: robot.readDigital(6),
        buttonB: robot.readDigital(7),
        buttonC: robot.readDigital(8)
    };

    io.sockets.emit('hostInput', hostThings);
}, 100);

io.on('connection', function (socket) {
	socket.on('hostOutput', function (data) {
        // This is outbound from the host to the astar
        robot.writeDigital(3, data.dio3);
        robot.writeDigital(4, data.dio4);
        robot.writeDigital(5, data.dio5);

        robot.writePWM(0, data.pwm0);
        robot.writePWM(1, data.pwm1);
    });

    socket.on('arduinoBuffer', function(buf) {
        var buffer = Buffer.from(buf);
        s_i2c.writeI2cBlockSync(20, 0, 23, buffer);
    });
});

http.listen(3000, function () {
	console.log('WebApp server listening on *:3000');
});