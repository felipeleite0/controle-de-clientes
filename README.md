# Controle de Clientes

Sistema web full stack para controle semanal de clientes, serviços prestados, pendências, cancelamentos e pagamentos.

O projeto foi preparado como uma versão pública de portfólio, com dados 100% fictícios e sem bancos, backups ou arquivos privados.

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

- Node.js 24 LTS ou superior.
- npm.
- Git, ou download do ZIP pelo GitHub.

Instale as dependências:

```bash
npm ci --ignore-scripts
```

Gere os dados fictícios:

```bash
npm run seed
```

Em um terminal, inicie a API:

```bash
npm run server
```

Em outro terminal, inicie o frontend:

```bash
npm run dev
```

Acesse o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

## Testes

```bash
npm test
npm run lint
npm run build
```

O projeto possui testes de API/migração e testes de interface. Os testes de backend usam bancos temporários próprios e não alteram o banco demonstrativo local.

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
