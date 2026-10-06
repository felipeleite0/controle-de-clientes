import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type StatusCliente = "Finalizado" | "Em andamento";
type Cliente = {
  id: number; nome: string; canal: string; dataPedido: string;
  servicos: number; pendencias: number; cancelamentos: number;
  valorPago: number; status: StatusCliente;
};
type Semana = { numero: number; clientes: Cliente[] };
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function verificarResposta(resposta: Response) {
  if (resposta.ok) return;
  const dados = await resposta.json().catch(() => null);
  throw new Error(dados?.erro ?? "Nao foi possivel concluir a operacao.");
}
function mensagemErro(erro: unknown) {
  return erro instanceof Error ? erro.message : "Nao foi possivel concluir a operacao.";
}

function App() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [semanaAtual, setSemanaAtual] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const operacaoEmAndamento = useRef(false);
  const sequenciaLeitura = useRef(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [canal, setCanal] = useState("Site");
  const [dataPedido, setDataPedido] = useState("");
  const [servicos, setServicos] = useState(0);
  const [pendencias, setPendencias] = useState(0);
  const [cancelamentos, setCancelamentos] = useState(0);
  const [valorPago, setValorPago] = useState(0);
  const [status, setStatus] = useState<StatusCliente>("Finalizado");

  const semanaSelecionada = semanas.find((semana) => semana.numero === semanaAtual) ?? semanas[0];
  const numeroSemana = semanaSelecionada?.numero;
  const clientes = semanaSelecionada?.clientes ?? [];
  const bloqueado = ocupado || erroServidor !== null;

  const carregarDados = useCallback(async (
    mensagemFalha = "Nao foi possivel atualizar os dados. Tente novamente.",
    signal?: AbortSignal,
  ) => {
    const leitura = ++sequenciaLeitura.current;
    try {
      const resposta = await fetch(`${API_URL}/api/dados`, { signal });
      await verificarResposta(resposta);
      const dados = await resposta.json();
      if (!Array.isArray(dados.semanas)) throw new Error("Resposta invalida do servidor.");
      if (signal?.aborted || leitura !== sequenciaLeitura.current) return false;
      setSemanas(dados.semanas);
      setSemanaAtual((atual) => dados.semanas.some((s: Semana) => s.numero === atual)
        ? atual : dados.semanas[0]?.numero ?? null);
      setErroServidor(null);
      return true;
    } catch {
      if (!signal?.aborted && leitura === sequenciaLeitura.current) setErroServidor(mensagemFalha);
      return false;
    } finally {
      if (!signal?.aborted && leitura === sequenciaLeitura.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Os estados so mudam depois da resposta assincrona da API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarDados("Nao foi possivel conectar a API. Verifique o servidor e tente novamente.", controller.signal);
    return () => controller.abort();
  }, [carregarDados]);

  // O ref bloqueia eventos repetidos antes de o React atualizar os botoes.
  function iniciarOperacao() {
    if (operacaoEmAndamento.current) return false;
    operacaoEmAndamento.current = true;
    setOcupado(true);
    setErroOperacao(null);
    return true;
  }
  function concluirOperacao() {
    operacaoEmAndamento.current = false;
    setOcupado(false);
  }
  async function tentarNovamente() {
    if (!iniciarOperacao()) return;
    try { await carregarDados(); } finally { concluirOperacao(); }
  }
  function limparFormulario() {
    setNome(""); setCanal("Site"); setDataPedido("");
    setServicos(0); setPendencias(0); setCancelamentos(0);
    setValorPago(0); setStatus("Finalizado");
    setClienteEditando(null); setErroFormulario(null);
  }
  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }
  async function salvarCliente() {
    if (erroServidor || numeroSemana === undefined || !iniciarOperacao()) return;
    setErroFormulario(null);
    try {
      if (!nome.trim() || !dataPedido) throw new Error("Preencha o nome e a data do pedido.");
      const editando = clienteEditando !== null;
      const resposta = await fetch(`${API_URL}/api/clientes${editando ? `/${clienteEditando}` : ""}`, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, canal, dataPedido, servicos, pendencias, cancelamentos, valorPago, status,
          ...(!editando ? { semana: numeroSemana } : {}),
        }),
      });
      await verificarResposta(resposta);
      fecharFormulario();
      await carregarDados("Cliente salvo, mas a lista nao foi atualizada. Nao repita o cadastro; tente atualizar novamente.");
    } catch (erro) { setErroFormulario(mensagemErro(erro)); }
    finally { concluirOperacao(); }
  }
  function editarCliente(cliente: Cliente) {
    setNome(cliente.nome); setCanal(cliente.canal); setDataPedido(cliente.dataPedido);
    setServicos(cliente.servicos); setPendencias(cliente.pendencias);
    setCancelamentos(cliente.cancelamentos); setValorPago(cliente.valorPago);
    setStatus(cliente.status); setClienteEditando(cliente.id); setErroFormulario(null);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function excluirCliente(id: number) {
    if (erroServidor || operacaoEmAndamento.current || !window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    if (!iniciarOperacao()) return;
    try {
      const resposta = await fetch(`${API_URL}/api/clientes/${id}`, { method: "DELETE" });
      await verificarResposta(resposta);
      if (clienteEditando === id) fecharFormulario();
      await carregarDados("Cliente excluido, mas a lista nao foi atualizada. Tente atualizar novamente.");
    } catch (erro) { setErroOperacao(mensagemErro(erro)); }
    finally { concluirOperacao(); }
  }
  async function criarNovaSemana() {
    if (erroServidor || !iniciarOperacao()) return;
    try {
      const proximaSemana = (semanas.length ? Math.max(...semanas.map((s) => s.numero)) : 0) + 1;
      const resposta = await fetch(`${API_URL}/api/semanas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: proximaSemana }),
      });
      await verificarResposta(resposta);
      fecharFormulario();
      if (await carregarDados("Semana criada, mas a lista nao foi atualizada. Nao repita a criacao; tente atualizar novamente.")) {
        setSemanaAtual(proximaSemana);
      }
    } catch (erro) { setErroOperacao(mensagemErro(erro)); }
    finally { concluirOperacao(); }
  }
  function trocarSemana(numero: number) {
    if (operacaoEmAndamento.current) return;
    setSemanaAtual(numero);
    fecharFormulario();
  }
  if (carregando) {
    return <main className="container"><h1>Controle de Clientes</h1><p>Carregando dados demonstrativos do SQLite...</p></main>;
  }

  const totalServicos = clientes.reduce(
    (total, cliente) => total + cliente.servicos,
    0,
  );

  const totalPendencias = clientes.reduce(
    (total, cliente) => total + cliente.pendencias,
    0,
  );

  const totalCancelamentos = clientes.reduce(
    (total, cliente) => total + cliente.cancelamentos,
    0,
  );

  const totalAtendimentos = totalServicos + totalPendencias + totalCancelamentos;

  const faturamento = clientes.reduce(
    (total, cliente) => total + cliente.valorPago,
    0,
  );

  const todosClientes = semanas.flatMap((semana) => semana.clientes);

  const totalGeralClientes = todosClientes.length;

  const totalGeralServicos = todosClientes.reduce(
    (total, cliente) => total + cliente.servicos,
    0,
  );

  const totalGeralPendencias = todosClientes.reduce(
    (total, cliente) => total + cliente.pendencias,
    0,
  );

  const totalGeralCancelamentos = todosClientes.reduce(
    (total, cliente) => total + cliente.cancelamentos,
    0,
  );

  const totalGeralAtendimentos =
    totalGeralServicos + totalGeralPendencias + totalGeralCancelamentos;

  const faturamentoGeral = todosClientes.reduce(
    (total, cliente) => total + cliente.valorPago,
    0,
  );

  return (
    <main className="container">
      <header className="cabecalho">
        <div>
          <h1>Controle de Clientes</h1>
          <p>Gerenciamento semanal de clientes, servicos e pagamentos</p>
        </div>

        <div className="acoes-cabecalho">
          <button
            className="botao-cliente"
            disabled={bloqueado || numeroSemana === undefined}
            onClick={() => {
              limparFormulario();
              setMostrarFormulario(true);
            }}
          >
            + Adicionar cliente
          </button>
        </div>
      </header>

      {erroServidor && (
        <section className="aviso" role="alert">
          <p>{erroServidor}</p>
          <button disabled={ocupado} onClick={tentarNovamente}>Tentar novamente</button>
        </section>
      )}
      {erroOperacao && <p className="aviso" role="alert">{erroOperacao}</p>}

      {mostrarFormulario && (
        <form className="formulario" onSubmit={(event) => {
          event.preventDefault();
          void salvarCliente();
        }}>
          <h2>
            {clienteEditando !== null
              ? "Editar cliente"
              : `Adicionar cliente - Semana ${numeroSemana}`}
          </h2>

          {erroFormulario && <p role="alert">{erroFormulario}</p>}
          <fieldset disabled={bloqueado} className="campos">
            <div>
              <label htmlFor="nome">Nome do cliente</label>
              <input
                id="nome"
                required
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label htmlFor="canal">Canal</label>
              <select id="canal" value={canal} onChange={(e) => setCanal(e.target.value)}>
                <option>Site</option>
                <option>Instagram</option>
                <option>WhatsApp</option>
                <option>Indicacao</option>
              </select>
            </div>

            <div>
              <label htmlFor="dataPedido">Data do pedido</label>
              <input
                id="dataPedido"
                required
                type="date"
                value={dataPedido}
                onChange={(e) => setDataPedido(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="servicos">Servicos</label>
              <input
                id="servicos"
                type="number"
                min="0"
                value={servicos}
                onChange={(e) => setServicos(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="pendencias">Pendencias</label>
              <input
                id="pendencias"
                type="number"
                min="0"
                value={pendencias}
                onChange={(e) => setPendencias(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="cancelamentos">Cancelamentos</label>
              <input
                id="cancelamentos"
                type="number"
                min="0"
                value={cancelamentos}
                onChange={(e) => setCancelamentos(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="valorPago">Valor pago</label>
              <input
                id="valorPago"
                type="number"
                min="0"
                step="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCliente)}
              >
                <option value="Finalizado">Finalizado</option>
                <option value="Em andamento">Em andamento</option>
              </select>
            </div>
          </fieldset>

          <div className="acoes-formulario">
            <button type="button" className="botao-cancelar" disabled={ocupado} onClick={fecharFormulario}>
              Cancelar
            </button>

            <button type="submit" className="botao-salvar" disabled={bloqueado}>
              {ocupado ? "Salvando..." : clienteEditando !== null ? "Salvar alteracoes" : "Salvar cliente"}
            </button>
          </div>
        </form>
      )}

      <section className="semana">
        <div>
          <h2>{numeroSemana === undefined ? "Nenhuma semana cadastrada" : `Semana ${numeroSemana}`}</h2>

          <div className="lista-semanas">
            {semanas.map((semana) => (
              <button
                key={semana.numero}
                className={semana.numero === numeroSemana ? "semana-ativa" : ""}
                aria-pressed={semana.numero === numeroSemana}
                disabled={ocupado}
                onClick={() => trocarSemana(semana.numero)}
              >
                Semana {semana.numero}
              </button>
            ))}
          </div>
        </div>

        <button disabled={bloqueado} onClick={criarNovaSemana}>+ Nova semana</button>
      </section>

      <section className="resumo resumo-clientes">
        <div className="card">
          <span>Clientes atendidos</span>
          <strong>{clientes.length}</strong>
        </div>

        <div className="card">
          <span>Servicos</span>
          <strong>{totalServicos}</strong>
        </div>

        <div className="card">
          <span>Pendencias</span>
          <strong>{totalPendencias}</strong>
        </div>

        <div className="card">
          <span>Cancelamentos</span>
          <strong>{totalCancelamentos}</strong>
        </div>

        <div className="card">
          <span>Atendimentos</span>
          <strong>{totalAtendimentos}</strong>
        </div>

        <div className="card">
          <span>Faturamento</span>
          <strong>
            {faturamento.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </strong>
        </div>
      </section>

      <section className="clientes">
        <h2>Detalhes dos clientes</h2>

        <div className="tabela tabela-clientes">
          <div className="linha linha-clientes cabecalho-tabela">
            <span>Cliente</span>
            <span>Canal</span>
            <span>Data</span>
            <span>Serv.</span>
            <span>Pend.</span>
            <span>Canc.</span>
            <span>Total</span>
            <span>Valor</span>
            <span>Status</span>
            <span>Acoes</span>
          </div>

          {clientes.length === 0 ? (
            <div className="sem-clientes">
              {numeroSemana === undefined ? "Crie uma semana para cadastrar clientes." : `Nenhum cliente cadastrado na Semana ${numeroSemana}.`}
            </div>
          ) : (
            clientes.map((cliente) => {
              const totalCliente =
                cliente.servicos + cliente.pendencias + cliente.cancelamentos;

              return (
                <div className="linha linha-clientes" key={cliente.id}>
                  <span>{cliente.nome}</span>
                  <span>{cliente.canal}</span>
                  <span>{cliente.dataPedido.split("-").reverse().join("/")}</span>
                  <span>{cliente.servicos}</span>
                  <span>{cliente.pendencias}</span>
                  <span>{cliente.cancelamentos}</span>
                  <span>{totalCliente}</span>
                  <span>
                    {cliente.valorPago.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <span
                    className={
                      cliente.status === "Finalizado"
                        ? "status finalizado"
                        : "status pendente"
                    }
                  >
                    {cliente.status}
                  </span>

                  <div className="acoes-cliente">
                    <button
                      className="botao-editar"
                      aria-label={`Editar ${cliente.nome}`}
                      disabled={bloqueado}
                      onClick={() => editarCliente(cliente)}
                    >
                      Editar
                    </button>

                    <button
                      className="botao-excluir"
                      aria-label={`Excluir ${cliente.nome}`}
                      disabled={bloqueado}
                      onClick={() => excluirCliente(cliente.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="resumo-geral">
        <h2>Resumo Geral</h2>
        <p className="descricao-resumo-geral">Dados acumulados de todas as semanas</p>

        <div className="resumo resumo-clientes">
          <div className="card">
            <span>Total de clientes</span>
            <strong>{totalGeralClientes}</strong>
          </div>

          <div className="card">
            <span>Servicos</span>
            <strong>{totalGeralServicos}</strong>
          </div>

          <div className="card">
            <span>Pendencias</span>
            <strong>{totalGeralPendencias}</strong>
          </div>

          <div className="card">
            <span>Cancelamentos</span>
            <strong>{totalGeralCancelamentos}</strong>
          </div>

          <div className="card">
            <span>Total de atendimentos</span>
            <strong>{totalGeralAtendimentos}</strong>
          </div>

          <div className="card">
            <span>Faturamento total</span>
            <strong>
              {faturamentoGeral.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
