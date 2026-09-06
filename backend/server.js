const app = require('./app');
const connectDB = require('./config/database');
const { seedSubscriptionTiers } = require('./utils/seedSubscriptionTiers');

// Production/dev entrypoint: connect to the real database, then start
// listening. Kept separate from app.js so tests can import the Express
// app on its own, without touching a real database or network port.
const start = async () => {
  await connectDB();

  // Part 1.5: make sure the full plan catalog (Free/Starter/Professional/
  // Enterprise) exists before any request can hit it -- registration only
  // ever needed 'Free' to exist, but the upgrade/tiers endpoints need all
  // four. Idempotent, so safe to run on every boot.
  await seedSubscriptionTiers();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

start();

module.exports = app;
