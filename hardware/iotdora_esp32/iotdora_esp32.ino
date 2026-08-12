#include <ESP32Servo.h> 

const int SERVO_PIN = 4; // サーボの信号線を接続するGPIOピン番号
Servo myServo; 

// クマ（ID:23）などの信号が来たらサーボを動かす関数
void executeServoSequence() {
  Serial.println("親機: 信号を受信 ➡️ サーボ駆動");
  
  myServo.detach(); 
  delay(10);
  myServo.attach(SERVO_PIN, 700, 2300); 
  delay(10); 
  
  myServo.write(1600); // 回転開始（パルス幅調整）
  delay(430);          // 回転時間の調整はここ

  myServo.write(1500); // 停止
  delay(200); 

  myServo.detach();    // 電源を切断（じわじわ動く現象を防止）
  pinMode(SERVO_PIN, OUTPUT);
  digitalWrite(SERVO_PIN, LOW);

  Serial.println("親機: サーボ動作完了");
}

void setup() {
  Serial.begin(115200);
  delay(1000); 
  Serial.setTimeout(100);

  pinMode(SERVO_PIN, OUTPUT);
  digitalWrite(SERVO_PIN, LOW);

  Serial.println("【単体モード】シリアル受信・サーボ制御 起動完了");
}

void loop() {
  // 💡 シリアル通信（ラズパイやPC）からデータが届いているか確認
  if (Serial.available() > 0) {
    String inputString = Serial.readStringUntil('\n');
    inputString.trim();
    if (inputString.length() == 0) return;

    Serial.print("受信ログ: ");
    Serial.println(inputString);

    // 💡 "(ID:23)" または "SERVO_ON" の文字が含まれていたらサーボを動かす
    if (inputString.indexOf("(ID:23)") != -1 || inputString.indexOf("SERVO_ON") != -1) {
      executeServoSequence();
    }
  }
  
  delay(10);
}