import { useEffect, useState } from "react";
import "./App.css";

type StatusCliente = "Finalizado" | "Em andamento";

type Cliente = {
  id: number;
  nome: string;
  canal: string;
  dataPedido: string;
  servicos: number;
  pendencias: number;
  cancelamentos: number;
  valorPago: number;
  status: StatusCliente;
};

type Semana = {
  numero: number;
  clientes: Cliente[];
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function App() {
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [semanaAtual, setSemanaAtual] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erroServidor, setErroServidor] = useState(false);
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

  async function carregarDados() {
    try {
      const resposta = await fetch(`${API_URL}/api/dados`);

      if (!resposta.ok) {
        throw new Error("Nao foi possivel carregar os dados.");
      }

      const dados = await resposta.json();

      if (!Array.isArray(dados.semanas)) {
        throw new Error("Resposta invalida do servidor.");
      }

      setSemanas(dados.semanas);
      setErroServidor(false);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      setErroServidor(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // Carga inicial dos dados da API ao abrir a aplicação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDados();
  }, []);

  function limparFormulario() {
    setNome("");
    setCanal("Site");
    setDataPedido("");
    setServicos(0);
    setPendencias(0);
    setCancelamentos(0);
    setValorPago(0);
    setStatus("Finalizado");
    setClienteEditando(null);
  }

  function fecharFormulario() {
    limparFormulario();
    setMostrarFormulario(false);
  }

  async function salvarCliente() {
    if (nome.trim() === "" || dataPedido === "") {
      alert("Preencha o nome do cliente e a data do pedido.");
      return;
    }

    try {
      if (clienteEditando !== null) {
        const resposta = await fetch(`${API_URL}/api/clientes/${clienteEditando}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome,
            canal,
            dataPedido,
            servicos,
            pendencias,
            cancelamentos,
            valorPago,
            status,
          }),
        });

        if (!resposta.ok) {
          throw new Error("Erro ao atualizar cliente.");
        }
      } else {
        const novoCliente: Cliente = {
          id: Date.now(),
          nome,
          canal,
          dataPedido,
          servicos,
          pendencias,
          cancelamentos,
          valorPago,
          status,
        };

        const resposta = await fetch(`${API_URL}/api/clientes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...novoCliente,
            semana: semanaAtual,
          }),
        });

        if (!resposta.ok) {
          throw new Error("Erro ao cadastrar cliente.");
        }
      }

      fecharFormulario();
      await carregarDados();
    } catch (erro) {
      console.error(erro);
      alert("Nao foi possivel salvar o cliente no banco de dados.");
    }
  }

  function editarCliente(cliente: Cliente) {
    setNome(cliente.nome);
    setCanal(cliente.canal);
    setDataPedido(cliente.dataPedido);
    setServicos(cliente.servicos);
    setPendencias(cliente.pendencias);
    setCancelamentos(cliente.cancelamentos);
    setValorPago(cliente.valorPago);
    setStatus(cliente.status);
    setClienteEditando(cliente.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirCliente(id: number) {
    const confirmar = window.confirm("Tem certeza que deseja excluir este cliente?");

    if (!confirmar) {
      return;
    }

    try {
      const resposta = await fetch(`${API_URL}/api/clientes/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        throw new Error("Erro ao excluir cliente.");
      }

      await carregarDados();
    } catch (erro) {
      console.error(erro);
      alert("Nao foi possivel excluir o cliente do banco.");
    }
  }

  async function criarNovaSemana() {
    try {
      const maiorNumero =
        semanas.length > 0 ? Math.max(...semanas.map((semana) => semana.numero)) : 0;
      const proximaSemana = maiorNumero + 1;

      const resposta = await fetch(`${API_URL}/api/semanas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numero: proximaSemana,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Erro ao criar semana.");
      }

      await carregarDados();
      setSemanaAtual(proximaSemana);
      fecharFormulario();
    } catch (erro) {
      console.error(erro);
      alert("Nao foi possivel criar a nova semana.");
    }
  }

  function trocarSemana(numero: number) {
    setSemanaAtual(numero);
    fecharFormulario();
  }

  if (carregando) {
    return (
      <main className="container">
        <h1>Controle de Clientes</h1>
        <p>Carregando dados demonstrativos do SQLite...</p>
      </main>
    );
  }

  if (erroServidor && semanas.length === 0) {
    return (
      <main className="container">
        <h1>Controle de Clientes</h1>
        <p>Nao foi possivel conectar ao banco de dados.</p>
        <p>Verifique se a API esta rodando no endereco configurado.</p>
        <button
          onClick={() => {
            setCarregando(true);
            carregarDados();
          }}
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  const semanaSelecionada =
    semanas.find((semana) => semana.numero === semanaAtual) ?? semanas[0];

  const clientes = semanaSelecionada?.clientes ?? [];

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
            onClick={() => {
              limparFormulario();
              setMostrarFormulario(true);
            }}
          >
            + Adicionar cliente
          </button>
        </div>
      </header>

      {mostrarFormulario && (
        <form className="formulario" onSubmit={(event) => {
          event.preventDefault();
          void salvarCliente();
        }}>
          <h2>
            {clienteEditando !== null
              ? "Editar cliente"
              : `Adicionar cliente - Semana ${semanaAtual}`}
          </h2>

          <div className="campos">
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
          </div>

          <div className="acoes-formulario">
            <button type="button" className="botao-cancelar" onClick={fecharFormulario}>
              Cancelar
            </button>

            <button type="submit" className="botao-salvar">
              {clienteEditando !== null ? "Salvar alteracoes" : "Salvar cliente"}
            </button>
          </div>
        </form>
      )}

      <section className="semana">
        <div>
          <h2>Semana {semanaAtual}</h2>

          <div className="lista-semanas">
            {semanas.map((semana) => (
              <button
                key={semana.numero}
                className={semana.numero === semanaAtual ? "semana-ativa" : ""}
                onClick={() => trocarSemana(semana.numero)}
              >
                Semana {semana.numero}
              </button>
            ))}
          </div>
        </div>

        <button onClick={criarNovaSemana}>+ Nova semana</button>
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
              Nenhum cliente cadastrado na Semana {semanaAtual}.
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
                      onClick={() => editarCliente(cliente)}
                    >
                      Editar
                    </button>

                    <button
                      className="botao-excluir"
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
