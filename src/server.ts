import { app } from './app';
import { sequelize } from './config/database';
import { env } from './config/env';
import { recoverGenerationJobs } from './jobs/generationQueue';

async function start() {
  await sequelize.authenticate();
  await recoverGenerationJobs();
  app.listen(env.PORT, () => console.log(`Find 10 Differences API listening on ${env.BASE_URL}`));
}
start().catch(error => {
  console.error('Server failed to start. Import database/find_differences_game.sql and check .env.', error);
  process.exit(1);
});
