import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";

export type SqliteDb = sqlite3.Database;

export function openDb(sqlitePath: string): SqliteDb {
  const dir = path.dirname(sqlitePath);
  if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new sqlite3.Database(sqlitePath);
}

export function exec(db: SqliteDb, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, err => (err ? reject(err) : resolve()));
  });
}

export function all<T = any>(db: SqliteDb, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });
}

export function get<T = any>(db: SqliteDb, sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T | undefined)));
  });
}

export function run(db: SqliteDb, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, err => (err ? reject(err) : resolve()));
  });
}

export async function ensureSchema(db: SqliteDb) {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await exec(db, schemaSql);
}
