const trains = [
  {
    start: "我孫子",
    st: "07:42",
    mid: "動物園前",
    arr: "07:54",
    routes: [
      { id: "A", wait: "1分", from: "動物園前", fromTime: "07:55", to: "淡路", toTime: "08:18", officeTime: "08:35" },
      { id: "B", wait: "4分", from: "動物園前", fromTime: "07:58", to: "淡路", toTime: "08:21", officeTime: "08:38" }
    ]
  },
  {
    start: "我孫子",
    st: "07:45",
    mid: "動物園前",
    arr: "07:57",
    routes: [
      { id: "A", wait: "1分", from: "動物園前", fromTime: "07:58", to: "淡路", toTime: "08:21", officeTime: "08:38" },
      { id: "B", wait: "5分", from: "動物園前", fromTime: "08:02", to: "淡路", toTime: "08:25", officeTime: "08:42" }
    ]
  },
  {
    start: "我孫子",
    st: "07:47",
    mid: "動物園前",
    arr: "07:59",
    routes: [
      { id: "A", wait: "3分", from: "動物園前", fromTime: "08:02", to: "淡路", toTime: "08:25", officeTime: "08:42" },
      { id: "B", wait: "10分", from: "動物園前", fromTime: "08:09", to: "淡路", toTime: "08:32", officeTime: "08:49" }
    ]
  }
];

let selected = null;
let state = "standby";
let keptTrain = null;

const views = ["standbyView", "homeView", "arrivalWaitView", "recordView"];
const routeList = document.getElementById("routeList");
const nextTrack = document.getElementById("nextTrack");
const mainActionButton = document.getElementById("mainAction");

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
        <button class="head" type="button" data-toggle-route>
          <div class="main">${trainIcon()}<span>${train.start}</span><span class="depart">${train.st}発</span></div>
        </button>
        <div class="detail">
          <div class="inner">
            <div class="arrival">${trainIcon()}<span>${train.mid}</span><span>${train.arr}着</span></div>
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
        <div class="stop first">${trainIcon("mini-icon")}<span><span class="station">${route.from}</span><span class="tm">${route.fromTime}発</span></span></div>
        <div class="stop">${trainIcon("mini-icon")}<span><span class="station">${route.to}</span><span class="tm">${route.toTime}着</span></span></div>
      </div>
    </button>
  `;
}

function startCommute() {
  state = "home";
  selected = null;
  keptTrain = null;
  document.body.classList.remove("standby-mode");
  show("homeView");
  setNext("乗換ルートをタップ！ﾉﾘｶｴ♪ﾉﾘｶｴ♫");
  setAction("乗換完了", true);
  renderRoutes();
  toast("ルートを表示しました");
}

function toggleCard(button) {
  if (keptTrain !== null) return;
  button.closest(".route-card").classList.toggle("open");
}

function selectBranch(trainIndex, routeIndex) {
  keptTrain = trainIndex;
  selected = { kind: "route", trainIndex, routeIndex, ...trains[trainIndex].routes[routeIndex] };
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
  keptTrain = trainIndex;
  selected = {
    kind: "other",
    trainIndex,
    wait: "想定外",
    from: "その他",
    fromTime: "--:--",
    to: "淡路",
    toTime: "--:--",
    officeTime: "08:35"
  };
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
  document.getElementById("waitFromTime").textContent = formatTime(selected.fromTime, "発");
  document.getElementById("waitTo").textContent = selected.to;
  document.getElementById("waitToTime").textContent = formatTime(selected.toTime, "着");
  document.getElementById("officeTime").textContent = selected.officeTime;

  state = "arrivalWait";
  show("arrivalWaitView");
  setNext("会社に着いたら「到着」をタップ！今日も良いﾉﾘｶｴ♪ﾀﾞｯﾀﾖ ♫", true);
  setAction("到着");
  toast("乗換完了");
}

function arriveOffice() {
  state = "record";
  show("recordView");
  setNext("お疲れ様でした！");
  setAction("ホームへ戻る");
  toast("今日の記録へ");
}

function backStandby() {
  state = "standby";
  selected = null;
  keptTrain = null;
  document.body.classList.add("standby-mode");
  show("standbyView");
  setNext("おはようございます。今日も元気に出発しましょう。", true);
  setAction("出発");
}

function formatTime(value, suffix) {
  return value.includes(":") ? `${value}${suffix}` : value;
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
}

document.addEventListener("click", (event) => {
  const toastButton = event.target.closest("[data-toast]");
  if (toastButton) toast(toastButton.dataset.toast);

  const toggleButton = event.target.closest("[data-toggle-route]");
  if (toggleButton) toggleCard(toggleButton);

  const branchButton = event.target.closest("[data-select-branch]");
  if (branchButton) {
    const [trainIndex, routeIndex] = branchButton.dataset.selectBranch.split(":").map(Number);
    selectBranch(trainIndex, routeIndex);
  }

  const otherButton = event.target.closest("[data-select-other]");
  if (otherButton) selectOther(Number(otherButton.dataset.selectOther));
});

mainActionButton.addEventListener("click", mainAction);

window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.add("ready"), 1000);
  setNext("おはようございます。今日も元気に出発しましょう。", true);
});
