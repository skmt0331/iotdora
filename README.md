# iotdora
iot で銅鑼を鳴らすプロジェクト  
山梨県ITコミュニティイベント「テック無尽2026」にて、LTの時間測定に使用  

## 📐 設計要件
- 音が鳴ること
- 時間を変えられること
- 残り時間を確認できること

## 🎥 完成品

<img width="340" height="445" alt="IoT銅鑼" src="https://github.com/user-attachments/assets/20a2fe60-2410-4151-99c1-294cc4326b38" />


**🔊 実際に動作している様子はこちら → [Xで動画を見る](https://x.com/paralyze_joker/status/2087597486202654857)**


## 🗺️ 運用全体像
```
スマホ
 │
 │ HTTPS
 ▼
Tailscale Funnel
 │
 ▼
Cloud(NAS)
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

## 🛠️ 構築方法
### ハードウェア  
- 「hardware」フォルダ内  
iotdora_esp32.inoをESP32CherryIoTへ書き込み  
（SSIDやパスワード、MQTTサーバーなどのxxxxxxxは自身のものに直すこと）
- 接続はConnectorAに360°サーボモーター

### MQTTサーバー
- HiveMQ Cloudの無料ユーザーに登録、URL取得

### Cloud
- Linux搭載のクラウド環境で「cloud」フォルダ内のデータをDocker構築・ビルド。
（AWSやVPSなど、お持ちの環境で。我々はNAS上に構築しました。）

※ 以下の2ファイルをserver.js同階層に追加してください
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

### Tailscale
- 利用Cloudが公開できるリンクを生成できないタイプのものである場合、Tailscale利用をお勧めします。
- Tailscale Dockerコンテナを作成して利用してください。

## 🛒 銅鑼工作に必要なものリンク
### 銅鑼
https://www.amazon.co.jp/dp/B015PVRBGE

<a href="https://www.amazon.co.jp/dp/B015PVRBGE">
  <img width="50%" src="https://m.media-amazon.com/images/I/61sCOgPvmQL._AC_SL1500_.jpg" alt="Link Card" />
</a>

### ESP32CherryIoT
https://btoshop.jp/products/jm00007

<a href="https://btoshop.jp/products/jm00007">
  <img width="50%" src="https://btoshop.jp/cdn/shop/files/JM00007_1000x819.png?v=1780898013" alt="Link Card" />
</a>

### 360°連続回転サーボ
https://akizukidenshi.com/catalog/g/g114382/

<a href="https://akizukidenshi.com/catalog/g/g114382/">
  <img width="50%" src="https://akizukidenshi.com/img/goods/L/114382.jpg" alt="Link Card" />
</a>

### 吊り金具
こういうのをホームセンターで。  
サーボモーターを固定したり、銅鑼を打つ棒を吊るしたり。
<img width="50%" src="https://m.media-amazon.com/images/I/31GrUlB3fxL._SX342_SY445_QL70_ML2_.jpg" />

