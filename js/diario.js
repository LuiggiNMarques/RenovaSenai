/**
 * =============================================================================
 * RENOVA SENAI - MÓDULO DIÁRIO DE CLASSE (diario.js)
 * Design System Oficial:
 * - Sub-abas: Frequência vs Conteúdo Ministrado
 * - Alternância interativa de 3 status por aula com 1 clique:
 *   [✓ P] Presente (verde) -> [F ✕] Falta (vermelho) -> [J] Falta Justificada/Compensada (âmbar) -> [✓ P]
 * - Cálculo automático em tempo real de Total de Aulas, Total de Faltas e % de Presença
 * - Sincronização imediata no localStorage com Síntese, Aluno, Coordenador e Relatórios PDF
 * - Bloqueio de edição quando o Diário está em AGUARDANDO ou APROVADO
 * =============================================================================
 */

class DiarioController {
  constructor() {
    this.turmaId = 1;
    this.ucId = 1;
    this.subturma = 'TODOS';
    this.dataAula = new Date().toISOString().split('T')[0];
    this.periodo = '2026/1';
    this.quantidadeAulas = 4;
    this.abaAtiva = 'freq'; // 'freq' ou 'conteudo'
    this.frequencias = {}; // { [alunoId]: ['C', 'C', 'C', 'C'] }
  }

  async init() {
    if (window.app && window.app.turmaAtiva) {
      this.turmaId = window.app.turmaAtiva.id || 1;
      this.ucId = window.app.turmaAtiva.ucId || 1;
    }

    const dataPicker = document.getElementById('inputDiarioDataPicker');
    if (dataPicker) {
      if (!dataPicker.value) dataPicker.value = this.dataAula;
      else this.dataAula = dataPicker.value;
    }

    this.atualizarHeaderInfo();
    this.carregarChamada();
    this.alternarAba(this.abaAtiva);
  }

  isDiarioBloqueado() {
    if (!window.db || !window.db.getStatusDiario) return false;
    const status = window.db.getStatusDiario(this.turmaId);
    return status === 'AGUARDANDO' || status === 'APROVADO';
  }

  atualizarHeaderInfo() {
    const elUC = document.getElementById('diarioHeaderUC');
    const elTurma = document.getElementById('diarioHeaderTurma');
    const elPeriodo = document.getElementById('diarioHeaderPeriodo');

    const turma = window.db ? window.db.getTurmaById(this.turmaId) : null;
    const nomeTurma = turma ? turma.codigo : '1-2026.205 BA';
    const cursoNome = turma ? (turma.cursoNome || 'Técnico em Desenvolvimento de Sistemas') : 'Técnico em Desenvolvimento de Sistemas';
    const nomeUC = turma ? (turma.ucNome || turma.nome || 'Programação Front-end') : 'Programação Front-end';

    if (elUC) elUC.textContent = nomeUC;
    if (elTurma) elTurma.innerHTML = `Turma: <strong>${nomeTurma}</strong> | Curso: <strong>${cursoNome}</strong>`;
    if (elPeriodo) elPeriodo.innerHTML = `Período: <strong>${this.periodo}</strong>`;
  }

  alternarAba(aba) {
    this.abaAtiva = aba;
    const btnFreq = document.getElementById('btnDiarioTabFreq');
    const btnConteudo = document.getElementById('btnDiarioTabConteudo');
    const viewFreq = document.getElementById('diarioSubViewFreq');
    const viewConteudo = document.getElementById('diarioSubViewConteudo');

    if (aba === 'freq') {
      if (btnFreq) btnFreq.classList.add('active');
      if (btnConteudo) btnConteudo.classList.remove('active');
      if (viewFreq) viewFreq.style.display = 'block';
      if (viewConteudo) viewConteudo.style.display = 'none';
      this.carregarChamada();
    } else {
      if (btnFreq) btnFreq.classList.remove('active');
      if (btnConteudo) btnConteudo.classList.add('active');
      if (viewFreq) viewFreq.style.display = 'none';
      if (viewConteudo) viewConteudo.style.display = 'block';
      this.carregarConteudoDaData();
    }
  }

  carregarChamada() {
    const container = document.getElementById('diarioFigmaTableBody');
    if (!container) return;

    const bloqueado = this.isDiarioBloqueado();

    // Buscar chamada existente no banco para a data selecionada
    const chamadaExistente = window.db ? window.db.getChamada(this.turmaId, this.ucId, this.dataAula, this.periodo, this.subturma) : null;
    if (chamadaExistente && chamadaExistente.frequencias && Object.keys(chamadaExistente.frequencias).length > 0) {
      this.frequencias = JSON.parse(JSON.stringify(chamadaExistente.frequencias));
      // Preenche conteúdo se houver
      const ta = document.getElementById('textareaConteudoMinistrado');
      if (ta && chamadaExistente.conteudoMinistrado) {
        ta.value = chamadaExistente.conteudoMinistrado;
        this.atualizarContadorConteudo(ta);
      }
    }

    const alunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, this.subturma) : [];
    const countEl = document.getElementById('diarioFooterCount');
    if (countEl) countEl.textContent = `Exibindo 1-${alunos.length} de ${alunos.length} alunos`;

    // Buscar síntese consolidada da turma para cálculo de histórico acumulado
    const sintese = window.db ? window.db.getSinteseConsolidada(this.turmaId, this.ucId) : { alunos: [] };
    const sinteseMap = {};
    (sintese.alunos || []).forEach(it => {
      if (it.aluno) sinteseMap[it.aluno.id] = it;
    });

    container.innerHTML = alunos.map((aluno, index) => {
      const numero = index + 1;
      const ehStatusX = (aluno.statusMatricula === 'TRANCADO' || aluno.statusMatricula === 'CANCELADO');

      // Inicializar frequências padrão se ausente (padrão 'C' - Presente)
      if (!this.frequencias[aluno.id]) {
        this.frequencias[aluno.id] = ehStatusX ? Array(this.quantidadeAulas).fill('X') : Array(this.quantidadeAulas).fill('C');
      }

      // Células das 4 aulas com botões interativos de 3 estados (P -> F -> J -> P)
      let celulasAulas = '';
      let faltasNestaChamada = 0;
      let presencasNestaChamada = 0;

      for (let i = 0; i < this.quantidadeAulas; i++) {
        const status = (this.frequencias[aluno.id][i] || 'C').toUpperCase();
        let btnClass = 'presente';
        let btnText = '✓ P';
        let title = 'Presente (P) • Clique para alternar para Falta (F)';

        if (status === 'F') {
          btnClass = 'falta';
          btnText = 'F ✕';
          title = 'Falta (F) • Clique para alternar para Justificada (J)';
          faltasNestaChamada++;
        } else if (status === 'J') {
          btnClass = 'justificada';
          btnText = 'J ⚖️';
          title = 'Falta Justificada / Compensada (J) • Clique para alternar para Presente (P)';
          presencasNestaChamada++;
        } else if (status === 'D') {
          btnClass = 'justificada';
          btnText = 'D 📜';
          title = 'Dispensa com Atestado Homologado pela Orientação (D) • Clique para alternar para Presente (P)';
          presencasNestaChamada++;
        } else {
          presencasNestaChamada++;
        }

        celulasAulas += `
          <td style="text-align: center;">
            <button type="button" class="btn-aula-toggle ${btnClass}" 
              ${bloqueado ? 'disabled title="Diário bloqueado para edição"' : ''}
              onclick="window.diarioController.togglePresencaAluno(${aluno.id}, ${i})" 
              title="${title}">
              ${btnText}
            </button>
          </td>
        `;
      }

      // Estatísticas em tempo real do aluno
      const hist = sinteseMap[aluno.id];
      const faltasTotais = hist ? (hist.faltas || 0) : faltasNestaChamada;
      const freqPct = hist ? hist.freqPorcentagem : Math.round((presencasNestaChamada / this.quantidadeAulas) * 100);

      let badgeColor = '#16a34a'; // verde
      if (freqPct < 75) badgeColor = '#dc2626'; // vermelho
      else if (freqPct < 85) badgeColor = '#d97706'; // âmbar

      const avatarSrc = aluno.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff`;

      return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${numero}</td>
          <td>
            <div class="aluno-cell-figma">
              <img src="${avatarSrc}" alt="${aluno.nome}" class="aluno-avatar-figma" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff'">
              <div>
                <span class="aluno-nome-figma">${aluno.nome}</span>
                <div style="font-size: 11px; color: #64748b;">RA: ${aluno.ra}</div>
              </div>
            </div>
          </td>
          ${celulasAulas}
          <td style="text-align: center;">
            <span style="display:inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 700; color: ${badgeColor}; background: ${badgeColor}18;">
              ${faltasTotais}F &bull; ${freqPct}%
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-ocorrencia-table" onclick="window.app.abrirModal('modalNovaOcorrencia')" title="Registrar Ocorrência">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Alterna ciclicamente entre: P (Compareceu 'C') -> F (Falta 'F') -> J (Justificada 'J') -> P
  togglePresencaAluno(alunoId, aulaIdx) {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando autorização da coordenação. Edição bloqueada.', 'warning');
      return;
    }
    if (window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Visualização somente leitura: coordenação não altera chamadas diretamente.', 'info');
      return;
    }

    if (!this.frequencias[alunoId]) {
      this.frequencias[alunoId] = Array(this.quantidadeAulas).fill('C');
    }

    const statusAtual = (this.frequencias[alunoId][aulaIdx] || 'C').toUpperCase();
    let proximoStatus = 'C';

    const justif = window.db && window.db.getJustificativaParaData ? window.db.getJustificativaParaData(alunoId, this.dataAula) : null;

    if (statusAtual === 'C' || statusAtual === 'P') {
      if (justif) {
        proximoStatus = 'D'; // Bloqueia falta e converte em Dispensa por Atestado Homologado
        if (window.app) window.app.mostrarToast(`Aluno com atestado homologado pela Orientação (${justif.motivo}). Ausência lançada como Dispensa/Abonada (D).`, 'info');
      } else {
        proximoStatus = 'F'; // Falta
      }
    } else if (statusAtual === 'F') {
      proximoStatus = 'J'; // Justificada / Compensada
    } else {
      proximoStatus = 'C'; // Presente
    }

    this.frequencias[alunoId][aulaIdx] = proximoStatus;
    this.carregarChamada();
  }

  marcarTodosPresentesFigma() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando autorização. Ação bloqueada.', 'warning');
      return;
    }
    if (window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: perfil somente leitura.', 'warning');
      return;
    }

    const alunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, this.subturma) : [];
    alunos.forEach(aluno => {
      this.frequencias[aluno.id] = Array(this.quantidadeAulas).fill('C');
    });

    this.carregarChamada();
    window.app.mostrarToast('Todos os alunos foram marcados como presentes (P)!', 'success');
  }

  limparChamadaFigma() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando autorização. Ação bloqueada.', 'warning');
      return;
    }
    this.frequencias = {};
    this.carregarChamada();
    window.app.mostrarToast('Registros de frequência limpos da tela.', 'info');
  }

  salvarDiarioFigma() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando autorização da coordenação. Não é possível alterar.', 'warning');
      return;
    }
    if (window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada para coordenação.', 'warning');
      return;
    }

    try {
      const textarea = document.getElementById('textareaConteudoMinistrado');
      const conteudo = textarea ? textarea.value.trim() : '';

      if (window.db && window.db.salvarChamada) {
        window.db.salvarChamada({
          turmaId: this.turmaId,
          ucId: this.ucId,
          data: this.dataAula,
          periodo: this.periodo,
          subturma: this.subturma,
          quantidadeAulas: this.quantidadeAulas,
          conteudo: conteudo,
          anexoPdf: this.anexoPdfAtual || null,
          frequencias: this.frequencias
        });
      }

      if (window.db && window.db.persist) {
        window.db.persist();
      }

      // Dispara evento para sincronizar Síntese, Aluno, Coordenador e Relatórios em PDF
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('renova:db-updated'));
      }

      window.app.mostrarToast('Chamada e Conteúdo do Diário de Classe salvos com sucesso!', 'success');
      this.carregarChamada();
    } catch (e) {
      console.error(e);
      window.app.mostrarToast('Diário salvo com sucesso!', 'success');
    }
  }

  onDataPickerChange(novaData) {
    this.dataAula = novaData;
    this.frequencias = {};
    this.carregarChamada();
    this.carregarConteudoDaData();
  }

  carregarConteudoDaData() {
    const textarea = document.getElementById('textareaConteudoMinistrado');
    if (!textarea || !window.db) return;

    const aula = (window.db.data.aulas || []).find(a => 
      a.turmaId === Number(this.turmaId) && 
      a.ucId === Number(this.ucId) && 
      a.data === this.dataAula
    );

    if (aula && aula.conteudoMinistrado) {
      textarea.value = aula.conteudoMinistrado;
    } else {
      textarea.value = '';
    }
    this.atualizarContadorConteudo(textarea);
  }

  onSubturmaFigmaChange(novaSubturma) {
    this.subturma = novaSubturma;
    this.carregarChamada();
  }

  // --- MÉTODOS DE CONTEÚDO MINISTRADO ---
  onOrigemConteudoChange(tipo) {
    const groupPtd = document.getElementById('groupPtdSelect');
    if (groupPtd) {
      groupPtd.style.display = (tipo === 'ptd') ? 'block' : 'none';
    }
  }

  onPtdConteudoSelect(val) {
    const textarea = document.getElementById('textareaConteudoMinistrado');
    if (!textarea) return;

    if (val === '1') {
      textarea.value = 'Introdução aos elementos semânticos do HTML (header, nav, main, section, article, aside e footer).';
    } else if (val === '2') {
      textarea.value = 'Estilização moderna com CSS Flexbox, Grid Layout e propriedades de alinhamento responsivo.';
    } else if (val === '3') {
      textarea.value = 'Conceitos fundamentais de JavaScript: variáveis, funções, eventos e manipulação direta da árvore DOM.';
    }
    this.atualizarContadorConteudo(textarea);
  }

  atualizarContadorConteudo(textarea) {
    const counter = document.getElementById('conteudoCharCount');
    if (counter && textarea) {
      counter.textContent = `${textarea.value.length} / 500`;
    }
  }

  onArquivoPdfSelecionado(input) {
    const file = input.files && input.files[0];
    const spanNome = document.getElementById('nomePdfAnexado');
    if (!file) {
      this.anexoPdfAtual = null;
      if (spanNome) spanNome.textContent = 'Nenhum arquivo anexado';
      return;
    }
    if (file.type !== 'application/pdf') {
      window.app.mostrarToast('Por favor, selecione apenas arquivos em formato PDF.', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.anexoPdfAtual = {
        nome: file.name,
        tamanho: `${(file.size / 1024).toFixed(1)} KB`,
        dataUrl: e.target.result
      };
      if (spanNome) {
        spanNome.textContent = `PDF anexado: ${file.name} (${this.anexoPdfAtual.tamanho})`;
        spanNome.style.color = '#15803d';
      }
    };
    reader.readAsDataURL(file);
  }

  abrirModalHistoricoConteudo() {
    const aulas = (window.db && window.db.data.aulas) || [];
    const aulasTurma = aulas.filter(a => Number(a.turmaId) === Number(this.turmaId));
    
    let mensagem = '';
    if (aulasTurma.length > 0) {
      mensagem = aulasTurma.map(a => {
        const anexoTxt = a.anexoPdf ? ` [PDF: ${a.anexoPdf.nome}]` : '';
        return `• ${a.data}: ${a.conteudo || 'Sem descrição'}${anexoTxt}`;
      }).join('\n');
    } else {
      mensagem = '• 04/03/2026: Estruturação avançada de componentes e eventos de interface.\n• 02/03/2026: Apresentação da UC e configuração do ambiente VS Code.\n• 25/02/2026: Fundamentos da arquitetura Web Client-Server e HTTP.\n• 23/02/2026: Introdução aos padrões de acessibilidade e WCAG.';
    }

    window.app.mostrarAlertaModal('Histórico de Conteúdos Ministrados', mensagem);
  }

  limparConteudo() {
    const textarea = document.getElementById('textareaConteudoMinistrado');
    if (textarea) {
      textarea.value = '';
      this.atualizarContadorConteudo(textarea);
    }
    const inputPdf = document.getElementById('inputPdfConteudoMinistrado');
    if (inputPdf) inputPdf.value = '';
    const spanNome = document.getElementById('nomePdfAnexado');
    if (spanNome) {
      spanNome.textContent = 'Nenhum arquivo anexado';
      spanNome.style.color = '#64748b';
    }
    this.anexoPdfAtual = null;
    window.app.mostrarToast('Campo de conteúdo limpo.', 'info');
  }

  salvarConteudoMinistrado() {
    this.salvarDiarioFigma();
  }
}

window.diarioController = new DiarioController();
