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

        this.d_lastBuf;
        this.d_tempBuffer;
        this.d_inWriteBuffer;
        this.d_writeTimer;
        this.d_inWrite = false;


        // Set up polling
        this.d_i2cPolling = setInterval(this.getBoardStatus.bind(this), 100);
    }

    getBoardStatus() {
        // Make an i2c call to the board to get status 
        // Read 23 bytes from the board
        var buf = this.d_i2c.readSync(this.d_addr, 0x0, 23);
        this.d_lastBuf = buf;
        this.d_outBuf = Buffer.from(this.d_lastBuf);

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
        if (this.d_inWrite && !this.d_inWriteBuffer) {
            this.d_inWriteBuffer = Buffer.from(this.d_tempBuffer);
        }

        if (!this.d_tempBuffer) {
            // Create a temp buffer from the last buffer that we got
            this.d_tempBuffer = Buffer.from(this.d_lastBuf);
        }

        if (!this.d_writeTimer) {
            this.d_writeTimer = setTimeout(this._flushWriteBuffer.bind(this), 25);
        }
    }

    _flushWriteBuffer() {
        // we will set the d_lastBuf to whatever we have now
        this.d_inWrite = true;
        this.d_i2c.writeSync(this.d_addr, 0, this.d_tempBuffer);
        this.d_inWrite = false;
        this.d_lastBuf = Buffer.from(this.d_tempBuffer);
        this.d_writeTimer = undefined;
        this.d_tempBuffer = undefined;

        if (this.d_inWriteBuffer) {
            this.d_lastBuf = Buffer.from(this.d_inWriteBuffer);
            this.d_tempBuffer = Buffer.from(this.d_inWriteBuffer);
            this.d_writeTimer = setTimeout(this._flushWriteBuffer.bind(this), 25);
        }
    }

    _writeByte(register, byte) {
        this._setupWrite();

        var bufferToWrite;
        if (this.d_inWrite) {
            bufferToWrite = this.d_inWriteBuffer;
        }
        else {
            bufferToWrite = this.d_tempBuffer;
        }
        bufferToWrite[register] = byte;
        this.d_lastBuf = Buffer.from(bufferToWrite);
    }

    _writeWord(register, word) {
        this._setupWrite();

        var bufferToWrite;
        if (this.d_inWrite) {
            bufferToWrite = this.d_inWriteBuffer;
        }
        else {
            bufferToWrite = this.d_tempBuffer;
        }

        bufferToWrite[register] = (word >> 8) & 0xFF;
        bufferToWrite[register + 1] = word & 0xFF;
        this.d_lastBuf = Buffer.from(bufferToWrite);
    }

    _writeBuffer(register, buffer) {
        this._setupWrite();

        var bufferToWrite;
        if (this.d_inWrite) {
            bufferToWrite = this.d_inWriteBuffer;
        }
        else {
            bufferToWrite = this.d_tempBuffer;
        }

        for (var i = 0; i < buffer.length; i++) {
            bufferToWrite[register + i] = buffer[i];
        }
        this.d_lastBuf = Buffer.from(bufferToWrite);
    }

    // === External Interface
    configurePin(channel, mode) {
        // 0/1 -> byte 0
        // 2/3 -> byte 1
        // 4/5 -> byte 2
        var configByteIdx = Math.floor(channel / 2);
        var configByte = this.d_lastBuf[configByteIdx];
        
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

        // this.writeByte(configByteIdx, outByte);
        // Write directly first, till we figure out how to buffer properly
        //this.d_i2c.writeByteSync(this.d_addr, configByteIdx, outByte);
        this._writeByte(configByteIdx, outByte);
    }

    writeDigital(channel, value) {
        var oldByte = this.d_lastBuf[18];
        var newByte;
        if (value) {
            newByte = oldByte | (1 << channel);
        }
        else {
            newByte = oldByte & ~(1 << channel);
        }

        // Definitely need buffering
        //this.d_lastBuf[18] = newByte; 

        //this.d_i2c.writeByteSync(this.d_addr, 18, newByte);
        this._writeByte(18, newByte);
    }

    writePWM(channel, value) {
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
        var chOffset = 19 + (channel * 2);

        //this.d_i2c.writeWordSync(this.d_addr, chOffset, (output & 0xFFFF));

        this._writeWord(chOffset, (output & 0xFFFF));
    }

    readDigital(channel) {
        return this.d_boardState.digitalIn[channel];
    }

    readAnalog(channel) {
        return this.d_boardState.analogIn[channel];
    }

    readBattMV() {
        return this.d_boardState.battMV;
    }
};

module.exports = PololuAstarBoard;