"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const env_1 = require("./env");
exports.sequelize = new sequelize_1.Sequelize(env_1.env.DB_NAME, env_1.env.DB_USER, env_1.env.DB_PASSWORD, {
    host: env_1.env.DB_HOST,
    port: env_1.env.DB_PORT,
    dialect: 'mysql',
    logging: env_1.env.NODE_ENV === 'development' ? console.log : false,
    define: { underscored: true, timestamps: true }
});
