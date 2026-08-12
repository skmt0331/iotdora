# iotdora
iot で銅鑼を鳴らすプロジェクト
山梨県ITコミュニティイベント「テック無尽2026」にて、LTの時間測定に使用

## 設計要件
- 音が鳴ること
- 時間を変えられること
- 残り時間を確認できること

## 運用全体像
スマホ
 │
 │ HTTPS
 ▼
Tailscale Funnel
 │
 ▼
NAS
Node.js + Express
HTML/CSS/JS
 │
 │ MQTT/TLS
 ▼
HiveMQ Cloud
 │
 │ MQTT/TLS
 ▼
ESP32
 │
 ▼
Servo
 │
 ▼
🥁 銅鑼

## 銅鑼(ESP32)のベースコード
```C++
void callback(
    char* topic,
    byte* payload,
    unsigned int length
) {

    String message;

    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    if (
        String(topic) == "gong/command" &&
        message == "ON"
    ) {

        ringGong();

    }
}

client.setCallback(callback);
client.subscribe("gong/command");
```

## フロントエンドのベースコード
```JS
void callback(
    char* topic,
    byte* payload,
    unsigned int length
) {

    String message;

    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    if (
        String(topic) == "gong/command" &&
        message == "ON"
    ) {

        ringGong();

    }
}
```