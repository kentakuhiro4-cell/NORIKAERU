(function () {
  const ROUTE_DATA = window.NORIKAERU_ROUTE_WEEKDAY;

  function toMinutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  function nearestIndex(routes, targetTime) {
    const target = toMinutes(targetTime);
    let bestIndex = 0;
    let bestDiff = Infinity;

    routes.forEach((route, index) => {
      const diff = Math.abs(toMinutes(route.abikoDepart) - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  function routeToCard(route) {
    return {
      id: route.id,
      start: "あびこ",
      st: route.abikoDepart,
      mid: "動物園前",
      arr: route.dobutsuenArrive,
      routes: route.routes.slice(0, 2).map((branch) => ({
        id: branch.id,
        wait: `${branch.wait}分`,
        from: "動物園前",
        fromTime: branch.dobutsuenDepart,
        to: "淡路",
        toTime: branch.awajiArrive,
        officeTime: branch.officeArrive,
        destination: branch.destination
      }))
    };
  }

  function getMorningRoutes(targetTime = "07:42", count = 3) {
    const sourceRoutes = ROUTE_DATA && Array.isArray(ROUTE_DATA.routes) ? ROUTE_DATA.routes : [];
    if (!sourceRoutes.length) return [];

    const centerIndex = nearestIndex(sourceRoutes, targetTime);
    const half = Math.floor(count / 2);
    let startIndex = Math.max(0, centerIndex - half);
    startIndex = Math.min(startIndex, Math.max(0, sourceRoutes.length - count));

    return sourceRoutes.slice(startIndex, startIndex + count).map(routeToCard);
  }

  window.NORIKAERU_ROUTE_ENGINE = {
    getMorningRoutes
  };
})();
