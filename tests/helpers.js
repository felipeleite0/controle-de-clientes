import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

export function ambienteTemporario() {
  const pasta = mkdtempSync(path.join(tmpdir(), "controle-clientes-teste-"));
  const banco = path.join(pasta, "teste.db");
  return {
    pasta, banco, env: { ...process.env, DATABASE_PATH: banco },
    limpar() {
      if (path.dirname(pasta) !== path.resolve(tmpdir()) || !path.basename(pasta).startsWith("controle-clientes-teste-")) {
        throw new Error("Diretorio temporario fora do escopo.");
      }
      rmSync(pasta, { recursive: true, force: true });
    },
  };
}

export function executar(script, ambiente, argumentos = []) {
  return spawnSync(process.execPath, [script, ...argumentos], {
    env: ambiente.env, encoding: "utf8", timeout: 15000,
  });
}

export async function iniciarApi(ambiente) {
  const processo = spawn(process.execPath, ["server/server.js"], {
    env: { ...ambiente.env, PORT: "0" }, stdio: ["ignore", "pipe", "pipe"],
  });
  let saida = "";
  const url = await new Promise((resolve, reject) => {
    const tempo = setTimeout(() => { processo.kill(); reject(new Error(saida || "API nao iniciou.")); }, 15000);
    const falhou = (erro) => { clearTimeout(tempo); reject(erro); };
    processo.once("error", falhou);
    processo.once("exit", (codigo) => falhou(new Error(`API encerrou: ${codigo}: ${saida}`)));
    processo.stderr.on("data", (dados) => { saida += dados; });
    processo.stdout.on("data", (dados) => {
      saida += dados;
      const endereco = saida.match(/Servidor: (http:\/\/localhost:\d+)/)?.[1];
      if (endereco) { clearTimeout(tempo); resolve(endereco); }
    });
  });
  return {
    url,
    async fechar() {
      if (processo.exitCode !== null || processo.signalCode !== null) return;
      const encerrado = once(processo, "exit");
      processo.kill();
      await encerrado;
    },
  };
}

export const clienteFicticio = {
  nome: "Pessoa Demonstrativa", canal: "Site", dataPedido: "2028-02-29",
  servicos: 2, pendencias: 1, cancelamentos: 0, valorPago: 150, status: "Finalizado",
};
