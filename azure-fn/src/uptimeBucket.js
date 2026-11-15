function bucketUptime(records) {
  const perDay = {};
  for (const record of records) {
    const day = String(record.ts).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !record.app) continue;
    const slot = (perDay[day] ??= {});
    const app = (slot[record.app] ??= { checks: 0, up: 0 });
    app.checks += 1;
    if (record.up) app.up += 1;
  }

  const apps = [...new Set(Object.values(perDay).flatMap((slot) => Object.keys(slot)))].sort();
  const points = Object.keys(perDay)
    .sort()
    .map((day) => {
      const point = { day };
      for (const name of apps) {
        const app = perDay[day][name];
        if (app) point[name] = Math.round((app.up / app.checks) * 10000) / 100;
      }
      return point;
    });

  return { apps, points };
}

module.exports = { bucketUptime };
