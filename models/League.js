import { DataTypes } from "sequelize";
import sequelize from "../database.js";

const League = sequelize.define("League", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [3, 100],
        msg: 'El nombre debe tener entre 3 y 100 caracteres',
      },
    },
  },
  // URL amigable única
  slug: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Liga pública (cualquiera puede unirse) o privada (solo con código)
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Código de invitación para ligas privadas
  inviteCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true,
  },
  // Usuario que creó la liga
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Temporada de la liga (año)
  season: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => new Date().getFullYear(),
  },
  // Máximo de miembros permitidos (null = sin límite)
  maxMembers: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  // Imagen/logo de la liga
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  // Estado de la liga
  status: {
    type: DataTypes.ENUM('active', 'archived', 'deleted'),
    defaultValue: 'active',
  },
}, {
  tableName: 'leagues',
  timestamps: true,
  paranoid: true, // Soft delete
  hooks: {
    // Generar slug automáticamente antes de crear
    beforeValidate: async (league) => {
      if (!league.slug && league.name) {
        let baseSlug = league.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Verificar unicidad
        let slug = baseSlug;
        let counter = 1;
        const League = sequelize.models.League;
        
        while (await League.findOne({ where: { slug }, paranoid: false })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        league.slug = slug;
      }
    },
  },
  indexes: [
    {
      fields: ['createdBy'],
      name: 'idx_leagues_creator',
    },
    {
      fields: ['season'],
      name: 'idx_leagues_season',
    },
    {
      fields: ['isPublic', 'status'],
      name: 'idx_leagues_public_status',
    },
  ],
});

export default League;