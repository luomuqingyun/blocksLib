#include <Arduino.h>
#ifndef LED_BUILTIN
  #define LED_BUILTIN 2
#endif

// 由 EmbedBlocks 逻辑生成
bool toggleState_LED_BUILTIN = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  toggleState_LED_BUILTIN = !toggleState_LED_BUILTIN;
  digitalWrite(LED_BUILTIN, toggleState_LED_BUILTIN ? HIGH : LOW);
  delay(1000);
}