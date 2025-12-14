import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Seleccionar credenciales según el entorno
const dbConfig = {
  database: isProduction ? process.env.PROD_DB_NAME : process.env.DEV_DB_NAME,
  username: isProduction ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
  password: isProduction ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD,
  host: isProduction ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST,
  dialect: "mysql",
  port: 3306,
  logging: false,
};

console.log(`🔧 Entorno: ${process.env.NODE_ENV}`);
console.log(`🔧 Conectando a base de datos: ${dbConfig.database} en ${dbConfig.host}`);

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    port: dbConfig.port,
    logging: dbConfig.logging,
  }
);

export default sequelize;