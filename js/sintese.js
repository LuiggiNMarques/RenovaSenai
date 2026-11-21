/**
 * =============================================================================
 * RENOVA SENAI - SÍNTESE DO PROFESSOR (sintese.js)
 * Design System Oficial do Figma:
 * - Sub-abas: Síntese Acadêmica, Ocorrências, Análise da Turma
 * - Tabela: Nº, ALUNO, MATRÍCULA, DIAS, AULAS, PRESENÇAS, ATRASOS, FALTAS, COMPENSADAS, % FREQUÊNCIA (badge vermelho se <75%), MÉDIA
 * - Resumo da turma no rodapé
 * =============================================================================
 */

class SinteseController {
  constructor() {
    this.turmaId = 1;
    this.ucId = 1;
    this.abaAtiva = 'academica';
  }

  init() {
    if (window.app && window.app.turmaAtiva) {
      this.turmaId = window.app.turmaAtiva.id || 1;
      this.ucId = window.app.turmaAtiva.ucId || 1;
    }
    this.popularSelectTurma();
    this.alternarAba(this.abaAtiva);
  }

  popularSelectTurma() {
    const sel = document.getElementById('selectSinteseTurma');
    if (!sel || !window.db) return;

    const turmas = (window.db.getTurmas && window.db.getTurmas('EM_ANDAMENTO')) || (window.db.data && window.db.data.turmas) || [];
    if (turmas.length === 0) return;

    sel.innerHTML = turmas.map(t =>
      `<option value="${t.id}" ${Number(t.id) === Number(this.turmaId) ? 'selected' : ''}>${t.codigo} — ${t.nome || t.ucNome || ''}</option>`
    ).join('');

    this.atualizarHeaderTurma();
  }

  onTurmaChange(turmaId) {
    this.turmaId = Number(turmaId);
    if (window.app && window.db && window.db.data) {
      window.app.turmaAtiva = (window.db.data.turmas || []).find(t => Number(t.id) === this.turmaId);
      if (window.app.turmaAtiva) {
        this.ucId = window.app.turmaAtiva.ucId || 1;
      }
    }
    this.atualizarHeaderTurma();
    this.renderizarSintese();
    if (window.app && typeof window.app.renderizarChecklistFechamentoSintese === 'function') {
      window.app.renderizarChecklistFechamentoSintese();
    }
  }

  atualizarHeaderTurma() {
    const headerInfo = document.getElementById('sinteseTurmaHeaderInfo');
    if (!headerInfo || !window.db) return;
    const turma = (window.db.data.turmas || []).find(t => Number(t.id) === Number(this.turmaId));
    if (turma) {
      headerInfo.innerHTML = `Curso: <strong>${turma.nome || turma.ucNome || 'Técnico SENAI'}</strong>`;
    }
  }

  alternarAba(aba) {
    this.abaAtiva = aba;
    const btnAc = document.getElementById('btnSinteseTabAcademica');
    const btnOc = document.getElementById('btnSinteseTabOcorrencias');
    const btnAn = document.getElementById('btnSinteseTabAnalise');

    const viewAc = document.getElementById('sinteseSubViewAcademica');
    const viewOc = document.getElementById('sinteseSubViewOcorrencias');
    const viewAn = document.getElementById('sinteseSubViewAnalise');

    if (btnAc) btnAc.classList.toggle('active', aba === 'academica');
    if (btnOc) btnOc.classList.toggle('active', aba === 'ocorrencias');
    if (btnAn) btnAn.classList.toggle('active', aba === 'analise');

    if (viewAc) viewAc.style.display = (aba === 'academica') ? 'block' : 'none';
    if (viewOc) viewOc.style.display = (aba === 'ocorrencias') ? 'block' : 'none';
    if (viewAn) viewAn.style.display = (aba === 'analise') ? 'block' : 'none';

    if (aba === 'academica') {
      this.renderizarSintese();
    }
  }

  renderizarSintese() {
    const tbody = document.getElementById('sinteseFigmaTableBody');
    if (!tbody || !window.db) return;

    const sintese = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
    const listaAlunos = sintese.alunos || [];

    let totalPresencas = 0;
    let totalFaltas = 0;
    let totalCompensadas = 0;

    tbody.innerHTML = listaAlunos.map((item, idx) => {
      const numero = idx + 1;
      const aluno = item.aluno;
      const avatarSrc = aluno.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff`;

      const dias = item.dias !== undefined ? item.dias : (sintese.totalDias || 0);
      const aulas = item.totalAulasDadas || 0;
      const presencas = item.presencas || 0;
      const atrasos = item.atrasos || 0;
      const faltas = item.faltas || 0;
      const compensadas = item.faltasCompensadas || 0;
      const pct = Number(item.freqPorcentagem !== undefined ? item.freqPorcentagem : 100);
      
      const mediaValor = item.media !== undefined ? (item.media > 10 ? item.media / 10 : item.media) : 0;
      const mediaStr = Number(mediaValor).toFixed(1);

      totalPresencas += presencas;
      totalFaltas += faltas;
      totalCompensadas += compensadas;

      const isCritico = pct < 75.0;
      const pctColor = isCritico ? '#e30613' : '#15803d';
      const pctBg = isCritico ? '#fee2e2' : '#dcfce7';

      const situacao = item.situacaoFinal || 'Aprovado';
      let sitBg = '#dcfce7';
      let sitColor = '#15803d';
      if (situacao.includes('Nota e Falta')) {
        sitBg = '#fee2e2';
        sitColor = '#991b1b';
      } else if (situacao.includes('Falta')) {
        sitBg = '#fff7ed';
        sitColor = '#c2410c';
      } else if (situacao.includes('Nota') || situacao.includes('Retido')) {
        sitBg = '#fef2f2';
        sitColor = '#b91c1c';
      }

      return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #64748b;">${numero}</td>
          <td>
            <div class="aluno-cell-figma">
              <img src="${avatarSrc}" alt="${aluno.nome}" class="aluno-avatar-figma" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff'">
              <span class="aluno-nome-figma">${aluno.nome}</span>
            </div>
          </td>
          <td style="color: #64748b; font-size: 13px;">${aluno.ra}</td>
          <td style="text-align: center;">${dias}</td>
          <td style="text-align: center;">${aulas}</td>
          <td style="text-align: center; font-weight: 600;">${presencas}</td>
          <td style="text-align: center; color: #d97706;">${atrasos}</td>
          <td style="text-align: center; color: ${faltas > 10 ? '#e30613' : '#64748b'}; font-weight: 600;">${faltas}</td>
          <td style="text-align: center;">${compensadas}</td>
          <td style="text-align: center;">
            <span class="badge-situacao" style="background: ${pctBg}; color: ${pctColor}; font-weight: 700;">${pct.toFixed(1)}%</span>
          </td>
          <td style="text-align: center; font-weight: 700;">${mediaStr}</td>
          <td style="text-align: center;">
            <span class="badge-situacao" style="background: ${sitBg}; color: ${sitColor}; font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11.5px; white-space: nowrap;">${situacao}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Atualizar resumo da turma no rodapé
    const summaryBar = document.querySelector('.sintese-summary-bar');
    if (summaryBar) {
      const totalAlunos = listaAlunos.length;
      const totalAulas = sintese.totalAulasDadas || 0;
      const totalConsiderado = (totalAulas * totalAlunos) || 1;
      const pctPresencaTurma = totalAulas > 0 
        ? ((totalPresencas / totalConsiderado) * 100).toFixed(1) 
        : '100,0';
      const pctColor = Number(pctPresencaTurma) >= 75 ? '#16a34a' : '#e30613';

      summaryBar.innerHTML = `
        <span>Alunos: <strong>${totalAlunos}</strong></span>
        <span>Aulas: <strong>${totalAulas}</strong></span>
        <span>Presenças: <strong>${totalPresencas.toLocaleString('pt-BR')}</strong></span>
        <span>Faltas: <strong>${totalFaltas.toLocaleString('pt-BR')}</strong></span>
        <span>Faltas Comp.: <strong>${totalCompensadas.toLocaleString('pt-BR')}</strong></span>
        <span>% Presença: <strong style="color: ${pctColor};">${pctPresencaTurma.replace('.', ',')}%</strong></span>
      `;
    }
  }
}

window.sinteseController = new SinteseController();
