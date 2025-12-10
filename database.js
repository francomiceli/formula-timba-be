import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,      // nombre de la base
  process.env.DB_USER,      // ej: admin
  process.env.DB_PASSWORD,  // tu password
  {
    host: process.env.DB_HOST, // endpoint del RDS
    dialect: "mysql",
    port: 3306,
    logging: false,
  }
);

export default sequelize;