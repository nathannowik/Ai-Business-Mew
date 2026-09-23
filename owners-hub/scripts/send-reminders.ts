// Manually send today's reminder emails: npm run reminders:send [-- --force]
import { sendDailyReminders } from "../src/lib/notify";

sendDailyReminders({ force: process.argv.includes("--force") })
  .then((n) => {
    console.log(`Sent ${n} reminder email(s).`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
