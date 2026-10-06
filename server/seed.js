import db from "./database.js";

const semanasDemo = [
  {
    numero: 1,
    clientes: [
      {
        id: 101001,
        nome: "Ana Souza",
        canal: "Site",
        dataPedido: "2026-01-05",
        servicos: 3,
        pendencias: 1,
        cancelamentos: 0,
        valorPago: 420,
        status: "Finalizado",
      },
      {
        id: 101002,
        nome: "Bruno Lima",
        canal: "WhatsApp",
        dataPedido: "2026-01-07",
        servicos: 2,
        pendencias: 0,
        cancelamentos: 0,
        valorPago: 280,
        status: "Finalizado",
      },
      {
        id: 101003,
        nome: "Loja Prisma",
        canal: "Indicacao",
        dataPedido: "2026-01-09",
        servicos: 5,
        pendencias: 2,
        cancelamentos: 1,
        valorPago: 760,
        status: "Em andamento",
      },
    ],
  },
  {
    numero: 2,
    clientes: [
      {
        id: 102001,
        nome: "Carla Mendes",
        canal: "Instagram",
        dataPedido: "2026-01-12",
        servicos: 4,
        pendencias: 0,
        cancelamentos: 0,
        valorPago: 540,
        status: "Finalizado",
      },
      {
        id: 102002,
        nome: "Empresa Aurora",
        canal: "Site",
        dataPedido: "2026-01-14",
        servicos: 6,
        pendencias: 1,
        cancelamentos: 0,
        valorPago: 980,
        status: "Em andamento",
      },
      {
        id: 102003,
        nome: "Diego Rocha",
        canal: "WhatsApp",
        dataPedido: "2026-01-16",
        servicos: 1,
        pendencias: 0,
        cancelamentos: 1,
        valorPago: 150,
        status: "Finalizado",
      },
    ],
  },
  {
    numero: 3,
    clientes: [
      {
        id: 103001,
        nome: "Marina Costa",
        canal: "Instagram",
        dataPedido: "2026-01-20",
        servicos: 2,
        pendencias: 1,
        cancelamentos: 0,
        valorPago: 310,
        status: "Em andamento",
      },
      {
        id: 103002,
        nome: "Norte Digital",
        canal: "Indicacao",
        dataPedido: "2026-01-22",
        servicos: 7,
        pendencias: 0,
        cancelamentos: 0,
        valorPago: 1200,
        status: "Finalizado",
      },
    ],
  },
];

const limparBanco = db.transaction(() => {
  db.prepare("DELETE FROM clientes").run();
  db.prepare("DELETE FROM semanas").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('semanas')").run();
});

const inserirSemana = db.prepare(`
  INSERT INTO semanas (numero)
  VALUES (?)
`);

const buscarSemana = db.prepare(`
  SELECT id
  FROM semanas
  WHERE numero = ?
`);

const inserirCliente = db.prepare(`
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
`);

const popularBanco = db.transaction(() => {
  limparBanco();

  for (const semana of semanasDemo) {
    inserirSemana.run(semana.numero);
    const semanaBanco = buscarSemana.get(semana.numero);

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

popularBanco();

const conferencia = db
  .prepare(`
    SELECT
      semanas.numero AS semana,
      clientes.nome,
      clientes.canal,
      clientes.valor_pago AS valor
    FROM clientes
    INNER JOIN semanas
      ON semanas.id = clientes.semana_id
    ORDER BY semanas.numero, clientes.nome
  `)
  .all();

console.log("");
console.log("Dados ficticios carregados com sucesso.");
console.table(conferencia);
