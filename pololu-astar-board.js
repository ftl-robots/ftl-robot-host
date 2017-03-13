'use strict';

const RobotDevice = require('./device');
const Constants = require('./constants');

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

class PololuAstarBoard extends RobotDevice {
    constructor(i2c, addr, id, config) {
        super(id, 'PololuAstarBoard', Constants.InterfaceTypes.I2C, config);

        this.d_i2c = i2c;
        this.d_addr = addr;

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
            digitalOut: [
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
                0.0
            ]
        };

        this.d_lastReceivedBuffer;
        this.d_masterBuffer = Buffer.alloc(23);
        this.d_writeBuffer;
        this.d_flushTimer;
        this.d_inWrite = false; // Set to true when we are writing
        this.d_inFlush = false; // Set to true when flushing onto the bus


        this.d_lastBuf;
        this.d_tempBuffer;
        this.d_inWriteBuffer;
        this.d_activeWriteBuffer; // Just a reference to which buffer to write to
        this.d_writeTimer;
        this.d_inWrite = false;


        // Set up polling
        this.d_i2cPolling = setInterval(this.getBoardStatus.bind(this), 100);
    }

    getBoardStatus() {
        // Make an i2c call to the board to get status 
        // Read 23 bytes from the board
        var buf = Buffer.allocUnsafe(23);
        this.d_i2c.readI2cBlockSync(this.d_addr, 0x0, 23, buf);
        this.d_lastReceivedBuffer = buf;

        // Check if we are in write mode
        if (this.d_inWrite) {
            // Just copy bytes 0 to 16 into master
            // these deal with the inputs
            for (var i = 0; i < 17; i++) {
                this.d_masterBuffer[i] = this.d_lastReceivedBuffer[i];
            }
        }
        else {
            // Not in write, just copy to the master buffer 
            this.d_masterBuffer = Buffer.from(this.d_lastReceivedBuffer);
        }

        // The parts we really care about are bytes 3 to 16
        var buttonVals = buf[3];
        var dinVals = buf[4];
        var ainVals = [0, 0, 0, 0, 0];
        for (var i = 0; i < 5; i++) {
            // assume big-endian (network byte order)
            var byteStart = 5 + (i * 2);
            ainVals[i] = (buf[byteStart] << 8) + (buf[byteStart + 1]);
            this.d_boardState.analogIn[i] = ainVals[i];
        }
        var battMV = (buf[15] << 8) + buf[16];

        this.d_boardState.buttons.buttonA = buttonVals & 0x1;
        this.d_boardState.buttons.buttonB = (buttonVals >> 0x1) & 0x1;
        this.d_boardState.buttons.buttonC = (buttonVals >> 0x2) & 0x1;

        for (var i = 0; i < 6; i++) {
            this.d_boardState.digitalIn[i] = (dinVals >> i) & 0x1;
        }

        this.d_boardState.battMV = battMV;
    }

    // Buffered writes 
    // if we don't have a tempBuffer, create one
    // set a timeout for 10-25ms before we send it 
    _setupWrite() {
        if (this.d_inFlush && !this.d_writeBuffer) {
            // If we are in flush mode, create the write buffer if we need to
            this.d_writeBuffer = Buffer.from(this.d_masterBuffer);
        }

        if (this.d_inFlush) {
            this.d_activeWriteBuffer = this.d_writeBuffer;
        }
        else {
            this.d_activeWriteBuffer = this.d_masterBuffer;
        }
        
        // If we're not in write mode yet, set it up
        // We just need to set the flag, since receive buffer does everything else
        if (!this.d_inWrite) {
            this.d_inWrite = true;
        }

        if (!this.d_flushTimer) {
            this.d_flushTimer = setTimeout(this._flushWriteBuffer.bind(this), 25);
        }
    }

    _flushWriteBuffer() {
        this.d_inFlush = true;
        // Copy the master buffer 
        var outBuf = Buffer.from(this.d_masterBuffer);
        this.d_i2c.writeI2cBlockSync(this.d_addr, 0x0, outBuf.length, outBuf);
        this.d_inFlush = false;
        this.d_inWrite = false;
        this.d_flushTimer = undefined;

        if (this.d_writeBuffer) {
            // If the write buffer exists, copy the OUT bits to master buffer 
            // copy the config bits
            this.d_masterBuffer[0] = this.d_writeBuffer[0];
            this.d_masterBuffer[1] = this.d_writeBuffer[1];
            this.d_masterBuffer[2] = this.d_writeBuffer[2];

            for (var i = 17; i < 23; i++) {
                this.d_masterBuffer[i] = this.d_writeBuffer[i];
            }

            // Clear out the flush buffer
            this.d_writeBuffer = undefined;

            // set up the write mode again
            this.d_inWrite = true;
            this.d_flushTimer = setTimeout(this._flushWriteBuffer.bind(this), 25);
        }
    }

    _writeByte(register, byte) {
        this._setupWrite();

        this.d_activeWriteBuffer[register] = byte;
    }

    _writeWord(register, word) {
        this._setupWrite();

        this.d_activeWriteBuffer[register] = (word >> 8) & 0xFF;
        this.d_activeWriteBuffer[register + 1] = word & 0xFF;
    }

    _writeBuffer(register, buffer) {
        this._setupWrite();

        for (var i = 0; i < buffer.length; i++) {
            this.d_activeWriteBuffer[register + i] = buffer[i];
        }
    }

    // === External Interface
    configurePin(channel, mode) {
        // 0/1 -> byte 0
        // 2/3 -> byte 1
        // 4/5 -> byte 2
        var configByteIdx = Math.floor(channel / 2);
        var configByte = this.d_masterBuffer[configByteIdx];
        
        var newSetting = 0x4;
        switch(mode) {
            case Constants.PinModes.INPUT:
                newSetting |= 0x1;
                break;
            case Constants.PinModes.INPUT_PULLUP:
                newSetting |= 0x2;
                break;
            case Constants.PinModes.OUTPUT:
                newSetting |= 0x0;
                break;
        }

        var outByte;
        if (channel % 2 === 0) {
            outByte = ((newSetting << 4) & 0xF0) | (configByte & 0xF);
        }
        else {
            outByte = (configByte & 0xF0) | (newSetting & 0xF);
        }

        this._writeByte(configByteIdx, outByte);
    }

    write(portType, channel, value) {
        if (portType === Constants.PortTypes.DIGITAL) {
            this._writeDigital(channel, value);
        }
        else if (portType === Constants.PortTypes.PWM) {
            this._writePWM(channel, value);
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

    _writeDigital(channel, value) {
        var oldByte = this.d_masterBuffer[18];
        var newByte;
        if (value) {
            newByte = oldByte | (1 << channel);
        }
        else {
            newByte = oldByte & ~(1 << channel);
        }

        this._writeByte(18, newByte);
    }

    _writePWM(channel, value) {
        // ch 0 is left motor, ch 1 is right motor
        // send -400 to 400
        // take in -1 to 1
        // To follow WPILib, -ve input => +ve output 
        var isNegative = false;
        var output = 0;
        if (value < -1) {
            value = -1;
        }
        
        if (value > 1) {
            value = 1;
        }

        if (value < 0) {
            isNegative = true;
            value = -value;
        }

        output = value * 400;
        if (isNegative) {
            output = -output;
        }

        output = Math.round(output);

        //flip to follow WPILib format
        output = -output;
        var chOffset = 19 + (channel * 2);

        this._writeWord(chOffset, (output & 0xFFFF));
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