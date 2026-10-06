import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ambienteTemporario, executar, clienteFicticio } from "./helpers.js";

function importar(ambiente, dados) {
  const arquivo = path.join(ambiente.pasta, "entrada-ficticia.json");
  writeFileSync(arquivo, typeof dados === "string" ? dados : JSON.stringify(dados));
  return executar("server/migrar.js", ambiente, [arquivo]);
}
const dadosValidos = { semanas: [{ numero: 7, clientes: [{ ...clienteFicticio, id: 10 }] }] };

test("importacao normaliza, aplica padroes e e idempotente", () => {
  const ambiente = ambienteTemporario();
  try {
    const entrada = { semanas: [{ numero: 7, clientes: [{ id: 10, nome: "  Pessoa Ficticia  ", canal: "Site", dataPedido: "2028-01-01" }] }] };
    assert.equal(importar(ambiente, entrada).status, 0);
    const repeticao = importar(ambiente, entrada);
    assert.equal(repeticao.status, 0);
    assert.match(repeticao.stdout, /jaExistentes/);
    const db = new Database(ambiente.banco);
    try {
      const cliente = db.prepare("SELECT * FROM clientes").get();
      assert.equal(cliente.nome, "Pessoa Ficticia");
      assert.equal(cliente.status, "Finalizado");
      assert.equal(cliente.valor_pago, 0);
      assert.equal(db.prepare("SELECT count(*) AS n FROM clientes").get().n, 1);
    } finally { db.close(); }
  } finally { ambiente.limpar(); }
});

test("conflito de ID desfaz tambem semanas e clientes inseridos antes dele", () => {
  const ambiente = ambienteTemporario();
  try {
    assert.equal(importar(ambiente, dadosValidos).status, 0);
    const entrada = { semanas: [{ numero: 8, clientes: [
      { ...clienteFicticio, id: 11 }, { ...clienteFicticio, id: 10, nome: "Pessoa Diferente" },
    ] }] };
    const resposta = importar(ambiente, entrada);
    assert.equal(resposta.status, 1);
    assert.match(resposta.stderr, /dados diferentes/);
    assert.doesNotMatch(resposta.stdout, /concluida/);
    const db = new Database(ambiente.banco);
    try {
      assert.equal(db.prepare("SELECT count(*) AS n FROM clientes").get().n, 1);
      assert.equal(db.prepare("SELECT count(*) AS n FROM semanas").get().n, 1);
      assert.equal(db.prepare("SELECT nome FROM clientes WHERE id=10").get().nome, clienteFicticio.nome);
    } finally { db.close(); }
  } finally { ambiente.limpar(); }
});

const entradasInvalidas = [
  ["JSON malformado", "{"], ["formato errado", { semanas: {} }],
  ["nome ausente", { semanas: [{ numero: 7, clientes: [{ id: 10, canal: "Site", dataPedido: "2028-01-01" }] }] }],
  ["valor negativo", { semanas: [{ numero: 7, clientes: [{ ...clienteFicticio, id: 10, valorPago: -1 }] }] }],
  ["contador texto", { semanas: [{ numero: 7, clientes: [{ ...clienteFicticio, id: 10, servicos: "abc" }] }] }],
  ["data inexistente", { semanas: [{ numero: 7, clientes: [{ ...clienteFicticio, id: 10, dataPedido: "2026-02-31" }] }] }],
  ["semana repetida", { semanas: [{ numero: 7, clientes: [] }, { numero: 7, clientes: [] }] }],
  ["ID repetido", { semanas: [{ numero: 7, clientes: [{ ...clienteFicticio, id: 10 }] }, { numero: 8, clientes: [{ ...clienteFicticio, id: 10 }] }] }],
];
for (const [nome, entrada] of entradasInvalidas) {
  test(`importacao rejeita ${nome} sem gravar parcialmente`, () => {
    const ambiente = ambienteTemporario();
    try {
      assert.equal(importar(ambiente, dadosValidos).status, 0);
      const resposta = importar(ambiente, entrada);
      assert.equal(resposta.status, 1);
      assert.match(resposta.stderr, /cancelada/);
      const db = new Database(ambiente.banco);
      try {
        assert.equal(db.prepare("SELECT count(*) AS n FROM clientes").get().n, 1);
        assert.equal(db.prepare("SELECT count(*) AS n FROM semanas").get().n, 1);
      } finally { db.close(); }
    } finally { ambiente.limpar(); }
  });
}

test("arquivo inexistente resulta em falha clara", () => {
  const ambiente = ambienteTemporario();
  try {
    const resultado = executar("server/migrar.js", ambiente, [path.join(ambiente.pasta, "inexistente.json")]);
    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /cancelada/);
  } finally { ambiente.limpar(); }
});

test("atualizacao de esquema preserva banco anterior", () => {
  const ambiente = ambienteTemporario();
  let db = new Database(ambiente.banco);
  try {
    db.exec(`CREATE TABLE semanas(id INTEGER PRIMARY KEY AUTOINCREMENT, numero INTEGER NOT NULL UNIQUE);
      CREATE TABLE clientes(id INTEGER PRIMARY KEY, nome TEXT NOT NULL, canal TEXT NOT NULL,
        data_pedido TEXT NOT NULL, servicos INTEGER NOT NULL DEFAULT 0, pendencias INTEGER NOT NULL DEFAULT 0,
        cancelamentos INTEGER NOT NULL DEFAULT 0, valor_pago REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Finalizado', semana_id INTEGER NOT NULL REFERENCES semanas(id) ON DELETE CASCADE);
      INSERT INTO semanas(numero) VALUES(7);
      INSERT INTO clientes(id,nome,canal,data_pedido,semana_id) VALUES(99,'Pessoa Legada Ficticia','Site','2028-01-01',1);`);
    db.close();
    assert.equal(importar(ambiente, dadosValidos).status, 0);
    db = new Database(ambiente.banco);
    assert.equal(db.prepare("SELECT nome FROM clientes WHERE id=99").get().nome, "Pessoa Legada Ficticia");
    assert.throws(() => db.prepare("UPDATE clientes SET servicos=-1 WHERE id=99").run(), /invalidos/);
  } finally { if (db.open) db.close(); ambiente.limpar(); }
});
