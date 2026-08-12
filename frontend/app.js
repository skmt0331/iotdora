// ==============================
// 銅鑼タイマー フロントエンド          [GONG5-JS-000]
// この画面はNAS(Express)から配信されるため、宛先は "/api/..." の相対パスでよい
// ==============================

// HTML要素  [GONG5-JS-001]
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");

const startButton = document.getElementById("startButton");
const cancelButton = document.getElementById("cancelButton");

const remainingDisplay = document.getElementById("remaining");
const statusDisplay = document.getElementById("status");

const gongHolder = document.getElementById("holder");
const gongButton = document.getElementById("gong");
const linkPill = document.getElementById("link");
const linkText = document.getElementById("linkText");


// サーバー問い合わせ間隔  [GONG5-JS-002]
// 動作中は1秒ごと。待機中も5秒ごとに見に行き、
// 別のスマホから開始された命令にも気づけるようにする。
const STATUS_INTERVAL_ACTIVE_MS = 1000;
const STATUS_INTERVAL_IDLE_MS = 5000;

let statusTimer = null;
let statusTimerMode = null;


// 表示をなめらかにするための控え  [GONG5-JS-003]
// 正解の時間は必ずサーバー。受け取った値を起点に、
// 次の問い合わせまでは手元の時計で補って表示する。
let serverRemaining = 0;      // 直近にサーバーから受け取った残り秒
let serverReceivedAt = 0;     // 受け取った時刻（performance.now）
let isActive = false;         // サーバーが計測中かどうか
let hasRung = false;          // 今回の計測でもう鳴らしたか
let userCancelled = false;    // 取消による停止か（0秒到達と区別する）


// サーバーが無い場所で開いた時のお試し表示  [GONG5-JS-004]
// （NASに置けば自動的に本番の通信に切り替わります）
let offlineMode = false;
let offlineEnd = 0;


// ==============================
// 分・秒のプルダウンを作る            [GONG5-JS-005]
// ==============================

function buildSelects() {

    for (let i = 0; i <= 60; i++) {
        minutesInput.add(new Option(String(i).padStart(2, "0"), i));
    }

    for (let i = 0; i < 60; i++) {
        secondsInput.add(new Option(String(i).padStart(2, "0"), i));
    }

    minutesInput.value = 5;
    secondsInput.value = 0;
}


// ==============================
// タイマー開始                       [GONG5-JS-006]
// ==============================

async function startTimer() {

    const minutes = Number(minutesInput.value) || 0;
    const seconds = Number(secondsInput.value) || 0;

    const totalSeconds = (minutes * 60) + seconds;

    if (totalSeconds <= 0) {
        setStatus("時間を設定してください", true);
        return;
    }

    unlockSound();                 // 音を出す許可はタップ時にもらう

    startButton.disabled = true;
    setStatus("送信中…");

    if (offlineMode) {
        offlineEnd = Date.now() + totalSeconds * 1000;
        hasRung = false;
        userCancelled = false;
        applyStatus({ active: true, remainingSeconds: totalSeconds });
        setStatus("お試し表示で動かしています");
        return;
    }

    try {

        const response = await fetch("/api/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds: totalSeconds })
        });

        if (!response.ok) {
            throw new Error("タイマーの開始に失敗しました（HTTP " + response.status + "）");
        }

        const result = await response.json();
        console.log("タイマー開始:", result);

        hasRung = false;
        userCancelled = false;

        // 応答を先に反映し、続けてサーバーの現在値で上書きする
        applyStatus({ active: true, remainingSeconds: totalSeconds });

        await updateStatus();

    } catch (error) {

        console.error(error);

        startButton.disabled = false;

        setStatus("開始できません。電波の状態を確認してください", true);
        setLink("ng", "未接続");
    }
}


// ==============================
// 送った命令の取消                    [GONG5-JS-007]
// ==============================

async function cancelTimer() {

    cancelButton.disabled = true;
    userCancelled = true;

    setStatus("取消を送信中…");

    if (offlineMode) {
        offlineEnd = 0;
        applyStatus({ active: false, remainingSeconds: 0 });
        setStatus("取消しました。銅鑼は鳴りません");
        return;
    }

    try {

        const response = await fetch("/api/cancel", { method: "POST" });

        if (!response.ok) {
            throw new Error("タイマーの取消に失敗しました（HTTP " + response.status + "）");
        }

        const result = await response.json();
        console.log("タイマー取消:", result);

        applyStatus({ active: false, remainingSeconds: 0 });

        setStatus("取消しました。銅鑼は鳴りません");

    } catch (error) {

        console.error(error);

        cancelButton.disabled = false;
        userCancelled = false;

        setStatus("取消できません。もう一度押してください", true);
        setLink("ng", "未接続");
    }
}


// ==============================
// 現在の状態を取得                    [GONG5-JS-008]
// ==============================

async function updateStatus() {

    if (offlineMode) {
        const left = Math.max(0, (offlineEnd - Date.now()) / 1000);
        applyStatus({ active: offlineEnd > 0 && left > 0, remainingSeconds: left });
        return;
    }

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
            サーバーから返るJSON

            動作中: { "active": true,  "remainingSeconds": 125 }
            停止中: { "active": false, "remainingSeconds": 0 }
        */

        applyStatus(data);
        setLink("ok", "接続中");

    } catch (error) {

        console.error(error);

        setLink("ng", "未接続");
        setStatus("サーバーとの通信に失敗しました", true);
    }
}


// ==============================
// 受け取った状態を画面に反映           [GONG5-JS-009]
// ==============================

function applyStatus(data) {

    serverRemaining = Math.max(0, Number(data.remainingSeconds) || 0);
    serverReceivedAt = performance.now();

    const wasActive = isActive;
    isActive = Boolean(data.active);

    startButton.disabled = isActive;
    cancelButton.disabled = !isActive;

    if (isActive) {

        if (!wasActive) {
            hasRung = false;
        }

        if (statusDisplay.textContent !== "お試し表示で動かしています") {
            setStatus("タイマー動作中");
        }

        startStatusPolling("active");

    } else {

        // 動作中 → 停止 に変わった瞬間だけ鳴らす（取消のときは鳴らさない）
        if (wasActive && !userCancelled && !hasRung) {
            ring();
            setStatus("時間になりました");
        }

        startStatusPolling("idle");
    }
}


// ==============================
// 画面の描き直し（毎フレーム）          [GONG5-JS-010]
// ==============================

function currentRemaining() {

    if (!isActive) {
        return serverRemaining;
    }

    return Math.max(0, serverRemaining - (performance.now() - serverReceivedAt) / 1000);
}

function render() {

    const value = currentRemaining();

    remainingDisplay.textContent = formatTime(value);
    remainingDisplay.classList.toggle("warn", isActive && value <= 10);

    document.title = isActive ? formatTime(value) + " 銅鑼" : "銅鑼タイマー";

    // サーバーの停止通知より先に0秒へ着いた場合もここで鳴らす
    if (isActive && value <= 0 && !hasRung) {
        ring();
        setStatus("時間になりました");
    }

    requestAnimationFrame(render);
}


// ==============================
// mm:ss 表示                        [GONG5-JS-011]
// ==============================

function formatTime(totalSeconds) {

    const rounded = Math.max(0, Math.ceil(totalSeconds));

    const minutes = Math.floor(rounded / 60);
    const seconds = rounded % 60;

    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}


// ==============================
// 状態確認の開始・停止                 [GONG5-JS-012]
// ==============================

function startStatusPolling(mode) {

    if (statusTimer !== null && statusTimerMode === mode) {
        return;
    }

    stopStatusPolling();

    statusTimerMode = mode;

    statusTimer = setInterval(
        updateStatus,
        mode === "active" ? STATUS_INTERVAL_ACTIVE_MS : STATUS_INTERVAL_IDLE_MS
    );
}

function stopStatusPolling() {

    if (statusTimer !== null) {

        clearInterval(statusTimer);

        statusTimer = null;
        statusTimerMode = null;
    }
}


// ==============================
// 銅鑼の見た目と音                    [GONG5-JS-013]
// 実際に叩くのはESP32側。ここでは合図として見せて鳴らす。
// ==============================

function ring() {

    hasRung = true;
    shake();
    playSound();
}

function shake() {
    gongHolder.classList.remove("hit");
    void gongHolder.offsetWidth;      // 連続再生のために一度戻す
    gongHolder.classList.add("hit");
}

let audioContext = null;

function unlockSound() {

    try {

        audioContext = audioContext ||
            new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

    } catch (error) {
        // 音が出せない環境では何もしない
    }
}

function playSound() {

    try {

        unlockSound();

        if (!audioContext) {
            return;
        }

        const t0 = audioContext.currentTime;
        const out = audioContext.createGain();

        out.gain.setValueAtTime(0.0001, t0);
        out.gain.exponentialRampToValueAtTime(0.45, t0 + 0.008);
        out.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.0);
        out.connect(audioContext.destination);

        [1, 1.61, 2.29, 2.94, 4.11, 5.43, 7.1].forEach((ratio, i) => {

            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(96 * ratio * (1 + (Math.random() - 0.5) * 0.02), t0);
            osc.frequency.exponentialRampToValueAtTime(96 * ratio * 0.985, t0 + 1.6);

            gain.gain.value = 0.55 / (i + 1.4);

            osc.connect(gain).connect(out);
            osc.start(t0);
            osc.stop(t0 + 3.1);
        });

    } catch (error) {
        console.error(error);
    }
}


// ==============================
// 小さな表示の世話                    [GONG5-JS-014]
// ==============================

function setStatus(text, isError) {
    statusDisplay.textContent = text;
    statusDisplay.classList.toggle("err", Boolean(isError));
}

function setLink(state, text) {
    linkPill.dataset.s = state;
    linkText.textContent = text;
}


// ==============================
// ボタンイベント                      [GONG5-JS-015]
// ==============================

startButton.addEventListener("click", startTimer);
cancelButton.addEventListener("click", cancelTimer);

// 銅鑼を押すと音だけ試せる（命令は送らない）
gongButton.addEventListener("click", () => {
    shake();
    playSound();
});

// 画面を伏せている間はブラウザが時計を間引くため、戻ったら取り直す
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        updateStatus();
    }
});


// ==============================
// ページを開いた時                    [GONG5-JS-016]
// すでにタイマーが動いている可能性があるため、まずNASへ現在状態を問い合わせる
// ==============================

async function initialize() {

    buildSelects();
    render();

    try {

        const response = await fetch("/api/status", { cache: "no-store" });

        if (!response.ok) {
            throw new Error("status " + response.status);
        }

        applyStatus(await response.json());
        setLink("ok", "接続中");

    } catch (error) {

        // サーバーが見つからない場所で開いた場合はお試し表示に切り替える
        offlineMode = true;
        setLink("ng", "お試し表示");
        setStatus("サーバー未接続のため、この端末だけで動かしています");
        startStatusPolling("idle");
    }
}

initialize();

// ファイル管理番号: GONG-FE-2026-0812-009
