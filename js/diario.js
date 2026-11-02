/**
 * =============================================================================
 * RENOVA SENAI - MÓDULO DIÁRIO DE CLASSE (diario.js)
 * Chamada com Week Picker visual (Seg-Sex), Calendário Interativo para dias anteriores
 * e opções de presença: C (Presente), F (Falta), A (Atraso).
 * =============================================================================
 */

class DiarioController {
  constructor() {
    this.turmaId = 1;
    this.ucId = 1;
    this.subturma = 'TODOS';
    this.dataAula = this.formatDateISO(new Date());
    this.periodo = 'Tarde';
    this.quantidadeAulas = 4;
    this.frequencias = {}; // { [alunoId]: ['C', 'C', 'C', 'C'] }
    
    // Week Picker
    this.semanaAtual = null; // Date do domingo inicial da semana
    this.diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    
    // Calendar Popover
    this.calendarCurrentMonth = new Date(); // Mês atual no calendário
    this.calendarPopoverOpen = false;
    this._closeCalendarPopoverBound = null;
  }

  async init() {
    this.carregarTurmasSelect();
    this.carregarUCsSelect();
    
    // Procura se já existem aulas com chamada nesta turma/UC para inicializar com dados reais
    const chamadas = (window.db && window.db.data && window.db.data.aulas)
      ? window.db.data.aulas.filter(a => a.turmaId === Number(this.turmaId) && a.ucId === Number(this.ucId) && a.frequencias)
      : [];
      
    if (chamadas.length > 0) {
      // Ordena por data decrescente para pegar a chamada mais recente
      const chamadasOrdenadas = [...chamadas].sort((a, b) => b.data.localeCompare(a.data));
      this.dataAula = chamadasOrdenadas[0].data;
      this.semanaAtual = this.getInicioSemana(this.dataAula);
    } else {
      const hoje = new Date();
      this.dataAula = this.formatDateISO(hoje);
      this.semanaAtual = this.getInicioSemana(hoje);
    }

    const inputHidden = document.getElementById('inputDiarioData');
    if (inputHidden) inputHidden.value = this.dataAula;

    await this.renderWeekPicker();
    this.carregarChamada();
    this.atualizarDataHeader();
  }

  // ============================================================
  // UTILITÁRIOS SEGUROS DE DATA (Evita problemas de Fuso UTC)
  // ============================================================

  parseDate(str) {
    if (str instanceof Date) {
      return new Date(str.getFullYear(), str.getMonth(), str.getDate());
    }
    if (typeof str === 'string') {
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    return new Date();
  }

  formatDateISO(d) {
    const d2 = this.parseDate(d);
    const ano = d2.getFullYear();
    const mes = String(d2.getMonth() + 1).padStart(2, '0');
    const dia = String(d2.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  formatarDataBR(dataStr) {
    const parts = this.formatDateISO(dataStr).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  formatarDataExtenso(dataStr) {
    const d = this.parseDate(dataStr);
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${diasSemana[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  // Retorna Date do domingo da semana da data dada (0=Dom)
  getInicioSemana(data) {
    const dataRef = this.parseDate(data);
    const day = dataRef.getDay(); // 0=Dom, 1=Seg...
    return new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate() - day);
  }

  // Retorna array de 5 Dates (Seg-Sex) da semanaAtual
  getDiasUteisSemana() {
    const inicio = this.parseDate(this.semanaAtual);
    const dias = [];
    for (let i = 1; i <= 5; i++) { // 1=Seg ... 5=Sex
      dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
    }
    return dias;
  }

  // Navega semanas (delta = -1 anterior, +1 próxima)
  async navegarSemana(delta) {
    const inicio = this.parseDate(this.semanaAtual);
    const nova = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + delta * 7);
    this.semanaAtual = this.getInicioSemana(nova);
    
    // Se a dataAula selecionada não pertence à nova semana visível, seleciona a Segunda-feira
    const diasUteis = this.getDiasUteisSemana().map(d => this.formatDateISO(d));
    if (!diasUteis.includes(this.dataAula)) {
      this.dataAula = diasUteis[0]; // Segunda-feira da semana navegada
      this.frequencias = {};
      const inputHidden = document.getElementById('inputDiarioData');
      if (inputHidden) inputHidden.value = this.dataAula;
    }
    
    await this.renderWeekPicker();
    this.carregarChamada();
    this.atualizarDataHeader();
  }

  // Volta para semana de hoje
  async irParaHoje() {
    const hoje = new Date();
    const hojeStr = this.formatDateISO(hoje);
    this.dataAula = hojeStr;
    this.semanaAtual = this.getInicioSemana(hoje);
    this.frequencias = {};
    const inputHidden = document.getElementById('inputDiarioData');
    if (inputHidden) inputHidden.value = hojeStr;
    
    await this.renderWeekPicker();
    this.carregarChamada();
    this.atualizarDataHeader();
    
    if (this.calendarPopoverOpen) {
      this.calendarCurrentMonth = this.parseDate(this.dataAula);
      this.renderCalendarPopover();
    }
  }

  // Seleciona um dia da semana através dos pills
  async selecionarDiaSemana(dataStr) {
    this.dataAula = dataStr;
    this.frequencias = {}; // LIMPA estado local ao mudar de dia para carregar do banco
    const inputHidden = document.getElementById('inputDiarioData');
    if (inputHidden) inputHidden.value = dataStr;
    await this.renderWeekPicker();
    this.carregarChamada();
    this.atualizarDataHeader();
  }

  // Renderiza os 5 pills (Seg-Sex) com indicadores de chamada salva
  async renderWeekPicker() {
    const container = document.getElementById('diarioWeekPills');
    const inputHidden = document.getElementById('inputDiarioData');
    if (!container) return;

    const dias = this.getDiasUteisSemana();
    const hojeStr = this.formatDateISO(new Date());

    // Busca quais dias têm chamada salva nesta semana
    const inicioSemana = this.formatDateISO(dias[0]);
    const fimSemana = this.formatDateISO(dias[4]);
    const diasComChamada = await this.buscarDiasComChamada(inicioSemana, fimSemana);

    container.innerHTML = dias.map((dia, idx) => {
      const dataStr = this.formatDateISO(dia);
      const isHoje = dataStr === hojeStr;
      const isSelecionado = this.dataAula === dataStr;
      const temChamada = diasComChamada.includes(dataStr);

      return `
        <button type="button" 
          class="week-pill ${isHoje ? 'today' : ''} ${isSelecionado ? 'selected' : ''} ${temChamada ? 'has-chamada' : ''}"
          onclick="window.diarioController.selecionarDiaSemana('${dataStr}')"
          aria-label="${this.diasSemana[idx]}, ${dia.getDate()}/${dia.getMonth()+1}"
          title="${this.diasSemana[idx]}, ${dia.getDate()}/${dia.getMonth()+1}${temChamada ? ' • Chamada salva' : ''}">
          <span class="dia-nome">${this.diasSemana[idx]}</span>
          <span class="dia-numero">${dia.getDate()}</span>
        </button>
      `;
    }).join('');

    if (inputHidden) inputHidden.value = this.dataAula;
    
    const inputDirect = document.getElementById('inputDiarioDataDirect');
    if (inputDirect) inputDirect.value = this.dataAula;

    this.atualizarDataHeader();
  }

  // Atualiza os cabeçalhos com o nome e data formatados
  atualizarDataHeader() {
    const dateTextEl = document.getElementById('calendarSelectedDateText');
    const inputDirect = document.getElementById('inputDiarioDataDirect');
    
    if (dateTextEl) {
      dateTextEl.textContent = this.formatarDataExtenso(this.dataAula);
    }
    if (inputDirect) {
      inputDirect.value = this.dataAula;
    }
  }

  // Busca dias com chamada salva no período (usa DB)
  async buscarDiasComChamada(inicio, fim) {
    if (!window.db || !window.db.getChamadasPorPeriodo) return [];
    return window.db.getChamadasPorPeriodo(this.turmaId, this.ucId, inicio, fim);
  }

  // ============================================================
  // CALENDÁRIO INTERATIVO - POPOVER E VISUALIZAÇÃO DE DIAS ANTERIORES
  // ============================================================

  toggleCalendarPopover(event) {
    if (event) event.stopPropagation();
    const popover = document.getElementById('calendarPopover');
    const toggleBtn = document.getElementById('btnCalendarToggle');
    const toggleIconBtn = document.getElementById('btnCalendarToggleIcon');
    
    if (!popover) return;
    
    this.calendarPopoverOpen = !this.calendarPopoverOpen;
    
    if (this.calendarPopoverOpen) {
      // Sincroniza o mês do calendário com a data da aula atualmente selecionada
      this.calendarCurrentMonth = this.parseDate(this.dataAula);
      this.renderCalendarPopover();
      popover.style.display = 'block';
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.classList.add('active');
      }
      if (toggleIconBtn) {
        toggleIconBtn.setAttribute('aria-expanded', 'true');
        toggleIconBtn.classList.add('active');
      }
      
      // Fecha ao clicar fora, mas ignora cliques dentro do popover ou nos botões de toggle
      if (this._closeCalendarPopoverBound) {
        document.removeEventListener('click', this._closeCalendarPopoverBound);
      }
      this._closeCalendarPopoverBound = this._closeCalendarPopover.bind(this);
      setTimeout(() => {
        document.addEventListener('click', this._closeCalendarPopoverBound);
      }, 50);
    } else {
      this.closeCalendarPopover();
    }
  }

  _closeCalendarPopover(event) {
    const popover = document.getElementById('calendarPopover');
    const toggleBtn = document.getElementById('btnCalendarToggle');
    const toggleIconBtn = document.getElementById('btnCalendarToggleIcon');
    
    // Não fecha se o clique ocorreu dentro do próprio calendário ou dos botões de abertura
    if (popover && popover.contains(event.target)) return;
    if (toggleBtn && toggleBtn.contains(event.target)) return;
    if (toggleIconBtn && toggleIconBtn.contains(event.target)) return;
    
    this.closeCalendarPopover();
  }

  closeCalendarPopover() {
    const popover = document.getElementById('calendarPopover');
    const toggleBtn = document.getElementById('btnCalendarToggle');
    const toggleIconBtn = document.getElementById('btnCalendarToggleIcon');
    
    this.calendarPopoverOpen = false;
    if (popover) popover.style.display = 'none';
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('active');
    }
    if (toggleIconBtn) {
      toggleIconBtn.setAttribute('aria-expanded', 'false');
      toggleIconBtn.classList.remove('active');
    }
    if (this._closeCalendarPopoverBound) {
      document.removeEventListener('click', this._closeCalendarPopoverBound);
      this._closeCalendarPopoverBound = null;
    }
  }

  calendarNavMonth(delta) {
    this.calendarCurrentMonth = new Date(
      this.calendarCurrentMonth.getFullYear(),
      this.calendarCurrentMonth.getMonth() + delta,
      1
    );
    this.renderCalendarPopover();
  }

  async renderCalendarPopover() {
    const monthYearEl = document.getElementById('calendarMonthYear');
    const weekdaysEl = document.getElementById('calendarWeekdays');
    const daysEl = document.getElementById('calendarDays');
    
    if (!monthYearEl || !weekdaysEl || !daysEl) return;
    
    const ano = this.calendarCurrentMonth.getFullYear();
    const mesIndex = this.calendarCurrentMonth.getMonth();
    
    const nomesMeses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    monthYearEl.textContent = `${nomesMeses[mesIndex]} de ${ano}`;
    
    // Dias da semana (Dom a Sáb)
    const diasSemanaCal = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekdaysEl.innerHTML = diasSemanaCal.map(d => `<div class="calendar-weekday">${d}</div>`).join('');
    
    // Busca dias com chamada salva para o mês atual
    const primeiroDiaMes = new Date(ano, mesIndex, 1);
    const ultimoDiaMes = new Date(ano, mesIndex + 1, 0);
    const inicioMesStr = this.formatDateISO(primeiroDiaMes);
    const fimMesStr = this.formatDateISO(ultimoDiaMes);
    const diasComChamada = await this.buscarDiasComChamada(inicioMesStr, fimMesStr);
    
    const primeiroDiaSemana = primeiroDiaMes.getDay(); // 0=Dom
    const totalDiasMes = ultimoDiaMes.getDate();
    const hojeStr = this.formatDateISO(new Date());
    
    let diasHtml = '';
    
    // Dias do mês anterior para preencher a primeira semana
    const ultimoDiaMesAnterior = new Date(ano, mesIndex, 0).getDate();
    for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
      const numDiaPrev = ultimoDiaMesAnterior - i;
      const prevDate = new Date(ano, mesIndex - 1, numDiaPrev);
      const prevDataStr = this.formatDateISO(prevDate);
      diasHtml += `
        <button type="button" class="calendar-day prev-month" onclick="window.diarioController.calendarSelectDate('${prevDataStr}')" title="${this.formatarDataBR(prevDataStr)}">
          ${numDiaPrev}
        </button>
      `;
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const dataStr = `${ano}-${String(mesIndex + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const isHoje = dataStr === hojeStr;
      const isSelecionado = this.dataAula === dataStr;
      const temChamada = diasComChamada.includes(dataStr);
      
      let classes = ['calendar-day'];
      if (isSelecionado) classes.push('selected');
      if (isHoje) classes.push('today');
      if (temChamada) classes.push('has-chamada');
      
      const dataFormatada = this.formatarDataBR(dataStr);
      const statusDesc = temChamada ? ' • Chamada salva' : '';
      const hojeDesc = isHoje ? ' • Hoje' : '';
      
      diasHtml += `
        <button type="button" 
          class="${classes.join(' ')}"
          onclick="window.diarioController.calendarSelectDate('${dataStr}')"
          aria-label="${dataFormatada}${statusDesc}${hojeDesc}"
          title="${dataFormatada}${statusDesc}${hojeDesc}">
          <span>${dia}</span>
          ${temChamada ? '<span class="cal-chamada-dot" title="Chamada salva"></span>' : ''}
        </button>
      `;
    }
    
    // Dias do próximo mês para completar a grade
    const totalCelulas = primeiroDiaSemana + totalDiasMes;
    const celulasFaltantes = (totalCelulas % 7 === 0) ? 0 : 7 - (totalCelulas % 7);
    for (let i = 1; i <= celulasFaltantes; i++) {
      const nextDate = new Date(ano, mesIndex + 1, i);
      const nextDataStr = this.formatDateISO(nextDate);
      diasHtml += `
        <button type="button" class="calendar-day next-month" onclick="window.diarioController.calendarSelectDate('${nextDataStr}')" title="${this.formatarDataBR(nextDataStr)}">
          ${i}
        </button>
      `;
    }
    
    daysEl.innerHTML = diasHtml;
  }

  // Seleciona uma data a partir do calendário mensal (dias anteriores ou futuros)
  calendarSelectDate(dataStr) {
    if (!dataStr) return;
    this.dataAula = dataStr;
    this.frequencias = {}; // Limpa estado local para ler do banco
    this.semanaAtual = this.getInicioSemana(dataStr); // CRÍTICO: atualiza os 5 pills para a semana do dia selecionado!
    
    const inputHidden = document.getElementById('inputDiarioData');
    if (inputHidden) inputHidden.value = dataStr;
    
    const inputDirect = document.getElementById('inputDiarioDataDirect');
    if (inputDirect) inputDirect.value = dataStr;
    
    this.renderWeekPicker(); // Atualiza os pills da semana
    this.carregarChamada();  // Carrega a chamada do dia selecionado
    this.renderCalendarPopover(); // Atualiza visualmente o dia selecionado no calendário
    this.atualizarDataHeader();

    if (window.app && window.app.mostrarToast) {
      window.app.mostrarToast(`Chamada de ${this.formatarDataBR(dataStr)} carregada`, 'info');
    }
  }

  calendarSelectToday() {
    const hojeStr = this.formatDateISO(new Date());
    this.calendarSelectDate(hojeStr);
  }

  // Atalho direto para ir para a aula com chamada mais recente registrada
  irParaUltimaAulaComChamada() {
    const chamadas = (window.db && window.db.data && window.db.data.aulas)
      ? window.db.data.aulas.filter(a => a.turmaId === Number(this.turmaId) && a.ucId === Number(this.ucId) && a.frequencias)
      : [];

    if (chamadas.length > 0) {
      const chamadasOrdenadas = [...chamadas].sort((a, b) => b.data.localeCompare(a.data));
      this.calendarSelectDate(chamadasOrdenadas[0].data);
    } else {
      if (window.app && window.app.mostrarToast) {
        window.app.mostrarToast('Nenhuma chamada anterior encontrada para esta disciplina.', 'info');
      }
    }
  }

  // ============================================================
  // TURMAS E UNIDADES CURRICULARES
  // ============================================================

  carregarTurmasSelect() {
    const sel = document.getElementById('selectDiarioTurma');
    if (!sel) return;
    const turmas = window.db.getTurmas('EM_ANDAMENTO');
    sel.innerHTML = turmas.map(t => `<option value="${t.id}">${t.codigo} - ${t.nome}</option>`).join('');
    sel.value = this.turmaId;
    const turma = turmas.find(t => t.id === this.turmaId);
    this.atualizarInfoBadge(turma);
  }

  carregarUCsSelect() {
    const sel = document.getElementById('selectDiarioUC');
    if (!sel) return;
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    sel.innerHTML = ucs.map(u => `<option value="${u.id}">${u.codigo} - ${u.nome}</option>`).join('');
    if (ucs.length) {
      this.ucId = ucs[0].id;
      sel.value = this.ucId;
    }
  }

  atualizarInfoBadge(turma) {
    const badge = document.getElementById('diarioInfoTurma');
    if (badge && turma) {
      badge.textContent = `${turma.codigo} • ${turma.periodo}`;
    }
  }

  async onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.frequencias = {}; // Limpa ao trocar turma
    this.carregarUCsSelect();
    const turma = window.db.getTurmaById(this.turmaId);
    this.atualizarInfoBadge(turma);
    await this.renderWeekPicker();
    this.carregarChamada();
  }

  async onUCChange(novaUCId) {
    this.ucId = Number(novaUCId);
    this.frequencias = {}; // Limpa ao trocar UC
    await this.renderWeekPicker();
    this.carregarChamada();
  }

  // ============================================================
  // TABELA DE CHAMADA (C, F, A - Sem a letra D)
  // ============================================================

  carregarChamada() {
    console.log('[Diário] carregarChamada:', { turmaId: this.turmaId, ucId: this.ucId, data: this.dataAula, subturma: this.subturma, qtdAulas: this.quantidadeAulas });
    
    const container = document.getElementById('diarioChamadaTableBody');
    if (!container) {
      console.error('[Diário] Container não encontrado!');
      return;
    }

    // SÓ carrega do banco se NÃO temos dados locais (inicialização ou troca de dia)
    if (Object.keys(this.frequencias).length === 0) {
      const chamadaExistente = window.db.getChamada(this.turmaId, this.ucId, this.dataAula, this.periodo, this.subturma);

      if (chamadaExistente) {
        this.quantidadeAulas = chamadaExistente.quantidadeAulas || 4;
        this.frequencias = JSON.parse(JSON.stringify(chamadaExistente.frequencias || {}));
        const inputQtd = document.getElementById('inputDiarioQtdAulas');
        if (inputQtd) inputQtd.value = this.quantidadeAulas;
      } else {
        this.frequencias = {};
      }
    }

    const alunos = window.db.getAlunosPorTurma(this.turmaId, this.subturma);
    const dentroDoPrazo = window.db.isDataDentroDoPrazo(this.dataAula);

    // Alerta de prazo - AVISA mas NÃO BLOQUEIA
    const alertaPrazo = document.getElementById('diarioAlertaPrazo');
    if (alertaPrazo) {
      if (!dentroDoPrazo) {
        alertaPrazo.style.display = 'flex';
        alertaPrazo.innerHTML = ` <strong>Atenção:</strong> Esta aula tem mais de ${window.db.data.config.prazoEdicaoDias} dias. Você pode editar, mas será registrado como alteração tardia.`;
      } else {
        alertaPrazo.style.display = 'none';
      }
    }

    // Atualizar seletor de qtd aulas
    const inputQtd = document.getElementById('inputDiarioQtdAulas');
    if (inputQtd) inputQtd.value = this.quantidadeAulas;

    // Renderizar linhas de alunos
    container.innerHTML = alunos.map(aluno => {
      const ehStatusX = (aluno.statusMatricula === 'TRANCADO' || aluno.statusMatricula === 'CANCELADO');
      const justificativa = window.db.getJustificativaParaData(aluno.id, this.dataAula);
      const atrasosAcumulados = window.db.getAtrasosAcumulados(aluno.id, this.ucId);

      // Frequência consolidada para badge visual
      let freqCritica = false;
      let freqPorcentagem = 100;
      if (!ehStatusX) {
        const sintese = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
        const alunoSintese = sintese.alunos.find(item => item.aluno.id === aluno.id);
        if (alunoSintese) {
          freqPorcentagem = alunoSintese.freqPorcentagem;
          freqCritica = freqPorcentagem < window.db.data.config.frequenciaMinimaPorcentagem;
        }
      }

      // Inicializar frequências se não existirem
      if (!this.frequencias[aluno.id]) {
        if (ehStatusX) {
          this.frequencias[aluno.id] = Array(this.quantidadeAulas).fill('X');
        } else if (justificativa) {
          this.frequencias[aluno.id] = Array(this.quantidadeAulas).fill('D');
        } else {
          this.frequencias[aluno.id] = Array(this.quantidadeAulas).fill('C');
        }
      }

      // Células de frequência: botões C (Presente), F (Falta), A (Atraso) - Letra D removida
      let celulasHtml = '';
      if (ehStatusX) {
        celulasHtml = `<td colspan="${this.quantidadeAulas}" style="text-align:center; padding:20px;">
          <span class="status-x-badge">STATUS X - ${aluno.statusMatricula} (BLOQUEADO)</span>
        </td>`;
      } else {
        for (let i = 0; i < this.quantidadeAulas; i++) {
          const status = this.frequencias[aluno.id][i] || 'C';
          const disabledF = justificativa ? 'disabled style="opacity:0.3;cursor:not-allowed;" title="Bloqueado por atestado homologado"' : '';
          const dispensaTag = (status === 'D') ? '<span class="status-dispensa-tag" title="Dispensado por atestado homologado">Dispensa</span>' : '';

          celulasHtml += `
            <td style="text-align:center;">
              <div class="freq-selector-group">
                <button type="button" class="btn-freq-opt ${status==='C'?'active-C':''}" onclick="window.diarioController.setFrequencia(${aluno.id},${i},'C')" title="Presente">C</button>
                <button type="button" class="btn-freq-opt ${status==='F'?'active-F':''}" ${disabledF} onclick="window.diarioController.setFrequencia(${aluno.id},${i},'F')" title="Falta">F</button>
                <button type="button" class="btn-freq-opt ${status==='A'?'active-A':''}" onclick="window.diarioController.setFrequencia(${aluno.id},${i},'A')" title="Atraso">A</button>
                ${dispensaTag}
              </div>
            </td>`;
        }
      }

      // Badges informativos
      let badges = '';
      if (justificativa) badges += `<span class="justified-pill-badge">${justificativa.tipo}</span>`;
      if (atrasosAcumulados >= 5) badges += `<span class="delays-warning-chip">${atrasosAcumulados} atrasos</span>`;
      else if (atrasosAcumulados > 0) badges += `<span style="font-size:11px;color:#b45309;font-weight:600;">${atrasosAcumulados} atraso(s)</span>`;
      if (freqCritica) badges += `<span class="freq-critical-badge">${freqPorcentagem}% CRÍTICO</span>`;
      else if (freqPorcentagem < 85) badges += `<span style="font-size:11px;color:#d97706;font-weight:600;">${freqPorcentagem}%</span>`;

      const rowClass = ehStatusX ? 'row-status-x' : (freqCritica ? 'row-freq-critical' : '');

      return `
        <tr class="${rowClass}">
          <td style="width:40px;font-weight:700;color:var(--text-muted);">${aluno.numeroChamada}</td>
          <td>
            <div class="student-cell">
              <img src="${aluno.foto}" alt="${aluno.nome}" class="student-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=c3161c&color=fff'">
              <div class="student-meta">
                <span class="student-name">${aluno.nome}</span>
                <span class="student-ra">${aluno.ra} • Subturma ${aluno.subturma}</span>
                <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">${badges}</div>
              </div>
            </div>
          </td>
          ${celulasHtml}
        </tr>`;
    }).join('');

    console.log('[Diário] Renderizados', alunos.length, 'alunos');

    // Cabeçalho da tabela
    const theadRow = document.getElementById('diarioChamadaTableHeadRow');
    if (theadRow) {
      let ths = '';
      for (let i = 1; i <= this.quantidadeAulas; i++) ths += `<th style="text-align:center;width:90px;">Aula ${i}</th>`;
      theadRow.innerHTML = `<th style="width:45px;">Nº</th><th style="min-width:220px;">Aluno</th>${ths}`;
    }
    if (window.app && window.app._aplicarModoObservador) {
      window.app._aplicarModoObservador('diario');
    }
  }

  setFrequencia(alunoId, aulaIndex, novoStatus) {
    console.log('[Diário] setFrequencia CLICADO:', { alunoId, aulaIndex, novoStatus });
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Visualização somente leitura: o perfil de Coordenação não pode alterar presenças.', 'info');
      return;
    }
    
    if (!this.frequencias[alunoId]) this.frequencias[alunoId] = Array(this.quantidadeAulas).fill('C');
    
    // Bloquear F se tem justificativa
    if (novoStatus === 'F' && window.db.getJustificativaParaData(alunoId, this.dataAula)) {
      window.app.mostrarToast('Aluno com atestado válido. Falta bloqueada!', 'warning');
      return;
    }
    this.frequencias[alunoId][aulaIndex] = novoStatus;
    console.log('[Diário] Frequência atualizada:', this.frequencias[alunoId]);
    this.carregarChamada(); // Re-render imediato para feedback visual
  }

  marcarTodosComoComparecimento() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    const alunos = window.db.getAlunosPorTurma(this.turmaId, this.subturma);
    alunos.forEach(aluno => {
      if (aluno.statusMatricula === 'ATIVO') {
        const justificativa = window.db.getJustificativaParaData(aluno.id, this.dataAula);
        this.frequencias[aluno.id] = Array(this.quantidadeAulas).fill(justificativa ? 'D' : 'C');
      }
    });
    this.carregarChamada();
    window.app.mostrarToast('Todos marcados como Presente [C]', 'success');
  }

  salvarChamada() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    try {
      const resultado = window.db.salvarChamada({
        turmaId: this.turmaId,
        ucId: this.ucId,
        data: this.dataAula,
        periodo: this.periodo,
        subturma: this.subturma,
        quantidadeAulas: this.quantidadeAulas,
        frequencias: this.frequencias
      });

      this.verificarLimiteCriticoFrequencia();

      window.app.mostrarToast('Chamada salva com sucesso!', 'success');
      this.carregarChamada();
      this.renderWeekPicker(); // Atualiza indicadores verdes nos pills
      if (this.calendarPopoverOpen) {
        this.renderCalendarPopover(); // Atualiza indicadores no calendário
      }
    } catch (e) {
      window.app.mostrarToast(e.message, 'warning');
    }
  }

  verificarLimiteCriticoFrequencia() {
    const alunos = window.db.getAlunosPorTurma(this.turmaId, this.subturma);
    const criticos = alunos.filter(a => a.statusMatricula === 'ATIVO').map(a => {
      const s = window.db.getSinteseConsolidada(this.turmaId, this.ucId).alunos.find(x => x.aluno.id === a.id);
      return s && s.freqPorcentagem < window.db.data.config.frequenciaMinimaPorcentagem ? {nome: a.nome, ra: a.ra, freq: s.freqPorcentagem, faltas: s.faltas} : null;
    }).filter(Boolean);

    if (criticos.length) {
      const msg = ` FREQUÊNCIA CRÍTICA (<${window.db.data.config.frequenciaMinimaPorcentagem}%):\n\n${criticos.map(c=>`• ${c.nome} (${c.ra}) - ${c.freq}% - ${c.faltas} faltas`).join('\n')}\n\nIr para aba Compensar?`;
      const elTit = document.getElementById('modalAlertaTitulo');
      const elMsg = document.getElementById('modalAlertaMensagem');
      const elFooter = document.querySelector('#modalAlertaGlobal .modal-footer');
      if (elTit && elMsg && elFooter) {
        elTit.innerText = 'Frequência Crítica Detectada';
        elMsg.innerText = msg;
        elMsg.style.whiteSpace = 'pre-line';
        elFooter.innerHTML = `<button class="btn btn-secondary" onclick="window.app.fecharModal('modalAlertaGlobal')">Agora não</button><button class="btn btn-primary" onclick="window.app.navegarPara('compensacoes');window.app.fecharModal('modalAlertaGlobal')">Ir para Compensar →</button>`;
        window.app.abrirModal('modalAlertaGlobal');
      }
    }
  }
}

window.diarioController = new DiarioController();

// Auto-inicializar quando a aba Diário for aberta
document.addEventListener('DOMContentLoaded', () => {
  // O init será chamado pelo app.js ao navegar para 'diario'
});
