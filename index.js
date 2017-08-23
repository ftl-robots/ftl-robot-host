'use strict';

const Robot = require('./robot');
const Constants = require('./constants');
const I2CInterface = require('./interfaces/i2c-iface');

module.exports = {
    Robot: Robot,
    Constants: Constants,
    Interfaces: {
        I2C: I2CInterface
    }
};