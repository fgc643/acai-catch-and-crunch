# Açaí Catch & Crunch

Mini jogo para açaiterias e outros comércios locais. O cliente joga 45 segundos pegando ingredientes, deixa nome e WhatsApp e, se passar da pontuação mínima, ganha um cupom de desconto válido por 7 dias. O dono valida o cupom em um painel administrativo.

> Projeto de portfólio, desenvolvido com apoio de IA (Lovable). Eu defini as regras, testei os fluxos e corrigi os problemas encontrados.

**Aplicativo ao vivo:** https://acai-catch-and-crunch.lovable.app

## Como funciona

- O jogo dura 45 segundos: ingredientes bons dão +10 pontos, ruins tiram 15
- Com 150 pontos ou mais, o jogador ganha um cupom de 10% de desconto, válido por 7 dias
- O painel administrativo tem quatro abas: validar cupom, lista de cupons, lista de jogadores e configurações
- Nome do negócio, cores, desconto, pontuação mínima e validade ficam em uma linha de configuração, então o mesmo jogo serve para vários comércios
- Pensado para ser colocado no site de um cliente por link ou iframe

## Tecnologias

React, TypeScript, TanStack Start, Tailwind, Supabase (Postgres, autenticação e funções de servidor), Vitest.

## Segurança e regras (o que está implementado)

- A rodada é cronometrada pelo servidor: ao começar, ele cria um registro com um token de uso único, e só aceita o envio se o token existir, ainda não foi usado e o tempo decorrido for coerente
- A pontuação máxima aceita depende do tempo real da rodada, com teto de 630 pontos
- Uma jogada por telefone por dia, garantida por índice único no banco (fuso de São Paulo)
- O cupom é gerado com sorteio seguro, sem caracteres confusos (sem 0/O e 1/I)
- Jogadores e cupons só são gravados pelo servidor; o administrador lê pelo banco com regra de acesso por papel
- Modo de teste (`?debug=1`) que nunca grava jogada nem gera cupom real
- Testes automatizados para as regras do jogo e para o modo de teste

## Limitações conhecidas

- O telefone não é verificado por código (OTP), então é possível usar números diferentes para jogar de novo
- Não há teto diário de cupons nem limite por IP
- Falta política de privacidade e prazo de retenção dos dados (LGPD)
- A primeira conta criada vira administradora: crie a sua antes de divulgar o link

## Como rodar

```sh
npm install
npm run dev
```

Crie um arquivo `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do seu projeto Supabase.

## Autor

Flávio Augusto da Silva, Zentrixia Smart Solutions. Diadema, SP.
