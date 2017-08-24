const EventEmitter = require('events');
const Constants = require('./constants');
const InterfaceTypes = require('./interfaces/interface-types');
const BuiltinDeviceTypes = require('./devices/device-types');

class Robot extends EventEmitter {
    constructor(robotConfig) {
        super();
        this.d_config = robotConfig;
        this.d_interfaces = {};
        this.d_devices = {};
        this.d_portDeviceMaps = {};
        this.d_ready = false;
        
        // Assign interfaces
        this.setupInterfaces();

        // And finally set up devices
        this.setupDevices();
    }

    /**
     * Go through the provided list of peripheral interfaces and save them
     */
    setupInterfaces() {
        // This should be a list of objects with the following keys
        // type: Constants.InterfaceTypes.*
        // id: identifier
        // implementation: an instance of the interface
        var interfaceList = this.d_config.interfaces;
        if (!interfaceList) {
            // This is a valid use case, if, for example, this is a mock
            // robot that doesn't have any real hardware
            return;
        }

        for (var i = 0; i < interfaceList.length; i++) {
            var ifaceSpec = interfaceList[i];
            // Verify against the Interface Types that we know of
            if (InterfaceTypes[ifaceSpec.type]) {
                // This is a type we know about, make sure we are good
                if (!(ifaceSpec.implementation instanceof InterfaceTypes[ifaceSpec.type])) {
                    console.warn('Invalid implementation of type: ', ifaceSpec.type);
                    continue;
                }
            }

            // If we are a verified known type, or an unknown type, carry on
            if (this.d_interfaces[ifaceSpec.id]) {
                console.warn('Interface with id ' + ifaceSpec.id + ' already exists');
                continue;
            }

            this.d_interfaces[ifaceSpec.id] = ifaceSpec.implementation;
        }
    }

    getInterface(id) {
        return this.d_interfaces[id];
    }

    setupDevices() {
        // Read off configuration and generate the device list
        var deviceList = this.d_config.devices;
        for (var i = 0; i < deviceList.length; i++) {
            var deviceSpec = deviceList[i];

            var deviceImpl;
            if (BuiltinDeviceTypes[deviceSpec.type]) {
                deviceImpl = BuiltinDeviceTypes[deviceSpec.type];
            }
            else {
                deviceImpl = deviceSpec.implementation;
            }

            this.d_devices[deviceSpec.id] = 
                        new deviceImpl(deviceSpec.id, 
                                       this.getInterface(deviceSpec.interfaceId), 
                                       deviceSpec.config);
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