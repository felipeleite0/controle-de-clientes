import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caminhoBanco = path.resolve(process.env.DATABASE_PATH ?? path.join(__dirname, "..", "dados", "controle-clientes-demo.db"));
const pastaDados = path.dirname(caminhoBanco);

if (!fs.existsSync(pastaDados)) {
  fs.mkdirSync(pastaDados, { recursive: true });
}

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

// Triggers protegem bancos existentes sem reconstruir tabelas ou apagar registros.
const clienteInvalido = `
  NEW.id NOT BETWEEN 1 AND 9007199254740991
  OR typeof(NEW.nome) != 'text' OR length(trim(NEW.nome)) NOT BETWEEN 1 AND 200
  OR NEW.canal NOT IN ('Site', 'Instagram', 'WhatsApp', 'Indicacao')
  OR length(NEW.data_pedido) != 10 OR substr(NEW.data_pedido, 1, 4) = '0000'
  OR date(NEW.data_pedido, '+0 days') IS NOT NEW.data_pedido
  OR typeof(NEW.servicos) != 'integer' OR NEW.servicos NOT BETWEEN 0 AND 9007199254740991
  OR typeof(NEW.pendencias) != 'integer' OR NEW.pendencias NOT BETWEEN 0 AND 9007199254740991
  OR typeof(NEW.cancelamentos) != 'integer' OR NEW.cancelamentos NOT BETWEEN 0 AND 9007199254740991
  OR typeof(NEW.valor_pago) NOT IN ('integer', 'real')
  OR NEW.valor_pago < 0 OR NEW.valor_pago > 1.7976931348623157e308
  OR NEW.status NOT IN ('Finalizado', 'Em andamento')
`;
for (const operacao of ["INSERT", "UPDATE"]) {
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS validar_cliente_${operacao.toLowerCase()}
    AFTER ${operacao} ON clientes WHEN ${clienteInvalido}
    BEGIN SELECT RAISE(ABORT, 'Dados do cliente invalidos.'); END;
    CREATE TRIGGER IF NOT EXISTS validar_semana_${operacao.toLowerCase()}
    AFTER ${operacao} ON semanas
    WHEN typeof(NEW.numero) != 'integer' OR NEW.numero NOT BETWEEN 1 AND 9007199254740991
    BEGIN SELECT RAISE(ABORT, 'Numero da semana invalido.'); END;
  `);
}
db.exec("CREATE INDEX IF NOT EXISTS clientes_por_semana ON clientes (semana_id, data_pedido, id)");

console.log("Banco SQLite conectado com sucesso.");
console.log(`Banco: ${caminhoBanco}`);

export default db;
