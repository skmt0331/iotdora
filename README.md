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
// ==============================
// 銅鑼タイマー フロントエンド
// ==============================

// HTML要素
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");

const startButton = document.getElementById("startButton");
const cancelButton = document.getElementById("cancelButton");

const remainingDisplay = document.getElementById("remaining");
const statusDisplay = document.getElementById("status");

// サーバー問い合わせ間隔
const STATUS_INTERVAL_MS = 1000;

let statusTimer = null;


// ==============================
// タイマー開始
// ==============================

async function startTimer() {

    const minutes = Number(minutesInput.value) || 0;
    const seconds = Number(secondsInput.value) || 0;

    const totalSeconds = (minutes * 60) + seconds;

    if (totalSeconds <= 0) {
        alert("時間を設定してください。");
        return;
    }

    try {

        const response = await fetch("/api/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                seconds: totalSeconds
            })
        });

        if (!response.ok) {
            throw new Error("タイマーの開始に失敗しました");
        }

        const result = await response.json();

        console.log("タイマー開始:", result);

        statusDisplay.textContent = "タイマー動作中";

        // すぐに現在状態を取得
        await updateStatus();

        // 定期的にサーバーへ問い合わせ
        startStatusPolling();

    } catch (error) {

        console.error(error);

        statusDisplay.textContent = "通信エラー";

        alert("タイマーを開始できませんでした。");
    }
}


// ==============================
// タイマー取消
// ==============================

async function cancelTimer() {

    try {

        const response = await fetch("/api/cancel", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("タイマーの取消に失敗しました");
        }

        const result = await response.json();

        console.log("タイマー取消:", result);

        stopStatusPolling();

        remainingDisplay.textContent = "00:00";
        statusDisplay.textContent = "取消しました";

    } catch (error) {

        console.error(error);

        statusDisplay.textContent = "通信エラー";

        alert("タイマーを取り消せませんでした。");
    }
}


// ==============================
// 現在の状態を取得
// ==============================

async function updateStatus() {

    try {

        const response = await fetch("/api/status", {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("状態取得に失敗しました");
        }

        const data = await response.json();

        /*
            サーバーから以下のJSONが返る想定

            タイマー動作中:
            {
                "active": true,
                "remainingSeconds": 125
            }

            タイマー停止中:
            {
                "active": false,
                "remainingSeconds": 0
            }
        */

        const remainingSeconds =
            Math.max(0, Number(data.remainingSeconds) || 0);

        remainingDisplay.textContent =
            formatTime(remainingSeconds);

        if (data.active) {

            statusDisplay.textContent = "タイマー動作中";

            startButton.disabled = true;
            cancelButton.disabled = false;

        } else {

            statusDisplay.textContent = "待機中";

            startButton.disabled = false;
            cancelButton.disabled = true;

            stopStatusPolling();
        }

    } catch (error) {

        console.error(error);

        statusDisplay.textContent = "サーバーとの通信に失敗しました";
    }
}


// ==============================
// mm:ss 表示
// ==============================

function formatTime(totalSeconds) {

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );
}


// ==============================
// 状態確認開始
// ==============================

function startStatusPolling() {

    if (statusTimer !== null) {
        return;
    }

    statusTimer = setInterval(
        updateStatus,
        STATUS_INTERVAL_MS
    );
}


// ==============================
// 状態確認停止
// ==============================

function stopStatusPolling() {

    if (statusTimer !== null) {

        clearInterval(statusTimer);

        statusTimer = null;
    }
}


// ==============================
// ボタンイベント
// ==============================

startButton.addEventListener(
    "click",
    startTimer
);

cancelButton.addEventListener(
    "click",
    cancelTimer
);


// ==============================
// ページを開いた時
// ==============================

// すでにタイマーが動いている可能性があるため
// 最初にNASへ現在状態を問い合わせる

async function initialize() {

    await updateStatus();

    // updateStatus()でactive=trueだった場合は
    // pollingを開始したいので、もう一度状態を確認

    try {

        const response = await fetch("/api/status", {
            cache: "no-store"
        });

        const data = await response.json();

        if (data.active) {
            startStatusPolling();
        }

    } catch (error) {

        console.error(
            "初期状態取得エラー:",
            error
        );
    }
}

initialize();
```