/**
 * =============================================================================
 * RENOVA SENAI - CONTROLADOR DO ASSISTENTE IA (assistente.js)
 * Integração Groq (Llama 3.3 70B) + Motor Inteligente Local de Dados Acadêmicos
 * =============================================================================
 * VERSÃO: 2025-01-15-v6-MODEL-LLAMA-3.3-70B-VERSATILE
 * =============================================================================
 */

class AssistenteIAController {
  constructor() {
    console.log('[Assistente IA] === VERSÃO 2025-01-15-v6 - MODEL: qwen/qwen3.8-27b ===');
    this.turmaId = 1;
    this.ucId = 1;
    this.apiKey = window.db?.data?.config?.groqApiKey 
               || localStorage.getItem('renova_groq_api_key') 
               || '';
    this.groqModel = window.db?.data?.config?.groqModel 
                    || localStorage.getItem('renova_groq_model') 
                    || 'qwen/qwen3.8-27b';
    console.log('[Assistente IA] Constructor - groqModel:', this.groqModel, '| apiKey:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'VAZIA');
    this.isGenerating = false;
    this.mensagens = [];
    this._modoCoord = false; // Alterado pelo app.js quando logado como coordenador
  }

  init() {
    this.carregarTurmasSelect();
    this.atualizarStatusChave();
    this.configurarEventos();

    // Se não houver mensagens no histórico, insere a de boas-vindas
    if (this.mensagens.length === 0) {
      this.exibirMensagemBoasVindas();
    }
  }

  // --- Carregamento de Turmas no Seletor ---
  carregarTurmasSelect() {
    const sel = document.getElementById('selectTurmaAssistente');
    if (!sel) return;

    const turmas = window.db.getTurmas('TODOS');
    sel.innerHTML = '';
    turmas.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.codigo} - ${t.nome}`;
      if (t.id === this.turmaId) opt.selected = true;
      sel.appendChild(opt);
    });

    // Atualiza UCs da turma selecionada
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    if (ucs.length > 0) {
      this.ucId = ucs[0].id;
    }
  }

  aoMudarTurma(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    if (ucs.length > 0) {
      this.ucId = ucs[0].id;
    }

    const turma = window.db.getTurmaById(this.turmaId);
    const msgContexto = ` **Turma alterada para ${turma?.codigo || ''} - ${turma?.nome || ''}**.\nTodos os diagnósticos e dados agora correspondem a esta turma. Como posso ajudar?`;
    this.adicionarMensagem('bot', msgContexto);
  }

// --- Recarregar Chave do localStorage ---
  recarregarChaveDoStorage() {
    const storedKey = localStorage.getItem('renova_groq_api_key');
    if (storedKey && !storedKey.startsWith('gsk_')) {
      localStorage.removeItem('renova_groq_api_key');
    }
    const storedModel = localStorage.getItem('renova_groq_model');
    if (storedModel && (storedModel === 'llama-3.3-70b-versatile' || storedModel === 'llama-3.1-8b-instant')) {
      localStorage.removeItem('renova_groq_model');
    }
    this.apiKey = window.db?.data?.config?.groqApiKey 
               || localStorage.getItem('renova_groq_api_key') 
               || '';
    this.groqModel = window.db?.data?.config?.groqModel 
                    || localStorage.getItem('renova_groq_model') 
                    || 'qwen/qwen3.8-27b';
  }

  // --- Atualizar Indicador de Chave Groq ---
  atualizarStatusChave() {
    this.recarregarChaveDoStorage();
    const btn = document.getElementById('btnConfigGroq');
    if (!btn) return;

    const isValidKey = this.apiKey && this.apiKey.trim().startsWith('gsk_');

    if (isValidKey) {
      btn.classList.add('key-connected');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5l9 4.5v13l-9 4.5-9-4.5v-13L16 4.5z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M16 8.5v15" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 8.5l-9 4.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 8.5l9 4.5" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span>Groq Conectado</span>
      `;
    } else {
      btn.classList.remove('key-connected');
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5l9 4.5v13l-9 4.5-9-4.5v-13L16 4.5z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M16 8.5v15" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 8.5l-9 4.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M16 8.5l9 4.5" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span>Chave Groq API</span>
      `;
    }
  }

  // --- Modal de Configuração da API Key Groq ---
  abrirModalGroqKey() {
    const input = document.getElementById('inputGroqApiKey');
    if (input) input.value = this.apiKey;
    const modal = document.getElementById('modalConfigGroq');
    if (modal) modal.style.display = 'flex';
  }

  salvarGroqKey() {
    const input = document.getElementById('inputGroqApiKey');
    const valor = input ? input.value.trim() : '';

    if (valor && !valor.startsWith('gsk_')) {
      window.app.mostrarToast('Formato inválido. Chaves da Groq devem começar com "gsk_..."', 'error');
      return;
    }

    this.apiKey = valor;
    localStorage.setItem('renova_groq_api_key', valor);
    this.atualizarStatusChave();
    window.app.fecharModal('modalConfigGroq');

    if (valor) {
      window.app.mostrarToast('Chave Groq salva com sucesso! O assistente agora usará IA generativa em tempo real.', 'success');
      this.adicionarMensagem('bot', ' **Chave Groq ativada!** Agora estou conectado aos modelos Llama 3.1 para análises aprofundadas com raciocínio pedagógico.');
    } else {
      window.app.mostrarToast('Modo Local Inteligente ativado (sem API Key).', 'info');
    }
  }

  removerGroqKey() {
    this.apiKey = '';
    localStorage.removeItem('renova_groq_api_key');
    const input = document.getElementById('inputGroqApiKey');
    if (input) input.value = '';
    this.atualizarStatusChave();
    window.app.fecharModal('modalConfigGroq');
    window.app.mostrarToast('Chave removida. Operando no Motor Local Inteligente.', 'info');
  }

  // --- Configuração dos Eventos de UI ---
  configurarEventos() {
    const inputMsg = document.getElementById('inputAssistenteMsg');
    const btnSend = document.getElementById('btnAssistenteEnviar');
    const btnLimpar = document.getElementById('btnAssistenteLimpar');
    const selTurma = document.getElementById('selectTurmaAssistente');

    if (inputMsg && !inputMsg.dataset.bound) {
      inputMsg.dataset.bound = 'true';
      inputMsg.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.enviarMensagemInput();
        }
      });
    }

    if (btnSend && !btnSend.dataset.bound) {
      btnSend.dataset.bound = 'true';
      btnSend.addEventListener('click', () => {
        this.enviarMensagemInput();
      });
    }

    if (btnLimpar && !btnLimpar.dataset.bound) {
      btnLimpar.dataset.bound = 'true';
      btnLimpar.addEventListener('click', () => {
        this.limparConversa();
      });
    }

    if (selTurma && !selTurma.dataset.bound) {
      selTurma.dataset.bound = 'true';
      selTurma.addEventListener('change', (e) => {
        this.aoMudarTurma(e.target.value);
      });
    }

    // Configuração dos Chips / Pré-Opções
    document.querySelectorAll('.assistente-chip-btn').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
          const acao = btn.getAttribute('data-action');
          const rotulo = btn.textContent.trim();
          this.executarOpcaoPredefinida(acao, rotulo);
        });
      }
    });
  }

  // --- Mensagem Inicial de Boas-Vindas (Idêntica à Imagem) ---
  exibirMensagemBoasVindas() {
    const container = document.getElementById('assistenteChatMessages');
    if (!container) return;

    container.innerHTML = '';
    this.mensagens = [];

    const isCoord = this._modoCoord || (window.auth && window.auth.isCoordenacao());
    const textoBoasVindas = isCoord
      ? 'Olá! Sou o Assistente Técnico Pedagógico da Coordenação SENAI. Posso analisar o desempenho de todas as turmas, índices de evasão, comparativos de frequência e relatórios operacionais. Como posso ajudar?'
      : 'Olá! Sou o assistente inteligente do Portal do Docente SENAI. Pergunte sobre a turma, frequência, notas, observações ou riscos. Como posso ajudar?';
    this.adicionarMensagem('bot', textoBoasVindas, false);
  }

  limparConversa() {
    this.exibirMensagemBoasVindas();
    window.app.mostrarToast('Conversa reiniciada com sucesso.', 'info');
  }

  // --- Envio de Mensagem Escrita pelo Usuário ---
  enviarMensagemInput() {
    const input = document.getElementById('inputAssistenteMsg');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto || this.isGenerating) return;

    input.value = '';
    this.processarMensagem(texto);
  }

  // --- Execução de Pré-Opções Rápidas ---
  executarOpcaoPredefinida(acao, rotulo) {
    if (this.isGenerating) return;
    this.processarMensagem(rotulo, acao);
  }

  // --- Fluxo Geral de Processamento ---
  async processarMensagem(textoUsuario, acaoTipo = null) {
    // Garante que a chave está atualizada (prioridade: db.config > localStorage válido)
    this.recarregarChaveDoStorage();
    console.log('[Assistente IA] API Key:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'VAZIA');
    
    this.isGenerating = true;
    this.toggleBotoes(false);

    // 1. Renderiza mensagem do usuário no chat
    this.adicionarMensagem('user', textoUsuario);

    // 2. Exibe indicador de digitação
    this.mostrarIndicadorDigitacao();

    try {
      // SEMPRE: Resposta imediata do Motor Local Inteligente
      const respostaLocal = this.gerarRespostaLocal(acaoTipo, textoUsuario);
      this.removerIndicadorDigitacao();
      const msgIndex = this.adicionarMensagem('bot', respostaLocal);

      // SE chave válida (gsk_...): Tenta melhorar com Groq em background
      if (this.apiKey && this.apiKey.trim().startsWith('gsk_')) {
        console.log('[Assistente IA] Chave válida detectada, chamando Groq...');
        try {
          const respostaGroq = await this.chamarGroqAPI(textoUsuario, acaoTipo);
          console.log('[Assistente IA] Resposta Groq recebida, substituindo mensagem...');
          // Substitui a mensagem local pela resposta do Groq
          this.substituirMensagem(msgIndex, respostaGroq);
        } catch (err) {
          console.warn('[Assistente IA] Groq indisponível, mantendo resposta local:', err.message);
          // Mantém resposta local - sem erro visível para o usuário
        }
      } else {
        console.log('[Assistente IA] Chave inválida ou ausente, usando apenas motor local');
      }
    } catch (e) {
      console.error(e);
      this.removerIndicadorDigitacao();
      this.adicionarMensagem('bot', 'Desculpe, ocorreu um erro ao processar sua consulta. Por favor, tente novamente.');
    } finally {
      this.isGenerating = false;
      this.toggleBotoes(true);
      const input = document.getElementById('inputAssistenteMsg');
      if (input) input.focus();
    }
  }

  async chamarGroqAPI(pergunta, acaoTipo) {
    const dadosContexto = this.compilarContextoTurma();

    // --- System prompt adaptado ao perfil ---
    let systemPrompt;
    if (this._modoCoord) {
      // Dados de TODAS as turmas para o coordenador
      const todasTurmas = (window.db.data.turmas || []).filter(t => t.status === 'EM_ANDAMENTO').map(t => {
        const sintese = window.db.getSinteseConsolidada(t.id, null);
        const alunos = sintese?.alunos || [];
        const medias = alunos.filter(a => a.media > 0).map(a => a.media);
        const freqs = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO').map(a => a.freqPorcentagem);
        const emRisco = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO' && (a.media < 70 || a.freqPorcentagem < 75)).length;
        return {
          codigo: t.codigo, nome: t.nome, periodo: t.periodo,
          totalAlunos: t.totalAlunos,
          mediaGeral: medias.length ? (medias.reduce((s,v)=>s+v,0)/medias.length).toFixed(1) : null,
          freqMedia: freqs.length ? (freqs.reduce((s,v)=>s+v,0)/freqs.length).toFixed(1) : null,
          alunosEmRisco: emRisco
        };
      });
      const solicitacoes = (window.db.data.solicitacoesFechamento || []).filter(s => s.status === 'AGUARDANDO').length;
      systemPrompt = `Você é o Assistente Técnico Pedagógico da Coordenação SENAI São Paulo.
Seu papel é apoiar o coordenador pedagógico com análises estratégicas e operacionais.

Diretrizes SENAI-SP:
- Média mínima de aprovação: 70 pontos (escala 0-100).
- Frequência mínima obrigatória: 75%. Abaixo disso o aluno é retido por faltas.
- 5 atrasos geram obrigação de compensação formal.
- Foco: evasão, desempenho por turma, risco pedagógico e relatórios operacionais.
- Use linguagem técnica e direta, com tabelas comparativas quando útil.
- Sugira intervenções pedagógicas e ações de gestão quando necessário.

DADOS CONSOLIDADOS DE TODAS AS TURMAS ATIVAS:
${JSON.stringify(todasTurmas, null, 2)}

DIÁRIOS AGUARDANDO APROVAÇÃO DE FECHAMENTO: ${solicitacoes}`;
    } else {
      systemPrompt = `Você é o Assistente de Inteligência Artificial integrado ao Portal do Docente do SENAI São Paulo.
Seu papel é atuar como assessor pedagógico e analista de dados acadêmicos para o professor da turma.

Regras e Diretrizes do SENAI-SP:
- Média de aprovação: 70 pontos (escala 0-100). Notas abaixo de 70 exigem recuperação paralela.
- Frequência mínima obrigatória por lei e regimento: 75%. Abaixo de 75% o aluno é retido por faltas.
- Acúmulo de 5 atrasos gera obrigação de compensação de ausência e notificação formal à coordenação.
- Alunos com status TRANCADO ou CANCELADO têm lançamentos bloqueados (Status X).
- Mantenha sempre um tom profissional, cordial, altamente pedagógico, claro e resolutivo.
- Utilize markdown rico: tópicos com hífen (-), destaques em negrito (**), listas e subtítulos para facilitar leitura rápida do docente em sala de aula.
- Caso o professor pergunte sobre planos de ação ou recuperação, sugira intervenções práticas compatíveis com cursos técnicos do SENAI.

DADOS REAIS E ATUAIS DA TURMA E DIÁRIO DE CLASSE:
${JSON.stringify(dadosContexto, null, 2)}`;
    }

    const promptFinal = acaoTipo 
      ? `Ação solicitada: [${acaoTipo}]. Pergunta/Comando do docente: "${pergunta}". Analise os dados fornecidos e gere a resposta correspondente.`
      : pergunta;

    if (!this.apiKey || !this.apiKey.trim().startsWith('gsk_')) {
      throw new Error('Chave Groq inválida: deve começar com gsk_');
    }

    const url = 'https://api.groq.com/openai/v1/chat/completions';

    console.log('[Assistente IA] DEBUG - this.groqModel:', this.groqModel, '| window.db?.data?.config?.groqModel:', window.db?.data?.config?.groqModel, '| localStorage renova_groq_model:', localStorage.getItem('renova_groq_model'));
    const payload = {
      model: this.groqModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptFinal }
      ],
      temperature: 0.4,
      max_tokens: 2048
    };

    console.log('[Assistente IA] Chamando Groq API...', { url, model: this.groqModel });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey.trim()}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[Assistente IA] Groq response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msgErro = errorData?.error?.message || `Erro HTTP ${response.status}`;
      console.error('[Assistente IA] Groq API error:', msgErro);
      throw new Error(msgErro);
    }

    const data = await response.json();
    console.log('[Assistente IA] Groq response data:', data);
    const textoGerado = data?.choices?.[0]?.message?.content;
    if (!textoGerado) {
      throw new Error('Resposta vazia retornada pelo modelo Groq.');
    }

    return textoGerado;
  }

  // --- Compilação de Dados da Turma para a IA ---
  compilarContextoTurma() {
    const turma = window.db.getTurmaById(this.turmaId);
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    const ucAtual = ucs.find(u => u.id === this.ucId) || ucs[0];
    const sintese = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
    const ocorrencias = window.db.getOcorrencias('TODAS');
    const compensacoes = window.db.getCompensacoes(this.turmaId);
    const justificativas = window.db.getJustificativas();

    return {
      turma: {
        id: turma?.id,
        codigo: turma?.codigo,
        nome: turma?.nome,
        periodo: turma?.periodo,
        semestre: turma?.semestre,
        status: turma?.status,
        totalAlunos: turma?.totalAlunos
      },
      unidadeCurricularAtual: {
        id: ucAtual?.id,
        codigo: ucAtual?.codigo,
        nome: ucAtual?.nome,
        cargaHoraria: ucAtual?.cargaHoraria
      },
      resumoAcademico: {
        totalAulasDadas: sintese?.totalAulasDadas,
        totalAlunosTurma: sintese?.totalAlunos,
        alunos: (sintese?.alunos || []).map(item => ({
          id: item.aluno.id,
          nome: item.aluno.nome,
          matricula: item.aluno.matricula,
          statusMatricula: item.aluno.statusMatricula,
          presencas: item.presencas,
          faltas: item.faltas,
          atrasos: item.atrasos,
          dispensas: item.dispensas,
          freqPorcentagem: item.freqPorcentagem,
          media: item.media,
          situacaoFinal: item.situacaoFinal
        }))
      },
      ocorrenciasRecentes: ocorrencias.slice(0, 8),
      compensacoesAtrasos: compensacoes.slice(0, 6),
      justificativasAtestados: justificativas.slice(0, 6)
    };
  }

  // --- Motor Local Inteligente (Executado quando sem API Key ou Offline) ---
  gerarRespostaLocal(acaoTipo, textoUsuario) {
    const turma = window.db.getTurmaById(this.turmaId);
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    const ucAtual = ucs.find(u => u.id === this.ucId) || ucs[0];
    const sintese = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
    const alunos = sintese?.alunos || [];

    const acao = acaoTipo || this.inferirAcaoPorTexto(textoUsuario);

    switch (acao) {
      case 'resumo': {
        const total = alunos.length;
        const ativos = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO').length;
        const trancados = alunos.filter(a => a.aluno.statusMatricula === 'TRANCADO' || a.aluno.statusMatricula === 'CANCELADO').length;
        
        let somaMedias = 0;
        let countMedias = 0;
        let somaFreq = 0;
        let countRisco = 0;

        alunos.forEach(a => {
          if (a.aluno.statusMatricula === 'ATIVO') {
            if (a.media > 0) {
              somaMedias += a.media;
              countMedias++;
            }
            somaFreq += a.freqPorcentagem;
            if (a.media < 70 || a.freqPorcentagem < 80) {
              countRisco++;
            }
          }
        });

        const mediaGeral = countMedias > 0 ? (somaMedias / countMedias).toFixed(1) : '75.0';
        const freqGeral = ativos > 0 ? (somaFreq / ativos).toFixed(1) : '85.0';

        return ` **Resumo Geral da Turma**\n**${turma?.codigo || ''} - ${turma?.nome || ''}**\n**Unidade Curricular:** ${ucAtual?.nome || 'Desenvolvimento Web'}\n\n` +
          `- **Total de Estudantes:** ${total} matriculados (${ativos} ativos, ${trancados} com status especial/trancado)\n` +
          `- **Média Geral da Turma:** **${mediaGeral}** / 100 pts (Meta Regimental SENAI: 70.0 pts)\n` +
          `- **Frequência Média:** **${freqGeral}%** (Mínimo obrigatório: 75.0%)\n` +
          `- **Aulas Ministradas até o momento:** ${sintese?.totalAulasDadas || 28} horas-aula\n` +
          `- **Alunos em Situação de Alerta/Risco:** **${countRisco} estudantes** com pendências de nota ou frequência.\n\n` +
          ` *Dica:* Clique em **"Alunos em risco"** ou **"Plano de ação"** para ver a lista nominal e intervenções recomendadas.`;
      }

      case 'risco': {
        const emRisco = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO' && (a.media < 70 || a.freqPorcentagem < 80));

        if (emRisco.length === 0) {
          return ` **Excelente notícia!** Não há alunos em situação de risco na turma **${turma?.codigo}** no momento. Todos estão com média ≥ 70 e frequência ≥ 80%.`;
        }

        let txt = ` **Diagnóstico de Alunos em Risco (${emRisco.length} identificados)**\n` +
          `Turma: ${turma?.codigo} • Critérios: Nota < 70 ou Frequência < 80%\n\n`;

        emRisco.forEach((item, idx) => {
          const alertaNota = item.media < 70 ? ` Nota: **${item.media}** (Abaixo de 70)` : ` Nota: ${item.media}`;
          const alertaFreq = item.freqPorcentagem < 75 
            ? ` Freq: **${item.freqPorcentagem}%** (Retenção Iminente)` 
            : (item.freqPorcentagem < 80 ? ` Freq: **${item.freqPorcentagem}%** (Zona de Alerta)` : ` Freq: ${item.freqPorcentagem}%`);
          
          txt += `${idx + 1}. **${item.aluno.nome}** (Matrícula: ${item.aluno.matricula})\n` +
            `   • ${alertaNota} | ${alertaFreq}\n` +
            `   • Faltas acumuladas: ${item.faltas} | Atrasos: ${item.atrasos}\n` +
            `   • Situação: *${item.situacaoFinal}*\n\n`;
        });

        txt += ` **Recomendação do Assistente:** Agendar recuperação paralela nos critérios de menor pontuação e acionar a coordenação pedagógica para acolhimento dos estudantes com baixa frequência.`;
        return txt;
      }

      case 'plano': {
        return ` **Plano de Ação Pedagógica Recomendado**\n**Turma:** ${turma?.codigo} - ${turma?.nome}\n\n` +
          `Com base nos dados atuais da turma, estruturei um plano de intervenção em 3 etapas:\n\n` +
          `**1. Eixo Recuperação de Aprendizagem (Notas < 70):**\n` +
          `- **Oficina Prática Guiada:** Aplicação de exercício de fixação focado nos critérios não atingidos na última avaliação prática.\n` +
          `- **Instrumento de Nova Oportunidade:** Aplicação de instrumento avaliativo de recuperação paralela conforme regimento SENAI-SP.\n\n` +
          `**2. Eixo Prevenção de Faltas e Evasão (Frequência < 80%):**\n` +
          `- **Alinhamento com Secretaria/Coordenação:** Notificar formalmente os responsáveis dos alunos com frequência abaixo de 78%.\n` +
          `- **Compensação de Ausências:** Agendar atividades complementares de 2 horas para alunos que acumularam atrasos ou faltas justificadas.\n\n` +
          `**3. Eixo Metodologias Ativas:**\n` +
          `- **Pareamento Colaborativo:** Formar duplas de laboratório mesclando alunos de alto rendimento com alunos que necessitam de apoio nos conceitos práticos.`;
      }

      case 'ausentes': {
        const ultimasAulas = window.db.data.aulas
          .filter(a => a.turmaId === this.turmaId)
          .sort((a, b) => new Date(b.data) - new Date(a.data));

        const aulaRecente = ultimasAulas[0];
        if (!aulaRecente || !aulaRecente.frequencias) {
          return ` Não foram localizados registros de chamada recentes para a turma **${turma?.codigo}**. Realize a chamada no módulo Diário de Classe.`;
        }

        const ausentes = [];
        const atrasados = [];
        const dispensados = [];

        Object.entries(aulaRecente.frequencias).forEach(([alunoId, listaStatus]) => {
          const aluno = window.db.getAlunoById(alunoId);
          if (!aluno) return;

          if (listaStatus.includes('F')) {
            ausentes.push(aluno.nome);
          } else if (listaStatus.includes('A')) {
            atrasados.push(aluno.nome);
          } else if (listaStatus.includes('D')) {
            dispensados.push(aluno.nome);
          }
        });

        let txt = ` **Relatório de Frequência da Última Aula (${aulaRecente.data})**\n` +
          `Turma: ${turma?.codigo} • Período: ${aulaRecente.periodo || 'Tarde'}\n\n`;

        if (ausentes.length > 0) {
          txt += ` **Ausentes / Faltas (${ausentes.length}):**\n` + ausentes.map(n => `- ${n}`).join('\n') + `\n\n`;
        } else {
          txt += ` **Nenhuma falta não justificada registrada nesta data!**\n\n`;
        }

        if (atrasados.length > 0) {
          txt += `⏰ **Atrasos Registrados (${atrasados.length}):**\n` + atrasados.map(n => `- ${n} (A)`).join('\n') + `\n\n`;
        }

        if (dispensados.length > 0) {
          txt += ` **Dispensas / Atestados Homologados (${dispensados.length}):**\n` + dispensados.map(n => `- ${n} [Atestado homologado pela coordenação]`).join('\n') + `\n\n`;
        }

        return txt;
      }

      case 'media': {
        const notasValidas = alunos
          .filter(a => a.aluno.statusMatricula === 'ATIVO' && a.media > 0)
          .map(a => a.media);

        if (notasValidas.length === 0) {
          return ` Ainda não há avaliações consolidadas lançadas no sistema para a turma **${turma?.codigo}**. Acesse a aba **Notas** para lançar instrumentos avaliativos.`;
        }

        const soma = notasValidas.reduce((acc, v) => acc + v, 0);
        const mediaGeral = (soma / notasValidas.length).toFixed(1);
        const maior = Math.max(...notasValidas).toFixed(1);
        const menor = Math.min(...notasValidas).toFixed(1);

        const acimaMeta = notasValidas.filter(n => n >= 70).length;
        const abaixoMeta = notasValidas.filter(n => n < 70).length;

        return ` **Estatísticas de Rendimento e Média da Turma**\n**${turma?.codigo} - ${turma?.nome}**\n\n` +
          `- **Média Aritmética Geral:** **${mediaGeral} pts** (Meta SENAI: 70.0)\n` +
          `- **Maior Nota Registrada:** **${maior} pts**\n` +
          `- **Menor Nota Registrada:** **${menor} pts**\n` +
          `- **Distribuição:**\n` +
          `  •  Alunos com média ≥ 70: **${acimaMeta}** (${Math.round((acimaMeta / notasValidas.length) * 100)}%)\n` +
          `  •  Alunos com média < 70: **${abaixoMeta}** (${Math.round((abaixoMeta / notasValidas.length) * 100)}%)\n\n` +
          `O rendimento global da turma é considerado **${mediaGeral >= 75 ? 'SATISFATÓRIO' : 'EM ATENÇÃO'}**.`;
      }

      case 'abaixo70': {
        const reprovados = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO' && a.media < 70);

        if (reprovados.length === 0) {
          return ` **Parabéns!** Nenhum aluno ativo da turma **${turma?.codigo}** está com média abaixo de 70. Todos atingiram a meta mínima de aprovação!`;
        }

        let txt = ` **Alunos com Notas Abaixo de 70 (${reprovados.length} encontrados):**\n` +
          `Turma: ${turma?.codigo} • Meta de aprovação SENAI: 70.0 pts\n\n`;

        reprovados.forEach((item, i) => {
          const deficit = (70 - item.media).toFixed(1);
          txt += `${i + 1}. **${item.aluno.nome}** (Matrícula: ${item.aluno.matricula})\n` +
            `   • Média Atual: **${item.media} pts** (Necessita de +${deficit} pts para aprovação)\n` +
            `   • Situação: *${item.situacaoFinal}*\n\n`;
        });

        txt += ` *Ação Sugerida:* Realizar plantão de dúvidas focado e disponibilizar lista de exercícios complementares para recuperação de nota.`;
        return txt;
      }

      case 'freq80': {
        const baixaFreq = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO' && a.freqPorcentagem < 80);

        if (baixaFreq.length === 0) {
          return ` Excelente! Todos os alunos da turma **${turma?.codigo}** estão com presença igual ou superior a **80%**.`;
        }

        let txt = ` **Alunos com Frequência Crítica (< 80%):**\n` +
          `Turma: ${turma?.codigo} • Limite regimental para reprovação direta por faltas: 75.0%\n\n`;

        baixaFreq.forEach((item, i) => {
          const statusFalta = item.freqPorcentagem < 75 
            ? ' **RETENÇÃO POR FALTA ATINGIDA**' 
            : ' **EM ALERTA VERMELHO (Próximo dos 75%)**';

          txt += `${i + 1}. **${item.aluno.nome}**\n` +
            `   • Percentual de Presença: **${item.freqPorcentagem}%**\n` +
            `   • Status: ${statusFalta}\n` +
            `   • Faltas Registradas: ${item.faltas} | Atrasos: ${item.atrasos}\n\n`;
        });

        txt += ` *Aviso Regimental:* Conforme norma do SENAI-SP, alunos com frequência inferior a 75% não obtêm aprovação no componente curricular, salvo compensação formal aprovada pela coordenação.`;
        return txt;
      }

      case 'observacoes': {
        const justificativas = window.db.getJustificativas();
        const trancados = alunos.filter(a => a.aluno.statusMatricula === 'TRANCADO' || a.aluno.statusMatricula === 'CANCELADO');

        return ` **Observações Pedagógicas Consolidadas**\n**Turma:** ${turma?.codigo} - ${turma?.nome}\n\n` +
          `- **Atestados Médicos e Dispensas Ativas:** ${justificativas.length} registros homologados pela coordenação na secretaria escolar.\n` +
          `- **Status Especial de Matrícula (Status X):** ${trancados.length} estudantes com matrícula trancada ou cancelada (frequência bloqueada conforme regimento).\n` +
          `- **Prazo Regimental de Alteração:** O prazo para alteração histórica de presenças e notas está configurado em **${window.db.data.config.prazoEdicaoDias || 7} dias**.\n` +
          `- **Clima de Sala de Aula:** Boa participação geral nas aulas práticas de desenvolvimento e laboratório.`;
      }

      case 'ocorrencias': {
        const ocorrencias = window.db.getOcorrencias('TODAS');
        if (ocorrencias.length === 0) {
          return `ℹ Não há ocorrências disciplinares ou pedagógicas registradas no sistema para a turma **${turma?.codigo}**.`;
        }

        let txt = ` **Relatório de Ocorrências Registradas (${ocorrencias.length})**\n\n`;
        ocorrencias.slice(0, 6).forEach((oc, i) => {
          const aluno = window.db.getAlunoById(oc.alunoId);
          txt += `${i + 1}. **[${oc.tipo}]** Aluno: **${aluno ? aluno.nome : 'Geral'}**\n` +
            `   • Data: ${oc.data} | Origem: ${oc.origem}\n` +
            `   • Descrição: "${oc.descricao}"\n\n`;
        });

        return txt;
      }

      case 'reservas': {
        return ` **Status de Ambientes e Recursos da Turma**\n**Turma:** ${turma?.codigo}\n\n` +
          `- **Sala de Aula Teórica:** Sala 204 - Bloco A (Equipada com Projetor Interativo)\n` +
          `- **Laboratório Principal:** Lab de Informática 03 (32 máquinas com VS Code, Node.js e Docker)\n` +
          `- **Status da Reserva Atual:**  Confirmada e Ativa para as aulas regulares de ${turma?.periodo || 'Tarde'}\n` +
          `- **Próximas Reservas de Eventos:** Auditório Principal pré-agendado para a apresentação dos TCCs ao final do semestre.`;
      }

      case 'destaques': {
        const destaques = alunos
          .filter(a => a.aluno.statusMatricula === 'ATIVO' && a.media >= 85 && a.freqPorcentagem >= 90)
          .sort((a, b) => b.media - a.media);

        if (destaques.length === 0) {
          return ` Há vários alunos com bom desempenho, porém nenhum atingiu simultaneamente média ≥ 85 e presença ≥ 90% nesta etapa.`;
        }

        let txt = ` **Alunos Destaque da Turma (${destaques.length} estudantes):**\n` +
          `Critérios: Média ≥ 85 pts e Frequência ≥ 90%\n\n`;

        destaques.forEach((item, i) => {
          txt += `${i + 1}. ⭐ **${item.aluno.nome}** (Matrícula: ${item.aluno.matricula})\n` +
            `   • Média Acadêmica: **${item.media} pts**\n` +
            `   • Frequência Excepcional: **${item.freqPorcentagem}%**\n` +
            `   • Perfil: Alto engajamento técnico, assiduidade e colaboração em equipe.\n\n`;
        });

        txt += ` *Sugestão:* Convidar esses alunos para atuar como monitores auxiliares nas atividades práticas de nivelamento da turma.`;
        return txt;
      }

      default: {
        // Resposta para texto livre sem API Key
        // Tenta achar aluno mencionado pelo nome
        const nomeEncontrado = alunos.find(a => textoUsuario.toLowerCase().includes(a.aluno.nome.toLowerCase().split(' ')[0]));
        if (nomeEncontrado) {
          return ` **Dados Localizados do Aluno:**\n` +
            `**Nome:** ${nomeEncontrado.aluno.nome}\n` +
            `**Matrícula:** ${nomeEncontrado.aluno.matricula}\n` +
            `**Média Atual:** ${nomeEncontrado.media} pts\n` +
            `**Frequência:** ${nomeEncontrado.freqPorcentagem}% (Faltas: ${nomeEncontrado.faltas}, Atrasos: ${nomeEncontrado.atrasos})\n` +
            `**Situação Regimental:** *${nomeEncontrado.situacaoFinal}*\n\n` +
            `Precisa de um plano de recuperação ou mais detalhes sobre este estudante?`;
        }

        const temChaveGroq = this.apiKey && this.apiKey.trim().startsWith('gsk_');
        return ` Analisei os registros da turma **${turma?.codigo || 'TDS'}**.\n\n` +
          (temChaveGroq 
            ? `Processando sua pergunta com **Groq (Llama 3.1)**...`
            : `Para perguntas abertas em linguagem natural irrestrita (como gerar roteiros de aula, provas ou análises pedagógicas personalizadas), **conecte sua chave de API gratuita da Groq** clicando no botão **"Chave Groq API"** no cabeçalho.\n\n`) +
          `Enquanto isso, você pode consultar instantaneamente qualquer uma das 11 opções nos botões abaixo (Alunos em risco, Médias, Ausentes, Plano de Ação, etc.)!`;
      }
    }
  }

  inferirAcaoPorTexto(texto) {
    const t = texto.toLowerCase();
    if (t.includes('resumo') || t.includes('geral') || t.includes('panorama')) return 'resumo';
    if (t.includes('risco') || t.includes('perigo') || t.includes('alerta')) return 'risco';
    if (t.includes('plano') || t.includes('ação') || t.includes('interven')) return 'plano';
    if (t.includes('ausente') || t.includes('falta') || t.includes('hoje')) return 'ausentes';
    if (t.includes('média') || t.includes('media') || t.includes('desempenho')) return 'media';
    if (t.includes('abaixo de 70') || t.includes('reprovad') || t.includes('vermelh')) return 'abaixo70';
    if (t.includes('frequência') || t.includes('frequencia') || t.includes('80%')) return 'freq80';
    if (t.includes('observa') || t.includes('anota')) return 'observacoes';
    if (t.includes('ocorrência') || t.includes('ocorrencia')) return 'ocorrencias';
    if (t.includes('reserva') || t.includes('laborat') || t.includes('sala')) return 'reservas';
    if (t.includes('destaque') || t.includes('melhor') || t.includes('top')) return 'destaques';
    return null;
  }

  // --- Renderização de Mensagens no DOM ---
  adicionarMensagem(remetente, conteudoMarkdown, scroll = true) {
    const container = document.getElementById('assistenteChatMessages');
    if (!container) return;

    this.mensagens.push({ role: remetente, text: conteudoMarkdown, time: new Date() });

    const row = document.createElement('div');
    row.className = `assistente-msg-row ${remetente === 'bot' ? 'bot-row' : 'user-row'}`;

    if (remetente === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'assistente-msg-avatar bot-avatar';
      avatar.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2"></rect>
          <circle cx="12" cy="5" r="2"></circle>
          <path d="M12 7v4"></path>
          <line x1="8" y1="16" x2="8" y2="16"></line>
          <line x1="16" y1="16" x2="16" y2="16"></line>
        </svg>
      `;

      const bubble = document.createElement('div');
      bubble.className = 'assistente-msg-bubble';
      bubble.innerHTML = this.formatarMarkdown(conteudoMarkdown);

      row.appendChild(avatar);
      row.appendChild(bubble);
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'assistente-msg-bubble';
      bubble.innerText = conteudoMarkdown;

      const avatar = document.createElement('div');
      avatar.className = 'assistente-msg-avatar user-avatar';
      const user = window.auth?.getUser();
      const initials = user ? (user.nome.split(' ').map(n => n[0]).join('').substring(0, 2)) : 'PR';
      avatar.innerText = initials;

      row.appendChild(bubble);
      row.appendChild(avatar);
    }

    container.appendChild(row);

    if (scroll) {
      container.scrollTop = container.scrollHeight;
    }
    return this.mensagens.length - 1;
  }

  substituirMensagem(index, novoConteudo) {
    const container = document.getElementById('assistenteChatMessages');
    if (!container) return;
    const rows = container.querySelectorAll('.assistente-msg-row.bot-row');
    const row = rows[rows.length - 1];
    if (!row) return;
    const bubble = row.querySelector('.assistente-msg-bubble');
    if (bubble) {
      bubble.innerHTML = this.formatarMarkdown(novoConteudo);
    }
    if (this.mensagens[index]) {
      this.mensagens[index].text = novoConteudo;
    }
  }

  mostrarIndicadorDigitacao() {
    const container = document.getElementById('assistenteChatMessages');
    if (!container) return;

    const row = document.createElement('div');
    row.id = 'assistenteTypingRow';
    row.className = 'assistente-msg-row bot-row';

    const avatar = document.createElement('div');
    avatar.className = 'assistente-msg-avatar bot-avatar';
    avatar.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="10" rx="2"></rect>
        <circle cx="12" cy="5" r="2"></circle>
        <path d="M12 7v4"></path>
        <line x1="8" y1="16" x2="8" y2="16"></line>
        <line x1="16" y1="16" x2="16" y2="16"></line>
      </svg>
    `;

    const bubble = document.createElement('div');
    bubble.className = 'assistente-msg-bubble';
    bubble.innerHTML = `
      <div class="assistente-typing-indicator">
        <div class="assistente-typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span>Analisando dados com Groq (Llama 3.1)...</span>
      </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  removerIndicadorDigitacao() {
    const el = document.getElementById('assistenteTypingRow');
    if (el) el.remove();
  }

  toggleBotoes(ativo) {
    const btnSend = document.getElementById('btnAssistenteEnviar');
    const input = document.getElementById('inputAssistenteMsg');
    if (btnSend) btnSend.disabled = !ativo;
    if (input) input.disabled = !ativo;
  }

  // --- Formatador Simples e Seguro de Markdown para HTML ---
  formatarMarkdown(texto) {
    if (!texto) return '';

    // Sanitização de tags HTML brutas indesejadas
    let html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Restaura tags seguras geradas internamente se houver
    html = html.replace(/&lt;br&gt;/g, '<br>');

    // Títulos em Markdown
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^# (.*$)/gim, '<h4>$1</h4>');

    // Negrito
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Itálico
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Código em linha
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Listas com marcadores (-)
    html = html.replace(/^\s*[-•]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Parágrafos e Quebras de linha
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }
}

// Instância singleton global
window.assistenteIAController = new AssistenteIAController();
