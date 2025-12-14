import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createDatabaseIfNotExists() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Seleccionar credenciales según el entorno
  const dbHost = isProduction ? process.env.PROD_DB_HOST : process.env.DEV_DB_HOST;
  const dbUser = isProduction ? process.env.PROD_DB_USER : process.env.DEV_DB_USER;
  const dbPassword = isProduction ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD;
  const dbName = isProduction ? process.env.PROD_DB_NAME : process.env.DEV_DB_NAME;

  console.log(`🔧 Verificando base de datos: ${dbName} en ${dbHost}`);

  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    port: 3306
  });

  // Crea la base si no existe
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  console.log(`✅ Base de datos "${dbName}" lista.`);
  await connection.end();
}

export default createDatabaseIfNotExists;