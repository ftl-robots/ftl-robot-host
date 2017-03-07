'use strict';

class RobotDevice {
    constructor(id, type, iface, config) {
        this.d_id = id;
        this.d_type = type;
        this.d_interface = iface;
        this.d_config = config;
    }

    configurePin(channel, mode) {

    }

    writeDigital(channel, value) {

    }

    writePWM(channel, value) {

    }

    readDigital(channel) {

    }

    readAnalog(channel) {
        
    }
};

module.exports = RobotDevice;