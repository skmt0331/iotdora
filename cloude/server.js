// ==============================
// IoT銅鑼 サーバー
// ==============================

const express = require("express");
const path = require("path");
const mqtt = require("mqtt");

const app = express();

const PORT = 3000;


// ==============================
// 基本設定
// ==============================

app.use(express.json());


// ==============================
// フロントエンド配信
// ==============================

app.use(
    express.static(
        path.join(__dirname, "frontend")
    )
);


// ==============================
// MQTT設定
// ==============================

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT || "8883";
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

const MQTT_TOPIC = "iotdora/gong/command";


// 必要な環境変数があるか確認
if (
    !MQTT_HOST ||
    !MQTT_USER ||
    !MQTT_PASSWORD
) {
    console.error(
        "MQTT環境変数が設定されていません"
    );

    process.exit(1);
}


// ==============================
// MQTT Brokerへ接続
// ==============================

const mqttClient = mqtt.connect(
    `mqtts://${MQTT_HOST}:${MQTT_PORT}`,
    {
        username: MQTT_USER,
        password: MQTT_PASSWORD,

        // TLS証明書を正しく検証する
        rejectUnauthorized: true,

        // 切断時の再接続間隔
        reconnectPeriod: 5000
    }
);


// 接続成功
mqttClient.on("connect", () => {

    console.log(
        "MQTT connected"
    );

    console.log(
        `MQTT Broker: ${MQTT_HOST}:${MQTT_PORT}`
    );

});


// 接続エラー
mqttClient.on("error", (error) => {

    console.error(
        "MQTT error:",
        error.message
    );

});


// 再接続中
mqttClient.on("reconnect", () => {

    console.log(
        "MQTT reconnecting..."
    );

});


// 切断
mqttClient.on("close", () => {

    console.log(
        "MQTT connection closed"
    );

});


// ==============================
// タイマー状態
// ==============================

let timerId = null;
let endTime = null;


// ==============================
// タイマー動作中か確認
// ==============================

function isTimerActive() {

    return timerId !== null &&
           endTime !== null;

}


// ==============================
// 残り時間計算
// ==============================

function getRemainingSeconds() {

    if (!isTimerActive()) {
        return 0;
    }

    const remaining =
        Math.ceil(
            (endTime - Date.now()) / 1000
        );

    return Math.max(
        0,
        remaining
    );
}


// ==============================
// 銅鑼を鳴らす処理
// ==============================

function fireGong() {

    console.log(
        `[${new Date().toISOString()}] GONG!`
    );


    // ------------------------------
    // タイマー状態解除
    // ------------------------------

    timerId = null;
    endTime = null;


    // ------------------------------
    // MQTT送信
    // ------------------------------

    mqttClient.publish(
        MQTT_TOPIC,
        "ON",
        {
            qos: 1,
            retain: false
        },
        (error) => {

            if (error) {

                console.error(
                    "MQTT publish failed:",
                    error.message
                );

                return;
            }

            console.log(
                `MQTT published: ${MQTT_TOPIC} -> ON`
            );

        }
    );

}


// ==============================
// タイマー開始
//
// POST /api/start
// ==============================

app.post("/api/start", (req, res) => {

    const seconds =
        Number(req.body.seconds);


    // ------------------------------
    // 入力チェック
    // ------------------------------

    if (
        !Number.isFinite(seconds) ||
        !Number.isInteger(seconds) ||
        seconds <= 0 ||
        seconds > 3600
    ) {

        return res.status(400).json({
            success: false,
            error: "seconds must be between 1 and 3600"
        });

    }


    // ------------------------------
    // すでにタイマー動作中
    // ------------------------------

    if (isTimerActive()) {

        return res.status(409).json({
            success: false,
            error: "Timer is already active",
            active: true,
            remainingSeconds:
                getRemainingSeconds()
        });

    }


    // ------------------------------
    // 終了予定時刻
    // ------------------------------

    endTime =
        Date.now() +
        (seconds * 1000);


    // ------------------------------
    // タイマー開始
    // ------------------------------

    timerId = setTimeout(
        fireGong,
        seconds * 1000
    );


    console.log(
        `タイマー開始: ${seconds}秒後`
    );


    res.json({
        success: true,
        active: true,
        remainingSeconds: seconds
    });

});


// ==============================
// 現在の状態取得
//
// GET /api/status
// ==============================

app.get("/api/status", (req, res) => {

    res.set(
        "Cache-Control",
        "no-store"
    );


    if (!isTimerActive()) {

        return res.json({
            active: false,
            remainingSeconds: 0
        });

    }


    res.json({
        active: true,
        remainingSeconds:
            getRemainingSeconds()
    });

});


// ==============================
// タイマー取消
//
// POST /api/cancel
// ==============================

app.post("/api/cancel", (req, res) => {

    if (!isTimerActive()) {

        return res.json({
            success: true,
            cancelled: false,
            active: false,
            remainingSeconds: 0
        });

    }


    clearTimeout(timerId);

    timerId = null;
    endTime = null;


    console.log(
        "タイマーを取り消しました"
    );


    res.json({
        success: true,
        cancelled: true,
        active: false,
        remainingSeconds: 0
    });

});


// ==============================
// サーバー起動
// ==============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `IoT Dora server started on port ${PORT}`
        );

    }
);