# Controle de Clientes

Sistema web full stack para controle semanal de clientes, serviços prestados, pendências, cancelamentos e pagamentos.

O projeto foi preparado como uma versão pública de portfólio, com dados 100% fictícios e sem bancos, backups ou arquivos privados.

## Prévia da aplicação

![Interface do Controle de Clientes com dados fictícios](docs/screenshots/revisao-desktop.jpg)

[Ver captura da interface em celular](docs/screenshots/revisao-mobile.jpg).

## Destaques

- CRUD completo de clientes.
- Organização dos registros por semana.
- Resumo semanal e resumo geral.
- API REST com Node.js e Express.
- Persistência em SQLite.
- Interface em React, TypeScript e Vite.
- Validações no frontend, na API e no banco.
- Testes automatizados de backend, migração e interface.
- Documentação técnica para execução local e análise do projeto.

## Tecnologias

**Front-end:** React, TypeScript, Vite, CSS  
**Back-end:** Node.js, Express  
**Banco de dados:** SQLite, better-sqlite3, SQL  
**Qualidade:** ESLint, Vitest, Testing Library, Node.js test runner

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

O frontend consome a API local em `http://localhost:3001` por padrão. O backend cria e utiliza um banco SQLite local em `dados/controle-clientes-demo.db`.

## Funcionalidades

- Cadastrar, editar e excluir clientes.
- Criar novas semanas de acompanhamento.
- Separar clientes por semana.
- Calcular totais de serviços, pendências, cancelamentos e pagamentos.
- Exibir resumo acumulado de todas as semanas.
- Tratar erros de conexão e falhas de operação.
- Restaurar dados fictícios com um comando de seed.

## Como executar

### Requisitos

- Node.js 24 (versão indicada pela documentação existente do projeto).
- npm.
- Git, ou download do ZIP pelo GitHub.

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/felipeleite0/controle-de-clientes.git
cd controle-de-clientes
```

Instale as dependências:

```bash
npm ci --ignore-scripts
```

Esse comando é o procedimento registrado para o ambiente Windows na documentação existente. Em outras plataformas, o `better-sqlite3` pode precisar de seus scripts de instalação para obter ou compilar o binário nativo. Se houver erro ao carregar o SQLite, consulte a [documentação do better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

No PowerShell, se `npm.ps1` estiver bloqueado, use `npm.cmd` no lugar de `npm` nos comandos.

Gere os dados fictícios:

```bash
npm run seed
```

O seed substitui os registros do banco demonstrativo. Use na primeira execução ou para restaurar os dados fictícios; não execute em um banco que queira preservar.

Em um terminal, inicie a API:

```bash
npm run server
```

Em outro terminal, inicie o frontend:

```bash
npm run dev
```

Acesse o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

### Porta da API ocupada

Inicie a API em outra porta:

```bash
npm run server -- --port=3002
```

No segundo terminal PowerShell, informe a mesma porta antes de iniciar o frontend:

```powershell
$env:VITE_API_URL="http://localhost:3002"
npm.cmd run dev
```

No Bash:

```bash
VITE_API_URL=http://localhost:3002 npm run dev
```

Ainda não há um endereço público de demonstração; a aplicação precisa desses dois servidores locais.

## Testes

```bash
npm test
npm run lint
npm run build
```

O projeto possui testes de API/migração e testes de interface. Os testes de backend usam bancos temporários próprios e não alteram o banco demonstrativo local.

## Documentação complementar

- [Relatório de teste como visitante](docs/teste-visitante.md).
- [Correções, validações e testes de regressão](docs/correcoes-revisao.md).

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/status` | Verifica se a API está online |
| `GET` | `/api/dados` | Lista semanas e clientes |
| `GET` | `/api/semanas` | Lista semanas cadastradas |
| `POST` | `/api/semanas` | Cria uma nova semana |
| `GET` | `/api/semanas/:numero/clientes` | Lista clientes de uma semana |
| `POST` | `/api/clientes` | Cadastra cliente |
| `PUT` | `/api/clientes/:id` | Atualiza cliente |
| `DELETE` | `/api/clientes/:id` | Exclui cliente |

## Modelagem

O banco possui duas tabelas principais: `semanas` e `clientes`.

```text
semanas.id 1 ---- N clientes.semana_id
```

Esse relacionamento permite listar os clientes de uma semana específica e calcular totais por período.

## Dados demonstrativos

Todos os nomes, datas, valores, canais e métricas do projeto são fictícios e usados apenas para demonstração.

## Segurança

Este é um projeto local de portfólio. A API não possui autenticação e não deve ser exposta na internet sem ajustes de segurança, como autenticação, autorização, HTTPS, restrição de CORS e revisão da infraestrutura.

## Aprendizados

- Separar responsabilidades entre frontend, API e banco.
- Criar rotas REST para operações CRUD.
- Modelar relacionamentos com SQL.
- Consumir API com `fetch` no React.
- Validar entradas no frontend, na API e no banco.
- Criar testes automatizados sem alterar dados locais.
- Preparar uma versão pública sem dados reais.

## Próximas melhorias

- Adicionar autenticação.
- Criar filtros por status e canal.
- Incluir paginação na tabela.
- Criar dashboard com gráficos.
- Permitir exportação CSV.
- Configurar deploy do frontend e backend.
