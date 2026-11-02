# RENOVA SENAI - Portal do Docente & Gestão Acadêmica

Sistema Web desenvolvido para o **Portal do Docente SENAI-SP**, inspirado no layout moderno do portal de cursos SENAI Educação Online (`ead.sp.senai.br`), com reprodução fiel da **Aba de Configurações e Meu Perfil** e implementação completa de todas as 9 fases da especificação acadêmica do TCC.

---

## 🎨 Fidelidade Visual ao Portal Oficial SENAI

1. **Barra Lateral (Sidebar Dock)**:
   - Ícone quadrado vermelho com o "S" estilizado oficial do SENAI.
   - Menu vertical com ícones limpos e rótulos abaixo.
   - Indicador de seleção com traço vermelho inferior.
   - Botão "Sair" estilizado em vermelho no rodapé da barra.

2. **Tela de Login (Imagens 2 e 3)**:
   - Fundo gradiente em **Vinho / Vermelho Escuro SENAI** (`radial-gradient`) com cubos isométricos 3D animados e malha de pontos (*dotted grid*).
   - Alternador de **Modo Escuro / Claro** no topo direito que transforma o login na versão grafite/escura (idêntica à imagem 3).
   - Botão "Manual de acesso (?)".
   - Cartão de login com campos "Usuário", "Senha", botão vermelho "Avançar" e atalhos rápidos para preenchimento de teste (*Docente* e *Coordenação*).
   - Widgets flutuantes: **VLibras** (azul), **Acessibilidade** (vermelho) e pílula **Atendimento Educação Online** com fone no canto inferior direito.

3. **Aba de Configurações e Meu Perfil (Imagens 4 e 5 - IDÊNTICA)**:
   - **Banner Laranja com Grade (*Grid Pattern*)**: título *"Meu perfil"*, subtítulo *"Atualize suas informações básicas de perfil. ✨"* e botão branco *"Alterar senha ↗"*.
   - **Seção "Temas"**: 3 cartões interativos lado a lado:
     - **Sistema**: Mockup dividido 50% escuro e 50% claro.
     - **Claro**: Mockup com interface clara e barras simuladas.
     - **Escuro**: Mockup com interface escura.
     *(Ao clicar em qualquer cartão, o tema de todo o sistema se altera instantaneamente!)*
   - **Seção "Acessibilidade"**:
     - *Tamanho da fonte*: Seletor dropdown (Normal, Grande, Muito Grande) com ícone vermelho `Aa` e redimensionamento dinâmico no CSS.
     - *VLibras*: Card com ícone azul de mãozinha e interruptor (*toggle switch*) vermelho para exibir/ocultar o widget flutuante.
     - *Modo Daltônico*: Card com ícone verde/gradiente de paleta e interruptor para ativar filtro de alto contraste e adaptação de cores.
     - *Modo Monocromático*: Card com ícone cinza e interruptor para ativar filtro em escala de cinza (*grayscale*).

---

## 🚀 Arquitetura e Módulos Desenvolvidos

A aplicação foi estruturada sem necessidade de Python ou instalações adicionais, funcionando diretamente no navegador via HTML5, CSS3 moderno e JavaScript modular com persistência em `LocalStorage`:

```
c:\Users\56263693843\Downloads\PORR/
├── index.html                     # Interface completa e unificada
├── css/
│   ├── style.css                  # Variáveis, sidebar dock, canvas central e widgets flutuantes
│   ├── login.css                  # Login oficial com cubos 3D e alternância de temas (Imagens 2 e 3)
│   ├── components.css             # Tabelas acadêmicas, modais, alertas, carômetro e diário
│   ├── configuracoes.css          # REPRODUÇÃO IDÊNTICA das Imagens 4 e 5 (Temas e Acessibilidade)
│   └── relatorios.css             # Folha timbrada oficial e estilos de impressão em papel A4
├── js/
│   ├── db.js                      # Camada de banco de dados simulado com regras de negócio e persistência
│   ├── auth.js                    # Autenticação, perfis de docente e coordenação
│   ├── configuracoes.js           # Gerenciamento de temas, fonte e acessibilidade
│   ├── diario.js                  # Diário de classe, chamada e regras acadêmicas
│   ├── subturmas.js               # Divisão automática (Pares/Ímpares, Sequencial, Aleatório)
│   ├── ocorrencias.js             # Carômetro com fotos e registro de ocorrências por origem
│   ├── justificativas.js          # Módulo da coordenação que cadastra atestados e bloqueia faltas
│   ├── compensacoes.js            # Controle de obrigações geradas pelo acúmulo de 5 atrasos
│   ├── notas.js                   # Instrumentos avaliativos e cálculo automático de médias
│   ├── sintese.js                 # Consolidação automática dos lançamentos do professor
│   ├── relatorios.js              # Geração e impressão dos 4 relatórios oficiais
│   └── app.js                     # Controlador mestre, roteamento e diálogos modais
└── database/
    ├── schema.sql                 # Modelagem relacional completa do MySQL (22 tabelas)
    └── seed_data.sql              # Povoamento inicial com dados realistas do SENAI-SP
```

---

## 📋 Regras de Negócio Implementadas

1. **Regra do Status X (Matrículas Trancadas / Canceladas)**:
   - Alunos com status de matrícula `TRANCADO` ou `CANCELADO` têm sua frequência bloqueada no Diário de Classe com a indicação `STATUS X`. O professor **não pode** alterar esses lançamentos.

2. **Bloqueio de Falta por Atestados / Licenças**:
   - Quando a Coordenação homologa uma justificativa ou atestado médico no módulo da Secretaria para um período de datas, o sistema **bloqueia automaticamente** o lançamento de falta (`F`) para aquele aluno no Diário de Classe, convertendo para Dispensa (`D`) ou exibindo o badge `🏥 Atestado Homologado`.

3. **Controle de 5 Atrasos e Notificação Automática**:
   - Atrasos (`A`) são registrados separadamente.
   - Quando um aluno acumula **5 atrasos** nas aulas da Unidade Curricular, o sistema:
     - Gera automaticamente uma **Obrigação de Compensação** de 2 horas.
     - Cria um registro disciplinar no histórico do aluno.
     - Exibe um alerta na tela informando que a notificação foi enviada à Coordenação Pedagógica.

4. **Prazo Parametrizável de Edição Histórica**:
   - O prazo regulamentar para alteração de registros históricos passados é parametrizado em **7 dias**. Caso o docente tente salvar alterações de uma data além do prazo, o sistema bloqueia e emite um alerta formal.

5. **Divisão de Subturmas**:
   - Suporte a turmas divididas em Subturma A e Subturma B (ex: aulas práticas de laboratório).
   - Divisão automática com um clique: *Pares e Ímpares*, *Sequencial* ou *Aleatória*.
   - Transferência individual de alunos preservando integralmente o histórico de frequências já registradas.

6. **Relatórios Oficiais (com Impressão / Exportação PDF)**:
   - *1. Relatório de Controle de Frequência*
   - *2. Relatório de Rendimento Escolar (Boletim de Notas e Médias)*
   - *3. Relatório de Conteúdo das Aulas e PTDs por Período*
   - *4. Relatório de Compensação de Ausência*
   - Formatados com cabeçalho timbrado do SENAI-SP, metadados de emissão e campos de assinatura formal.

---

## 🗄️ Modelagem de Banco de Dados MySQL (`database/schema.sql`)

O script SQL modela integralmente todas as **22 tabelas** solicitadas na Fase 2:
- `usuarios`
- `professores`
- `alunos`
- `instituicoes`
- `escolas`
- `cursos`
- `turmas`
- `unidades_curriculares`
- `professor_turma_uc`
- `matriculas` (com coluna gerada para bloqueio do status X)
- `subturmas`
- `subturma_alunos`
- `subturma_professores`
- `aulas`
- `frequencias` (valores C, F, A, D, X)
- `justificativas` (atestados cadastrados pela coordenação)
- `ptds` (planos de trabalho docente)
- `conteudos_aula`
- `ocorrencias`
- `avaliacoes`
- `notas`
- `compensacoes`
- `auditoria`

---

## 💻 Como Executar

Basta abrir o arquivo [index.html](file:///c:/Users/56263693843/Downloads/PORR/index.html) em qualquer navegador web (Microsoft Edge, Google Chrome, Firefox). Não requer instalação de Python nem dependências externas.
