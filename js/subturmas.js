/**
 * =============================================================================
 * RENOVA SENAI - MÓDULO DE SUBTURMAS (subturmas.js)
 * Divisão de Subturmas A e B, Seleção Manual, Algoritmos e Transferência
 * =============================================================================
 */

class SubturmasController {
  constructor() {
    this.turmaId = 1;
    this.modoSelecao = false;
    this.alunosSelecionados = new Set(); // IDs dos alunos marcados para Subturma A
  }

  init() {
    this.renderizarSubturmaFigma();
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
    this.cancelarSelecao(); // Reset modo seleção ao trocar turma
    this.renderizarSubturmas();
  }

  // --- MODO SELEÇÃO ---
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
    if (this.alunosSelecionados.size === 0) {
      window.app.mostrarToast('Selecione pelo menos um aluno para a Subturma A.', 'warning');
      return;
    }

    const todosAlunos = window.db.getAlunosPorTurma(this.turmaId, 'TODOS');
    const ativos = todosAlunos.filter(a => a.statusMatricula === 'ATIVO');
    
    if (this.alunosSelecionados.size === ativos.length) {
      window.app.mostrarToast('Todos os alunos estão na Subturma A. A Subturma B ficaria vazia.', 'warning');
      return;
    }

    // Aplicar: selecionados -> A, não selecionados -> B
    ativos.forEach(aluno => {
      const novaSubturma = this.alunosSelecionados.has(aluno.id) ? 'A' : 'B';
      if (aluno.subturma !== novaSubturma) {
        window.db.transferirAlunoSubturma(aluno.id, novaSubturma);
      }
    });

    this.cancelarSelecao();
    window.app.mostrarToast('Subturmas configuradas com sucesso! Selecionados → A | Restantes → B', 'success');
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
      // Esconder botões de divisão automática durante seleção
      document.querySelectorAll('#tabSection_subturmas .btn-outline.btn-sm').forEach(btn => {
        if (!btn.onclick.toString().includes('transferir')) btn.style.display = 'none';
      });
    } else {
      if (selectionBar) selectionBar.style.display = 'none';
      if (btnConfigurar) {
        btnConfigurar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg> Configurar Seleção (A)`;
        btnConfigurar.onclick = () => this.iniciarSelecao();
        btnConfigurar.classList.remove('btn-secondary');
        btnConfigurar.classList.add('btn-primary');
      }
      document.querySelectorAll('#tabSection_subturmas .btn-outline.btn-sm').forEach(btn => {
        btn.style.display = '';
      });
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
      // MODO SELEÇÃO: Lista única com checkboxes para Subturma A
      const todosIds = new Set(ativos.map(a => a.id));
      
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
          <div style="font-size:14px; font-weight:600; margin-bottom:4px;">Modo Seleção Ativo</div>
          <div style="font-size:12px;">Marque os alunos para a <strong>Subturma A</strong> na coluna ao lado.<br>Os não marcados irão automaticamente para a <strong>Subturma B</strong> ao clicar em "Aplicar".</div>
        </div>
      `;
    } else {
      // MODO VISUALIZAÇÃO/EDIÇÃO NORMAL: Duas colunas com botões de mover
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
    // Re-renderizar apenas para atualizar estilos visuais dos checkboxes
    this.renderizarSubturmas();
  }

  // --- AÇÕES ---
  dividirAutomaticamente(metodo) {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    window.db.dividirSubturmas(this.turmaId, metodo);
    this.cancelarSelecao(); // Sai do modo seleção se estiver ativo
    this.renderizarSubturmas();
    const metodosNomes = {
      pares_impares: 'Pares e Ímpares',
      sequencial: 'Sequencial (Metade A / Metade B)',
      aleatorio: 'Distribuição Aleatória Equilibrada'
    };
    window.app.mostrarToast(`Subturmas redistribuídas com sucesso via: ${metodosNomes[metodo]}!`, 'success');
  }

  transferir(alunoId, novaSubturma) {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    window.db.transferirAlunoSubturma(alunoId, novaSubturma);
    this.renderizarSubturmas();
    window.app.mostrarToast(`Aluno transferido para a Subturma ${novaSubturma}! Registros de chamadas históricas preservados.`, 'success');
  }

  // --- MÉTODOS OFICIAIS DO FIGMA: CRIAR SUBTURMA ---
  renderizarSubturmaFigma() {
    const tbody = document.getElementById('subturmaTableBodyFigma');
    if (!tbody) return;

    let alunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, 'TODOS') : [];
    if (this.termoFiltro) {
      alunos = alunos.filter(a => a.nome.toLowerCase().includes(this.termoFiltro) || a.ra.includes(this.termoFiltro));
    }

    const countPill = document.getElementById('subturmaSelecionadosTexto');
    if (countPill) countPill.textContent = `Selecionados: ${this.alunosSelecionados.size} de ${alunos.length}`;

    tbody.innerHTML = alunos.map(aluno => {
      const isChecked = this.alunosSelecionados.has(aluno.id);
      const avatarSrc = aluno.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=9333ea&color=fff`;

      return `
        <tr>
          <td style="width: 40px; text-align: center;">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.subturmasController.toggleAlunoFigma(${aluno.id}, this.checked)">
          </td>
          <td>
            <div class="aluno-cell-figma">
              <img src="${avatarSrc}" alt="${aluno.nome}" class="aluno-avatar-figma" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=9333ea&color=fff'">
              <span class="aluno-nome-figma">${aluno.nome}</span>
            </div>
          </td>
          <td style="text-align: right; font-weight: 600; color: #64748b;">${aluno.ra}</td>
        </tr>
      `;
    }).join('');
  }

  toggleAlunoFigma(alunoId, checked) {
    if (checked) {
      this.alunosSelecionados.add(alunoId);
    } else {
      this.alunosSelecionados.delete(alunoId);
    }
    const countPill = document.getElementById('subturmaSelecionadosTexto');
    const todosAlunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, 'TODOS') : [];
    if (countPill) countPill.textContent = `Selecionados: ${this.alunosSelecionados.size} de ${todosAlunos.length}`;
  }

  toggleTodos(checked) {
    const todosAlunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, 'TODOS') : [];
    if (checked) {
      todosAlunos.forEach(a => this.alunosSelecionados.add(a.id));
    } else {
      this.alunosSelecionados.clear();
    }
    this.renderizarSubturmaFigma();
  }

  filtrarAlunos(termo) {
    this.termoFiltro = (termo || '').toLowerCase().trim();
    this.renderizarSubturmaFigma();
  }

  criarSubturmaFigma() {
    const inputNome = document.getElementById('inputSubturmaNomeFigma');
    let nome = inputNome ? inputNome.value.trim() : '';
    if (!nome) {
      nome = 'Subturma A';
    }
    if (this.alunosSelecionados.size === 0) {
      window.app.mostrarToast('Selecione pelo menos um aluno para a subturma.', 'warning');
      return;
    }

    const letraAlvo = nome.toUpperCase().includes('B') ? 'B' : 'A';
    const outraLetra = letraAlvo === 'A' ? 'B' : 'A';

    const todosAlunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, 'TODOS') : [];
    todosAlunos.forEach(aluno => {
      const novaSub = this.alunosSelecionados.has(aluno.id) ? letraAlvo : outraLetra;
      window.db.transferirAlunoSubturma(aluno.id, novaSub);
    });

    if (window.db && window.db.persist) window.db.persist();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    window.app.mostrarToast(`Subturmas divididas! ${this.alunosSelecionados.size} alunos na Subturma ${letraAlvo} e ${todosAlunos.length - this.alunosSelecionados.size} na Subturma ${outraLetra}.`, 'success');
    this.renderizarSubturmaFigma();
    setTimeout(() => {
      window.app.navegarPara('inicio');
    }, 900);
  }

  dividirMetadeMetade() {
    const todosAlunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, 'TODOS') : [];
    if (!todosAlunos.length) return;
    const metade = Math.ceil(todosAlunos.length / 2);
    this.alunosSelecionados.clear();
    todosAlunos.forEach((aluno, index) => {
      if (index < metade) {
        this.alunosSelecionados.add(aluno.id);
        window.db.transferirAlunoSubturma(aluno.id, 'A');
      } else {
        window.db.transferirAlunoSubturma(aluno.id, 'B');
      }
    });

    if (window.db && window.db.persist) window.db.persist();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    const inputNome = document.getElementById('inputSubturmaNomeFigma');
    if (inputNome) inputNome.value = 'Subturma A';

    this.renderizarSubturmaFigma();
    window.app.mostrarToast(`Divisão 50/50 aplicada! Metade na Subturma A e metade na Subturma B.`, 'success');
  }

}

window.subturmasController = new SubturmasController();
