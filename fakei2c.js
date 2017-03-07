'use strict';

const EventEmitter = require('events');

class FakeI2C extends EventEmitter {
    constructor() {
        super();
        this.d_buffer = Buffer.alloc(23);
    }

    writeByteSync(addr, register, byte) {
        this.d_buffer[register] = byte;
        this.emit('bufferModified', Buffer.from(this.d_buffer));
    }

    writeWordSync(addr, register, word) {
        this.d_buffer[register] = (word >> 8) & 0xFF;
        this.d_buffer[register+1] = (word & 0xFF);
        this.emit('bufferModified', Buffer.from(this.d_buffer));
    }

    writeSync(addr, register, buffer, noEvent) {
        for (var i = 0; i < buffer.length; i++) {
            this.d_buffer[register + i] = buffer[i];
        }
        if (!noEvent) {
            this.emit('bufferModified', Buffer.from(this.d_buffer));
        }
    }

    readSync(addr, register, length) {
        var temp = Buffer.from(this.d_buffer);
        return temp.slice(register, register + length);
    }
}
module.exports = new FakeI2C();