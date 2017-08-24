const EventEmitter = require('events');
// Essentially follows the serialport::SerialPort interface
class SerialInterface extends EventEmitter {
    constructor() {
        super();
    }

    write() {
        throw new Error("Abstract 'write()' called!");
    }

    read() {
        throw new Error("Abstract 'read()' called!");
    }

    close() {
        throw new Error("Abstract 'close()' called!");
    }

    flush() {
        throw new Error("Abstract 'flush()' called!");
    }

    drain() {
        throw new Error("Abstract 'drain()' called!");
    }

    pause() {
        throw new Error("Abstract 'pause()' called!");
    }

    resume() {
        throw new Error("Abstract 'resume()' called!");
    }
};

module.exports = SerialInterface;