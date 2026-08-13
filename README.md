# iotdora
iot で銅鑼を鳴らすプロジェクト  
山梨県ITコミュニティイベント「テック無尽2026」にて、LTの時間測定に使用  

## 設計要件
- 音が鳴ること
- 時間を変えられること
- 残り時間を確認できること

## 運用全体像
```
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
```

## 構築方法
- [] ハードウェア

### 以下の2ファイルをルートに追加してください
#### .env
```
MQTT_HOST=xxxxxxxxxxxxx.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=iotdora
MQTT_PASSWORD=xxxxxxxx
```
#### .dockerignore
```
.env
node_modules
npm-debug.log
```

