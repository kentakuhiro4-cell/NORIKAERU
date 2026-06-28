const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "app", "data");

const sources = {
  abiko: "https://kensaku.osakametro.co.jp/timetable/ja/sp/subway/dia/station/25806/1019/2/#weekday",
  dobutsuenmae: "https://kensaku.osakametro.co.jp/timetable/ja/sp/subway/dia/station/26081/1024/2/#weekday"
};

const legends = {
  abiko: {
    "": "箕面萱野",
    "新": "新大阪",
    "天": "天王寺",
    "江": "江坂",
    "中": "中津"
  },
  dobutsuenmae: {
    "": "北千里",
    "河": "河原町",
    "高": "高槻市",
    "茨": "茨木市",
    "正": "正雀",
    "淡": "淡路",
    "天": "天神橋筋六丁目",
    "■": "河原町(準急)"
  }
};

function strip(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[\s\u3000]+/g, " ")
    .trim();
}

function normalizeMark(value) {
  return (value || "").replace(/[\s\u3000]+/g, "").trim();
}

function parseMetro(file, stationKey) {
  const html = fs.readFileSync(file, "utf8");
  const weekday = html.match(/<div class="timetable_area stt_heijitsu[\s\S]*?<\/table>/)?.[0] || html;
  const rows = [...weekday.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
  const trains = [];
  let hour = null;

  for (const row of rows) {
    const cells = [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map((match) => ({
      attrs: match[1],
      html: match[2]
    }));

    if (!cells.length) continue;

    let start = 0;
    const firstText = strip(cells[0].html);
    if (/class="[^"]*time[^"]*"/.test(cells[0].attrs) && /^\d{1,2}$/.test(firstText)) {
      hour = Number(firstText);
      start = 1;
    }

    if (hour == null || hour < 5 || hour > 10) continue;

    for (let i = start; i < cells.length; i++) {
      const parts = cells[i].html.split(/<br\s*\/?\s*>/i).map(strip).filter(Boolean);
      if (!parts.length) continue;

      const minute = parts[parts.length - 1];
      if (!/^\d{2}$/.test(minute)) continue;

      const mark = parts.length > 1 ? normalizeMark(parts[0]) : "";
      trains.push({
        time: `${String(hour).padStart(2, "0")}:${minute}`,
        destination: legends[stationKey][mark] ?? null,
        mark,
        direction: stationKey === "abiko" ? "箕面萱野方面" : "天六・北千里・高槻・京都方面"
      });
    }
  }

  return trains;
}

function addMinutes(time, minutes) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function diffMinutes(from, to) {
  const [fromHour, fromMinute] = from.split(":").map(Number);
  const [toHour, toMinute] = to.split(":").map(Number);
  return toHour * 60 + toMinute - (fromHour * 60 + fromMinute);
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

fs.mkdirSync(outputDir, { recursive: true });

const abikoTrains = parseMetro(path.join(root, "..", "work", "abiko.html"), "abiko");
const dobutsuenTrains = parseMetro(path.join(root, "..", "work", "dobutsuenmae.html"), "dobutsuenmae")
  .map((train) => ({
    ...train,
    servesAwaji: train.destination !== "天神橋筋六丁目"
  }));

const generatedAt = new Date().toISOString();
const serviceDateNote = "Osaka Metro official timetable page shows 2025-10-14 as current date.";

const metroAbiko = {
  schemaVersion: 1,
  service: "weekday_morning_commute",
  source: {
    name: "Osaka Metro official timetable",
    url: sources.abiko,
    retrievedAt: generatedAt,
    note: serviceDateNote
  },
  station: { id: "M27", name: "あびこ", line: "御堂筋線" },
  direction: "箕面萱野方面",
  timeRange: { from: "05:00", to: "10:59" },
  legend: legends.abiko,
  trains: abikoTrains
};

const metroDobutsuenmae = {
  schemaVersion: 1,
  service: "weekday_morning_commute",
  source: {
    name: "Osaka Metro official timetable",
    url: sources.dobutsuenmae,
    retrievedAt: generatedAt,
    note: serviceDateNote
  },
  station: { id: "K19", name: "動物園前", line: "堺筋線" },
  direction: "天六・北千里・高槻・京都方面",
  timeRange: { from: "05:00", to: "10:59" },
  legend: legends.dobutsuenmae,
  rules: { excludeDestinations: ["天神橋筋六丁目"], reason: "淡路まで行けないため" },
  trains: dobutsuenTrains
};

const routes = abikoTrains.map((abiko, index) => {
  const dobutsuenArrive = addMinutes(abiko.time, 12);
  const candidates = dobutsuenTrains
    .filter((train) => train.servesAwaji && diffMinutes(dobutsuenArrive, train.time) >= 0)
    .slice(0, 2)
    .map((train, routeIndex) => ({
      id: routeIndex === 0 ? "A" : "B",
      wait: diffMinutes(dobutsuenArrive, train.time),
      dobutsuenDepart: train.time,
      destination: train.destination,
      awajiArrive: addMinutes(train.time, 23),
      officeArrive: addMinutes(addMinutes(train.time, 23), 17)
    }));

  return {
    id: `weekday-${String(index + 1).padStart(3, "0")}`,
    abikoDepart: abiko.time,
    abikoDestination: abiko.destination,
    dobutsuenArrive,
    routes: candidates,
    other: { id: "OTHER", type: "other" }
  };
});

const routeWeekday = {
  schemaVersion: 1,
  service: "weekday_morning_commute",
  source: {
    metroAbiko: sources.abiko,
    metroDobutsuenmae: sources.dobutsuenmae,
    generatedAt,
    note: "Route times use fixed travel assumptions until RouteEngine validates against full transit data."
  },
  assumptions: {
    abikoToDobutsuenMinutes: 12,
    dobutsuenToAwajiMinutes: 23,
    awajiToOfficeMinutes: 17,
    excludeDobutsuenDestinations: ["天神橋筋六丁目"]
  },
  routes
};

writeJson("metro_abiko_weekday.json", metroAbiko);
writeJson("metro_dobutsuenmae_weekday.json", metroDobutsuenmae);
writeJson("route_weekday.json", routeWeekday);

console.log(JSON.stringify({
  abiko: abikoTrains.length,
  dobutsuenmae: dobutsuenTrains.length,
  routeEntries: routes.length,
  sample742: routes.find((route) => route.abikoDepart === "07:42")
}, null, 2));
