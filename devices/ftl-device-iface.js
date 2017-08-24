'use strict';

class RobotDevice {
    constructor(id, interfaceImpl, config) {
        this.d_id = id;
        this.d_interfaceImpl = interfaceImpl;
        this.d_config = config;
        this.d_type = 'GENERIC_ROBOT_DEVICE';
    }

    get deviceType() {
        return this.d_type;
    }
    
    configurePin(channel, mode) {

    }

    write(portType, channel, value) {

    }

    read(portType, channel, value) {

    }
};

module.exports = RobotDevice;