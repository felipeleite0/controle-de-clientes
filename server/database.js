import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pastaDados = path.join(__dirname, "..", "dados");

if (!fs.existsSync(pastaDados)) {
  fs.mkdirSync(pastaDados, { recursive: true });
}

const caminhoBanco = path.join(pastaDados, "controle-clientes-demo.db");

const db = new Database(caminhoBanco);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS semanas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL UNIQUE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    canal TEXT NOT NULL,
    data_pedido TEXT NOT NULL,
    servicos INTEGER NOT NULL DEFAULT 0,
    pendencias INTEGER NOT NULL DEFAULT 0,
    cancelamentos INTEGER NOT NULL DEFAULT 0,
    valor_pago REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Finalizado',
    semana_id INTEGER NOT NULL,

    FOREIGN KEY (semana_id)
      REFERENCES semanas(id)
      ON DELETE CASCADE
  );
`);

console.log("Banco SQLite conectado com sucesso.");
console.log(`Banco: ${caminhoBanco}`);

export default db;
