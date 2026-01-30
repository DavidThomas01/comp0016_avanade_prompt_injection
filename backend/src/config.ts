import dotenv from "dotenv";

dotenv.config();

export type Config = {
  port: number;
  corsOrigin: string;
  sqlitePath: string;
  modelProvider: "mock";
};

export function getConfig(): Config {
  const port = Number(process.env.PORT ?? "8080");
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const sqlitePath = process.env.SQLITE_PATH ?? "./data.sqlite";
  const modelProvider = (process.env.MODEL_PROVIDER ?? "mock") as "mock";

  return { port, corsOrigin, sqlitePath, modelProvider };
}
