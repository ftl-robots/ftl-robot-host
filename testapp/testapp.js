var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const Robot = require('../index');
const FakeI2C = require('../fakei2c');

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
            devicePort: 0
        },
        'D-1': {
            deviceId: 'main-board',
            devicePort: 1
        },
        'D-2': {
            deviceId: 'main-board',
            devicePort: 2
        },
        'D-3': {
            deviceId: 'main-board',
            devicePort: 3
        },
        'D-4': {
            deviceId: 'main-board',
            devicePort: 4
        },
        'D-5': {
            deviceId: 'main-board',
            devicePort: 5
        },
        'A-0': {
            deviceId: 'main-board',
            devicePort: 0
        },
        'A-1': {
            deviceId: 'main-board',
            devicePort: 1
        },
        'A-2': {
            deviceId: 'main-board',
            devicePort: 2
        },
        'A-3': {
            deviceId: 'main-board',
            devicePort: 3
        },
        'A-4': {
            deviceId: 'main-board',
            devicePort: 4
        },
        'batt': {
            deviceId: 'main-board',
            devicePort: 'batt'
        }
    }
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

FakeI2C.on('bufferModified', function (buf) {
    var arrBuf = [];
    for (var i = 0; i < buf.length; i++) {
        arrBuf.push(buf[i]);
    }
    io.sockets.emit('incomingBuffer', arrBuf);
})

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
        battMV: robot.readBattMV()
    };

    io.sockets.emit('hostInput', hostThings);
}, 100);

io.on('connection', function (socket) {
	socket.on('hostOutput', function (data) {
        // This is outbound from the host to the astar
        robot.writeDigital(3, data.dio3);
        robot.writeDigital(4, data.dio4);
        robot.writeDigital(5, data.dio5);

    });

    socket.on('arduinoBuffer', function(buf) {
        var buffer = Buffer.from(buf);
        FakeI2C.writeSync(20, 0, buffer, true);
    });
});

http.listen(3000, function () {
	console.log('WebApp server listening on *:3000');
});