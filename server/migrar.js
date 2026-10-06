import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caminhoJson = path.join(__dirname, "..", "dados", "clientes-demo.json");

console.log("");
console.log("======================================");
console.log(" MIGRACAO JSON -> SQLITE");
console.log("======================================");
console.log("");

if (!fs.existsSync(caminhoJson)) {
  throw new Error(
    "Arquivo dados/clientes-demo.json nao encontrado. Use npm run seed para gerar dados ficticios diretamente no SQLite.",
  );
}

const conteudo = fs.readFileSync(caminhoJson, "utf-8");
const dados = JSON.parse(conteudo);

if (!Array.isArray(dados.semanas)) {
  throw new Error("O arquivo JSON nao possui semanas validas.");
}

const inserirSemana = db.prepare(`
  INSERT OR IGNORE INTO semanas (numero)
  VALUES (?)
`);

const buscarSemana = db.prepare(`
  SELECT id, numero
  FROM semanas
  WHERE numero = ?
`);

const inserirCliente = db.prepare(`
  INSERT OR IGNORE INTO clientes (
    id,
    nome,
    canal,
    data_pedido,
    servicos,
    pendencias,
    cancelamentos,
    valor_pago,
    status,
    semana_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const migrarDados = db.transaction(() => {
  for (const semana of dados.semanas) {
    inserirSemana.run(semana.numero);

    const semanaBanco = buscarSemana.get(semana.numero);

    if (!semanaBanco) {
      throw new Error(`Nao foi possivel localizar a Semana ${semana.numero}.`);
    }

    for (const cliente of semana.clientes) {
      inserirCliente.run(
        cliente.id,
        cliente.nome,
        cliente.canal,
        cliente.dataPedido,
        cliente.servicos,
        cliente.pendencias,
        cliente.cancelamentos,
        cliente.valorPago,
        cliente.status,
        semanaBanco.id,
      );
    }
  }
});

migrarDados();

const resumo = db
  .prepare(`
    SELECT
      semanas.numero AS semana,
      COUNT(clientes.id) AS clientes,
      SUM(clientes.valor_pago) AS faturamento
    FROM semanas
    LEFT JOIN clientes
      ON clientes.semana_id = semanas.id
    GROUP BY semanas.id
    ORDER BY semanas.numero
  `)
  .all();

console.table(resumo);
console.log("");
console.log("Migracao concluida com sucesso!");
