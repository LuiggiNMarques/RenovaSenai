/**
 * =============================================================================
 * RENOVA SENAI - JUSTIFICATIVAS E ATESTADOS (justificativas.js)
 * Cadastro pela Coordenação / Secretaria que bloqueia faltas automaticamente
 * =============================================================================
 */

class JustificativasController {
  init() {
    this.carregarAlunosSelect();
    this.renderizar();
  }

  carregarAlunosSelect() {
    const sel = document.getElementById('selectJustificativaAluno');
    if (!sel) return;
    const alunos = window.db.getAlunosPorTurma(1);
    sel.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome} (${a.ra})</option>`).join('');
  }

  renderizar() {
    const tbody = document.getElementById('justificativasTableBody');
    if (!tbody) return;

    const lista = window.db.getJustificativas();
    tbody.innerHTML = lista.map(j => `
      <tr>
        <td><strong>${j.alunoNome}</strong></td>
        <td><span class="justified-pill-badge"> ${j.tipo}</span></td>
        <td>${j.dataInicio} até ${j.dataFim}</td>
        <td>
          <div style="font-weight:600;">${j.motivo}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">Doc: ${j.documento || 'Anexado digitalmente'}</div>
        </td>
        <td>${j.cadastradoPor}</td>
        <td>
          <span style="display:inline-flex; align-items:center; gap:4px; font-weight:700; color:#16a34a; font-size:12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Homologado
          </span>
        </td>
      </tr>
    `).join('');
  }

  salvarNovaJustificativa() {
    const alunoId = document.getElementById('selectJustificativaAluno').value;
    const tipo = document.getElementById('selectJustificativaTipo').value;
    const dataInicio = document.getElementById('inputJustificativaInicio').value;
    const dataFim = document.getElementById('inputJustificativaFim').value;
    const motivo = document.getElementById('inputJustificativaMotivo').value;

    if (!dataInicio || !dataFim || !motivo) {
      window.app.mostrarToast('Preencha as datas e o motivo do atestado.', 'warning');
      return;
    }

    window.db.addJustificativa({
      alunoId: Number(alunoId),
      tipo,
      dataInicio,
      dataFim,
      motivo,
      documento: 'comprovante_homologado_' + Date.now() + '.pdf',
      cadastradoPor: window.auth.getUser() ? window.auth.getUser().nome : 'COORDENAÇÃO PEDAGÓGICA'
    });

    window.app.fecharModal('modalNovaJustificativa');
    window.app.mostrarToast('Justificativa cadastrada com sucesso! Faltas no período serão bloqueadas automaticamente.', 'success');
    this.renderizar();

    // Recarregar diário para refletir o bloqueio
    if (window.diarioController) {
      window.diarioController.carregarChamada();
    }
  }
}

window.justificativasController = new JustificativasController();
