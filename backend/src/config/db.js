import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

dotenv.config();

const dbSsl = process.env.DB_SSL?.toLowerCase() || "false";
if (!["true", "false"].includes(dbSsl)) {
  throw new Error("DB_SSL must be either true or false.");
}
const usarSSL = dbSsl === "true";
if (process.env.NODE_ENV === "production" && !usarSSL) {
  throw new Error("DB_SSL=true is required in production.");
}
if (usarSSL && process.env.NODE_ENV === "production" && !process.env.DB_SSL_CA) {
  throw new Error("DB_SSL_CA must point to the Amazon RDS CA bundle in production.");
}

const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;
if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
  throw new Error("DB_PORT must be a valid TCP port.");
}

const dialectOptions = usarSSL
  ? {
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA ? { ca: readFileSync(process.env.DB_SSL_CA, "utf8") } : {}),
    },
  }
  : {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: dbPort,
    dialect: "postgres",
    dialectOptions,
  }
);

export default sequelize;