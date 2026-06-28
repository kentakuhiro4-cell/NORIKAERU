# Data Model

## Scope

現在のデータ対象は平日朝の出勤用です。

- あびこ → 動物園前
- 動物園前 → 淡路
- 会社到着（予定） = 淡路到着 + 17分

将来的には平日退勤用、土日祝ダイヤも同じ構造で追加します。

## Files

### `app/data/metro_abiko_weekday.json`

大阪メトロ公式時刻表から取得した、あびこ駅・御堂筋線・箕面萱野方面の平日朝データです。

### `app/data/metro_dobutsuenmae_weekday.json`

大阪メトロ公式時刻表から取得した、動物園前駅・堺筋線・天六/北千里/高槻/京都方面の平日朝データです。

`天神橋筋六丁目` 行きは淡路まで行けないため、ルート生成対象から除外します。

### `app/data/route_weekday.json`

アプリが直接読むためのルート候補データです。

現在は以下の固定前提で生成しています。

- あびこ → 動物園前: 12分
- 動物園前 → 淡路: 23分
- 淡路 → 会社: 17分
- 各あびこ発に対して、動物園前から淡路まで行ける直近2本を `A` / `B` として採用

## Sources

- Osaka Metro あびこ 平日 箕面萱野方面: https://kensaku.osakametro.co.jp/timetable/ja/sp/subway/dia/station/25806/1019/2/#weekday
- Osaka Metro 動物園前 平日 天六・北千里・高槻・京都方面: https://kensaku.osakametro.co.jp/timetable/ja/sp/subway/dia/station/26081/1024/2/#weekday

公式ページ上の時刻表は `2025年10月14日現在` と表示されています。

## Regeneration

公式HTMLを `work/abiko.html` と `work/dobutsuenmae.html` に保存したうえで、以下を実行します。

```powershell
node tools\generate-weekday-data.js
```
