/**
 * =============================================================================
 * RENOVA SENAI - MÓDULO DE SUBTURMAS (subturmas.js)
 * Gerenciamento Manual de Subturmas A e B
 * =============================================================================
 */

class SubturmasController {
  constructor() {
    this.turmaId = 1;
    this.modoSelecao = false;
    this.alunosSelecionados = new Set(); // IDs dos alunos marcados para Subturma A
  }

  init() {
    this.carregarTurmasSelect();
    this.renderizarSubturmas();
  }

  carregarTurmasSelect() {
    const sel = document.getElementById('selectSubturmaTurma');
    if (!sel) return;
    const turmas = window.db.getTurmas('EM_ANDAMENTO');
    sel.innerHTML = turmas.map(t => `<option value="${t.id}">${t.codigo} - ${t.nome}</option>`).join('');
    sel.value = this.turmaId;
  }

  onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.cancelarSelecao();
    this.renderizarSubturmas();
  }

  // --- MODO SELEÇÃO MANUAL ---
  iniciarSelecao() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    this.modoSelecao = true;
    this.alunosSelecionados.clear();
    
    // Pré-marcar alunos que já estão na Subturma A
    const alunosA = window.db.getAlunosPorTurma(this.turmaId, 'A');
    alunosA.forEach(a => this.alunosSelecionados.add(a.id));
    
    this.atualizarUISelecao();
    this.renderizarSubturmas();
  }

  cancelarSelecao() {
    this.modoSelecao = false;
    this.alunosSelecionados.clear();
    this.atualizarUISelecao();
    this.renderizarSubturmas();
  }

  aplicarSelecao() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }

    const todosAlunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS');
    const ativos = todosAlunos.filter(a => a.statusMatricula === 'ATIVO');
    
    // Aplicar: marcados -> A, não marcados -> B
    ativos.forEach(aluno => {
      const novaSubturma = this.alunosSelecionados.has(aluno.id) ? 'A' : 'B';
      if (aluno.subturma !== novaSubturma) {
        window.db.transferirAlunoSubturma(aluno.id, novaSubturma);
      }
    });

    this.cancelarSelecao();
    window.app.mostrarToast('Subturmas configuradas manualmente com sucesso!', 'success');
  }

  removerDivisao() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    const todosAlunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS');
    todosAlunos.forEach(aluno => {
      window.db.transferirAlunoSubturma(aluno.id, null);
    });
    this.cancelarSelecao();
    this.renderizarSubturmas();
    window.app.mostrarToast('Divisão de subturmas desfeita. Todos os alunos estão na Turma Geral.', 'info');
  }

  atualizarUISelecao() {
    const selectionBar = document.getElementById('subturmaSelectionBar');
    const btnConfigurar = document.querySelector('button[onclick*="iniciarSelecao"]');
    
    if (this.modoSelecao) {
      if (selectionBar) selectionBar.style.display = 'block';
      if (btnConfigurar) {
        btnConfigurar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Sair da Seleção`;
        btnConfigurar.onclick = () => this.cancelarSelecao();
        btnConfigurar.classList.remove('btn-primary');
        btnConfigurar.classList.add('btn-secondary');
      }
    } else {
      if (selectionBar) selectionBar.style.display = 'none';
      if (btnConfigurar) {
        btnConfigurar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg> Selecionar Manualmente (A/B)`;
        btnConfigurar.onclick = () => this.iniciarSelecao();
        btnConfigurar.classList.remove('btn-secondary');
        btnConfigurar.classList.add('btn-primary');
      }
    }
  }

  // --- RENDERIZAÇÃO ---
  renderizarSubturmas() {
    const colA = document.getElementById('subturmaListA');
    const colB = document.getElementById('subturmaListB');
    if (!colA || !colB) return;

    const todosAlunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS');
    const ativos = todosAlunos.filter(a => a.statusMatricula === 'ATIVO');
    const alunosA = ativos.filter(a => a.subturma === 'A');
    const alunosB = ativos.filter(a => a.subturma === 'B');

    // Atualizar contadores
    const countA = document.getElementById('subturmaCountA');
    const countB = document.getElementById('subturmaCountB');
    if (countA) countA.innerText = `${alunosA.length} alunos`;
    if (countB) countB.innerText = `${alunosB.length} alunos`;

    if (this.modoSelecao) {
      const renderSelecaoItem = (aluno) => {
        const checked = this.alunosSelecionados.has(aluno.id) ? 'checked' : '';
        return `
          <div class="subturma-student-item selection-mode" style="background: ${this.alunosSelecionados.has(aluno.id) ? 'rgba(195,22,28,0.05)' : 'var(--bg-card)'}; border-color: ${this.alunosSelecionados.has(aluno.id) ? 'var(--senai-red)' : 'var(--border-color)'};">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; width:100%; padding:4px 0;">
              <input type="checkbox" class="selection-checkbox" value="${aluno.id}" ${checked} 
                onchange="window.subturmasController.toggleSelecao(${aluno.id}, this.checked)"
                style="width:18px; height:18px; accent-color: var(--senai-red); flex-shrink:0;">
              <img src="${aluno.foto}" alt="${aluno.nome}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}'">
              <div style="flex:1;">
                <div style="font-weight:600; font-size:13.5px; color:var(--text-main);">${aluno.nome}</div>
                <div style="font-size:11.5px; color:var(--text-muted);">Nº ${aluno.numeroChamada} &bull; ${aluno.ra}</div>
              </div>
              <span class="portal-tag-pill" style="font-size:10px; ${this.alunosSelecionados.has(aluno.id) ? 'background:rgba(195,22,28,0.15); color:var(--senai-red);' : 'background:var(--bg-card-subtle); color:var(--text-muted);'}">
                ${this.alunosSelecionados.has(aluno.id) ? '→ Subturma A' : '→ Subturma B'}
              </span>
            </label>
          </div>
        `;
      };

      colA.innerHTML = ativos.map(renderSelecaoItem).join('');
      colB.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.5;">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
          </svg>
          <div style="font-size:14px; font-weight:600; margin-bottom:4px;">Modo de Seleção Manual Ativo</div>
          <div style="font-size:12px;">Marque os alunos para a <strong>Subturma A</strong> na coluna ao lado.<br>Os não marcados irão para a <strong>Subturma B</strong> ao clicar em "Aplicar".</div>
        </div>
      `;
    } else {
      if (alunosA.length === 0 && alunosB.length === 0) {
        colA.innerHTML = `
          <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
            <p style="font-size:13.5px; margin-bottom:12px;">Nenhuma subturma configurada ainda para esta turma.</p>
            <button type="button" class="btn btn-sm btn-primary" onclick="window.subturmasController.iniciarSelecao()">
              Configurar Subturmas Manualmente
            </button>
          </div>
        `;
        colB.innerHTML = `
          <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
            <p style="font-size:13px;">Todos os ${ativos.length} alunos estão na Turma Geral.</p>
          </div>
        `;
        return;
      }

      const renderItem = (aluno, destino) => `
        <div class="subturma-student-item">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${aluno.foto}" alt="${aluno.nome}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}'">
            <div>
              <div style="font-weight:600; font-size:13.5px; color:var(--text-main);">${aluno.nome}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">Nº ${aluno.numeroChamada} &bull; ${aluno.ra}</div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline" onclick="window.subturmasController.transferir(${aluno.id}, '${destino}')" title="Mover para Subturma ${destino}">
            Mover para ${destino} &rarr;
          </button>
        </div>
      `;

      colA.innerHTML = alunosA.length ? alunosA.map(a => renderItem(a, 'B')).join('') : '<p style="color:var(--text-muted); font-size:13px; padding:12px;">Nenhum aluno na Subturma A.</p>';
      colB.innerHTML = alunosB.length ? alunosB.map(b => renderItem(b, 'A')).join('') : '<p style="color:var(--text-muted); font-size:13px; padding:12px;">Nenhum aluno na Subturma B.</p>';
    }
  }

  toggleSelecao(alunoId, checked) {
    if (checked) {
      this.alunosSelecionados.add(alunoId);
    } else {
      this.alunosSelecionados.delete(alunoId);
    }
    this.renderizarSubturmas();
  }

  transferir(alunoId, novaSubturma) {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    window.db.transferirAlunoSubturma(alunoId, novaSubturma);
    this.renderizarSubturmas();
    window.app.mostrarToast(`Aluno transferido para a Subturma ${novaSubturma}!`, 'success');
  }
}

window.subturmasController = new SubturmasController();
