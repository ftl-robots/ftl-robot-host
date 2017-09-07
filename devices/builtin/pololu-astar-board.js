const RobotDevice = require('../ftl-device-iface');
const Constants = require('../../constants');

const MOTOR_MAX_SPEED = 400;

// Map of pin name to arduino pin number
// This should match what is configured on the board
// This is really just for reference
const PIN_MAP = {
    DIO0: 0, 
    DIO1: 1,
    DIO2: 7,
    DIO3: 8,
    DIO4: 15,
    DIO5: 16,

    AIN0: 0, // These will need to get converted to to the corresponding Ax value
    AIN1: 2,
    AIN2: 3,
    AIN3: 4,
    AIN4: 5
}

// ===  Memory Map  ===
var MMAP_CONFIG_SECT_START = 0;
var MMAP_CONFIG_SECT_LEN = 1;


// --- INPUT SECTION ---
var MMAP_INPUT_SECT_START = 1;
var MMAP_INPUT_SECT_LEN = 16;
// - Absolute Positions in the main buffer
var MMAP_INPUT_BUTTONS = 1;
var MMAP_INPUT_DIGITAL = 2;
var MMAP_INPUT_ANALOG = 3; // These are uint_16ts
var MMAP_INPUT_BATT = 15;
// - Relative Positions in the partial buffer (0-based)
var MMAP_INPUT_BUTTONS_REL = 0;
var MMAP_INPUT_DIGITAL_REL = 1;
var MMAP_INPUT_ANALOG_REL = 2;
var MMAP_INPUT_BATT_REL = 14;

// --- OUTPUT SECTION ---
var MMAP_OUTPUT_SECT_START = 17;
var MMAP_OUTPUT_SECT_LEN = 13;
var MMAP_OUTPUT_LED_RED = 17;
var MMAP_OUTPUT_LED_GREEN = 18;
var MMAP_OUTPUT_LED_YELLOW = 19;
var MMAP_OUTPUT_DIGITAL = 20; // 6 of these, bytes
var MMAP_OUTPUT_MOTOR0 = 26;
var MMAP_OUTPUT_MOTOR1 = 28;

/**
 * Class representing an interface to a Pololu Atmel 32u4 based robot control board 
 * that can communicate over i2c, utilizing the protocol defined in astar-protocol.md
 */
class PololuAstarBoard extends RobotDevice {
    constructor(id, interfaceImpl, config) {
        super(id, interfaceImpl, config);
        this.d_type = 'PololuAstarBoard';

        this.d_i2c = interfaceImpl;
        
        if (!config) {
            config = {};
        }

        if (config.addr === undefined) {
            throw new Error('No destination i2c address defined');
        }
        
        this.d_addr = config.addr;
        
        this.d_boardState = {
            buttons: {
                buttonA: false,
                buttonB: false,
                buttonC: false,
            },
            battMV: 0.0,
            leds: {
                red: false,
                green: false,
                yellow: false
            },
            motors:{
                0: 0.0,
                1: 0.0
            },
            digitalIn: [
                false,
                false,
                false,
                false,
                false,
                false
            ],
            analogIn: [
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0 // <-- This is a fake value
            ]
        };

        this.d_motorMaxSpeed = MOTOR_MAX_SPEED;
        // TODO Update this if we are provided something in config

        // Set up polling
        this.d_i2cPolling = setInterval(this.getBoardInputValue.bind(this), 100);
        this.d_lastUpdate = 0;
    }

    getBoardInputValue() {
        // Just grab the INPUT section
        var buf = Buffer.allocUnsafe(MMAP_INPUT_SECT_LEN);
        this.d_i2c.readI2cBlock(this.d_addr, 
                                MMAP_INPUT_SECT_START, 
                                MMAP_INPUT_SECT_LEN, buf, 
                                (err, bytesRead, inpBuf) => {
            if (err) {
                // Skip
            }
            else {
                var timestamp = Date.now();
                if (timestamp > this.d_lastUpdate) {
                    // We can just read right off the buffer
                    var buttonVals = inpBuf[MMAP_INPUT_BUTTONS_REL];
                    var dinVals = inpBuf[MMAP_INPUT_DIGITAL_REL];
                    var ainVals = [0, 0, 0, 0, 0, 0];

                    // Load analog values. Assume network byte order (big endian)
                    for (var i = 0; i < 6; i++) {
                        var byteStart = MMAP_INPUT_ANALOG_REL + (i * 2);
                        ainVals[i] = (inpBuf[byteStart] << 8) + (buf[byteStart + 1]);
                        this.d_boardState.analogIn[i] = ainVals[i];
                    }

                    var battMV = (buf[MMAP_INPUT_BATT_REL] << 8) + buf[MMAP_INPUT_BATT_REL + 1];

                    this.d_boardState.buttons.buttonA = buttonVals & 0x1;
                    this.d_boardState.buttons.buttonB = (buttonVals >> 0x1) & 0x1;
                    this.d_boardState.buttons.buttonC = (buttonVals >> 0x2) & 0x1;

                    for (var i = 0; i < 6; i++) {
                        this.d_boardState.digitalIn[i] = (dinVals >> i) & 0x1;
                    }

                    this.d_boardState.battMV = battMV;

                    this.d_lastUpdate = timestamp;
                }
            }
        });
    }

    // All of these operate on the size of the full buffer
    _writeByte(register, byte) {
        this.d_i2c.writeByte(this.d_addr, register, byte, (err) => {
            if (err) {
                console.warn('Could not writeByte: ', err);
            }
        });
    }

    _writeWord(register, word) {
        this.d_i2c.writeWord(this.d_addr, register, word, (err) => {
            if (err) {
                console.warn('Could not writeWord: ', err);
            }
        });
    }

    // === External Interface
    configurePin(channel, mode) {
        // Config byte layout
        // [ configType ] [ pin ] [ mode ]
        //      0-2        3-5       6-7
        
        // 001 | XYZ | AB
        var configType = 0x20;
        var configPin = (channel << 2) & 0x1C;
        var configMode;

        switch (mode) {
            case Constants.PinModes.INPUT:
                configMode = 0x1;
                break;
            case Constants.PinModes.INPUT_PULLUP:
                configMode = 0x2;
                break;
            case Constants.PinModes.OUTPUT:
                configMode = 0x0;
                break;
        }
        var configByte = configType | configPin | configMode;

        this._writeByte(0x0, configByte);
    }

    write(portType, channel, value) {
        if (portType === Constants.PortTypes.DIGITAL) {
            this._writeDigital(channel, value);
        }
        else if (portType === Constants.PortTypes.PWM) {
            this._writePWM(channel, value);
        }
        else if (portType === 'ASTAR-LED') {
            this._writeLED(channel, value);
        }
        else {
            console.warn("Attempting to write to unsupported port type");
        }
    }

    read(portType, channel) {
        if (portType === Constants.PortTypes.DIGITAL) {
            return this._readDigital(channel);
        }
        else if (portType === Constants.PortTypes.ANALOG) {
            return this._readAnalog(channel);
        }
        else if (portType === 'ASTAR-BUTTON') {
            return this._readButton(channel);
        }
        else if (portType === 'ASTAR-BATT') {
            return this.d_boardState.battMV;
        }
    }

    enable() {
        // Unclear if we need to do this
    }

    disable() {
        // Turn off LEDs and motors
        this._writeLED('RED', false);
        this._writeLED('GREEN', false);
        this._writeLED('YELLOW', false);

        this._writePWM(0, 0);
        this._writePWM(1, 0);
    }

    _writeDigital(channel, value) {
        this._writeByte(MMAP_OUTPUT_DIGITAL + channel, value ? 1 : 0);
    }

    _writeLED(channel, value) {
        var reg = MMAP_OUTPUT_LED_RED;
        if (channel === 'RED') {
            reg = MMAP_OUTPUT_LED_RED;
        }
        else if (channel === 'GREEN') {
            reg = MMAP_OUTPUT_LED_GREEN;
        }
        else if (channel === 'YELLOW') {
            reg = MMAP_OUTPUT_LED_YELLOW;
        }

        this._writeByte(reg, value ? 1 : 0);
    }

    _writePWM(channel, value) {
        // ch 0 is left motor, ch 1 is right motor
        // send -400 to 400
        // take in -255 to 255
        if (value < -255) {
            value = -255;
        }
        if (value > 255) {
            value = 255;
        }

        var isNegative = false;
        var output = 0;

        if (value < 0) {
            isNegative = true;
            value = -value;
        }

        output = (value / 255) * this.d_motorMaxSpeed;
        if (isNegative) {
            output = -output;
        }

        output = Math.round(output);
        
        var reg = MMAP_OUTPUT_MOTOR0;
        if (channel === 1) {
            reg = MMAP_OUTPUT_MOTOR1;
        }
        this._writeWord(reg, (output & 0xFFFF));
    }

    _readDigital(channel) {
        return this.d_boardState.digitalIn[channel];
    }

    _readAnalog(channel) {
        return this.d_boardState.analogIn[channel];
    }

    _readButton(channel) {
        if (channel === 'A') {
            return this.d_boardState.buttons.buttonA;
        }
        else if (channel === 'B') {
            return this.d_boardState.buttons.buttonB;
        }
        else if (channel === 'C') {
            return this.d_boardState.buttons.buttonC;
        }
    }
};

module.exports = PololuAstarBoard;