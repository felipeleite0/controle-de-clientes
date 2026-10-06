import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./database.js";
import { ErroHttp, validarCliente, validarInteiroPositivo, validarObjeto } from "./validacao.js";

const pasta = path.dirname(fileURLToPath(import.meta.url));
const caminhoJson = process.argv[2] ?? path.join(pasta, "..", "dados", "clientes-demo.json");

try {
  const dados = JSON.parse(fs.readFileSync(caminhoJson, "utf8"));
  validarObjeto(dados);
  if (!Array.isArray(dados.semanas)) throw new ErroHttp(400, "O JSON deve conter um array semanas.");
  const numeros = new Set();
  const ids = new Set();
  const semanas = dados.semanas.map((semana) => {
    validarObjeto(semana);
    const numero = validarInteiroPositivo(semana.numero, "Numero da semana");
    if (numeros.has(numero)) throw new ErroHttp(400, `Semana ${numero} repetida no JSON.`);
    numeros.add(numero);
    if (!Array.isArray(semana.clientes)) throw new ErroHttp(400, `Clientes da semana ${numero} invalidos.`);
    const clientes = semana.clientes.map((entrada) => {
      const cliente = validarCliente(entrada, { exigirId: true });
      if (ids.has(cliente.id)) throw new ErroHttp(400, `ID ${cliente.id} repetido no JSON.`);
      ids.add(cliente.id);
      return cliente;
    });
    return { numero, clientes };
  });

  const inserirSemana = db.prepare("INSERT INTO semanas (numero) VALUES (?) ON CONFLICT(numero) DO NOTHING");
  const buscarSemana = db.prepare("SELECT id FROM semanas WHERE numero = ?");
  const buscarCliente = db.prepare(`SELECT id, nome, canal, data_pedido AS dataPedido,
    servicos, pendencias, cancelamentos, valor_pago AS valorPago, status, semana_id FROM clientes WHERE id = ?`);
  const inserirCliente = db.prepare(`INSERT INTO clientes
    (id, nome, canal, data_pedido, servicos, pendencias, cancelamentos, valor_pago, status, semana_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const resultado = db.transaction(() => {
    const contagem = { semanasCriadas: 0, inseridos: 0, jaExistentes: 0 };
    for (const semana of semanas) {
      contagem.semanasCriadas += inserirSemana.run(semana.numero).changes;
      const semanaBanco = buscarSemana.get(semana.numero);
      for (const cliente of semana.clientes) {
        const existente = buscarCliente.get(cliente.id);
        if (existente) {
          const identico = existente.semana_id === semanaBanco.id &&
            Object.entries(cliente).every(([campo, valor]) => existente[campo] === valor);
          if (!identico) throw new ErroHttp(409, `ID ${cliente.id} possui dados diferentes no banco. Nenhum registro foi importado.`);
          contagem.jaExistentes++;
          continue;
        }
        inserirCliente.run(cliente.id, cliente.nome, cliente.canal, cliente.dataPedido,
          cliente.servicos, cliente.pendencias, cliente.cancelamentos,
          cliente.valorPago, cliente.status, semanaBanco.id);
        contagem.inseridos++;
      }
    }
    return contagem;
  })();
  console.log("Migracao concluida com sucesso.");
  console.table(resultado);
} catch (erro) {
  console.error(`Migracao cancelada: ${erro.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
