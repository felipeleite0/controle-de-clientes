import express from "express";
import cors from "cors";
import db from "./database.js";

const app = express();
const argumentoPorta = process.argv.find((arg) => arg.startsWith("--port="));
const PORT = Number(process.env.PORT ?? argumentoPorta?.split("=")[1] ?? 3001);

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    sistema: "Controle de Clientes",
    banco: "SQLite",
  });
});

app.get("/api/dados", (req, res) => {
  try {
    const semanasBanco = db
      .prepare(`
        SELECT id, numero
        FROM semanas
        ORDER BY numero
      `)
      .all();

    const buscarClientes = db.prepare(`
      SELECT
        id,
        nome,
        canal,
        data_pedido AS dataPedido,
        servicos,
        pendencias,
        cancelamentos,
        valor_pago AS valorPago,
        status
      FROM clientes
      WHERE semana_id = ?
      ORDER BY data_pedido, id
    `);

    const semanas = semanasBanco.map((semana) => ({
      numero: semana.numero,
      clientes: buscarClientes.all(semana.id),
    }));

    res.json({ semanas });
  } catch (erro) {
    console.error("Erro ao buscar dados:", erro);
    res.status(500).json({
      erro: "Nao foi possivel buscar os dados.",
    });
  }
});

app.get("/api/semanas", (req, res) => {
  try {
    const semanas = db
      .prepare(`
        SELECT id, numero
        FROM semanas
        ORDER BY numero
      `)
      .all();

    res.json(semanas);
  } catch (erro) {
    console.error("Erro ao buscar semanas:", erro);
    res.status(500).json({
      erro: "Nao foi possivel buscar as semanas.",
    });
  }
});

app.get("/api/semanas/:numero/clientes", (req, res) => {
  try {
    const numero = Number(req.params.numero);

    const clientes = db
      .prepare(`
        SELECT
          clientes.id,
          clientes.nome,
          clientes.canal,
          clientes.data_pedido AS dataPedido,
          clientes.servicos,
          clientes.pendencias,
          clientes.cancelamentos,
          clientes.valor_pago AS valorPago,
          clientes.status
        FROM clientes

        INNER JOIN semanas
          ON semanas.id = clientes.semana_id

        WHERE semanas.numero = ?

        ORDER BY clientes.data_pedido, clientes.id
      `)
      .all(numero);

    res.json(clientes);
  } catch (erro) {
    console.error("Erro ao buscar clientes:", erro);
    res.status(500).json({
      erro: "Nao foi possivel buscar os clientes.",
    });
  }
});

app.post("/api/semanas", (req, res) => {
  try {
    const { numero } = req.body;

    if (!Number.isInteger(numero) || numero <= 0) {
      return res.status(400).json({
        erro: "Numero da semana invalido.",
      });
    }

    const resultado = db
      .prepare(`
        INSERT INTO semanas (numero)
        VALUES (?)
      `)
      .run(numero);

    res.status(201).json({
      id: Number(resultado.lastInsertRowid),
      numero,
      clientes: [],
    });
  } catch (erro) {
    console.error("Erro ao criar semana:", erro);
    res.status(500).json({
      erro: "Nao foi possivel criar a semana.",
    });
  }
});

app.post("/api/clientes", (req, res) => {
  try {
    const {
      id,
      nome,
      canal,
      dataPedido,
      servicos,
      pendencias,
      cancelamentos,
      valorPago,
      status,
      semana,
    } = req.body;

    if (!id || !nome || !canal || !dataPedido || !semana) {
      return res.status(400).json({
        erro: "Dados obrigatorios nao informados.",
      });
    }

    const semanaBanco = db
      .prepare(`
        SELECT id
        FROM semanas
        WHERE numero = ?
      `)
      .get(semana);

    if (!semanaBanco) {
      return res.status(404).json({
        erro: "Semana nao encontrada.",
      });
    }

    db.prepare(`
      INSERT INTO clientes (
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
    `).run(
      id,
      nome.trim(),
      canal,
      dataPedido,
      servicos ?? 0,
      pendencias ?? 0,
      cancelamentos ?? 0,
      valorPago ?? 0,
      status ?? "Finalizado",
      semanaBanco.id,
    );

    res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso.",
    });
  } catch (erro) {
    console.error("Erro ao cadastrar cliente:", erro);
    res.status(500).json({
      erro: "Nao foi possivel cadastrar o cliente.",
    });
  }
});

app.put("/api/clientes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      nome,
      canal,
      dataPedido,
      servicos,
      pendencias,
      cancelamentos,
      valorPago,
      status,
    } = req.body;

    const resultado = db
      .prepare(`
        UPDATE clientes

        SET
          nome = ?,
          canal = ?,
          data_pedido = ?,
          servicos = ?,
          pendencias = ?,
          cancelamentos = ?,
          valor_pago = ?,
          status = ?

        WHERE id = ?
      `)
      .run(
        nome.trim(),
        canal,
        dataPedido,
        servicos ?? 0,
        pendencias ?? 0,
        cancelamentos ?? 0,
        valorPago ?? 0,
        status ?? "Finalizado",
        id,
      );

    if (resultado.changes === 0) {
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    res.json({
      mensagem: "Cliente atualizado com sucesso.",
    });
  } catch (erro) {
    console.error("Erro ao atualizar cliente:", erro);
    res.status(500).json({
      erro: "Nao foi possivel atualizar o cliente.",
    });
  }
});

app.delete("/api/clientes/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const resultado = db
      .prepare(`
        DELETE FROM clientes
        WHERE id = ?
      `)
      .run(id);

    if (resultado.changes === 0) {
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    res.json({
      mensagem: "Cliente excluido com sucesso.",
    });
  } catch (erro) {
    console.error("Erro ao excluir cliente:", erro);
    res.status(500).json({
      erro: "Nao foi possivel excluir o cliente.",
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log(" Controle de Clientes");
  console.log("======================================");
  console.log("");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log("Banco: SQLite");
  console.log("");
});
