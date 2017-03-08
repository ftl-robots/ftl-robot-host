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

    write(portType, channel, value) {

    }

    read(portType, channel, value) {

    }
};

module.exports = RobotDevice;