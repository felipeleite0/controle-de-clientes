# Controle de Clientes

Sistema web para controle semanal de clientes, serviços prestados, pendências, cancelamentos e pagamentos. O projeto foi preparado como uma versão pública de portfólio, com dados 100% fictícios e sem bancos, backups ou arquivos privados.

## Objetivo

O objetivo do projeto é demonstrar uma aplicação full stack simples, funcional e documentada, com:

- cadastro, edição, listagem e exclusão de clientes;
- separação dos clientes por semana;
- resumo semanal e resumo geral;
- API REST em Node.js e Express;
- persistência em SQLite;
- seed com dados demonstrativos fictícios;
- documentação técnica para publicação no GitHub.

## Tecnologias

- React
- TypeScript
- Vite
- Node.js
- Express
- SQLite
- better-sqlite3
- CORS
- ESLint
- Vitest, Testing Library e test runner nativo do Node.js

## Arquitetura

```text
React + TypeScript + Vite
        |
        | HTTP / JSON
        v
Node.js + Express
        |
        | SQL
        v
SQLite
```

O frontend consome a API local em `http://localhost:3001` por padrão. O backend lê e grava no banco SQLite localizado em `dados/controle-clientes-demo.db`, criado automaticamente em ambiente local.

## Estrutura de pastas

```text
controle-de-clientes/
├── dados/
│   └── .gitkeep
├── public/
├── server/
│   ├── database.js
│   ├── migrar.js
│   ├── seed.js
│   ├── validacao.js
│   └── server.js
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── test-setup.ts
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── tests/
│   ├── api.test.js
│   ├── migracao.test.js
│   └── helpers.js
├── docs/
├── package.json
├── package-lock.json
├── README.md
├── vite.config.ts
└── vitest.config.ts
```

## Instalação

### Requisitos e download

- Node.js 24 LTS e npm (ambiente validado: Node.js 24.21.0 / npm 11.19.0).
- Git para clonar, ou a opção **Code > Download ZIP** do GitHub.

Clone usando a URL mostrada no botão **Code** do seu repositório e entre na pasta `controle-de-clientes`. Se baixar o ZIP, extraia os arquivos e abra um terminal na pasta que contém `package.json`.

O GitHub mostra o código e esta documentação. A aplicação precisa dos dois servidores locais abaixo; ainda não existe um endereço público de demonstração.

```bash
npm ci --ignore-scripts
```

No Windows, se o PowerShell bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm` em todos os comandos. Isso permite executar o projeto sem alterar a politica de seguranca do Windows:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run seed
npm.cmd run server -- --port=3002
```

Em outro terminal PowerShell, na mesma pasta:

```powershell
$env:VITE_API_URL="http://localhost:3002"
npm.cmd run dev
```

O `package-lock.json` fixa as versões. Nesta versão, as dependências incluem os binários necessários para o ambiente testado. A opção `--ignore-scripts` evita a tentativa de compilação nativa do SQLite observada com `npm install` no Windows. Instalação, seed e build foram testados com esse comando sem copiar dependências de outro projeto. Para outras plataformas ou atualizações de dependências, confira a disponibilidade dos binários na [documentação do better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

## Gerar dados fictícios

```bash
npm run seed
```

Esse comando cria o banco SQLite local e popula as tabelas com clientes, datas e valores fictícios.

O seed substitui todos os registros do banco demonstrativo. Execute-o antes da primeira abertura e novamente apenas quando quiser restaurar a demonstração.

## Execução

No **terminal 1**, inicie a API:

```bash
npm run server
```

No **terminal 2**, na mesma pasta, inicie o frontend:

```bash
npm run dev
```

Mantenha os dois terminais abertos e acesse o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

### Se a porta da API estiver ocupada

Se a porta `3001` já estiver em uso, rode a API em outra porta:

```bash
node server/server.js --port=3002
```

Nesse caso, inicie o frontend apontando para a mesma porta.

No PowerShell:

```powershell
$env:VITE_API_URL="http://localhost:3002"
npm run dev
```

No Bash:

```bash
VITE_API_URL=http://localhost:3002 npm run dev
```

Se o frontend já estiver aberto, encerre-o antes de definir `VITE_API_URL` e iniciá-lo novamente. Se a porta do frontend estiver ocupada, use o novo endereço exibido pelo Vite.

### Primeiro teste

1. Confirme as três semanas e os oito clientes fictícios.
2. Adicione um cliente com nome, data e valor demonstrativos.
3. Confira a linha criada e os totais atualizados.
4. Edite o cliente e recarregue a página para conferir a persistência.
5. Exclua esse registro e confirme a atualização dos totais.
6. Crie uma nova semana e confira que ela começa vazia.

O [relatório de teste como visitante](docs/teste-visitante.md) registra os resultados e as limitações dessa simulação.

### Testes automatizados

```bash
npm test
npm run lint
npm run build
```

No PowerShell, use `npm.cmd` se necessário. Para executar separadamente:

- `npm run test:api`: integração HTTP com a API real, SQLite e migração JSON.
- `npm run test:ui`: componentes React com Vitest, Testing Library e jsdom.

São 45 testes: 36 de backend/migração e 9 de interface. Os testes de backend criam bancos temporários exclusivos, escolhem uma porta livre, encerram seus servidores e removem apenas seus próprios arquivos temporários. Não usam nem alteram o banco demonstrativo local. Os testes React simulam respostas HTTP; a conferência visual complementar está no [relatório das correções](docs/correcoes-revisao.md).

## Modelagem SQLite

O banco possui duas tabelas principais: `semanas` e `clientes`.

```sql
CREATE TABLE semanas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL UNIQUE
);
```

```sql
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  canal TEXT NOT NULL,
  data_pedido TEXT NOT NULL,
  servicos INTEGER NOT NULL DEFAULT 0,
  pendencias INTEGER NOT NULL DEFAULT 0,
  cancelamentos INTEGER NOT NULL DEFAULT 0,
  valor_pago REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Finalizado',
  semana_id INTEGER NOT NULL,

  FOREIGN KEY (semana_id)
    REFERENCES semanas(id)
    ON DELETE CASCADE
);
```

## Relacionamento semanas/clientes

O `id` de um novo cliente é gerado pelo SQLite quando omitido. IDs explícitos continuam aceitos para compatibilidade com seed e importação; o frontend não usa mais `Date.now()`.

Ao abrir um banco existente, `database.js` adiciona triggers de validação para `INSERT` e `UPDATE`, sem recriar tabelas ou excluir registros. Essas regras impedem novas gravações com datas inexistentes, campos fora das opções permitidas, contagens negativas/fracionadas e pagamentos inválidos. Registros inválidos eventualmente gravados por versões antigas não são apagados automaticamente e precisam de revisão manual.

O índice `clientes_por_semana (semana_id, data_pedido, id)` atende à listagem ordenada de clientes por semana. A API também valida os tipos JSON antes de executar SQL e usa parâmetros nas consultas.

Uma semana pode ter vários clientes. Cada cliente pertence a uma única semana.

```text
semanas.id 1 ─── N clientes.semana_id
```

Esse relacionamento permite consultar todos os clientes de uma semana específica e também calcular totais por período.

## Exemplos SQL

### SELECT

```sql
SELECT *
FROM clientes
ORDER BY data_pedido;
```

### INSERT

```sql
INSERT INTO semanas (numero)
VALUES (4);
```

```sql
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
VALUES (
  104001,
  'Cliente Exemplo',
  'Site',
  '2026-02-02',
  3,
  0,
  0,
  350,
  'Finalizado',
  4
);
```

### UPDATE

```sql
UPDATE clientes
SET
  nome = 'Cliente Atualizado',
  canal = 'WhatsApp',
  valor_pago = 420,
  status = 'Em andamento'
WHERE id = 104001;
```

### DELETE

```sql
DELETE FROM clientes
WHERE id = 104001;
```

### INNER JOIN

```sql
SELECT
  semanas.numero AS semana,
  clientes.nome,
  clientes.canal,
  clientes.valor_pago
FROM clientes
INNER JOIN semanas
  ON semanas.id = clientes.semana_id
ORDER BY semanas.numero, clientes.nome;
```

## Endpoints da API

### Status da API

```http
GET /api/status
```

Retorna se a API está online.

### Dados completos

```http
GET /api/dados
```

Retorna semanas com seus respectivos clientes.

### Listar semanas

```http
GET /api/semanas
```

Retorna todas as semanas cadastradas.

### Clientes de uma semana

```http
GET /api/semanas/:numero/clientes
```

Retorna os clientes vinculados ao número de semana informado.

### Criar semana

```http
POST /api/semanas
```

Exemplo de corpo:

```json
{
  "numero": 4
}
```

### Criar cliente

```http
POST /api/clientes
```

Exemplo de corpo:

```json
{
  "nome": "Cliente Exemplo",
  "canal": "Site",
  "dataPedido": "2026-02-02",
  "servicos": 3,
  "pendencias": 0,
  "cancelamentos": 0,
  "valorPago": 350,
  "status": "Finalizado",
  "semana": 4
}
```

### Atualizar cliente

O cadastro retorna HTTP `201` com `{ "mensagem": "...", "id": 104001 }` (ID ilustrativo). O campo `semana` representa o número da semana, não sua chave interna.

```http
PUT /api/clientes/:id
```

Atualiza os dados do cliente informado.

Envie os mesmos campos do exemplo de cadastro, sem `semana` ou `id`. Nome, canal e data são obrigatórios. Campos opcionais omitidos em POST ou PUT recebem zero nas contagens/pagamento e `Finalizado` no status; PUT substitui os campos do cliente, não é uma atualização parcial.

### Excluir cliente

```http
DELETE /api/clientes/:id
```

Remove o cliente informado.

### Validação e erros

- `nome`: texto não vazio após retirar espaços externos, até 200 caracteres.
- `canal`: `Site`, `Instagram`, `WhatsApp` ou `Indicacao`.
- `dataPedido`: data existente em `AAAA-MM-DD`, entre os anos 0001 e 9999.
- `servicos`, `pendencias`, `cancelamentos`: inteiros seguros não negativos.
- `valorPago`: número JSON finito não negativo, nunca texto.
- `status`: `Finalizado` ou `Em andamento`.
- IDs e número da semana: inteiros seguros positivos.

Erros têm o formato `{ "erro": "Mensagem explicativa." }`: `400` para entradas inválidas, `404` para registros/semanas inexistentes, `409` para número de semana ou ID duplicado e `500` para falhas inesperadas. Dados rejeitados não alteram os registros.

## Fluxo do CRUD

1. O usuário preenche o formulário no frontend.
2. O React valida os campos obrigatórios.
3. O frontend envia uma requisição HTTP para a API.
4. O Express recebe e valida os dados em JSON.
5. O backend executa comandos SQL parametrizados no SQLite.
6. A API retorna sucesso ou erro.
7. O frontend recarrega os dados e atualiza a interface.

A interface bloqueia operações repetidas enquanto aguarda a resposta. Se a gravação terminar mas a leitura seguinte falhar, mantém os dados anteriores e mostra um aviso persistente, com a opção de tentar atualizar novamente sem repetir o cadastro. Sem nenhuma semana cadastrada, só permite adicionar clientes após criar uma semana. A seleção inicial acompanha as semanas realmente retornadas pela API.

## Migração e evolução do projeto

O projeto evoluiu em etapas:

1. criação da interface com React, TypeScript e Vite;
2. organização de estados para semanas, clientes, formulário e edição;
3. criação do backend com Node.js e Express;
4. definição da API REST;
5. criação do banco SQLite;
6. modelagem das tabelas `semanas` e `clientes`;
7. conexão entre frontend e backend;
8. implementação do CRUD completo;
9. criação de seed com dados fictícios;
10. preparação de uma versão pública sem dados reais.

O arquivo `server/migrar.js` demonstra a migração a partir de JSON, mas a versão pública usa `server/seed.js` como caminho principal para gerar dados demonstrativos.

Para experimentar a migração, crie apenas um JSON fictício local:

```json
{
  "semanas": [
    {
      "numero": 7,
      "clientes": [
        { "id": 7001, "nome": "Pessoa Demonstrativa", "canal": "Site", "dataPedido": "2028-01-01" }
      ]
    }
  ]
}
```

```bash
node server/migrar.js dados/clientes-demo.json
```

Também é possível passar outro caminho como argumento. O arquivo inteiro é validado antes da importação. IDs devem ser únicos no JSON; clientes idênticos já existentes são contabilizados como `jaExistentes`, sem duplicação. Um ID existente com dados diferentes cancela toda a transação, inclusive semanas/clientes criados anteriormente nessa execução. A saída informa `semanasCriadas`, `inseridos` e `jaExistentes`; uma falha encerra com código 1, sem anunciar sucesso.

Para usar um banco descartável independente, defina `DATABASE_PATH` antes de executar API, seed ou migração. Essa variável troca o arquivo de destino; nunca aponte o seed para um banco que queira preservar.

No PowerShell:

```powershell
$env:DATABASE_PATH="$env:TEMP/controle-clientes-exemplo.db"
node server/migrar.js dados/clientes-demo.json
Remove-Item Env:DATABASE_PATH
```

A evolução após a revisão acrescentou validações, proteção de banco, importação transacional, tratamento de falhas na interface e testes de regressão, preservando a arquitetura original.

## Dados demonstrativos

Os dados usados no projeto são fictícios. Exemplos:

- Ana Souza
- Bruno Lima
- Loja Prisma
- Empresa Aurora
- Norte Digital

Datas, valores, canais e métricas também foram criados apenas para demonstração.

## Segurança para publicação

Este projeto é uma demonstração local: não possui autenticação e permite requisições de outras origens via CORS. Não exponha a API na internet nem use dados reais antes de implementar autenticação/autorização, restringir origens, configurar HTTPS e revisar a infraestrutura. Publicar o código no GitHub não hospeda a API.

O `.gitignore` impede a publicação de:

- bancos SQLite;
- arquivos JSON de dados;
- backups;
- arquivos `.env`;
- arquivos locais;
- `node_modules`;
- `dist`.

Antes de publicar, confira:

```bash
git status
git diff --cached
```

Também é recomendado procurar termos privados ou arquivos sensíveis antes do primeiro push.

O `.gitignore` não remove arquivos já rastreados nem limpa o histórico do Git. Revise também `git ls-files` e o histórico antes de publicar; um banco já adicionado precisa sair do índice, e um segredo vazado precisa ser revogado.

## Sequência sugerida de commits

```bash
git add package.json package-lock.json index.html .gitignore
git commit -m "chore: rename project to controle de clientes"
```

```bash
git add src
git commit -m "feat: adapt frontend for customer control"
```

```bash
git add server dados/.gitkeep
git commit -m "feat: add sqlite api and demo seed"
```

```bash
git add README.md
git commit -m "docs: document architecture crud api and setup"
```

```bash
git status
git commit -m "chore: prepare sanitized portfolio version"
```

## Aprendizados

- separar responsabilidades entre frontend, API e banco;
- criar rotas REST para operações CRUD;
- usar SQL para modelar relacionamento entre tabelas;
- consumir API com `fetch` no React;
- organizar dados por período;
- preparar dados fictícios para um repositório público;
- configurar `.gitignore` para evitar vazamento de dados privados.
- validar entradas na API e proteger novas gravações diretamente no banco;
- usar transações para evitar importações parciais;
- diferenciar erro de gravação de erro de atualização da interface;
- criar testes isolados sem tocar nos dados locais.

## Próximas melhorias

- adicionar autenticação;
- adicionar testes ponta a ponta no navegador e integração contínua;
- adicionar filtros por status e canal;
- incluir paginação na tabela;
- criar dashboard com gráficos;
- validar os dados com uma biblioteca de schema;
- permitir exportação CSV;
- configurar deploy do frontend e backend.
