import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { ambienteTemporario, iniciarApi, clienteFicticio } from "./helpers.js";

const ambiente = ambienteTemporario();
let api;
let banco;
let id;
async function requisitar(rota, method = "GET", body) {
  const resposta = await fetch(api.url + rota, {
    method, headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: resposta.status, dados: await resposta.json() };
}
before(async () => {
  api = await iniciarApi(ambiente);
  banco = new Database(ambiente.banco);
});
after(async () => {
  banco?.close();
  await api?.fechar();
  ambiente.limpar();
});

test("status, semana e cadastro gerado pelo SQLite", async () => {
  assert.equal((await requisitar("/api/status")).dados.online, true);
  assert.equal((await requisitar("/api/semanas", "POST", { numero: 7 })).status, 201);
  const resposta = await requisitar("/api/clientes", "POST", { ...clienteFicticio, nome: "  Pessoa Demonstrativa  ", semana: 7 });
  assert.equal(resposta.status, 201);
  id = resposta.dados.id;
  assert.ok(Number.isSafeInteger(id) && id > 0);
  const clientes = (await requisitar("/api/semanas/7/clientes")).dados;
  assert.equal(clientes[0].nome, "Pessoa Demonstrativa");
  assert.equal(clientes[0].valorPago, 150);
  assert.equal((await requisitar("/api/dados")).dados.semanas[0].numero, 7);
});

test("PUT modifica todos os campos e GET retorna a alteracao", async () => {
  const alterado = { ...clienteFicticio, nome: "Pessoa Editada", canal: "Indicacao", status: "Em andamento", valorPago: 250 };
  assert.equal((await requisitar(`/api/clientes/${id}`, "PUT", alterado)).status, 200);
  const cliente = (await requisitar("/api/semanas/7/clientes")).dados[0];
  assert.equal(cliente.nome, alterado.nome);
  assert.equal(cliente.valorPago, 250);
  assert.equal(cliente.status, "Em andamento");
});

const invalidos = [
  ["nome vazio", { nome: "   " }], ["nome numerico", { nome: 123 }],
  ["nome longo", { nome: "a".repeat(201) }], ["canal desconhecido", { canal: "Outro" }],
  ["data impossivel", { dataPedido: "2026-02-31" }], ["ano nao bissexto", { dataPedido: "2027-02-29" }],
  ["ano zero", { dataPedido: "0000-01-01" }], ["formato de data", { dataPedido: "01/01/2028" }],
  ["servico negativo", { servicos: -1 }], ["servico fracionado", { servicos: 1.5 }],
  ["contador texto", { pendencias: "abc" }], ["contador nulo", { cancelamentos: null }],
  ["contador inseguro", { servicos: Number.MAX_SAFE_INTEGER + 1 }],
  ["valor negativo", { valorPago: -100 }], ["valor texto", { valorPago: "abc" }],
  ["valor nulo", { valorPago: null }], ["status desconhecido", { status: "Cancelado" }],
];
for (const [nome, campos] of invalidos) {
  test(`POST/PUT rejeitam ${nome} sem alterar o banco`, async () => {
    const antes = banco.prepare("SELECT * FROM clientes").all();
    const entrada = { ...clienteFicticio, ...campos, semana: 7 };
    assert.equal((await requisitar("/api/clientes", "POST", entrada)).status, 400);
    assert.equal((await requisitar(`/api/clientes/${id}`, "PUT", entrada)).status, 400);
    assert.deepEqual(banco.prepare("SELECT * FROM clientes").all(), antes);
  });
}

test("conflitos retornam 409 e IDs antigos continuam aceitos", async () => {
  assert.equal((await requisitar("/api/semanas", "POST", { numero: 7 })).status, 409);
  const entrada = { ...clienteFicticio, semana: 7, id: 500 };
  assert.equal((await requisitar("/api/clientes", "POST", entrada)).status, 201);
  assert.equal((await requisitar("/api/clientes", "POST", entrada)).status, 409);
});

test("campos ausentes opcionais recebem valores padrao", async () => {
  const resposta = await requisitar("/api/clientes", "POST", { nome: "Pessoa Padrao", canal: "WhatsApp", dataPedido: "2028-01-01", semana: 7 });
  assert.equal(resposta.status, 201);
  const cliente = (await requisitar("/api/semanas/7/clientes")).dados.find((c) => c.id === resposta.dados.id);
  assert.equal(cliente.servicos, 0);
  assert.equal(cliente.valorPago, 0);
  assert.equal(cliente.status, "Finalizado");
});

test("objetos, IDs e semanas invalidos retornam 400; inexistentes retornam 404", async () => {
  for (const numero of [-1, 0, 1.5, "1", null]) {
    assert.equal((await requisitar("/api/semanas", "POST", { numero })).status, 400);
  }
  for (const body of [{}, [], null]) {
    assert.equal((await requisitar("/api/clientes", "POST", body)).status, 400);
    assert.equal((await requisitar(`/api/clientes/${id}`, "PUT", body)).status, 400);
  }
  for (const parametro of ["abc", "-1", "0", "1.5", "9007199254740992"]) {
    assert.equal((await requisitar(`/api/clientes/${parametro}`, "DELETE")).status, 400);
    assert.equal((await requisitar(`/api/semanas/${parametro}/clientes`)).status, 400);
  }
  assert.equal((await requisitar("/api/clientes", "POST", { ...clienteFicticio, semana: 99 })).status, 404);
  assert.equal((await requisitar("/api/semanas/99/clientes")).status, 404);
  assert.equal((await requisitar("/api/clientes/999", "PUT", clienteFicticio)).status, 404);
  assert.equal((await requisitar("/api/clientes/999", "DELETE")).status, 404);
  const malformado = await fetch(api.url + "/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformado.status, 400);
});

test("SQLite bloqueia gravacoes invalidas fora da API e preserva os registros", () => {
  const antes = banco.prepare("SELECT * FROM clientes WHERE id = ?").get(id);
  for (const sql of [
    "UPDATE clientes SET valor_pago = 'abc' WHERE id = ?",
    "UPDATE clientes SET servicos = -1 WHERE id = ?",
    "UPDATE clientes SET servicos = 1.5 WHERE id = ?",
    "UPDATE clientes SET data_pedido = '2026-02-31' WHERE id = ?",
    "UPDATE clientes SET status = 'Invalido' WHERE id = ?",
    "UPDATE clientes SET nome = ' ' WHERE id = ?",
  ]) assert.throws(() => banco.prepare(sql).run(id), /invalidos/);
  assert.throws(() => banco.prepare("INSERT INTO semanas(numero) VALUES(0)").run(), /invalido/);
  assert.deepEqual(banco.prepare("SELECT * FROM clientes WHERE id = ?").get(id), antes);
  assert.ok(banco.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='clientes_por_semana'").get());
});

test("DELETE remove cliente e confirma ausencia", async () => {
  assert.equal((await requisitar(`/api/clientes/${id}`, "DELETE")).status, 200);
  assert.equal((await requisitar(`/api/clientes/${id}`, "DELETE")).status, 404);
  assert.ok(!(await requisitar("/api/semanas/7/clientes")).dados.some((c) => c.id === id));
});
