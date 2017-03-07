#include <Servo.h>
#include <AStar32U4.h>
#include <PololuRPiSlave.h>

#define PIN_MODE_INPUT 0
#define PIN_MODE_OUTPUT 1

struct Data {
  //--- Configuration
  byte config01; // 0
  byte config23; // 1
  byte config45; // 2

  //--- Input (board -> rpi)
  byte buttonVals; // 3
  byte dinVals; // 4
  uint16_t analog[6]; // 5 - 14
  uint16_t batteryMillivolts; // 15 - 16

  //--- Output (rpi -> board)
  byte ledVals; // 17
  byte doutVals; // 18
  int16_t leftMotor; // 19-20
  int16_t rightMotor; // 21-22
};

PololuRPiSlave<struct Data, 5> slave;
PololuBuzzer buzzer;
AStar32U4Motors motors;
AStar32U4ButtonA buttonA;
AStar32U4ButtonB buttonB;
AStar32U4ButtonC buttonC;

int digitalPinMap[6] = {0, 1, 7, 8, 15, 16};
int analogPinMap[5] = {A0, A2, A3, A4, A5};
byte pinConfigs[6];

int getPinMode(int vPin) {
  if (pinConfigs[vPin] & 0x3 == 1 ||
      pinConfigs[vPin] & 0x3 == 2) {
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

  // See if we need to make any configuration changes
  // [ ch0 config ] [ ch1 config ]
  pinConfigs[0] = (slave.buffer.config01 >> 4) & 0xF;
  pinConfigs[1] = (slave.buffer.config01) & 0xF;
  pinConfigs[2] = (slave.buffer.config23 >> 4) & 0xF;
  pinConfigs[3] = (slave.buffer.config23) & 0xF;
  pinConfigs[4] = (slave.buffer.config45 >> 4) & 0xF;
  pinConfigs[5] = (slave.buffer.config45) & 0xF;

  for (uint8_t i = 0; i < 6; i++) {
    bool hasUpdate = (pinConfigs[i] >> 2) & 0x1;
    if (hasUpdate) {
      byte mode = pinConfigs[i] & 0x3;
      if (mode == 0) {
        pinMode(digitalPinMap[i], OUTPUT);
      }
      else if(mode == 1) {
        pinMode(digitalPinMap[i], INPUT);
      }
      else if(mode == 2) {
        pinMode(digitalPinMap[i], INPUT_PULLUP);
      }
      // unset the flag locally
      pinConfigs[i] = pinConfigs[i] & ~0x4;
    }
  }

  // Update the buffer
  slave.buffer.config01 = slave.buffer.config01 & ~0x68;
  
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

  slave.buffer.batteryMillivolts = readBatteryMillivoltsSV();

  // Handle the outputs
  ledYellow((slave.buffer.ledVals >> 2) & 0x1);
  ledGreen((slave.buffer.ledVals >> 1) & 0x1);
  ledRed((slave.buffer.ledVals) & 0x1);

  for (uint8_t i = 0; i < 6; i++) {
    byte val = (slave.buffer.doutVals >> i) & 0x1;
    doDigitalWrite(i, val);
  }

  motors.setSpeeds(slave.buffer.leftMotor, slave.buffer.rightMotor);

  // Done writing. Flush the buffer
  slave.finalizeWrites();
}
