'use strict';

const EventEmitter = require('events');
const Constants = require('./constants');
const PololuAstarBoard = require('./pololu-astar-board');
const I2C = require('i2c-bus');

class Robot extends EventEmitter {
    constructor(robotConfig) {
        super();
        this.d_config = robotConfig;
        this.d_devices = {};
        this.d_portDeviceMaps = {};
        this.d_ready = false;

        this.d_i2c = I2C.openSync(1);

        this.setupDevices();
    }

    setupDevices() {
        // Read off configuration and generate the device list
        var deviceList = this.d_config.devices;
        for (var i = 0; i < deviceList.length; i++) {
            var deviceSpec = deviceList[i];

            // Generate built in types
            if (deviceSpec.type === 'PololuAstarBoard') {
                this.d_devices[deviceSpec.id] = new PololuAstarBoard(this.d_i2c, 20, deviceSpec.id, deviceSpec.configuration);
            }
            else {
                this.d_devices[deviceSpec.id] = new deviceSpec.implementation(deviceSpec);
            }
        }

        // Map to devices
        var portMap = this.d_config.portMap;
        for (var portName in portMap) {
            var mapInfo = portMap[portName];

            if (this.d_portDeviceMaps[portName] !== undefined) {
                throw new Error('Attempting to assign already mapped port: ' + portName);
            }

            this.d_portDeviceMaps[portName] = {
                device: this.d_devices[mapInfo.deviceId],
                devicePortType: mapInfo.devicePortType,
                devicePort: mapInfo.devicePort
            }
        }
    }

    configureDigitalPinMode(channel, mode) {
        var channelName = 'D-' + channel;
        if (Constants.PinModes[mode] === undefined) {
            throw new Error('Invalid pin mode (' + mode + ') specified');
        }

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            device.configurePin(deviceMapInfo.devicePort, mode);
        }
        else {
            throw new Error('Attempting to set mode on unmapped pin ' + channelName);
        }
    }

    writeDigital(channel, value) {
        var channelName = 'D-' + channel;
        value = !!value;

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            device.write(deviceMapInfo.devicePortType, deviceMapInfo.devicePort, value);
        }
        else {
            throw new Error('Attempting to write to unmapped port ' + channelName);
        }
    }

    writePWM(channel, value) {
        var channelName = 'PWM-' + channel;

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            device.write(deviceMapInfo.devicePortType, deviceMapInfo.devicePort, value);
        }
        else {
            throw new Error('Attempting to write to unmapped port ' + channelName);
        }
    }

    readDigital(channel) {
        var channelName = 'D-' + channel;

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            //return device.readDigital(deviceMapInfo.devicePort);
            return device.read(deviceMapInfo.devicePortType, deviceMapInfo.devicePort);
        }
        else {
            throw new Error('Attempting to read from unmapped port ' + channelName);
        }
    }

    readAnalog(channel) {
        var channelName = 'A-' + channel;

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            return device.read(deviceMapInfo.devicePortType, deviceMapInfo.devicePort);
        }
        else {
            throw new Error('Attempting to read from unmapped port ' + channelName);
        }
    }

    readBattMV() {
        var channelName = 'batt';

        var deviceMapInfo = this.d_portDeviceMaps[channelName];
        if (deviceMapInfo) {
            var device = deviceMapInfo.device;
            return device.read(deviceMapInfo.devicePortType, deviceMapInfo.devicePort);
        }
        else {
            throw new Error('Attempting to read from unmapped port ' + channelName);
        }
    }
};

module.exports = Robot;