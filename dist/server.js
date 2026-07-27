"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const generationQueue_1 = require("./jobs/generationQueue");
async function start() {
    await database_1.sequelize.authenticate();
    await (0, generationQueue_1.recoverGenerationJobs)();
    app_1.app.listen(env_1.env.PORT, () => console.log(`Find 10 Differences API listening on ${env_1.env.BASE_URL}`));
}
start().catch(error => {
    console.error('Server failed to start. Import database/find_differences_game.sql and check .env.', error);
    process.exit(1);
});
