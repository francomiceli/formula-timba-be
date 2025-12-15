import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const LeagueMember = sequelize.define("LeagueMember", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leagueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leagues',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Rol del usuario en la liga
  role: {
    type: DataTypes.ENUM('admin', 'moderator', 'member'),
    defaultValue: 'member',
  },
  // Puntos acumulados en esta liga
  totalPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Cantidad de predicciones realizadas en esta liga
  predictionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Posiciones exactas acertadas
  correctPositions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Racha actual de carreras con puntos
  currentStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Mejor racha histórica
  bestStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Fecha de unión a la liga
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  // Estado de la membresía
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
  },
  // Último acceso a la liga
  lastActiveAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'league_members',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['leagueId', 'userId'],
      name: 'unique_league_user',
    },
    {
      fields: ['leagueId', 'totalPoints'],
      name: 'idx_league_ranking',
    },
    {
      fields: ['userId'],
      name: 'idx_member_user',
    },
    {
      fields: ['leagueId', 'status'],
      name: 'idx_league_active_members',
    },
  ],
});

export default LeagueMember;