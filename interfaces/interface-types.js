// Static List of InterfaceType->class
const Constants = require('../constants.js');

const I2CInterface = require('./i2c-iface');
const SerialInterface = require('./serial-iface');

var retMod = {};
retMod[Constants.InterfaceTypes.I2C] = I2CInterface;
retMod[Constants.InterfaceTypes.SERIAL] = SerialInterface;

module.exports = retMod;