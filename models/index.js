import sequelize from "../database.js";

// ==========================================
// IMPORTAR TODOS LOS MODELOS
// ==========================================
import User from "./User.js";
import Pilot from "./Pilot.js";
import Race from "./Race.js";
import RaceResult from "./RaceResult.js";
import Prediction from "./Prediction.js";
import PredictionItem from "./PredictionItem.js";
import League from "./League.js";
import LeagueMember from "./LeagueMember.js";
import UserStats from "./UserStats.js";

// ==========================================
// ASOCIACIONES
// ==========================================

// ------------------------------------------
// USER <-> LEAGUE (Many-to-Many via LeagueMember)
// ------------------------------------------
User.belongsToMany(League, {
  through: LeagueMember,
  foreignKey: 'userId',
  otherKey: 'leagueId',
  as: 'leagues',
});

League.belongsToMany(User, {
  through: LeagueMember,
  foreignKey: 'leagueId',
  otherKey: 'userId',
  as: 'members',
});

// Liga creada por usuario
League.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

User.hasMany(League, {
  foreignKey: 'createdBy',
  as: 'createdLeagues',
});

// ------------------------------------------
// LEAGUE_MEMBER (acceso directo para queries)
// ------------------------------------------
User.hasMany(LeagueMember, { 
  foreignKey: 'userId', 
  as: 'leagueMemberships' 
});

League.hasMany(LeagueMember, { 
  foreignKey: 'leagueId', 
  as: 'leagueMemberships' 
});

LeagueMember.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

LeagueMember.belongsTo(League, { 
  foreignKey: 'leagueId', 
  as: 'league' 
});

// ------------------------------------------
// RACE <-> RACE_RESULT
// ------------------------------------------
Race.hasMany(RaceResult, {
  foreignKey: 'raceId',
  as: 'results',
  onDelete: 'CASCADE',
});

RaceResult.belongsTo(Race, {
  foreignKey: 'raceId',
  as: 'race',
});

// ------------------------------------------
// PILOT <-> RACE_RESULT
// ------------------------------------------
Pilot.hasMany(RaceResult, {
  foreignKey: 'pilotId',
  as: 'raceResults',
});

RaceResult.belongsTo(Pilot, {
  foreignKey: 'pilotId',
  as: 'pilot',
});

// ------------------------------------------
// USER <-> PREDICTION
// ------------------------------------------
User.hasMany(Prediction, {
  foreignKey: 'userId',
  as: 'predictions',
});

Prediction.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ------------------------------------------
// RACE <-> PREDICTION
// ------------------------------------------
Race.hasMany(Prediction, {
  foreignKey: 'raceId',
  as: 'predictions',
});

Prediction.belongsTo(Race, {
  foreignKey: 'raceId',
  as: 'race',
});

// ------------------------------------------
// LEAGUE <-> PREDICTION
// ------------------------------------------
League.hasMany(Prediction, {
  foreignKey: 'leagueId',
  as: 'predictions',
});

Prediction.belongsTo(League, {
  foreignKey: 'leagueId',
  as: 'league',
});

// ------------------------------------------
// PREDICTION <-> PREDICTION_ITEM
// ------------------------------------------
Prediction.hasMany(PredictionItem, {
  foreignKey: 'predictionId',
  as: 'items',
  onDelete: 'CASCADE',
});

PredictionItem.belongsTo(Prediction, {
  foreignKey: 'predictionId',
  as: 'prediction',
});

// ------------------------------------------
// PILOT <-> PREDICTION_ITEM
// ------------------------------------------
Pilot.hasMany(PredictionItem, {
  foreignKey: 'pilotId',
  as: 'predictionItems',
});

PredictionItem.belongsTo(Pilot, {
  foreignKey: 'pilotId',
  as: 'pilot',
});

// ------------------------------------------
// USER <-> USER_STATS (One-to-One)
// ------------------------------------------
User.hasOne(UserStats, {
  foreignKey: 'userId',
  as: 'stats',
  onDelete: 'CASCADE',
});

UserStats.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// ------------------------------------------
// USER_STATS <-> PILOT (referencias de estadísticas)
// ------------------------------------------
UserStats.belongsTo(Pilot, {
  foreignKey: 'mostPickedPilotId',
  as: 'mostPickedPilot',
});

UserStats.belongsTo(Pilot, {
  foreignKey: 'bestPerformingPilotId',
  as: 'bestPerformingPilot',
});

// ==========================================
// EXPORTAR
// ==========================================

// Export nombrado para imports específicos
export {
  sequelize,
  User,
  Pilot,
  Race,
  RaceResult,
  Prediction,
  PredictionItem,
  League,
  LeagueMember,
  UserStats,
};

// Export default para import completo
export default {
  sequelize,
  User,
  Pilot,
  Race,
  RaceResult,
  Prediction,
  PredictionItem,
  League,
  LeagueMember,
  UserStats,
};