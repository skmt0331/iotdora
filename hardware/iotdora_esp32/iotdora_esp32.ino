#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h> //PubSubClient by Nick O'Leary
#include <ESP32Servo.h> //ESP32Servo by Kevin Harrington

// Wi-Fi設定
const char* WIFI_SSID = "xxxxxxxxxxxx";
const char* WIFI_PASSWORD = "xxxxxxxxxxxx";

// HiveMQ Cloud設定
const char* MQTT_HOST = "xxxxxxxxxxxxxx.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USER = "iotdora";
const char* MQTT_PASSWORD = "xxxxxxxxxxxx";

// NAS側(フロントエンド構築)と同じTopic
const char* MQTT_TOPIC = "iotdora/gong/command";

// サーボ設定
const int motorPin = 3; // 3:ConnectorA, 4:ConnectorB
Servo myservo;

// サーボパルス幅
const int SERVO_MOVE_US = 2200;
const int SERVO_STOP_US = 1450;

// 銅鑼を叩くために回転させる時間
const int SERVO_MOVE_TIME_MS = 420;

// MQTT
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

// MQTT再接続用
unsigned long lastMqttReconnectAttempt = 0;
const unsigned long MQTT_RECONNECT_INTERVAL = 5000;

// 銅鑼を鳴らす
void ringGong() {
  Serial.println();
  Serial.println("====================");
  Serial.println("GONG!");
  Serial.println("====================");

  // サーボ回転
  myservo.attach(motorPin,700,2300);
  delay(10);
  myservo.writeMicroseconds(SERVO_MOVE_US);
  delay(SERVO_MOVE_TIME_MS);

  // サーボ停止
  myservo.writeMicroseconds(SERVO_STOP_US);
  myservo.detach();
  delay(10);
  Serial.println("Servo stopped.");
}

// MQTTメッセージ受信
void mqttCallback(
  char* topic,
  byte* payload,
  unsigned int length
) {
  Serial.print("MQTT received");
  Serial.print("  Topic: ");
  Serial.println(topic);
  Serial.print("  Message: ");
  String message;
  for (unsigned int i = 0; i < length; i++) {
    char c = (char)payload[i];
    message += c;
    Serial.print(c);
  }
  Serial.println();

  // Topic確認
  if (String(topic) != MQTT_TOPIC) {
    Serial.println("Unknown topic.");
    return;
  }

  // ONなら銅鑼を鳴らす
  if (message == "ON") {
    Serial.println("GONG command received.");
    ringGong();
  } else {
    Serial.println("Unknown command.");
  }
}

// Wi-Fi接続
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(
    WIFI_SSID,
    WIFI_PASSWORD
  );

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected.");
  Serial.print("IP address: ");
  Serial.println(
    WiFi.localIP()
  );
}

// MQTT接続
bool connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  Serial.println();
  Serial.println("Connecting to HiveMQ Cloud...");

  // ESP32ごとに異なるClient IDを作る
  uint64_t chipId =
    ESP.getEfuseMac();

  char clientId[40];

  snprintf(
    clientId,
    sizeof(clientId),
    "iotdora-%04X%08X",
    (uint16_t)(chipId >> 32),
    (uint32_t)chipId
  );

  Serial.print("Client ID: ");
  Serial.println(clientId);

  // HiveMQへ接続
  if (
    mqttClient.connect(
      clientId,
      MQTT_USER,
      MQTT_PASSWORD
    )
  ) {
    Serial.println("MQTT connected.");

    // 銅鑼TopicをSubscribe
    if (
      mqttClient.subscribe(
        MQTT_TOPIC,
        1
      )
    ) {
      Serial.print("Subscribed: ");
      Serial.println(MQTT_TOPIC);
    } else {
      Serial.println(
        "Subscribe failed."
      );
    }
    return true;
  }

  Serial.print(
    "MQTT connection failed. state="
  );
  Serial.println(
    mqttClient.state()
  );
  return false;
}

// setup
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("==========================");
  Serial.println(" IoT Dora ESP32");
  Serial.println("==========================");

  // 起動直後は必ずサーボ停止
  myservo.detach();
  delay(10);

  Serial.println(
    "Servo initialized."
  );

  // Wi-Fi接続
  connectWiFi();

  // TLS
  // TLS暗号化は使うがサーバー証明書の検証は省略
  secureClient.setInsecure();

  // MQTT設定
  mqttClient.setServer(
    MQTT_HOST,
    MQTT_PORT
  );
  mqttClient.setCallback(
    mqttCallback
  );

  // 最初のMQTT接続
  connectMQTT();
}

// loop
void loop() {
  // Wi-Fiが切れた場合
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(
      "Wi-Fi disconnected."
    );
    connectWiFi();
  }

  // MQTT再接続
  if (!mqttClient.connected()) {
    unsigned long now =
      millis();
    if (
      now -
      lastMqttReconnectAttempt
      >= MQTT_RECONNECT_INTERVAL
    ) {
      lastMqttReconnectAttempt =
        now;
      connectMQTT();
    }
  } else {

    // MQTT通信維持
    mqttClient.loop();
  }
}