#include <Servo.h>
#include <Romi32U4.h>
#include <PololuRPiSlave.h>

#define PIN_MODE_INPUT 0
#define PIN_MODE_OUTPUT 1

struct Data {
  //--- Configuration
  byte configRegister; // 0

  //--- Input (board -> rpi)
  byte buttonVals; // 1
  byte dinVals; // 2
  uint16_t analog[6]; // 3 - 14
  uint16_t batteryMillivolts; // 15 - 16

  //--- Output (rpi -> board)
  bool ledValRed; // 17
  bool ledValGreen; // 18
  bool ledValYellow; // 19
  bool doutVals[6]; // 20-25
  int16_t leftMotor; // 26-27
  int16_t rightMotor; // 28-29
};

PololuRPiSlave<struct Data, 5> slave;
Romi32U4Buzzer buzzer;
Romi32U4Motors motors;
Romi32U4ButtonA buttonA;
Romi32U4ButtonB buttonB;
Romi32U4ButtonC buttonC;

int digitalPinMap[6] = {0, 1, 7, 8, 15, 16};
int analogPinMap[5] = {A0, A2, A3, A4, A5};
byte digitalPinConfigs[6] = {0, 0, 0, 0, 0, 0};

int getPinMode(int vPin) {
  if (digitalPinConfigs[vPin] == 1 ||
      digitalPinConfigs[vPin] == 2) {
    return PIN_MODE_INPUT;      
  }
  return PIN_MODE_OUTPUT;
}

// Wrapper around digital read to also take into account the pin mode
// and do the mapping to the actual digital pins from 'virtual pin number'
bool doDigitalRead(int vPin) {
  if (getPinMode(vPin) == PIN_MODE_INPUT) {
    return digitalRead(digitalPinMap[vPin]);
  }
  return false;
}

void doDigitalWrite(int vPin, bool val) {
  if (getPinMode(vPin) == PIN_MODE_OUTPUT) {
    digitalWrite(digitalPinMap[vPin], val);
  }
}

void setup() {
  // Set up the slave at I2C address 20 (0x14)
  slave.init(20);

  // Play startup sound
  buzzer.play("v10>>g16>>>c16");
}

void loop() {
  // Call updateBuffer() before using the buffer, to get the latest
  // data, including recent master writes
  slave.updateBuffer();

  // If the high 3 bits of the config byte are set, then we have changes
  byte configByte = slave.buffer.configRegister;
  byte configCmd = (configByte >> 5) & 0xF;
  if ( configCmd ) {
    // We have things to configure
    if (configCmd == 0x1) {
      // Pin config
      int pin = (configByte >> 2) & 0x7;
      int mode = configByte & 0x3;
      if (mode == 0) {
        pinMode(digitalPinMap[pin], OUTPUT);
      }
      else if (mode == 1) {
        pinMode(digitalPinMap[pin], INPUT);
      }
      else if (mode == 2) {
        pinMode(digitalPinMap[pin], INPUT_PULLUP);
      }
      digitalPinConfigs[pin] = mode;
    }
  }

  // Zero out the register
  slave.buffer.configRegister = 0;
  
  // Gather up our input 
  byte buttonVals = (buttonC.isPressed() ? 0x4 : 0x0) | 
                    (buttonB.isPressed() ? 0x2 : 0x0) |
                    (buttonA.isPressed() ? 0x1 : 0x0);
  slave.buffer.buttonVals = buttonVals;
  
  // loop through the input pins
  byte dinVals = 0;
  for (uint8_t i = 0; i < 6; i++) {
    dinVals |= (doDigitalRead(i) << i);
  }
  slave.buffer.dinVals = dinVals;

  for (uint8_t i = 0; i < 5; i++) {
    slave.buffer.analog[i] = analogRead(analogPinMap[i]);
  }

  slave.buffer.batteryMillivolts = readBatteryMillivolts();

  // Handle the outputs
  ledYellow(slave.buffer.ledValYellow);
  ledGreen(slave.buffer.ledValGreen);
  ledRed(slave.buffer.ledValRed);

  for (uint8_t i = 0; i < 6; i++) {
    doDigitalWrite(i, slave.buffer.doutVals[i]);
  }

  motors.setSpeeds(slave.buffer.leftMotor, slave.buffer.rightMotor);

  // Done writing. Flush the buffer
  slave.finalizeWrites();
}
