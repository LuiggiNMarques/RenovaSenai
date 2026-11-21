/**
 * =============================================================================
 * RENOVA SENAI — PORTAL DO ORIENTADOR EDUCACIONAL (portal-orientador.js)
 * Analista de Qualidade de Vida e Acompanhamento Diário de Alunos
 * Zero Mocks Estáticos • Fonte Única de Verdade em window.db (LocalStorage)
 * =============================================================================
 */

class PortalOrientadorController {
  constructor() {
    this.currentSubTab = 'radar'; // radar | atestados | compensacoes | prontuario
    this.turmaId = 1;
    this.alunoProntuarioAtivo = null;
    this._boundEvents = false;
  }

  init() {
    if (!window.db) return;

    // Sincroniza turma selecionada com fallbacks seguros
    const turmas = (window.db.getTurmas && window.db.getTurmas('EM_ANDAMENTO')) || (window.db.data && window.db.data.turmas) || [];
    if (window.app && window.app.turmaAtiva && window.app.turmaAtiva.id) {
      this.turmaId = Number(window.app.turmaAtiva.id);
    } else if (turmas.length > 0) {
      this.turmaId = Number(turmas[0].id);
      if (window.app) window.app.turmaAtiva = turmas[0];
    }

    this._popularSelectsTurma();
    this._bindEvents();
    this.navegarAba(this.currentSubTab || 'radar');
  }

  _bindEvents() {
    if (this._boundEvents) return;
    this._boundEvents = true;

    // Atualização reativa em tempo real com o banco central
    window.addEventListener('renova:db-updated', () => {
      if (window.auth && window.auth.isOrientador && window.auth.isOrientador()) {
        this.recarregarAbaAtiva();
      }
    });
  }

  _popularSelectsTurma() {
    if (!window.db) return;
    const turmas = (window.db.getTurmas && window.db.getTurmas('EM_ANDAMENTO')) || (window.db.data && window.db.data.turmas) || [];
    if (turmas.length === 0) return;

    if (!turmas.some(t => Number(t.id) === Number(this.turmaId))) {
      this.turmaId = Number(turmas[0].id);
      if (window.app) window.app.turmaAtiva = turmas[0];
    }

    const selects = document.querySelectorAll('.orientador-turma-select, #orientadorTurmaSelect, #orientadorTurmaSelectGlobal');
    selects.forEach(sel => {
      sel.innerHTML = turmas.map(t => 
        `<option value="${t.id}" ${Number(t.id) === Number(this.turmaId) ? 'selected' : ''}>${t.codigo} — ${t.nome || t.ucNome || ''}</option>`
      ).join('');

      sel.onchange = (e) => {
        this.onTurmaChange(e.target.value);
      };
    });
  }

  onTurmaChange(turmaId) {
    this.turmaId = Number(turmaId);
    if (window.app && window.db && window.db.data) {
      window.app.turmaAtiva = (window.db.data.turmas || []).find(t => Number(t.id) === this.turmaId);
    }
    // Sincroniza todos os selects da tela
    document.querySelectorAll('.orientador-turma-select, #orientadorTurmaSelect, #orientadorTurmaSelectGlobal').forEach(sel => {
      sel.value = this.turmaId;
    });
    this.recarregarAbaAtiva();
  }

  navegarAba(aba) {
    // Calendário removido do Orientador — redireciona para radar
    if (aba === 'calendario') aba = 'radar';
    this.currentSubTab = aba || 'radar';
    const subviews = ['radar', 'atestados', 'compensacoes', 'prontuario'];

    // Atualiza botões da barra lateral do Orientador
    document.querySelectorAll('#sidebarOrientSection .nav-item, #sidebarModeOrientador .nav-item, .orientador-sidebar .nav-item').forEach(btn => {
      const target = btn.getAttribute('data-target-tab');
      if (target === `orientador_${this.currentSubTab}` || target === this.currentSubTab || (this.currentSubTab === 'radar' && target === 'orientador')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Atualiza botões de sub-abas internas
    document.querySelectorAll('.orientador-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-subtab') === this.currentSubTab);
    });

    // Alterna seções principais tabSection_orientador_*
    subviews.forEach(s => {
      const el = document.getElementById(`tabSection_orientador_${s}`) || document.getElementById(`orientadorSubView_${s}`);
      if (el) {
        el.style.display = (s === this.currentSubTab) ? 'block' : 'none';
        if (s === this.currentSubTab) {
          el.classList.remove('section-entering');
          void el.offsetWidth;
          el.classList.add('section-entering');
        }
      }
    });

    this.recarregarAbaAtiva();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  recarregarTelaAtiva() {
    this.recarregarAbaAtiva();
  }

  recarregarAbaAtiva() {
    switch (this.currentSubTab) {
      case 'radar':
        this.renderRadar();
        break;
      case 'atestados':
        this.renderAtestados();
        break;
      case 'compensacoes':
        this.renderCompensacoes();
        break;
      case 'prontuario':
        this.renderProntuario();
        break;
      default:
        this.renderRadar();
    }
  }

  // =========================================================================
  // 1. RADAR DO DIA (QUALIDADE DE VIDA & PENDÊNCIAS EM TEMPO REAL)
  // =========================================================================
  renderRadar() {
    if (!window.db) return;
    const radarData = window.db.getRadarOrientador(this.turmaId);

    // 1. Atualizar KPIs Operacionais
    const kpiFaltas = document.getElementById('radarKpiFaltas');
    const kpiAtrasos = document.getElementById('radarKpiAtrasos');
    const kpiAtestados = document.getElementById('radarKpiAtestados');
    const kpiCompensacoes = document.getElementById('radarKpiCompensacoes');

    if (kpiFaltas) kpiFaltas.textContent = radarData.kpis.faltasSemJustificativa;
    if (kpiAtrasos) kpiAtrasos.textContent = radarData.kpis.alunosCom5Atrasos;
    if (kpiAtestados) kpiAtestados.textContent = radarData.kpis.atestadosAguardando;
    if (kpiCompensacoes) kpiCompensacoes.textContent = radarData.kpis.compensacoesEmAberto;

    // 2. Fila Priorizada por Urgência
    const tbody = document.getElementById('radarFilaUrgenciaTbody');
    const badgeCount = document.getElementById('radarFilaCountBadge');
    if (!tbody) return;

    if (badgeCount) {
      badgeCount.textContent = `${radarData.filaUrgencia.length} caso${radarData.filaUrgencia.length !== 1 ? 's' : ''} prioritário${radarData.filaUrgencia.length !== 1 ? 's' : ''}`;
    }

    if (radarData.filaUrgencia.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:36px; color:#16a34a; font-size:14px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px; display:inline-block; vertical-align:middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <strong style="display:block; margin-top:4px;">Nenhum caso prioritário hoje.</strong>
            <span style="font-size:12px; color:#64748b;">Todas as faltas estão justificadas e compensações em dia.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = radarData.filaUrgencia.map(item => {
      const al = item.aluno;
      const freqPct = item.hist ? item.hist.freqPorcentagem : 100;
      let freqColor = '#16a34a';
      if (freqPct < 75) freqColor = '#be123c';
      else if (freqPct < 85) freqColor = '#d97706';

      let gravidade = 'Ausência';
      let gravidadeColor = '#475569';
      let gravidadeBg = '#f1f5f9';
      if (item.tipoUrgencia === 'ATESTADO_PENDENTE') { gravidade = 'Atestado Pendente'; gravidadeColor = '#92400e'; gravidadeBg = '#fef3c7'; }
      else if (item.tipoUrgencia === 'FALTAS_CRITICAS') { gravidade = 'Faltas Críticas'; gravidadeColor = '#991b1b'; gravidadeBg = '#fee2e2'; }
      else if (item.tipoUrgencia === 'ATRASOS_ACUMULADOS') { gravidade = '5+ Atrasos'; gravidadeColor = '#9a3412'; gravidadeBg = '#ffedd5'; }

      const contatoHojeFeito = !!item.contatoHoje;
      const statusContato = contatoHojeFeito
        ? `<span class="radar-badge-contato feito" style="font-size:11px;">Contato feito (${item.contatoHoje.canal})</span>`
        : `<span class="radar-badge-contato pendente" style="font-size:11px;">Sem contato hoje</span>`;

      const telefone = al.telefone || al.celular || '(11) 9xxxx-xxxx';
      const email = al.email || `${al.nome.split(' ')[0].toLowerCase()}@aluno.senai.br`;
      const whatsappLink = `https://wa.me/55${telefone.replace(/\D/g,'')}`;

      return `
        <tr>
          <td>
            <strong style="color:#0f172a; font-size:13px; display:block;">${al.nome}</strong>
            <span style="font-size:11px; color:#64748b;">RA: ${al.ra || 'RA' + String(al.id).padStart(7, '0')} &bull; ${item.turma ? item.turma.codigo : ''}</span>
          </td>
          <td>
            <span class="badge" style="background:${gravidadeBg}; color:${gravidadeColor}; font-weight:700; font-size:11px; padding:3px 8px; border-radius:5px;">${gravidade}</span>
          </td>
          <td style="font-weight:700; color:${freqColor}; font-size:13px;">
            ${freqPct}%
            <div style="font-size:11px; color:#64748b; font-weight:400;">${item.hist ? item.hist.faltas : 0}F / ${item.hist ? item.hist.atrasos : 0}A</div>
          </td>
          <td>${statusContato}</td>
          <td>
            <div style="font-size:11.5px; color:#334155;">
              <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.1 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 18.92z"></path></svg>
                <a href="${whatsappLink}" target="_blank" style="color:#15803d; text-decoration:none; font-size:11px;">${telefone}</a>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <a href="mailto:${email}" style="color:#0284c7; text-decoration:none; font-size:11px;">${email}</a>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.abrirModalRegistrarContato(${al.id}, '${al.nome.replace(/'/g, "\\'")}')" style="font-size:11px; padding:3px 7px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 11.9"></path></svg>
                Contato
              </button>
              ${item.atestadoPendente ? `
                <button type="button" class="btn btn-primary btn-sm" onclick="window.portalOrientadorController.abrirModalValidarAtestado(${item.atestadoPendente.id})" style="font-size:11px; padding:3px 7px; background:#0284c7; border-color:#0284c7;">Validar</button>
              ` : `
                <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.abrirModalAgendarCompensacao(${al.id}, '${al.nome.replace(/'/g, "\\'")}')" style="font-size:11px; padding:3px 7px;">Compensar</button>
              `}
              <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.abrirProntuario(${al.id})" style="font-size:11px; padding:3px 7px; background:#f8fafc;">Prontuário</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // 2. CALENDÁRIO OPERACIONAL INTEGRADO (MENSAL / SEMANAL)
  // =========================================================================
  renderCalendario() {
    if (!window.db) return;

    const titleEl = document.getElementById('orientadorCalMonthTitle');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    if (titleEl) {
      titleEl.textContent = `${meses[this.calMonth]} de ${this.calYear}`;
    }

    const grid = document.getElementById('orientadorCalGridBody');
    if (!grid) return;

    // Buscar dados agregados para o calendário
    const atendimentos = window.db.getAtendimentosOrientacao(this.turmaId);
    const compensacoes = window.db.getCompensacoes(this.turmaId);
    const justificativas = window.db.getJustificativas(this.turmaId);
    const avaliacoes = (window.db.data.avaliacoes || []).filter(av => !this.turmaId || Number(av.turmaId) === Number(this.turmaId));
    const aulas = (window.db.data.aulas || []).filter(a => !this.turmaId || Number(a.turmaId) === Number(this.turmaId));

    // Primeiro dia do mês e total de dias
    const firstDay = new Date(this.calYear, this.calMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.calYear, this.calMonth, 0).getDate();

    let cellsHtml = '';

    // Dias do mês anterior para completar a semana
    for (let p = firstDay - 1; p >= 0; p--) {
      const prevDayNum = daysInPrevMonth - p;
      cellsHtml += `<div class="cal-day-cell other-month"><div class="cal-day-top"><span>${prevDayNum}</span></div></div>`;
    }

    const hojeStr = new Date().toISOString().split('T')[0];

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const diaFormatted = String(d).padStart(2, '0');
      const mesFormatted = String(this.calMonth + 1).padStart(2, '0');
      const dateStr = `${this.calYear}-${mesFormatted}-${diaFormatted}`;

      const isToday = (dateStr === hojeStr);
      const isSelected = (dateStr === this.selectedDay);

      // Eventos deste dia
      const atendsDia = atendimentos.filter(a => a.data === dateStr);
      const compsDia = compensacoes.filter(c => c.dataAgendada === dateStr || c.dataLimite === dateStr);
      const justsDia = justificativas.filter(j => dateStr >= j.dataInicio && dateStr <= j.dataFim);
      const avalsDia = avaliacoes.filter(av => av.data === dateStr);

      // Contagem de faltas registradas em aulas neste dia
      const aulasDia = aulas.filter(a => a.data === dateStr);
      let totalFaltasDia = 0;
      aulasDia.forEach(aula => {
        if (aula.frequencias) {
          Object.values(aula.frequencias).forEach(arr => {
            totalFaltasDia += (arr || []).filter(s => s === 'F').length;
          });
        }
      });

      let chipsHtml = '';

      if (this.calFiltroTipo === 'TODOS' || this.calFiltroTipo === 'ATENDIMENTOS') {
        atendsDia.slice(0, 2).forEach(at => {
          chipsHtml += `<div class="cal-chip atendimento" title="Atendimento com ${at.alunoNome} (${at.horaInicio})">⏱️ ${at.horaInicio} ${at.alunoNome.split(' ')[0]}</div>`;
        });
      }

      if (this.calFiltroTipo === 'TODOS' || this.calFiltroTipo === 'COMPENSACOES') {
        compsDia.slice(0, 2).forEach(cp => {
          chipsHtml += `<div class="cal-chip compensacao" title="Compensação: ${cp.alunoNome} (${cp.turno})">⚖️ ${cp.alunoNome.split(' ')[0]} (${cp.horasObrigacao}h)</div>`;
        });
      }

      if (this.calFiltroTipo === 'TODOS' || this.calFiltroTipo === 'ATESTADOS') {
        justsDia.slice(0, 2).forEach(jt => {
          chipsHtml += `<div class="cal-chip atestado" title="Afastamento: ${jt.alunoNome}">📋 ${jt.alunoNome.split(' ')[0]}</div>`;
        });
      }

      if (this.calFiltroTipo === 'TODOS' || this.calFiltroTipo === 'AVALIACOES') {
        avalsDia.slice(0, 1).forEach(av => {
          chipsHtml += `<div class="cal-chip avaliacao" title="Avaliação: ${av.titulo}">🎓 ${av.titulo.substring(0, 18)}...</div>`;
        });
      }

      if (totalFaltasDia > 0) {
        chipsHtml += `<div class="cal-chip falta" title="${totalFaltasDia} falta(s) registrada(s) nesta data">🔴 ${totalFaltasDia} falta(s)</div>`;
      }

      cellsHtml += `
        <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
             onclick="window.portalOrientadorController.selecionarDiaCalendario('${dateStr}')">
          <div class="cal-day-top">
            <span class="cal-day-number">${d}</span>
          </div>
          <div class="cal-day-chips">
            ${chipsHtml}
          </div>
        </div>
      `;
    }

    // Completar última semana
    const totalRendered = firstDay + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      cellsHtml += `<div class="cal-day-cell other-month"><div class="cal-day-top"><span>${r}</span></div></div>`;
    }

    grid.innerHTML = cellsHtml;
    this.renderPainelDiaSelecionado();
  }

  selecionarDiaCalendario(dateStr) {
    this.selectedDay = dateStr;
    this.renderCalendario();
  }

  mudarMesCalendario(offset) {
    this.calMonth += offset;
    if (this.calMonth > 11) {
      this.calMonth = 0;
      this.calYear++;
    } else if (this.calMonth < 0) {
      this.calMonth = 11;
      this.calYear--;
    }
    this.renderCalendario();
  }

  hojeCalendario() {
    const hoje = new Date();
    this.calYear = hoje.getFullYear();
    this.calMonth = hoje.getMonth();
    this.selectedDay = hoje.toISOString().split('T')[0];
    this.renderCalendario();
  }

  filtrarTipoCalendario(tipo) {
    this.calFiltroTipo = tipo;
    document.querySelectorAll('.cal-filter-chip').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cal-type') === tipo);
    });
    this.renderCalendario();
  }

  renderPainelDiaSelecionado() {
    const container = document.getElementById('orientadorCalSideEvents');
    const labelDate = document.getElementById('orientadorCalSideDateLabel');
    if (!container) return;

    const parts = this.selectedDay.split('-');
    const dataObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = diasSemana[dataObj.getDay()];
    const dataFormatada = `${diaSemana}, ${parts[2]}/${parts[1]}/${parts[0]}`;

    if (labelDate) labelDate.textContent = dataFormatada;

    const atendimentos = (window.db.getAtendimentosOrientacao() || []).filter(a => a.data === this.selectedDay);
    const compensacoes = (window.db.getCompensacoes() || []).filter(c => c.dataAgendada === this.selectedDay || c.dataLimite === this.selectedDay);
    const justificativas = (window.db.getJustificativas() || []).filter(j => this.selectedDay >= j.dataInicio && this.selectedDay <= j.dataFim);
    const avaliacoes = (window.db.data.avaliacoes || []).filter(av => av.data === this.selectedDay);
    const aulas = (window.db.data.aulas || []).filter(a => a.data === this.selectedDay);

    let html = '';

    if (atendimentos.length === 0 && compensacoes.length === 0 && justificativas.length === 0 && avaliacoes.length === 0 && aulas.length === 0) {
      container.innerHTML = `
        <div style="padding:24px 12px; text-align:center; color:#64748b; font-size:12.5px;">
          Nenhum compromisso ou ausência registrada para esta data.
          <div style="margin-top:10px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.abrirModalNovoAtendimentoComData('${this.selectedDay}')" style="font-size:12px;">
              + Agendar Atendimento no Dia
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Atendimentos do Dia
    atendimentos.forEach(at => {
      html += `
        <div class="cal-side-event-item" style="border-left:3px solid #0284c7;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#0369a1; font-size:11.5px;">⏱️ Atendimento (${at.horaInicio} - ${at.horaFim})</strong>
            <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10px;">${at.status}</span>
          </div>
          <div style="font-weight:700; color:#0f172a;">${at.alunoNome}</div>
          <div style="color:#475569; font-size:11.5px; margin-top:2px;">Foco: ${at.foco} • ${at.resumo}</div>
        </div>
      `;
    });

    // Compensações Agendadas no Dia
    compensacoes.forEach(cp => {
      html += `
        <div class="cal-side-event-item" style="border-left:3px solid #d97706;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#92400e; font-size:11.5px;">⚖️ Compensação de Ausência</strong>
            <span class="badge" style="background:#fef3c7; color:#92400e; font-size:10px;">${cp.status}</span>
          </div>
          <div style="font-weight:700; color:#0f172a;">${cp.alunoNome} (${cp.horasObrigacao} horas)</div>
          <div style="color:#475569; font-size:11.5px; margin-top:2px;">Turno: ${cp.turno || 'Contraturno'} • ${cp.atividadeDescricao}</div>
        </div>
      `;
    });

    // Atestados Ativos no Dia
    justificativas.forEach(jt => {
      html += `
        <div class="cal-side-event-item" style="border-left:3px solid #16a34a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#15803d; font-size:11.5px;">📋 Afastamento / Atestado</strong>
            <span class="badge" style="background:#dcfce7; color:#15803d; font-size:10px;">${jt.status}</span>
          </div>
          <div style="font-weight:700; color:#0f172a;">${jt.alunoNome}</div>
          <div style="color:#475569; font-size:11.5px; margin-top:2px;">${jt.tipo}: ${jt.motivo}</div>
        </div>
      `;
    });

    // Avaliações de Turmas
    avaliacoes.forEach(av => {
      html += `
        <div class="cal-side-event-item" style="border-left:3px solid #9333ea; background:#faf5ff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#6b21a8; font-size:11.5px;">🎓 Avaliação Docente da Turma</strong>
            <span class="badge" style="background:#f3e8ff; color:#6b21a8; font-size:10px;">Peso ${av.peso}</span>
          </div>
          <div style="font-weight:700; color:#0f172a;">${av.titulo}</div>
          <div style="color:#475569; font-size:11.5px; margin-top:2px;">⚠️ Alunos em prova nesta data: evitar choques de agenda.</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // 3. FALTAS & ATESTADOS (TRIAGEM & HOMOLOGAÇÃO EM 1 CLIQUE)
  // =========================================================================
  renderAtestados() {
    if (!window.db) return;
    const tbody = document.getElementById('orientadorAtestadosTbody');
    const badgeCount = document.getElementById('orientadorAtestadosCount');
    const filtroStatus = (document.getElementById('filtroStatusAtestado') || {}).value || '';
    if (!tbody) return;

    let lista = window.db.getJustificativas(this.turmaId);
    if (filtroStatus) {
      lista = lista.filter(j => j.status === filtroStatus);
    }

    if (badgeCount) badgeCount.textContent = `${lista.length} registro${lista.length !== 1 ? 's' : ''}`;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#64748b;">Nenhum atestado ou justificativa encontrada para os filtros selecionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(j => {
      let badgeBg = '#fef3c7';
      let badgeColor = '#92400e';
      let statusLabel = 'Pendente';

      if (j.status === 'ABONADA') {
        badgeBg = '#dcfce7';
        badgeColor = '#15803d';
        statusLabel = '✓ Abonada (Oficial)';
      } else if (j.status === 'A_COMPENSAR') {
        badgeBg = '#e0e7ff';
        badgeColor = '#3730a3';
        statusLabel = '⚖️ A Compensar';
      } else if (j.status === 'INJUSTIFICADA') {
        badgeBg = '#fee2e2';
        badgeColor = '#991b1b';
        statusLabel = '✕ Injustificada';
      }

      const periodoStr = (j.dataInicio === j.dataFim) ? j.dataInicio : `${j.dataInicio} até ${j.dataFim}`;

      return `
        <tr>
          <td>
            <strong style="color:#0f172a; font-size:13px; display:block;">${j.alunoNome}</strong>
            <span style="font-size:11px; color:#64748b;">Cadastrado por: ${j.cadastradoPor || 'Aluno'}</span>
          </td>
          <td><span class="badge" style="background:#f1f5f9; color:#334155; font-size:11px; padding:3px 6px;">${j.tipo}</span></td>
          <td>📅 ${periodoStr}</td>
          <td style="max-width:240px; font-size:12px; color:#475569;">
            <div>${j.motivo}</div>
            ${j.parecer ? `<div style="font-size:11px; color:#0284c7; margin-top:3px;"><strong>Parecer:</strong> ${j.parecer}</div>` : ''}
          </td>
          <td>
            <span class="badge" style="background:${badgeBg}; color:${badgeColor}; font-weight:700; font-size:11px; padding:4px 8px; border-radius:6px;">
              ${statusLabel}
            </span>
          </td>
          <td>
            <a href="javascript:void(0)" onclick="window.app.mostrarToast('Visualizando documento anexo: ' + '${j.documento}', 'info')" style="color:#0284c7; font-size:12px; font-weight:600; text-decoration:underline;">
              📎 ${j.documento || 'Anexo'}
            </a>
          </td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              ${j.status === 'PENDENTE' ? `
                <button type="button" class="btn btn-sm" onclick="window.portalOrientadorController.homologarAtestado(${j.id}, 'ABONADA')" title="Homologar e Abonar Falta" style="background:#16a34a; color:#fff; border:none; padding:4px 8px; font-size:11px; border-radius:4px;">
                  ✓ Abonar
                </button>
                <button type="button" class="btn btn-sm" onclick="window.portalOrientadorController.homologarAtestado(${j.id}, 'A_COMPENSAR')" title="Encaminhar para Compensação de Horas" style="background:#d97706; color:#fff; border:none; padding:4px 8px; font-size:11px; border-radius:4px;">
                  ⚖️ Compensar
                </button>
                <button type="button" class="btn btn-sm" onclick="window.portalOrientadorController.homologarAtestado(${j.id}, 'INJUSTIFICADA')" title="Recusar como Injustificada" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; font-size:11px; border-radius:4px;">
                  ✕ Recusar
                </button>
              ` : `
                <span style="font-size:11px; color:#64748b;">Homologado por ${j.homologadoPor ? j.homologadoPor.split(' ')[0] : 'Orientador'}</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  homologarAtestado(id, novoStatus) {
    const user = window.auth.getUser() || {};
    let parecer = '';
    if (novoStatus === 'ABONADA') {
      parecer = prompt('Informe o parecer de abono (opcional):', 'Atestado médico homologado conforme normas do regimento.');
      if (parecer === null) return;
    } else if (novoStatus === 'A_COMPENSAR') {
      parecer = prompt('Informe a prescrição da compensação:', 'Encaminhado para 2h de compensação de conteúdo em contraturno.');
      if (parecer === null) return;
    } else {
      parecer = prompt('Informe o motivo da recusa do atestado:', 'Documentação não preenche os requisitos do regimento escolar.');
      if (parecer === null) return;
    }

    const res = window.db.atualizarStatusJustificativa(id, novoStatus, parecer || '', user.nome || 'CARLA BEATRIZ MENDES (Orientação)');
    if (res) {
      window.app.mostrarToast(`Atestado atualizado com status: ${novoStatus}!`, 'success');
      this.recarregarAbaAtiva();
    }
  }

  // =========================================================================
  // 4. COMPENSAÇÕES DE AUSÊNCIA
  // =========================================================================
  renderCompensacoes() {
    if (!window.db) return;
    const tbody = document.getElementById('orientadorCompensacoesTbody');
    const badgeCount = document.getElementById('orientadorCompensacoesCount');
    const filtroStatus = (document.getElementById('filtroStatusCompensacao') || {}).value || '';
    if (!tbody) return;

    let lista = window.db.getCompensacoes(this.turmaId);
    if (filtroStatus) {
      lista = lista.filter(c => c.status === filtroStatus);
    }

    if (badgeCount) badgeCount.textContent = `${lista.length} compensaç${lista.length !== 1 ? 'ões' : 'ão'}`;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:#64748b;">Nenhuma compensação de ausência registrada para os filtros selecionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(c => {
      const isCumprido = (c.status === 'CUMPRIDO');
      return `
        <tr>
          <td>
            <strong style="color:#0f172a; font-size:13px; display:block;">${c.alunoNome}</strong>
            <span style="font-size:11px; color:#64748b;">Cadastrado em: ${c.criadoEm || '—'}</span>
          </td>
          <td><span class="badge" style="background:#fef3c7; color:#92400e; font-weight:700; font-size:11.5px; padding:3px 8px; border-radius:4px;">${c.horasObrigacao} horas</span></td>
          <td style="font-size:12px; color:#475569;">${c.motivoOrigem}</td>
          <td style="font-size:12px;">
            <div>📅 <strong>${c.dataAgendada || c.dataLimite}</strong></div>
            <span style="font-size:11px; color:#64748b;">Turno: ${c.turno || 'Contraturno'}</span>
          </td>
          <td style="max-width:240px; font-size:12px; color:#334155;">${c.atividadeDescricao}</td>
          <td>
            <span class="badge" style="background:${isCumprido ? '#dcfce7' : '#fef3c7'}; color:${isCumprido ? '#15803d' : '#92400e'}; font-weight:700; font-size:11px; padding:4px 8px; border-radius:6px;">
              ${isCumprido ? '✓ Cumprido' : (c.status === 'AGENDADA' ? '📅 Agendada' : '⏳ Pendente')}
            </span>
          </td>
          <td>
            ${!isCumprido ? `
              <button type="button" class="btn btn-sm btn-primary" onclick="window.portalOrientadorController.darBaixaCompensacao(${c.id})" style="font-size:11px; padding:4px 10px; background:#16a34a; border-color:#16a34a;">
                ✓ Dar Baixa
              </button>
            ` : `
              <span style="font-size:11.5px; color:#16a34a; font-weight:600;">Cumprida em ${c.dataCumprimento || ''}</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  darBaixaCompensacao(id) {
    const obs = prompt('Registrar observação de cumprimento da atividade (opcional):', 'Atividade prática entregue e conferida com aproveitamento satisfatório.');
    if (obs === null) return;
    const ok = window.db.registrarCompensacaoCumprida(id, obs);
    if (ok) {
      window.app.mostrarToast('Compensação registrada como CUMPRIDA com sucesso!', 'success');
      this.recarregarAbaAtiva();
    }
  }

  // =========================================================================
  // 5. PRONTUÁRIO & CARÔMETRO UNIFICADO
  // =========================================================================
  renderProntuario() {
    if (!window.db) return;
    const grid = document.getElementById('orientadorCarometroGrid');
    const inputBusca = (document.getElementById('inputBuscaCarometro') || {}).value || '';
    if (!grid) return;

    const alunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS')
      .filter(a => a.statusMatricula === 'ATIVO');

    const sintese = window.db.getSinteseConsolidada(this.turmaId);
    const sinteseMap = new Map();
    (sintese.alunos || []).forEach(item => sinteseMap.set(item.aluno.id, item));

    const contatosHoje = window.db.getContatosHoje();
    const mapContatosHoje = new Map();
    contatosHoje.forEach(c => mapContatosHoje.set(c.alunoId, c));

    const atestadosPendentes = (window.db.data.justificativas || []).filter(j => j.status === 'PENDENTE');
    const compensacoesAbertas = (window.db.data.compensacoes || []).filter(c => c.status !== 'CUMPRIDO');

    let filtrados = alunos;
    if (inputBusca.trim()) {
      const q = inputBusca.toLowerCase().trim();
      filtrados = alunos.filter(a => a.nome.toLowerCase().includes(q) || (a.ra && a.ra.toLowerCase().includes(q)));
    }

    grid.innerHTML = filtrados.map(al => {
      const hist = sinteseMap.get(al.id) || { faltas: 0, atrasos: 0, freqPorcentagem: 100 };
      const avatarSrc = al.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(al.nome)}&background=0284c7&color=fff`;
      const freqPct = hist.freqPorcentagem;

      let freqColor = '#16a34a';
      if (freqPct < 75) freqColor = '#be123c';
      else if (freqPct < 85) freqColor = '#d97706';

      const contatoFeito = mapContatosHoje.has(al.id);
      const temAtestadoPendente = atestadosPendentes.some(j => j.alunoId === al.id);
      const temCompAberta = compensacoesAbertas.some(c => c.alunoId === al.id);
      const temFalta = hist.faltas > 0;

      return `
        <div class="carometro-card" style="position:relative; cursor:pointer;" onclick="window.portalOrientadorController.abrirProntuario(${al.id})">
          <div style="position:absolute; top:12px; right:12px; display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
            ${contatoFeito ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:10px; padding:2px 6px;">📞 Contato Hoje</span>` : ''}
            ${temAtestadoPendente ? `<span class="badge" style="background:#fef3c7; color:#92400e; font-size:10px; padding:2px 6px;">📝 Atestado Pendente</span>` : ''}
            ${temCompAberta ? `<span class="badge" style="background:#f3e8ff; color:#6b21a8; font-size:10px; padding:2px 6px;">⚖️ Compensação</span>` : ''}
            ${temFalta ? `<span class="badge" style="background:#fee2e2; color:#be123c; font-size:10px; padding:2px 6px;">${hist.faltas} Faltas</span>` : ''}
          </div>

          <img src="${avatarSrc}" alt="${al.nome}" class="carometro-photo" style="border-color:${freqColor};">
          <div class="carometro-name" style="text-align:center;">${al.nome}</div>
          <div class="carometro-ra" style="text-align:center;">RA: ${al.ra || 'RA' + String(al.id).padStart(7, '0')}</div>

          <div class="carometro-stats-strip">
            <div style="text-align:center;">
              <span class="carometro-stat-val" style="color:${freqColor};">${freqPct}%</span>
              <span style="font-size:11px; color:#64748b;">Frequência</span>
            </div>
            <div style="text-align:center;">
              <span class="carometro-stat-val">${hist.faltas}</span>
              <span style="font-size:11px; color:#64748b;">Faltas</span>
            </div>
            <div style="text-align:center;">
              <span class="carometro-stat-val">${hist.atrasos}</span>
              <span style="font-size:11px; color:#64748b;">Atrasos</span>
            </div>
          </div>

          <button type="button" class="btn btn-outline btn-sm" style="width:100%; margin-top:12px; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            Ver Prontuário Completo
          </button>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // MODAIS E PRONTUÁRIO UNIFICADO (TIMELINE)
  // =========================================================================
  abrirProntuario(alunoId) {
    if (!window.db) return;
    const prontuario = window.db.getProntuarioAluno(alunoId);
    if (!prontuario) return;

    this.alunoProntuarioAtivo = prontuario.aluno;

    const modal = document.getElementById('modalProntuarioAluno');
    const container = document.getElementById('prontuarioAlunoContent');
    if (!modal || !container) return;

    const al = prontuario.aluno;
    const hist = prontuario.histAluno;
    const avatarSrc = al.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(al.nome)}&background=0284c7&color=fff`;

    container.innerHTML = `
      <div class="prontuario-student-header">
        <img src="${avatarSrc}" alt="${al.nome}" style="width:68px; height:68px; border-radius:50%; object-fit:cover; border:3px solid #0284c7;">
        <div style="flex:1;">
          <h3 style="font-size:17px; font-weight:800; color:#0f172a; margin:0 0 4px 0;">${al.nome}</h3>
          <div style="font-size:12px; color:#475569;">
            RA: <strong>${al.ra || 'RA' + String(al.id).padStart(7, '0')}</strong> &bull; Turma: <strong>${prontuario.turma ? prontuario.turma.codigo : ''}</strong> &bull; Freq: <strong>${hist.freqPorcentagem}%</strong> (${hist.faltas} faltas, ${hist.atrasos} atrasos)
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:4px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <a href="mailto:${al.email || 'aluno@senai.br'}" style="color:#0284c7; text-decoration:none; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              ${al.email || 'aluno@senai.br'}
            </a>
            <a href="https://wa.me/55${(al.telefone || al.celular || '11984521029').replace(/\D/g,'')}" target="_blank" style="color:#15803d; text-decoration:none; display:flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 11.9"></path></svg>
              ${al.telefone || al.celular || '(11) 98452-1029'}
            </a>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button type="button" class="btn btn-primary btn-sm" onclick="window.portalOrientadorController.abrirModalNovoAtendimentoComAluno(${al.id}, '${al.nome.replace(/'/g, "\\'")}')" style="font-size:12px; padding:6px 12px;">
            + Novo Atendimento
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.abrirModalRegistrarContato(${al.id}, '${al.nome.replace(/'/g, "\\'")}')" style="font-size:12px; padding:6px 12px;">
            Registrar Contato
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.portalOrientadorController.exportarProntuarioPDF()" style="font-size:12px; padding:6px 12px; display:flex; align-items:center; gap:5px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/><polyline points="6 9 14 9 14 2"/></svg>
            Exportar PDF
          </button>
        </div>
      </div>

      <div style="border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:14px; color:#0f172a;">Linha do Tempo Cronológica Unificada</strong>
        <span style="font-size:12px; color:#64748b;">${prontuario.timeline.length} registro(s) no histórico</span>
      </div>

      <div class="prontuario-timeline">
        ${prontuario.timeline.length === 0 ? `
          <div style="padding:24px; text-align:center; color:#64748b; font-size:13px;">Nenhum registro anterior no prontuário deste aluno.</div>
        ` : prontuario.timeline.map(item => `
          <div class="timeline-entry ${item.origemTipo.toLowerCase()}">
            <div class="timeline-box">
              <div class="timeline-box-header">
                <div>
                  <strong class="timeline-title">${item.titulo}</strong>
                  <span style="font-size:11px; color:#64748b; margin-left:8px;">📅 ${item.data} ${item.hora && item.hora !== '—' ? 'às ' + item.hora : ''}</span>
                </div>
                <span class="badge" style="background:${item.badgeColor}; color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px;">
                  ${item.badge}
                </span>
              </div>
              <p class="timeline-desc">${item.descricao}</p>
              ${item.detalhes ? `<div style="font-size:11.5px; color:#334155; margin-top:4px;">${item.detalhes}</div>` : ''}
              ${item.encaminhamento ? `<div style="font-size:11.5px; color:#be123c; font-weight:700; margin-top:4px;">⚠️ ${item.encaminhamento}</div>` : ''}
              <div style="font-size:11px; color:#94a3b8; margin-top:6px; text-align:right;">Registrado por: ${item.autor || 'Orientação'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    modal.classList.add('open');
  }

  // --- Modal Registrar Contato Hoje ---
  abrirModalRegistrarContato(alunoId, alunoNome) {
    const modal = document.getElementById('modalRegistrarContatoOrientador');
    if (!modal) return;

    document.getElementById('inputContatoAlunoId').value = alunoId;
    document.getElementById('inputContatoAlunoNome').value = alunoNome;
    document.getElementById('inputContatoData').value = new Date().toISOString().split('T')[0];
    document.getElementById('inputContatoCanal').value = 'WHATSAPP';
    document.getElementById('inputContatoObs').value = '';

    modal.classList.add('open');
  }

  salvarContatoHoje() {
    const alunoId = document.getElementById('inputContatoAlunoId').value;
    const canal = document.getElementById('inputContatoCanal').value;
    const obs = document.getElementById('inputContatoObs').value;
    const user = window.auth.getUser() || {};

    if (!obs.trim()) {
      window.app.mostrarToast('Por favor, informe uma observação sobre o contato.', 'warning');
      return;
    }

    window.db.addContatoOrientacao({
      alunoId: Number(alunoId),
      canal,
      observacao: obs.trim(),
      autor: user.nome || 'CARLA BEATRIZ MENDES (Orientação)'
    });

    window.app.fecharModal('modalRegistrarContatoOrientador');
    window.app.mostrarToast('Contato diário registrado com sucesso!', 'success');
    this.recarregarAbaAtiva();
  }

  // --- Modal Novo Atendimento / Qualidade de Vida ---
  abrirModalNovoAtendimentoComAluno(alunoId, alunoNome) {
    this.abrirModalNovoAtendimento(alunoId);
  }

  abrirModalNovoAtendimentoComData(dateStr) {
    this.abrirModalNovoAtendimento(null, dateStr);
  }

  abrirModalNovoAtendimento(alunoIdPre = null, dataPre = null) {
    const modal = document.getElementById('modalNovoAtendimentoOrientador');
    if (!modal) return;

    const selAluno = document.getElementById('selectAtendimentoAluno');
    if (selAluno && window.db) {
      const alunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS')
        .filter(a => a.statusMatricula === 'ATIVO');
      selAluno.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
      if (alunoIdPre) selAluno.value = alunoIdPre;
    }

    document.getElementById('inputAtendimentoData').value = dataPre || new Date().toISOString().split('T')[0];
    document.getElementById('inputAtendimentoHoraInicio').value = '14:00';
    document.getElementById('inputAtendimentoHoraFim').value = '14:45';
    document.getElementById('selectAtendimentoTipo').value = 'ACOMPANHAMENTO';
    document.getElementById('selectAtendimentoFoco').value = 'QUALIDADE_VIDA';
    document.getElementById('selectAtendimentoEncaminhamento').value = 'NENHUM';
    document.getElementById('inputAtendimentoResumo').value = '';
    document.getElementById('inputAtendimentoCombinados').value = '';

    modal.classList.add('open');
  }

  salvarNovoAtendimento() {
    const alunoId = document.getElementById('selectAtendimentoAluno').value;
    const data = document.getElementById('inputAtendimentoData').value;
    const horaInicio = document.getElementById('inputAtendimentoHoraInicio').value;
    const horaFim = document.getElementById('inputAtendimentoHoraFim').value;
    const tipo = document.getElementById('selectAtendimentoTipo').value;
    const foco = document.getElementById('selectAtendimentoFoco').value;
    const encaminhamento = document.getElementById('selectAtendimentoEncaminhamento').value;
    const resumo = document.getElementById('inputAtendimentoResumo').value;
    const combinados = document.getElementById('inputAtendimentoCombinados').value;
    const user = window.auth.getUser() || {};

    if (!resumo.trim()) {
      window.app.mostrarToast('Descreva o resumo do atendimento / queixa.', 'warning');
      return;
    }

    window.db.addAtendimentoOrientacao({
      alunoId: Number(alunoId),
      turmaId: this.turmaId,
      data,
      horaInicio,
      horaFim,
      tipo,
      foco,
      encaminhamento,
      resumo: resumo.trim(),
      combinados: combinados.trim(),
      status: 'REALIZADO',
      autor: user.nome || 'CARLA BEATRIZ MENDES'
    });

    window.app.fecharModal('modalNovoAtendimentoOrientador');
    window.app.mostrarToast('Atendimento de qualidade de vida registrado com sucesso!', 'success');
    this.recarregarAbaAtiva();
  }

  // --- Modal Agendar Compensação ---
  abrirModalAgendarCompensacao(alunoId, alunoNome) {
    const modal = document.getElementById('modalAgendarCompensacaoOrientador');
    if (!modal) return;

    document.getElementById('inputCompensacaoAlunoId').value = alunoId;
    document.getElementById('inputCompensacaoAlunoNome').value = alunoNome;
    document.getElementById('inputCompensacaoHoras').value = '2';
    document.getElementById('inputCompensacaoDataAgendada').value = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    document.getElementById('selectCompensacaoTurno').value = 'CONTRATURNO';
    document.getElementById('inputCompensacaoMotivo').value = 'Compensação decorrente de ausência / atrasos';
    document.getElementById('inputCompensacaoAtividade').value = 'Realização e entrega de atividade prática no laboratório.';

    modal.classList.add('open');
  }

  salvarAgendamentoCompensacao() {
    const alunoId = document.getElementById('inputCompensacaoAlunoId').value;
    const alunoNome = document.getElementById('inputCompensacaoAlunoNome').value;
    const horasObrigacao = document.getElementById('inputCompensacaoHoras').value;
    const dataAgendada = document.getElementById('inputCompensacaoDataAgendada').value;
    const turno = document.getElementById('selectCompensacaoTurno').value;
    const motivoOrigem = document.getElementById('inputCompensacaoMotivo').value;
    const atividadeDescricao = document.getElementById('inputCompensacaoAtividade').value;
    const user = window.auth.getUser() || {};

    window.db.addCompensacao({
      alunoId: Number(alunoId),
      alunoNome,
      turmaId: this.turmaId,
      motivoOrigem: motivoOrigem.trim(),
      horasObrigacao: Number(horasObrigacao),
      dataAgendada,
      turno,
      atividadeDescricao: atividadeDescricao.trim(),
      status: 'AGENDADA',
      registradoPor: user.nome || 'CARLA BEATRIZ MENDES (Orientação)'
    });

    window.app.fecharModal('modalAgendarCompensacaoOrientador');
    window.app.mostrarToast('Compensação de ausência agendada com sucesso!', 'success');
    this.recarregarAbaAtiva();
  }

  // --- Modal Validar Atestado do Aluno ---
  abrirModalValidarAtestado(justificativaId) {
    const just = (window.db.data.justificativas || []).find(j => j.id === Number(justificativaId));
    if (!just) return;

    const modal = document.getElementById('modalValidarAtestadoOrientador');
    if (!modal) return;

    document.getElementById('validarAtestadoId').value = just.id;
    document.getElementById('validarAtestadoAlunoNome').textContent = just.alunoNome;
    document.getElementById('validarAtestadoTipo').textContent = just.tipo;
    document.getElementById('validarAtestadoPeriodo').textContent = `${just.dataInicio} até ${just.dataFim}`;
    document.getElementById('validarAtestadoMotivo').textContent = just.motivo;
    document.getElementById('validarAtestadoParecer').value = '';

    modal.classList.add('open');
  }

  confirmarValidacaoAtestado(novoStatus) {
    const id = document.getElementById('validarAtestadoId').value;
    const parecer = document.getElementById('validarAtestadoParecer').value;
    const user = window.auth.getUser() || {};

    const res = window.db.atualizarStatusJustificativa(id, novoStatus, parecer, user.nome || 'CARLA BEATRIZ MENDES (Orientação)');
    if (res) {
      window.app.fecharModal('modalValidarAtestadoOrientador');
      window.app.mostrarToast(`Atestado processado como ${novoStatus}!`, 'success');
      this.recarregarAbaAtiva();
    }
  }

  // =========================================================================
  // EXPORTAÇÃO PDF
  // =========================================================================
  exportarProntuarioPDF() {
    window.print();
    window.app && window.app.mostrarToast('Use "Salvar como PDF" na janela de impressão.', 'info');
  }

  exportarAtendimentosPDF() {
    window.print();
    window.app && window.app.mostrarToast('Use "Salvar como PDF" na janela de impressão.', 'info');
  }

  exportarEncaminhamentoPDF(atendimentoId) {
    if (!window.db) return;
    const atend = (window.db.data.atendimentosOrientacao || []).find(a => a.id === Number(atendimentoId));
    if (!atend) return;
    const aluno = (window.db.data.alunos || []).find(a => a.id === atend.alunoId);
    const nomeAluno = aluno ? aluno.nome : 'Aluno';
    const user = window.auth ? window.auth.getUser() : {};
    const conteudo = `
      <html><head><title>Encaminhamento — ${nomeAluno}</title>
      <style>body{font-family:Arial,sans-serif;padding:30px;color:#111;}h2{color:#0284c7;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:8px;font-size:13px;}th{background:#f1f5f9;}</style>
      </head><body>
      <h2>Encaminhamento de Orientação Educacional</h2>
      <p><strong>Aluno:</strong> ${nomeAluno} &nbsp;|&nbsp; <strong>Data:</strong> ${atend.data} &nbsp;|&nbsp; <strong>Tipo:</strong> ${atend.tipo}</p>
      <p><strong>Foco:</strong> ${atend.foco} &nbsp;|&nbsp; <strong>Encaminhamento:</strong> ${atend.encaminhamento}</p>
      <p><strong>Resumo:</strong> ${atend.resumo}</p>
      <p><strong>Combinados:</strong> ${atend.combinados || '—'}</p>
      <hr><p style="font-size:11px;color:#666;">Registrado por: ${atend.autor || (user && user.nome) || 'Orientação'} — SENAI</p>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win.document.write(conteudo);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }
}

// Instância global
window.portalOrientadorController = new PortalOrientadorController();
