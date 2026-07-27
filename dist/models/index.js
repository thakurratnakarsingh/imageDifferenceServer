"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.models = exports.SessionFoundDifference = exports.GameSession = exports.GenerationJob = exports.LevelDifference = exports.Level = exports.Actress = exports.User = exports.Admin = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Admin extends sequelize_1.Model {
}
exports.Admin = Admin;
Admin.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(120), allowNull: false },
    email: { type: sequelize_1.DataTypes.STRING(190), allowNull: false, unique: true },
    passwordHash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    role: { type: sequelize_1.DataTypes.ENUM('admin', 'editor'), allowNull: false, defaultValue: 'editor' },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastLoginAt: sequelize_1.DataTypes.DATE
}, { sequelize: database_1.sequelize, modelName: 'Admin', tableName: 'admins' });
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: sequelize_1.DataTypes.STRING(120), email: { type: sequelize_1.DataTypes.STRING(190), unique: true },
    passwordHash: sequelize_1.DataTypes.STRING(255), deviceId: { type: sequelize_1.DataTypes.STRING(190), unique: true },
    currentLevel: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    highestUnlockedLevel: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    totalScore: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 }, coins: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    isBlocked: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false }, lastPlayedAt: sequelize_1.DataTypes.DATE
}, { sequelize: database_1.sequelize, modelName: 'User', tableName: 'users' });
class Actress extends sequelize_1.Model {
}
exports.Actress = Actress;
Actress.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(120), allowNull: false }, slug: { type: sequelize_1.DataTypes.STRING(140), unique: true, allowNull: false },
    country: { type: sequelize_1.DataTypes.STRING(80), allowNull: false }, industry: { type: sequelize_1.DataTypes.STRING(80), allowNull: false },
    description: sequelize_1.DataTypes.TEXT, profileImage: sequelize_1.DataTypes.STRING(500),
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize: database_1.sequelize, modelName: 'Actress', tableName: 'actresses' });
class Level extends sequelize_1.Model {
}
exports.Level = Level;
Level.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    levelNumber: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, validate: { min: 1, max: 1000 } },
    actressId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false }, title: { type: sequelize_1.DataTypes.STRING(180), defaultValue: 'Find 10 Differences' },
    originalImagePath: { type: sequelize_1.DataTypes.STRING(500), allowNull: false }, modifiedImagePath: sequelize_1.DataTypes.STRING(500),
    previewImagePath: sequelize_1.DataTypes.STRING(500), imageWidth: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    imageHeight: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    difficulty: { type: sequelize_1.DataTypes.ENUM('easy', 'medium', 'hard', 'expert'), allowNull: false },
    timeLimit: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 180 },
    maximumLives: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 5 },
    maximumHints: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 3 },
    completionBonus: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 500 },
    generationProvider: { type: sequelize_1.DataTypes.ENUM('local', 'ai', 'hybrid'), defaultValue: 'local' },
    generationStatus: { type: sequelize_1.DataTypes.STRING(30), defaultValue: 'pending' },
    validationStatus: { type: sequelize_1.DataTypes.STRING(30), defaultValue: 'pending' },
    reviewStatus: { type: sequelize_1.DataTypes.STRING(30), defaultValue: 'draft' },
    isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false }, approvedBy: sequelize_1.DataTypes.INTEGER.UNSIGNED, approvedAt: sequelize_1.DataTypes.DATE
}, { sequelize: database_1.sequelize, modelName: 'Level', tableName: 'levels', indexes: [
        { fields: ['generation_status'] }, { fields: ['validation_status'] }, { fields: ['review_status'] },
        { fields: ['difficulty'] }, { fields: ['is_active'] }
    ] });
class LevelDifference extends sequelize_1.Model {
}
exports.LevelDifference = LevelDifference;
LevelDifference.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    levelId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    differenceNumber: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 10 } },
    shapeType: { type: sequelize_1.DataTypes.ENUM('circle', 'rectangle'), allowNull: false },
    modificationType: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    normalizedX: { type: sequelize_1.DataTypes.DECIMAL(9, 6), allowNull: false }, normalizedY: { type: sequelize_1.DataTypes.DECIMAL(9, 6), allowNull: false },
    normalizedWidth: sequelize_1.DataTypes.DECIMAL(9, 6), normalizedHeight: sequelize_1.DataTypes.DECIMAL(9, 6), normalizedRadius: sequelize_1.DataTypes.DECIMAL(9, 6),
    sourceRegionX: sequelize_1.DataTypes.INTEGER.UNSIGNED, sourceRegionY: sequelize_1.DataTypes.INTEGER.UNSIGNED,
    sourceRegionWidth: sequelize_1.DataTypes.INTEGER.UNSIGNED, sourceRegionHeight: sequelize_1.DataTypes.INTEGER.UNSIGNED,
    description: { type: sequelize_1.DataTypes.STRING(255), allowNull: false }, confidenceScore: { type: sequelize_1.DataTypes.DECIMAL(5, 4), defaultValue: 0.9 },
    difficultyScore: { type: sequelize_1.DataTypes.DECIMAL(5, 4), defaultValue: 0.5 },
    isAutomaticallyGenerated: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true }, isActive: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize: database_1.sequelize, modelName: 'LevelDifference', tableName: 'level_differences', indexes: [
        { unique: true, fields: ['level_id', 'difference_number'] }
    ] });
class GenerationJob extends sequelize_1.Model {
}
exports.GenerationJob = GenerationJob;
GenerationJob.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    jobUuid: { type: sequelize_1.DataTypes.UUID, unique: true, allowNull: false }, levelId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    provider: { type: sequelize_1.DataTypes.STRING(20), allowNull: false }, status: { type: sequelize_1.DataTypes.STRING(30), defaultValue: 'pending' },
    progress: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, currentStep: { type: sequelize_1.DataTypes.STRING(255), defaultValue: 'Queued' },
    attemptCount: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, maximumAttempts: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, defaultValue: 5 },
    errorCode: sequelize_1.DataTypes.STRING(80), errorMessage: sequelize_1.DataTypes.TEXT, startedAt: sequelize_1.DataTypes.DATE, completedAt: sequelize_1.DataTypes.DATE
}, { sequelize: database_1.sequelize, modelName: 'GenerationJob', tableName: 'puzzle_generation_jobs' });
class GameSession extends sequelize_1.Model {
}
exports.GameSession = GameSession;
GameSession.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sessionToken: { type: sequelize_1.DataTypes.UUID, unique: true, allowNull: false }, userId: sequelize_1.DataTypes.INTEGER.UNSIGNED,
    deviceId: { type: sequelize_1.DataTypes.STRING(190), allowNull: false }, levelId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    startedAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW }, completedAt: sequelize_1.DataTypes.DATE,
    sessionStatus: { type: sequelize_1.DataTypes.STRING(30), defaultValue: 'active' },
    remainingLives: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, allowNull: false }, remainingHints: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, allowNull: false },
    foundCount: { type: sequelize_1.DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, scoreEarned: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    wrongTaps: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, defaultValue: 0 }
}, { sequelize: database_1.sequelize, modelName: 'GameSession', tableName: 'game_sessions' });
class SessionFoundDifference extends sequelize_1.Model {
}
exports.SessionFoundDifference = SessionFoundDifference;
SessionFoundDifference.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    sessionId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false }, differenceId: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    foundAt: { type: sequelize_1.DataTypes.DATE, defaultValue: sequelize_1.DataTypes.NOW }, tapX: sequelize_1.DataTypes.DECIMAL(9, 6), tapY: sequelize_1.DataTypes.DECIMAL(9, 6),
    imageType: sequelize_1.DataTypes.ENUM('original', 'modified')
}, { sequelize: database_1.sequelize, modelName: 'SessionFoundDifference', tableName: 'session_found_differences', indexes: [
        { unique: true, fields: ['session_id', 'difference_id'] }
    ] });
Actress.hasMany(Level, { foreignKey: 'actressId' });
Level.belongsTo(Actress, { foreignKey: 'actressId' });
Level.hasMany(LevelDifference, { foreignKey: 'levelId', as: 'differences', onDelete: 'CASCADE' });
LevelDifference.belongsTo(Level, { foreignKey: 'levelId' });
Level.hasMany(GenerationJob, { foreignKey: 'levelId', onDelete: 'CASCADE' });
Level.hasMany(GameSession, { foreignKey: 'levelId' });
GameSession.hasMany(SessionFoundDifference, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
LevelDifference.hasMany(SessionFoundDifference, { foreignKey: 'differenceId' });
exports.models = { Admin, User, Actress, Level, LevelDifference, GenerationJob, GameSession, SessionFoundDifference };
