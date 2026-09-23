// Runs once when the server boots: starts the in-process reminder scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.DISABLE_SCHEDULER === "1") return;
    const { sendDailyReminders } = await import("./lib/notify");
    const tick = () =>
      sendDailyReminders()
        .then((n) => n && console.log(`[reminders] sent ${n} daily email(s)`))
        .catch((err) => console.error("[reminders] failed:", err));
    setTimeout(tick, 15_000);
    setInterval(tick, 10 * 60_000);
  }
}
