import express from "express";
import cors from "cors";
import db from "./database.js";
import { ErroHttp, validarCliente, validarInteiroPositivo, validarObjeto, validarParametro } from "./validacao.js";

const app = express();
const argumentoPorta = process.argv.find((arg) => arg.startsWith("--port="));
const PORT = Number(process.env.PORT ?? argumentoPorta?.split("=")[1] ?? 3001);
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) throw new Error("Porta invalida.");

app.use(cors());
app.use(express.json());

const camposCliente = `id, nome, canal, data_pedido AS dataPedido,
  servicos, pendencias, cancelamentos, valor_pago AS valorPago, status`;

app.get("/api/status", (_req, res) => {
  res.json({ online: true, sistema: "Controle de Clientes", banco: "SQLite" });
});

app.get("/api/dados", (_req, res) => {
  const semanasBanco = db.prepare("SELECT id, numero FROM semanas ORDER BY numero").all();
  const buscarClientes = db.prepare(`SELECT ${camposCliente} FROM clientes
    WHERE semana_id = ? ORDER BY data_pedido, id`);
  res.json({ semanas: semanasBanco.map((semana) => ({
    numero: semana.numero, clientes: buscarClientes.all(semana.id),
  })) });
});

app.get("/api/semanas", (_req, res) => {
  res.json(db.prepare("SELECT id, numero FROM semanas ORDER BY numero").all());
});

app.get("/api/semanas/:numero/clientes", (req, res) => {
  const numero = validarParametro(req.params.numero, "Numero da semana");
  const semana = db.prepare("SELECT id FROM semanas WHERE numero = ?").get(numero);
  if (!semana) throw new ErroHttp(404, "Semana nao encontrada.");
  const clientes = db.prepare(`SELECT
    clientes.id, clientes.nome, clientes.canal, clientes.data_pedido AS dataPedido,
    clientes.servicos, clientes.pendencias, clientes.cancelamentos,
    clientes.valor_pago AS valorPago, clientes.status
    FROM clientes INNER JOIN semanas ON semanas.id = clientes.semana_id
    WHERE semanas.numero = ? ORDER BY clientes.data_pedido, clientes.id`).all(numero);
  res.json(clientes);
});

app.post("/api/semanas", (req, res) => {
  validarObjeto(req.body);
  const numero = validarInteiroPositivo(req.body.numero, "Numero da semana");
  const resultado = db.prepare("INSERT INTO semanas (numero) VALUES (?)").run(numero);
  res.status(201).json({ id: Number(resultado.lastInsertRowid), numero, clientes: [] });
});

app.post("/api/clientes", (req, res) => {
  const cliente = validarCliente(req.body, { exigirSemana: true });
  const semana = db.prepare("SELECT id FROM semanas WHERE numero = ?").get(cliente.semana);
  if (!semana) throw new ErroHttp(404, "Semana nao encontrada.");
  const resultado = db.prepare(`INSERT INTO clientes
    (id, nome, canal, data_pedido, servicos, pendencias, cancelamentos, valor_pago, status, semana_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      cliente.id ?? null, cliente.nome, cliente.canal, cliente.dataPedido,
      cliente.servicos, cliente.pendencias, cliente.cancelamentos,
      cliente.valorPago, cliente.status, semana.id,
    );
  res.status(201).json({ mensagem: "Cliente cadastrado com sucesso.", id: Number(resultado.lastInsertRowid) });
});

app.put("/api/clientes/:id", (req, res) => {
  const id = validarParametro(req.params.id, "ID do cliente");
  const cliente = validarCliente(req.body);
  const resultado = db.prepare(`UPDATE clientes SET nome = ?, canal = ?, data_pedido = ?,
    servicos = ?, pendencias = ?, cancelamentos = ?, valor_pago = ?, status = ? WHERE id = ?`).run(
      cliente.nome, cliente.canal, cliente.dataPedido, cliente.servicos,
      cliente.pendencias, cliente.cancelamentos, cliente.valorPago, cliente.status, id,
    );
  if (!resultado.changes) throw new ErroHttp(404, "Cliente nao encontrado.");
  res.json({ mensagem: "Cliente atualizado com sucesso." });
});

app.delete("/api/clientes/:id", (req, res) => {
  const id = validarParametro(req.params.id, "ID do cliente");
  const resultado = db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
  if (!resultado.changes) throw new ErroHttp(404, "Cliente nao encontrado.");
  res.json({ mensagem: "Cliente excluido com sucesso." });
});

// Express encaminha erros das rotas sincronas e do parser JSON a este middleware.
app.use((erro, _req, res, _next) => {
  if (erro instanceof ErroHttp) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON invalido." });
  if (["SQLITE_CONSTRAINT_UNIQUE", "SQLITE_CONSTRAINT_PRIMARYKEY"].includes(erro.code)) {
    return res.status(409).json({ erro: "Ja existe um registro com esse identificador." });
  }
  if (erro.code?.startsWith("SQLITE_CONSTRAINT")) {
    return res.status(400).json({ erro: "Os dados violam as regras do banco." });
  }
  console.error("Erro na API:", erro);
  res.status(500).json({ erro: "Nao foi possivel concluir a operacao." });
});

const servidor = app.listen(PORT, () => {
  console.log(`Controle de Clientes\nServidor: http://localhost:${servidor.address().port}\nBanco: SQLite`);
});
servidor.on("error", (erro) => {
  console.error(erro.code === "EADDRINUSE" ? "Porta em uso. Escolha outra com --port=NUMERO." : erro.message);
  db.close();
  process.exitCode = 1;
});
