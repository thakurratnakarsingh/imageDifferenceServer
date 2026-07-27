import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export class Admin extends Model {
  declare id: number; declare name: string; declare email: string;
  declare passwordHash: string; declare role: 'admin' | 'editor'; declare isActive: boolean;
}
Admin.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'editor'), allowNull: false, defaultValue: 'editor' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastLoginAt: DataTypes.DATE
}, { sequelize, modelName: 'Admin', tableName: 'admins' });

export class User extends Model {
  declare id: number; declare deviceId: string; declare name: string | null; declare email: string | null;
  declare currentLevel: number; declare highestUnlockedLevel: number; declare totalScore: number; declare coins: number;
}
User.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: DataTypes.STRING(120), email: { type: DataTypes.STRING(190), unique: true },
  passwordHash: DataTypes.STRING(255), deviceId: { type: DataTypes.STRING(190), unique: true },
  currentLevel: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
  highestUnlockedLevel: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
  totalScore: { type: DataTypes.INTEGER, defaultValue: 0 }, coins: { type: DataTypes.INTEGER, defaultValue: 0 },
  isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false }, lastPlayedAt: DataTypes.DATE
}, { sequelize, modelName: 'User', tableName: 'users' });

export class Actress extends Model {
  declare id: number; declare name: string; declare slug: string; declare country: string;
  declare industry: string; declare description: string | null; declare profileImage: string | null; declare isActive: boolean;
}
Actress.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false }, slug: { type: DataTypes.STRING(140), unique: true, allowNull: false },
  country: { type: DataTypes.STRING(80), allowNull: false }, industry: { type: DataTypes.STRING(80), allowNull: false },
  description: DataTypes.TEXT, profileImage: DataTypes.STRING(500),
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'Actress', tableName: 'actresses' });

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export class Level extends Model {
  declare id: number; declare levelNumber: number; declare actressId: number; declare title: string;
  declare originalImagePath: string; declare modifiedImagePath: string | null; declare previewImagePath: string | null;
  declare imageWidth: number; declare imageHeight: number; declare difficulty: Difficulty; declare timeLimit: number;
  declare maximumLives: number; declare maximumHints: number; declare generationProvider: string;
  declare generationStatus: string; declare validationStatus: string; declare reviewStatus: string; declare isActive: boolean;
}
Level.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  levelNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, validate: { min: 1, max: 1000 } },
  actressId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, title: { type: DataTypes.STRING(180), defaultValue: 'Find 10 Differences' },
  originalImagePath: { type: DataTypes.STRING(500), allowNull: false }, modifiedImagePath: DataTypes.STRING(500),
  previewImagePath: DataTypes.STRING(500), imageWidth: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  imageHeight: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  difficulty: { type: DataTypes.ENUM('easy','medium','hard','expert'), allowNull: false },
  timeLimit: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 180 },
  maximumLives: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 5 },
  maximumHints: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 3 },
  completionBonus: { type: DataTypes.INTEGER, defaultValue: 500 },
  generationProvider: { type: DataTypes.ENUM('local','ai','hybrid'), defaultValue: 'local' },
  generationStatus: { type: DataTypes.STRING(30), defaultValue: 'pending' },
  validationStatus: { type: DataTypes.STRING(30), defaultValue: 'pending' },
  reviewStatus: { type: DataTypes.STRING(30), defaultValue: 'draft' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false }, approvedBy: DataTypes.INTEGER.UNSIGNED, approvedAt: DataTypes.DATE
}, { sequelize, modelName: 'Level', tableName: 'levels', indexes: [
  { fields: ['generation_status'] }, { fields: ['validation_status'] }, { fields: ['review_status'] },
  { fields: ['difficulty'] }, { fields: ['is_active'] }
] });

export class LevelDifference extends Model {
  declare id: number; declare levelId: number; declare differenceNumber: number; declare shapeType: 'circle' | 'rectangle';
  declare modificationType: string; declare normalizedX: number; declare normalizedY: number;
  declare normalizedWidth: number | null; declare normalizedHeight: number | null; declare normalizedRadius: number | null;
  declare description: string; declare confidenceScore: number; declare difficultyScore: number; declare isActive: boolean;
}
LevelDifference.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  levelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  differenceNumber: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 10 } },
  shapeType: { type: DataTypes.ENUM('circle','rectangle'), allowNull: false },
  modificationType: { type: DataTypes.STRING(50), allowNull: false },
  normalizedX: { type: DataTypes.DECIMAL(9,6), allowNull: false }, normalizedY: { type: DataTypes.DECIMAL(9,6), allowNull: false },
  normalizedWidth: DataTypes.DECIMAL(9,6), normalizedHeight: DataTypes.DECIMAL(9,6), normalizedRadius: DataTypes.DECIMAL(9,6),
  sourceRegionX: DataTypes.INTEGER.UNSIGNED, sourceRegionY: DataTypes.INTEGER.UNSIGNED,
  sourceRegionWidth: DataTypes.INTEGER.UNSIGNED, sourceRegionHeight: DataTypes.INTEGER.UNSIGNED,
  description: { type: DataTypes.STRING(255), allowNull: false }, confidenceScore: { type: DataTypes.DECIMAL(5,4), defaultValue: 0.9 },
  difficultyScore: { type: DataTypes.DECIMAL(5,4), defaultValue: 0.5 },
  isAutomaticallyGenerated: { type: DataTypes.BOOLEAN, defaultValue: true }, isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'LevelDifference', tableName: 'level_differences', indexes: [
  { unique: true, fields: ['level_id','difference_number'] }
] });

export class GenerationJob extends Model {
  declare id: number; declare jobUuid: string; declare levelId: number; declare provider: string;
  declare status: string; declare progress: number; declare currentStep: string; declare attemptCount: number;
  declare maximumAttempts: number; declare errorCode: string | null; declare errorMessage: string | null;
}
GenerationJob.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  jobUuid: { type: DataTypes.UUID, unique: true, allowNull: false }, levelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  provider: { type: DataTypes.STRING(20), allowNull: false }, status: { type: DataTypes.STRING(30), defaultValue: 'pending' },
  progress: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, currentStep: { type: DataTypes.STRING(255), defaultValue: 'Queued' },
  attemptCount: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, maximumAttempts: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 5 },
  errorCode: DataTypes.STRING(80), errorMessage: DataTypes.TEXT, startedAt: DataTypes.DATE, completedAt: DataTypes.DATE
}, { sequelize, modelName: 'GenerationJob', tableName: 'puzzle_generation_jobs' });

export class GameSession extends Model {
  declare id: number; declare sessionToken: string; declare deviceId: string; declare levelId: number;
  declare sessionStatus: string; declare remainingLives: number; declare remainingHints: number;
  declare foundCount: number; declare scoreEarned: number; declare wrongTaps: number; declare completedAt: Date | null;
}
GameSession.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  sessionToken: { type: DataTypes.UUID, unique: true, allowNull: false }, userId: DataTypes.INTEGER.UNSIGNED,
  deviceId: { type: DataTypes.STRING(190), allowNull: false }, levelId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, completedAt: DataTypes.DATE,
  sessionStatus: { type: DataTypes.STRING(30), defaultValue: 'active' },
  remainingLives: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false }, remainingHints: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  foundCount: { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 0 }, scoreEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
  wrongTaps: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 }
}, { sequelize, modelName: 'GameSession', tableName: 'game_sessions' });

export class SessionFoundDifference extends Model {
  declare id: number; declare sessionId: number; declare differenceId: number;
}
SessionFoundDifference.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, differenceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  foundAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, tapX: DataTypes.DECIMAL(9,6), tapY: DataTypes.DECIMAL(9,6),
  imageType: DataTypes.ENUM('original','modified')
}, { sequelize, modelName: 'SessionFoundDifference', tableName: 'session_found_differences', indexes: [
  { unique: true, fields: ['session_id','difference_id'] }
] });

Actress.hasMany(Level, { foreignKey: 'actressId' }); Level.belongsTo(Actress, { foreignKey: 'actressId' });
Level.hasMany(LevelDifference, { foreignKey: 'levelId', as: 'differences', onDelete: 'CASCADE' });
LevelDifference.belongsTo(Level, { foreignKey: 'levelId' });
Level.hasMany(GenerationJob, { foreignKey: 'levelId', onDelete: 'CASCADE' });
Level.hasMany(GameSession, { foreignKey: 'levelId' });
GameSession.hasMany(SessionFoundDifference, { foreignKey: 'sessionId', onDelete: 'CASCADE' });
LevelDifference.hasMany(SessionFoundDifference, { foreignKey: 'differenceId' });

export const models = { Admin, User, Actress, Level, LevelDifference, GenerationJob, GameSession, SessionFoundDifference };
