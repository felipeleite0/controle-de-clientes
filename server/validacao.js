export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export function validarInteiroPositivo(valor, campo) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new ErroHttp(400, `${campo} deve ser um inteiro positivo valido.`);
  }
  return valor;
}

export function validarParametro(valor, campo) {
  if (!/^\d+$/.test(valor)) throw new ErroHttp(400, `${campo} invalido.`);
  return validarInteiroPositivo(Number(valor), campo);
}

export function validarObjeto(valor) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new ErroHttp(400, "Envie um objeto JSON valido.");
  }
}

export function validarCliente(entrada, { exigirId = false, exigirSemana = false } = {}) {
  validarObjeto(entrada);
  if (typeof entrada.nome !== "string" || !entrada.nome.trim() || entrada.nome.trim().length > 200) {
    throw new ErroHttp(400, "Nome deve ter entre 1 e 200 caracteres.");
  }
  if (!["Site", "Instagram", "WhatsApp", "Indicacao"].includes(entrada.canal)) {
    throw new ErroHttp(400, "Canal invalido.");
  }
  const data = entrada.dataPedido;
  if (typeof data !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new ErroHttp(400, "Data do pedido deve estar no formato AAAA-MM-DD.");
  }
  const instante = new Date(`${data}T00:00:00.000Z`);
  if (!Number.isFinite(instante.getTime()) || instante.toISOString().slice(0, 10) !== data) {
    throw new ErroHttp(400, "Data do pedido inexistente.");
  }
  const cliente = { nome: entrada.nome.trim(), canal: entrada.canal, dataPedido: data };
  for (const campo of ["servicos", "pendencias", "cancelamentos"]) {
    const valor = entrada[campo] === undefined ? 0 : entrada[campo];
    if (!Number.isSafeInteger(valor) || valor < 0) {
      throw new ErroHttp(400, `${campo} deve ser um inteiro nao negativo.`);
    }
    cliente[campo] = valor;
  }
  cliente.valorPago = entrada.valorPago === undefined ? 0 : entrada.valorPago;
  if (typeof cliente.valorPago !== "number" || !Number.isFinite(cliente.valorPago) || cliente.valorPago < 0) {
    throw new ErroHttp(400, "Valor pago deve ser um numero finito nao negativo.");
  }
  cliente.status = entrada.status === undefined ? "Finalizado" : entrada.status;
  if (!["Finalizado", "Em andamento"].includes(cliente.status)) throw new ErroHttp(400, "Status invalido.");
  if (exigirId || entrada.id !== undefined) cliente.id = validarInteiroPositivo(entrada.id, "ID do cliente");
  if (exigirSemana) cliente.semana = validarInteiroPositivo(entrada.semana, "Numero da semana");
  return cliente;
}
