import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import App from "./App";

const cliente = {
  id: 10, nome: "Pessoa Ficticia", canal: "Site", dataPedido: "2028-01-01",
  servicos: 2, pendencias: 0, cancelamentos: 0, valorPago: 100, status: "Finalizado",
};
const semanas = [{ numero: 7, clientes: [cliente] }];
const resposta = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), {
  status, headers: { "Content-Type": "application/json" },
});
const fetchMock = vi.fn<typeof fetch>();
function adiar() {
  let resolver!: (value: Response) => void;
  const promessa = new Promise<Response>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}
async function abrirFormulario() {
  const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole("button", { name: "+ Adicionar cliente" }));
  await usuario.type(screen.getByLabelText("Nome do cliente"), "Nova Pessoa Ficticia");
  fireEvent.change(screen.getByLabelText("Data do pedido"), { target: { value: "2028-01-01" } });
  return usuario;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Controle de Clientes", () => {
  it("seleciona a semana existente e cadastra nela sem gerar ID no navegador", async () => {
    fetchMock.mockResolvedValueOnce(resposta({ semanas }))
      .mockResolvedValueOnce(resposta({ id: 11 }, 201))
      .mockResolvedValueOnce(resposta({ semanas }));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Semana 7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semana 7" })).toHaveAttribute("aria-pressed", "true");
    const usuario = await abrirFormulario();
    expect(screen.getByRole("heading", { name: "Adicionar cliente - Semana 7" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const body = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(body.semana).toBe(7);
    expect(body).not.toHaveProperty("id");
  });

  it("bloqueia envio repetido mesmo antes da resposta", async () => {
    const pendente = adiar();
    fetchMock.mockResolvedValueOnce(resposta({ semanas }))
      .mockReturnValueOnce(pendente.promessa)
      .mockResolvedValueOnce(resposta({ semanas }));
    render(<App />);
    await abrirFormulario();
    const formulario = screen.getByRole("button", { name: "Salvar cliente" }).closest("form")!;
    fireEvent.submit(formulario);
    fireEvent.submit(formulario);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    pendente.resolver(resposta({ id: 11 }, 201));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Adicionar cliente - Semana 7" })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Adicionar cliente" })).toBeEnabled());
  });

  it("mantem aviso visivel quando salvou mas nao conseguiu recarregar", async () => {
    fetchMock.mockResolvedValueOnce(resposta({ semanas }))
      .mockResolvedValueOnce(resposta({ id: 11 }, 201))
      .mockResolvedValueOnce(resposta({ erro: "Indisponivel" }, 500))
      .mockResolvedValueOnce(resposta({ semanas: [{ numero: 7, clientes: [cliente, { ...cliente, id: 11, nome: "Nova Pessoa Ficticia" }] }] }));
    render(<App />);
    const usuario = await abrirFormulario();
    await usuario.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cliente salvo");
    expect(screen.getByText("Pessoa Ficticia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar cliente" })).toBeDisabled();
    await usuario.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Nova Pessoa Ficticia")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar cliente" })).toBeEnabled();
    expect(fetchMock.mock.calls.filter(([, opcoes]) => opcoes?.method === "POST")).toHaveLength(1);
  });

  it("mostra validacao do servidor e conserva o formulario", async () => {
    fetchMock.mockResolvedValueOnce(resposta({ semanas }))
      .mockResolvedValueOnce(resposta({ erro: "Valor pago invalido." }, 400));
    render(<App />);
    const usuario = await abrirFormulario();
    await usuario.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Valor pago invalido.");
    expect(screen.getByLabelText("Nome do cliente")).toHaveValue("Nova Pessoa Ficticia");
    expect(screen.getByRole("button", { name: "Salvar cliente" })).toBeEnabled();
  });

  it("recupera falha de conexao inicial com nova tentativa", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(resposta({ semanas }));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("conectar a API");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Semana 7" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("impede cadastrar sem semana e seleciona a primeira semana criada", async () => {
    fetchMock.mockResolvedValueOnce(resposta({ semanas: [] }))
      .mockResolvedValueOnce(resposta({ numero: 1 }, 201))
      .mockResolvedValueOnce(resposta({ semanas: [{ numero: 1, clientes: [] }] }));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Nenhuma semana cadastrada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar cliente" })).toBeDisabled();
    expect(screen.getByText("Crie uma semana para cadastrar clientes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ Nova semana" }));
    expect(await screen.findByRole("heading", { name: "Semana 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Adicionar cliente" })).toBeEnabled();
  });

  it("bloqueia criacao repetida de semana e avisa falha na atualizacao", async () => {
    const pendente = adiar();
    fetchMock.mockResolvedValueOnce(resposta({ semanas })).mockReturnValueOnce(pendente.promessa)
      .mockResolvedValueOnce(resposta({}, 500));
    render(<App />);
    const botao = await screen.findByRole("button", { name: "+ Nova semana" });
    fireEvent.click(botao); fireEvent.click(botao);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    pendente.resolver(resposta({ numero: 8 }, 201));
    expect(await screen.findByRole("alert")).toHaveTextContent("Semana criada");
    expect(screen.getByRole("heading", { name: "Semana 7" })).toBeInTheDocument();
  });

  it("edita e exclui com os endpoints corretos", async () => {
    fetchMock.mockResolvedValueOnce(resposta({ semanas }))
      .mockResolvedValueOnce(resposta({}))
      .mockResolvedValueOnce(resposta({ semanas }))
      .mockResolvedValueOnce(resposta({}))
      .mockResolvedValueOnce(resposta({ semanas: [{ numero: 7, clientes: [] }] }));
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Editar Pessoa Ficticia" }));
    expect(screen.getByLabelText("Nome do cliente")).toHaveValue("Pessoa Ficticia");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alteracoes" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Excluir Pessoa Ficticia" })).toBeEnabled());
    expect(fetchMock.mock.calls[1][0]).toMatch(/clientes\/10$/);
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PUT");
    await userEvent.click(screen.getByRole("button", { name: "Excluir Pessoa Ficticia" }));
    await waitFor(() => expect(screen.queryByText("Pessoa Ficticia")).not.toBeInTheDocument());
    expect(fetchMock.mock.calls[3][1]?.method).toBe("DELETE");
  });

  it("ignora a resposta antiga quando StrictMode cancela a primeira leitura", async () => {
    const antiga = adiar();
    fetchMock.mockReturnValueOnce(antiga.promessa).mockResolvedValueOnce(resposta({ semanas }));
    render(<StrictMode><App /></StrictMode>);
    expect(await screen.findByRole("heading", { name: "Semana 7" })).toBeInTheDocument();
    antiga.resolver(resposta({ semanas: [{ numero: 1, clientes: [] }] }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { name: "Semana 7" })).toBeInTheDocument();
  });
});
