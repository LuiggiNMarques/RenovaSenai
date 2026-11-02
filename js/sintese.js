/**
 * =============================================================================
 * RENOVA SENAI - SÍNTESE DO PROFESSOR (sintese.js)
 * Consolidação Automática de Dados Acadêmicos (Frequência, Compensações, Médias)
 * =============================================================================
 */

class SinteseController {
  constructor() {
    this.turmaId = 1;
    this.ucId = 1;
  }

  init() {
    this.carregarTurmasSelect();
    this.carregarUCsSelect();
    this.renderizar();
  }

  carregarTurmasSelect() {
    const sel = document.getElementById('selectSinteseTurma');
    if (!sel) return;
    const turmas = window.db.getTurmas('EM_ANDAMENTO');
    sel.innerHTML = turmas.map(t => `<option value="${t.id}">${t.codigo} - ${t.nome}</option>`).join('');
    sel.value = this.turmaId;
  }

  carregarUCsSelect() {
    const sel = document.getElementById('selectSinteseUC');
    if (!sel) return;
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    sel.innerHTML = ucs.map(u => `<option value="${u.id}">${u.codigo} - ${u.nome}</option>`).join('');
    if (ucs.length) {
      this.ucId = ucs[0].id;
      sel.value = this.ucId;
    }
  }

  onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.carregarUCsSelect();
    this.renderizar();
  }

  onUCChange(novaUCId) {
    this.ucId = Number(novaUCId);
    this.renderizar();
  }

  renderizar() {
    const tbody = document.getElementById('sinteseTableBody');
    const headerInfo = document.getElementById('sinteseHeaderInfo');
    const resumoContainer = document.getElementById('sinteseResumoCards');
    const legendaContainer = document.getElementById('sinteseLegenda');
    if (!tbody) return;

    const dados = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
    const turma = window.db.getTurmaById(this.turmaId);
    const uc = window.db.getUCById(this.ucId);

    if (headerInfo && turma && uc) {
      headerInfo.innerHTML = `
        <div style="display:flex; gap:24px; flex-wrap:wrap; font-size:13.5px;">
          <div>Turma: <strong>${turma.codigo}</strong> (${turma.periodo})</div>
          <div>Unidade Curricular: <strong>${uc.nome}</strong></div>
          <div>Carga Horária Total: <strong>${uc.cargaHoraria}h</strong></div>
          <div>Aulas Ministradas até o momento: <strong>${dados.totalAulasDadas} aulas</strong></div>
        </div>
      `;
    }

    // Calcular estatísticas para cards de resumo
    const stats = this.calcularEstatisticasTurma(dados.alunos);
    this.renderizarCardsResumo(resumoContainer, stats, dados.totalAulasDadas);

    tbody.innerHTML = dados.alunos.map(item => {
      const { aluno, totalAulasDadas, presencas, faltas, atrasos, dispensas, faltasCompensadas, freqPorcentagem, media } = item;
      const ehStatusX = (aluno.statusMatricula === 'TRANCADO' || aluno.statusMatricula === 'CANCELADO');

      let freqClass = 'good';
      if (freqPorcentagem < 75) {
        freqClass = 'danger';
      } else if (freqPorcentagem < 85) {
        freqClass = 'warning';
      }

      let mediaClass = 'approved';
      if (media < 50) mediaClass = 'failed';
      else if (media < 70) mediaClass = 'recovery';

      return `
        <tr class="${ehStatusX ? 'row-status-x' : ''}">
          <td style="font-weight: 700; color: var(--text-muted);">${aluno.numeroChamada}</td>
          <td>
            <div class="student-cell-modern">
              <img src="${aluno.foto}" alt="${aluno.nome}" class="student-avatar-modern" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=c3161c&color=fff'">
              <div class="student-meta-modern">
                <span class="student-name-modern">${aluno.nome}</span>
                <span class="student-ra-modern">${aluno.ra} &bull; Subturma ${aluno.subturma}</span>
                <span class="student-subturma-badge">${aluno.subturma}</span>
              </div>
            </div>
          </td>
          <td class="count-cell" style="text-align: center;">${totalAulasDadas}</td>
          <td class="count-cell presencas" style="text-align: center;">${presencas}</td>
          <td class="count-cell faltas" style="text-align: center;">${faltas}</td>
          <td class="count-cell atrasos" style="text-align: center;">${atrasos}</td>
          <td class="count-cell dispensas" style="text-align: center;">${dispensas}</td>
          <td class="count-cell compensadas" style="text-align: center;">${faltasCompensadas}</td>
          <td class="freq-cell ${freqClass}" style="text-align: center;">${freqPorcentagem}%</td>
          <td style="text-align: center;">
            <div class="media-display ${mediaClass}">${ehStatusX ? '-' : media.toFixed(1)}</div>
          </td>
        </tr>
      `;
    }).join('');

    // Limpar legenda de situação (removida conforme diretriz pedagógica)
    this.renderizarLegenda(legendaContainer);
  }

  calcularEstatisticasTurma(alunos) {
    const ativos = alunos.filter(item => item.aluno.statusMatricula === 'ATIVO');
    if (!ativos.length) {
      return { mediaTurma: 0, freqMedia: 0, total: 0 };
    }

    let somaMedias = 0, somaFreq = 0;
    ativos.forEach(item => {
      somaMedias += item.media;
      somaFreq += item.freqPorcentagem;
    });

    return {
      mediaTurma: (somaMedias / ativos.length).toFixed(1),
      freqMedia: Math.round(somaFreq / ativos.length),
      total: ativos.length
    };
  }

  renderizarCardsResumo(container, stats, totalAulas) {
    if (!container) return;
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Média Geral da Turma</span>
          <div class="stat-card-icon grades"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
        </div>
        <div class="stat-card-value">${stats.mediaTurma}</div>
        <div class="stat-card-sublabel">${stats.total} alunos ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Frequência Média</span>
          <div class="stat-card-icon attendance"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
        </div>
        <div class="stat-card-value" style="color: ${stats.freqMedia >= 75 ? '#16a34a' : stats.freqMedia >= 60 ? '#d97706' : 'var(--senai-red)'}">${stats.freqMedia}%</div>
        <div class="stat-card-sublabel">Média consolidada da turma</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Aulas Ministradas</span>
          <div class="stat-card-icon attendance"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
        </div>
        <div class="stat-card-value" style="color: var(--text-main);">${totalAulas}</div>
        <div class="stat-card-sublabel">Aulas no Diário de Classe</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Total de Alunos</span>
          <div class="stat-card-icon attendance"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
        </div>
        <div class="stat-card-value" style="color: var(--text-main);">${stats.total}</div>
        <div class="stat-card-sublabel">Alunos acompanhados</div>
      </div>
    `;
  }

  renderizarLegenda(container) {
    if (!container) return;
    container.innerHTML = '';
  }
}

window.sinteseController = new SinteseController();
