const cron = require('node-cron');
const { getDB } = require('./database/db');
const { createAndPost } = require('./services/post_creator');

let activeJobs = {};

function startScheduler() {
  console.log('⏰ Scheduler starting...');
  loadSchedules();

  // Reload schedules every 5 minutes (for dynamic updates from dashboard)
  cron.schedule('*/5 * * * *', () => {
    loadSchedules();
  });

  console.log('✅ Scheduler started!');
}

function loadSchedules() {
  const db = getDB();
  const schedules = db.prepare('SELECT * FROM schedules WHERE is_active = 1').all();

  // Stop all existing jobs
  Object.values(activeJobs).forEach(job => job.stop());
  activeJobs = {};

  schedules.forEach(schedule => {
    try {
      const cronExpr = timeToCron(schedule.time, schedule.days);
      if (!cronExpr) return;

      const job = cron.schedule(cronExpr, async () => {
        console.log(`\n⏰ Scheduled post triggered: ${schedule.label} (${schedule.time})`);
        const result = await createAndPost();
        if (result.success) {
          console.log(`✅ Scheduled post done: "${result.topicName}"`);
        } else {
          console.log(`❌ Scheduled post failed: ${result.error}`);
        }
      }, {
        timezone: 'Asia/Karachi',
      });

      activeJobs[schedule.id] = job;
      console.log(`📅 Schedule loaded: ${schedule.label} at ${schedule.time}`);

    } catch (err) {
      console.error(`❌ Schedule error for ID ${schedule.id}:`, err.message);
    }
  });

  console.log(`✅ ${Object.keys(activeJobs).length} schedules active`);
}

function timeToCron(timeStr, daysStr) {
  try {
    // timeStr format: "09:00" or "19:30"
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    // daysStr format: "1,2,3,4,5,6,7" (1=Sunday, 7=Saturday)
    let daysCron = '*';
    if (daysStr && daysStr !== '1,2,3,4,5,6,7') {
      // Convert to 0-6 (cron format: 0=Sunday)
      const days = daysStr.split(',').map(d => parseInt(d) - 1);
      daysCron = days.join(',');
    }

    return `${minutes} ${hours} * * ${daysCron}`;
  } catch (e) {
    return null;
  }
}

function reloadSchedules() {
  loadSchedules();
}

module.exports = { startScheduler, reloadSchedules };
