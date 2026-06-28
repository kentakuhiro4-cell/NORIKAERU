const fallbackTrains = [
  {
    start: "あびこ",
    st: "07:42",
    mid: "動物園前",
    arr: "07:54",
    routes: [
      { id: "A", wait: "1分", from: "動物園前", fromTime: "07:55", to: "淡路", toTime: "08:18", officeTime: "08:35" },
      { id: "B", wait: "4分", from: "動物園前", fromTime: "07:58", to: "淡路", toTime: "08:21", officeTime: "08:38" }
    ]
  },
  {
    start: "あびこ",
    st: "07:45",
    mid: "動物園前",
    arr: "07:57",
    routes: [
      { id: "A", wait: "1分", from: "動物園前", fromTime: "07:58", to: "淡路", toTime: "08:21", officeTime: "08:38" },
      { id: "B", wait: "5分", from: "動物園前", fromTime: "08:02", to: "淡路", toTime: "08:25", officeTime: "08:42" }
    ]
  },
  {
    start: "あびこ",
    st: "07:47",
    mid: "動物園前",
    arr: "07:59",
    routes: [
      { id: "A", wait: "3分", from: "動物園前", fromTime: "08:02", to: "淡路", toTime: "08:25", officeTime: "08:42" },
      { id: "B", wait: "10分", from: "動物園前", fromTime: "08:09", to: "淡路", toTime: "08:32", officeTime: "08:49" }
    ]
  }
];

const routeEngine = window.NORIKAERU_ROUTE_ENGINE;
const HISTORY_KEY = "norikaeruCommuteHistoryV1";
let currentTime = formatClock(new Date());
let routeSearchTime = currentTime;
let trains = loadTrainsForTime(routeSearchTime);

let selected = null;
let state = "standby";
let keptTrain = null;
let commuteRecord = null;

const views = ["standbyView", "homeView", "arrivalWaitView", "recordView", "historyView"];
const routeList = document.getElementById("routeList");
const nextTrack = document.getElementById("nextTrack");
const mainActionButton = document.getElementById("mainAction");
const timeText = document.getElementById("timeText");

function loadTrainsForTime(time) {
  const routeTrains = routeEngine ? routeEngine.getMorningRoutes(time, 3) : [];
  return routeTrains.length ? routeTrains : fallbackTrains;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatClock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(date) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}（${weekdays[date.getDay()]}）`;
}

function durationMinutes(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.max(0, Math.round(diff / 60000));
}

function waitMinutes(record) {
  const wait = record && record.selected && record.selected.wait;
  const value = parseInt(wait, 10);
  return Number.isFinite(value) ? value : null;
}

function readHistory() {
  try {
    const records = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeHistory(records) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 40)));
  } catch {
    toast("履歴の保存に失敗しました");
  }
}

function saveRecord(record) {
  const records = readHistory().filter((item) => item.id !== record.id);
  writeHistory([record, ...records]);
}

function updateClock() {
  currentTime = formatClock(new Date());
  timeText.textContent = currentTime;
}

function createCommuteRecord(startedAt) {
  return {
    id: String(startedAt.getTime()),
    mode: "出勤",
    dateKey: formatDateKey(startedAt),
    dateLabel: formatDateLabel(startedAt),
    departPressedAt: startedAt.toISOString(),
    departPressedTime: formatClock(startedAt),
    routeSearchTime,
    selected: null,
    arrivalPressedAt: null,
    arrivalPressedTime: null
  };
}

function trainIcon(className = "route-icon") {
  return `<span class="${className}"><img src="assets/train.png" alt=""></span>`;
}

function show(view) {
  views.forEach((id) => document.getElementById(id).classList.add("hidden"));
  document.getElementById(view).classList.remove("hidden");
}

function setNext(text, forceMarquee = false) {
  const box = document.querySelector(".next-nav");
  nextTrack.classList.remove("marquee");
  nextTrack.style.removeProperty("--shift");
  nextTrack.textContent = text.startsWith("🐸") ? text : `🐸 ${text}`;

  requestAnimationFrame(() => {
    const overflow = Math.max(0, nextTrack.scrollWidth - (box.clientWidth - 28));
    if (forceMarquee || overflow > 2) {
      nextTrack.style.setProperty("--shift", `-${overflow}px`);
      nextTrack.classList.add("marquee");
    }
  });
}

function setAction(label, disabled = false) {
  mainActionButton.textContent = label;
  mainActionButton.disabled = disabled;
}

function renderRoutes() {
  routeList.classList.toggle("route-kept", keptTrain !== null);
  routeList.innerHTML = trains.map((train, index) => {
    return `
      <section class="card route-card ${keptTrain === index ? "kept open" : ""}">
        <div class="head" role="button" tabindex="0" data-toggle-route>
          <div class="main">${trainIcon()}${inlineStop(train.st, train.start, "発")}</div>
          ${keptTrain === index ? '<button class="change-route" type="button" data-change-route>変更</button>' : ""}
        </div>
        <div class="detail">
          <div class="inner">
            <div class="arrival">${trainIcon()}${inlineStop(train.arr, train.mid, "着")}</div>
            <div class="branches" data-group="${index}">
              ${renderBranch(train.routes[0], "white", index, 0)}
              ${renderBranch(train.routes[1], "gray", index, 1)}
            </div>
            <button class="other-branch" type="button" data-select-other="${index}">想定外の乗換</button>
          </div>
        </div>
      </section>
    `;
  }).join("");
}

function renderBranch(route, style, trainIndex, routeIndex) {
  return `
    <button class="branch ${style}" type="button" data-select-branch="${trainIndex}:${routeIndex}">
      <div class="branch-head">乗換 ${route.wait}</div>
      <div class="mini">
        <div class="stop first">${trainIcon("mini-icon")}${stackedStop(route.fromTime, route.from, "発")}</div>
        <div class="stop">${trainIcon("mini-icon")}${stackedStop(route.toTime, route.to, "着")}</div>
      </div>
    </button>
  `;
}

function inlineStop(time, station, label) {
  return `<span class="inline-time">${time}<span class="inline-label">${label}</span></span><span class="inline-station">${station}</span>`;
}

function stackedStop(time, station, label) {
  return `<span class="stop-text"><span class="tm">${time}${label}</span><span class="station">${station}</span></span>`;
}

function startCommute() {
  const startedAt = new Date();
  routeSearchTime = formatClock(startedAt);
  trains = loadTrainsForTime(routeSearchTime);
  commuteRecord = createCommuteRecord(startedAt);
  state = "home";
  selected = null;
  keptTrain = null;
  document.body.classList.remove("standby-mode");
  show("homeView");
  setNext("乗換ルートをタップ！ﾉﾘｶｴ♪ﾉﾘｶｴ♫");
  setAction("乗換完了", true);
  renderRoutes();
  toast(`${commuteRecord.departPressedTime} 出発を記録しました`);
}

function toggleCard(button) {
  if (keptTrain !== null) return;
  button.closest(".route-card").classList.toggle("open");
}

function changeRoute() {
  keptTrain = null;
  selected = null;
  renderRoutes();
  setNext("乗換ルートをタップ！ﾉﾘｶｴ♪ﾉﾘｶｴ♫");
  setAction("乗換完了", true);
  toast("ルートを選び直せます");
}

function selectBranch(trainIndex, routeIndex) {
  const train = trains[trainIndex];
  const route = train.routes[routeIndex];
  keptTrain = trainIndex;
  selected = {
    kind: "route",
    trainIndex,
    routeIndex,
    routeLabel: `乗換 ${route.id}`,
    searchTime: routeSearchTime,
    start: train.start,
    startTime: train.st,
    mid: train.mid,
    midTime: train.arr,
    ...route
  };
  if (commuteRecord) commuteRecord.selected = selected;
  renderRoutes();

  requestAnimationFrame(() => {
    const card = document.querySelector(".route-card.kept");
    const branches = card.querySelector(".branches");
    branches.classList.add("has-selection");
    branches.querySelectorAll(".branch")[routeIndex].classList.add("selected");
    card.querySelector(".other-branch").classList.add("dim");
  });

  setNext("乗換できたら「乗換完了」を押しましょう。");
  setAction("乗換完了");
}

function selectOther(trainIndex) {
  const train = trains[trainIndex];
  keptTrain = trainIndex;
  selected = {
    kind: "other",
    trainIndex,
    routeLabel: "想定外の乗換",
    searchTime: routeSearchTime,
    start: train.start,
    startTime: train.st,
    mid: train.mid,
    midTime: train.arr,
    wait: "想定外",
    from: "その他",
    fromTime: "--:--",
    to: "淡路",
    toTime: "--:--",
    officeTime: train.routes[0] ? train.routes[0].officeTime : "--:--"
  };
  if (commuteRecord) commuteRecord.selected = selected;
  renderRoutes();

  requestAnimationFrame(() => {
    const card = document.querySelector(".route-card.kept");
    card.querySelectorAll(".branch").forEach((branch) => branch.classList.add("dim"));
    card.querySelector(".other-branch").classList.add("selected");
  });

  setNext("乗換できたら「乗換完了」を押しましょう。");
  setAction("乗換完了");
}

function goArrivalWait() {
  if (!selected) return;
  document.getElementById("waitFrom").textContent = selected.from;
  document.getElementById("waitFromTime").textContent = selected.fromTime;
  document.getElementById("waitTo").textContent = selected.to;
  document.getElementById("waitToTime").textContent = selected.toTime;
  document.getElementById("officeTime").textContent = selected.officeTime;

  state = "arrivalWait";
  show("arrivalWaitView");
  setNext("会社に着いたら「到着」をタップ！今日も良いﾉﾘｶｴ♪ﾀﾞｯﾀﾖ ♫", true);
  setAction("到着");
  toast("乗換完了");
}

function summaryIcon(type) {
  const icons = {
    building: "assets/building.png",
    frog: "assets/kerry.png",
    train: "assets/train.png"
  };
  return icons[type] || icons.train;
}

function summaryCard(icon, time, title, sub) {
  return `
    <div class="summary-card">
      <span class="summary-icon"><img src="${summaryIcon(icon)}" alt=""></span>
      <span class="summary-time">${time}</span>
      <span>
        <span class="summary-name">${title}</span>
        <span class="summary-sub">${sub}</span>
      </span>
    </div>
  `;
}

function renderRecordSummary(record = commuteRecord) {
  const summary = record && record.selected;
  if (!record || !summary) return;

  const todayKey = formatDateKey(new Date());
  const arrivalTime = record.arrivalPressedTime || "--:--";
  const duration = durationMinutes(record.departPressedAt, record.arrivalPressedAt);
  const wait = waitMinutes(record);
  const transferTime = summary.fromTime === "--:--" ? "--:--" : `${summary.fromTime}発`;
  const recordLabel = record.dateLabel || formatDateLabel(new Date(record.departPressedAt || Date.now()));

  document.getElementById("recordTitle").textContent = record.dateKey === todayKey ? "今日のサマリー" : `${recordLabel}のサマリー`;
  document.getElementById("summaryCards").innerHTML = [
    summaryCard("building", record.departPressedTime, "出発", `出発ボタンをタップ / 検索 ${record.routeSearchTime}`),
    summaryCard("train", `${summary.startTime}発`, summary.start, "予定ルート"),
    summaryCard("train", `${summary.midTime}着`, summary.mid, `${summary.start}から移動`),
    summaryCard("frog", "乗換", summary.wait, summary.routeLabel),
    summaryCard("train", transferTime, summary.from, "乗換後の出発"),
    summaryCard("train", summary.toTime === "--:--" ? "--:--" : `${summary.toTime}着`, summary.to, "乗換後の到着"),
    summaryCard("building", arrivalTime, "会社到着", `予定 ${summary.officeTime}`)
  ].join("");

  document.getElementById("summaryDuration").textContent = duration === null ? "--分" : `${duration}分`;
  document.getElementById("summaryWait").textContent = wait === null ? "--分" : `${wait}分`;
  document.getElementById("summaryChoice").textContent = summary.routeLabel;
}

function arriveOffice() {
  const arrivedAt = new Date();
  if (commuteRecord) {
    commuteRecord.arrivalPressedAt = arrivedAt.toISOString();
    commuteRecord.arrivalPressedTime = formatClock(arrivedAt);
    commuteRecord.selected = selected;
    saveRecord(commuteRecord);
  }
  state = "record";
  renderRecordSummary();
  show("recordView");
  setNext("お疲れ様でした！");
  setAction("ホームへ戻る");
  toast(`${formatClock(arrivedAt)} 到着を記録しました`);
}

function renderHistory() {
  const records = readHistory();
  const successCount = records.filter((record) => record.selected && record.selected.kind === "route").length;
  const successRate = records.length ? Math.round((successCount / records.length) * 1000) / 10 : null;

  document.getElementById("historySuccessRate").textContent = successRate === null ? "--%" : `${successRate}%`;
  document.getElementById("historySuccessCount").textContent = `${successCount}回`;

  const list = document.getElementById("historyList");
  if (!records.length) {
    list.innerHTML = '<div class="history-empty">まだ記録がありません</div>';
    return;
  }

  list.innerHTML = records.map((record) => {
    const duration = durationMinutes(record.departPressedAt, record.arrivalPressedAt);
    const wait = waitMinutes(record);
    const frog = record.selected && record.selected.kind === "route" ? "assets/frog_happy.png" : "assets/frog_sad.png";
    const label = record.dateLabel || formatDateLabel(new Date(record.departPressedAt || Date.now()));
    return `
      <button class="history-item" type="button" data-history-id="${record.id}">
        <span>
          <span class="history-date">${label}</span>
          <span class="history-meta">通勤${duration === null ? "--" : duration}分 ｜ 乗換${wait === null ? "--" : wait}分</span>
        </span>
        <img class="history-frog" src="${frog}" alt="">
        <span class="history-arrow">›</span>
      </button>
    `;
  }).join("");
}

function openHistory() {
  if (state === "home" || state === "arrivalWait") {
    toast("記録中は履歴を開けません");
    return;
  }

  state = "history";
  document.body.classList.remove("standby-mode");
  renderHistory();
  show("historyView");
  setNext("履歴をタップすると、その日のサマリーを見返せます。");
  setAction("ホームへ戻る");
}

function openHistoryRecord(id) {
  const record = readHistory().find((item) => item.id === id);
  if (!record) return;

  commuteRecord = record;
  selected = record.selected;
  state = "record";
  renderRecordSummary(record);
  show("recordView");
  setNext("この日の通勤を振り返っています。");
  setAction("ホームへ戻る");
}

function backStandby() {
  state = "standby";
  selected = null;
  keptTrain = null;
  commuteRecord = null;
  document.body.classList.add("standby-mode");
  show("standbyView");
  setNext("おはようございます。今日も元気に出発しましょう。", true);
  setAction("出発");
}

function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 950);
}

function mainAction() {
  if (state === "standby") startCommute();
  else if (state === "home" && selected) goArrivalWait();
  else if (state === "arrivalWait") arriveOffice();
  else if (state === "record") backStandby();
  else if (state === "history") backStandby();
}

document.addEventListener("click", (event) => {
  const historyButton = event.target.closest("[data-open-history]");
  if (historyButton) {
    openHistory();
    return;
  }

  const toastButton = event.target.closest("[data-toast]");
  if (toastButton) toast(toastButton.dataset.toast);

  const changeButton = event.target.closest("[data-change-route]");
  if (changeButton) {
    event.stopPropagation();
    changeRoute();
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-route]");
  if (toggleButton) toggleCard(toggleButton);

  const branchButton = event.target.closest("[data-select-branch]");
  if (branchButton) {
    const [trainIndex, routeIndex] = branchButton.dataset.selectBranch.split(":").map(Number);
    selectBranch(trainIndex, routeIndex);
  }

  const otherButton = event.target.closest("[data-select-other]");
  if (otherButton) selectOther(Number(otherButton.dataset.selectOther));

  const historyItem = event.target.closest("[data-history-id]");
  if (historyItem) openHistoryRecord(historyItem.dataset.historyId);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("[data-change-route]")) return;

  const toggleButton = event.target.closest("[data-toggle-route]");
  if (!toggleButton) return;

  event.preventDefault();
  toggleCard(toggleButton);
});

mainActionButton.addEventListener("click", mainAction);

window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.add("ready"), 1000);
  updateClock();
  setInterval(updateClock, 1000);
  setNext("おはようございます。今日も元気に出発しましょう。", true);
});
