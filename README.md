# FastFlow v2.0 — App PWA de Jejum Intermitente & GLP-1 Companion 🍃💉

> **FastFlow** é um aplicativo web progressivo (PWA) mobile-first, desenvolvido em HTML5, CSS3 moderno e JavaScript Vanilla puro (sem frameworks, sem build step e sem dependências externas). Ele entrega a experiência estética e tátil de aplicativos de primeira linha da App Store (como Zero e Apple Health), com persistência 100% local, timer imune a drift em segundo plano, estatísticas avançadas, módulo completo para **usuários de canetas emagrecedoras (GLP-1/GIP)** e suporte offline completo.

---

## ✨ Funcionalidades Principais

### ⏱️ Jejum Intermitente & Timer Preciso
- **Mobile-First & PWA Completo**: Instalável no iOS e Android, com manifesto web, ícones adaptativos e service worker com estratégia Cache-First para funcionamento 100% offline.
- **Timer Imune a Drift**:
  - Baseado estritamente em timestamps reais (`Date.now() - startedAt`), sem dessincronização quando o aparelho entra em repouso ou troca de aplicativo.
  - Sincronização instantânea com a API `visibilitychange`.
  - Anel de progresso circular SVG animado com efeito especial luminoso ao superar a meta.
  - Estágios fisiológicos do jejum (digestão, queima de glicogênio, cetose, autofagia).
- **Histórico & Filtros**:
  - Filtros por período: *Todos*, *Esta semana* e *Este mês*.
  - Badges inteligentes: ✅ *Concluído*, ⚠️ *Abaixo da meta* e 🔥 *Recorde pessoal*.
  - Visualização de detalhes completos e edição de notas.
- **Progressão Inteligente de Protocolos**:
  - Sugere automaticamente subir de patamar após 5 sucessos consecutivos (`14:10` → `16:8` → `17:7` → `18:6` → `20:4` → `22:2` → `23:1 OMAD`).

---

### 💉 NOVO v2.0: Módulo Canetas Emagrecedoras (GLP-1 Companion)
Criado especialmente para quem combina jejum com **Ozempic, Wegovy, Mounjaro, Zepbound, Saxenda ou Rybelsus**:

- **Controle de Aplicações & Dosagens**:
  - Catálogo nativo das principais canetas com suas faixas de dosagem clínicas (0,25mg até 15mg).
  - Lembrete do dia de aplicação semanal ou diário com contagem regressiva.
  - Registro de aplicação com dose, local anatômico, sintomas e notas.
- **Mapa de Rotação de Locais (Prevenção de Lipodistrofia)**:
  - Sugestão automática do próximo local de injeção (Abdômen Direito/Esquerdo, Coxa Direita/Esquerda, Braço).
- **Rastreador de Hidratação Diária**:
  - Combate a perda da sensação de sede provocada pelo GLP-1.
  - Widget interativo na tela inicial com botões rápidos de `+ 1 copo (250ml)` e meta customizável.
- **Proteção Muscular (Anti-Sarcopenia)**:
  - Cálculo automático da meta proteica diária (1,2g a 1,6g/kg) com base no peso corporal.
  - Lembrete clínico ao encerrar o jejum orientando a quebra com proteínas magras.
- **Aviso de Esvaziamento Gástrico Retardado**:
  - Alertas preventivos sobre alimentos pesados antes do jejum para evitar náuseas e refluxo.
- **Diário de Sintomas & Gráfico de Peso x Doses**:
  - Check-in de sintomas (Náusea, Azia/Refluxo, Constipação, Saciedade Plena, etc.).
  - Gráfico em Canvas puro demonstrando a curva de perda de peso correlacionada às doses aplicadas.

---

## 🏗️ Estrutura do Projeto

```
/fastflow
  ├── index.html                  # Shell da aplicação v2.0 e marcação semântica
  ├── manifest.webmanifest        # Manifesto PWA com metadados e ícones
  ├── service-worker.js           # Cache-First offline (v2.0.0)
  ├── README.md                   # Documentação do projeto
  ├── /css
  │    ├── reset.css              # Reset moderno com safe-areas e dvh
  │    ├── variables.css          # Design tokens (dark/light/glp1 cyan)
  │    ├── base.css               # Estilos globais, tipografia e layout container
  │    ├── components.css         # Anel SVG, botões pill, nav, widgets GLP-1 e toasts
  │    └── screens.css            # Estilos dedicados das telas
  ├── /js
  │    ├── app.js                 # Bootstrap, roteamento e listeners v2.0
  │    ├── glp1.js                # NOVO: Módulo GLP-1, catálogo, rotação e hidratação
  │    ├── state.js               # Estado reativo centralizado (Pub/Sub)
  │    ├── storage.js             # Wrapper de localStorage com backup v2.0
  │    ├── timer.js               # Lógica do cronômetro com proteção contra drift
  │    ├── protocols.js           # Definição dos protocolos clínicos e escalonamento
  │    ├── history.js             # CRUD de histórico de jejuns e recordes
  │    ├── stats.js               # Cálculos de streak, médias e progressão
  │    ├── charts.js              # Gráficos Canvas (barras, linha, heatmap, peso e água)
  │    ├── notifications.js       # Notificações Web (metas, lembrete e injeção GLP-1)
  │    ├── ui.js                  # Orquestração visual do DOM, cards GLP-1 e modais
  │    ├── theme.js               # Gerenciador de tema Dark/Light/Sistema
  │    └── utils.js               # Formatadores de tempo/data em PT-BR e helpers
  └── /assets
       └── /icons
            ├── icon.svg          # Ícone vetorial master
            ├── icon-192.png      # PWA standard 192x192
            ├── icon-512.png      # PWA standard 512x512
            ├── icon-maskable-192.png # PWA maskable 192x192
            └── icon-maskable-512.png # PWA maskable 512x512
```

---

## 🚀 Como Executar Localmente

Como o app utiliza módulos ES6 (`import`/`export`) e Service Worker, ele precisa ser servido através de um servidor HTTP local simples:

### Usando Node.js (npx serve)
No terminal, dentro da pasta do projeto, execute:
```bash
npx serve .
```
Ou com `http-server`:
```bash
npx http-server -p 3000
```
Em seguida, abra no navegador: `http://localhost:3000`

---

## 📲 Como Instalar no Celular (PWA)

### No iPhone / iPad (iOS Safari):
1. Abra a URL do app no Safari.
2. Toque no botão de **Compartilhar** (ícone de quadrado com seta para cima).
3. Selecione **"Adicionar à Tela de Início"** e toque em **Adicionar**.

### No Android (Google Chrome):
1. Abra a URL do app no Chrome.
2. Toque no botão **"Instalar aplicativo"** nas configurações do FastFlow ou no menu do navegador.

---

## 🌐 Instruções de Deploy

Como o projeto é 100% estático (HTML, CSS e JS puros):

### Vercel
```bash
vercel
```

### Netlify
Arraste a pasta do projeto diretamente para o painel do [Netlify Drop](https://app.netlify.com/drop).

### GitHub Pages
1. Crie um repositório no GitHub e envie os arquivos.
2. Em **Settings** > **Pages**, selecione a branch `main` e pasta `/(root)`.

---

## 🛡️ Privacidade e Segurança

- **Zero Rastreamento**: Não há bibliotecas de terceiros nem cookies externos.
- **100% dos Dados no Aparelho**: Seus dados de jejum, medicação e peso ficam armazenados exclusivamente no seu próprio navegador.
- **Backup Portátil v2.0**: Exporte e importe seus dados a qualquer momento em formato JSON.
