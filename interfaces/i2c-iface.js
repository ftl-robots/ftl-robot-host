// Essentially follows the i2c-bus::Bus interface
class I2CInterface {
    
    // Free Resources
    close() {
        throw new Error("Abstract 'close()' called!");
    }

    closeSync() {
        throw new Error("Abstract 'closeSync()' called!");
    }

    // Information
    scan() {
        throw new Error("Abstract 'scan()' called!");
    }

    scanSync() {
        throw new Error("Abstract 'scanSync()' called!");
    }

    // SMBus
    readByte() {
        throw new Error("Abstract 'readByte()' called!");
    }

    readByteSync() {
        throw new Error("Abstract 'readByteSync()' called!");
    }

    readWord() {
        throw new Error("Abstract 'readWord()' called!");
    }

    readWordSync() {
        throw new Error("Abstract 'readWordSync()' called!");
    }

    readI2cBlock() {
        throw new Error("Abstract 'readI2cBlock()' called!");
    }

    readI2cBlockSync() {
        throw new Error("Abstract 'readI2cBlockSync()' called!");
    }

    writeByte() {
        throw new Error("Abstract 'writeByte()' called!");
    }

    writeByteSync() {
        throw new Error("Abstract 'writeByteSync()' called!");
    }

    writeWord() {
        throw new Error("Abstract 'writeWord()' called!");
    }

    writeWordSync() {
        throw new Error("Abstract 'writeWordSync()' called!");
    }

    writeI2cBlock() {
        throw new Error("Abstract 'writeI2cBlock()' called!");
    }

    writeI2cBlockSync() {
        throw new Error("Abstract 'writeI2cBlockSync()' called!");
    }
};

module.exports = I2CInterface;