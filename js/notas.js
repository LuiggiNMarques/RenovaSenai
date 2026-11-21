/**
 * =============================================================================
 * RENOVA SENAI - AVALIAÇÕES E NOTAS (notas.js)
 * Design System Oficial:
 * - Sub-abas: Avaliações vs Médias (Escala 0 a 100)
 * - Tabela com foto/avatar, status, input de nota e badges de situação
 * - Médias: Nº, FOTO/NOME, MATRÍCULA, MÉDIA CALCULADA, MÉDIA DO PROFESSOR (0-100), SITUAÇÃO
 * - Bloqueio automático de edição quando o Diário está em AGUARDANDO ou APROVADO
 * =============================================================================
 */

class NotasController {
  constructor() {
    this.turmaId = 1;
    this.ucId = 1;
    this.subturma = 'TODOS';
    this.termoBusca = '';
    this.termoBuscaMedias = '';
    this.abaAtiva = 'avaliacoes';
    this.notasLocais = {}; // { [alunoId]: nota }
    this.mediasProfessor = {}; // { [alunoId]: mediaProf }
    this.avaliacaoAtivaId = null;
  }

  init() {
    if (window.app && window.app.turmaAtiva) {
      this.turmaId = window.app.turmaAtiva.id || 1;
      this.ucId = window.app.turmaAtiva.ucId || 1;
    }
    this.alternarAba(this.abaAtiva);
  }

  isDiarioBloqueado() {
    if (!window.db || !window.db.getStatusDiario) return false;
    const status = window.db.getStatusDiario(this.turmaId);
    return status === 'AGUARDANDO' || status === 'APROVADO';
  }

  alternarAba(aba) {
    this.abaAtiva = aba;
    const btnAv = document.getElementById('btnNotasTabAvaliacoes');
    const btnMed = document.getElementById('btnNotasTabMedias');
    const viewAv = document.getElementById('notasSubViewAvaliacoes');
    const viewMed = document.getElementById('notasSubViewMedias');

    if (aba === 'avaliacoes') {
      if (btnAv) btnAv.classList.add('active');
      if (btnMed) btnMed.classList.remove('active');
      if (viewAv) viewAv.style.display = 'block';
      if (viewMed) viewMed.style.display = 'none';
      this.renderizarAvaliacoes();
    } else {
      if (btnAv) btnAv.classList.remove('active');
      if (btnMed) btnMed.classList.add('active');
      if (viewAv) viewAv.style.display = 'none';
      if (viewMed) viewMed.style.display = 'block';
      this.renderizarMedias();
    }
  }

  onSubturmaChange(sub) {
    this.subturma = sub;
    if (this.abaAtiva === 'avaliacoes') {
      this.renderizarAvaliacoes();
    } else {
      this.renderizarMedias();
    }
  }

  onTurmaChange(turmaId, ucId) {
    this.turmaId = Number(turmaId);
    this.ucId = Number(ucId) || 1;
    this.avaliacaoAtivaId = null;
    this.notasLocais = {};
    this.mediasProfessor = {};
    if (this.abaAtiva === 'avaliacoes') {
      this.renderizarAvaliacoes();
    } else {
      this.renderizarMedias();
    }
  }

  filtrarPorNome(termo) {
    this.termoBusca = (termo || '').toLowerCase().trim();
    this.renderizarAvaliacoes();
  }

  filtrarMedias(termo) {
    this.termoBuscaMedias = (termo || '').toLowerCase().trim();
    this.renderizarMedias();
  }

  renderizarAvaliacoes() {
    const tbody = document.getElementById('notasFigmaTableBody');
    if (!tbody) return;

    const bloqueado = this.isDiarioBloqueado();

    let alunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, this.subturma) : [];
    if (this.termoBusca) {
      alunos = alunos.filter(a => a.nome.toLowerCase().includes(this.termoBusca) || a.ra.includes(this.termoBusca));
    }

    const avaliacoes = window.db ? window.db.getAvaliacoesPorUC(this.turmaId, this.ucId) : [];
    this.preencherSelectAvaliacoes(avaliacoes);

    const avaliacaoId = this.avaliacaoAtivaId || (avaliacoes.length > 0 ? avaliacoes[0].id : 1);
    const avaliacaoAtiva = avaliacoes.find(a => a.id === avaliacaoId);
    this.atualizarPillsAvaliacao(avaliacaoAtiva);

    tbody.innerHTML = alunos.map((aluno, idx) => {
      const numero = idx + 1;
      const avatarSrc = aluno.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff`;
      
      const notaDb = window.db ? window.db.getNota(avaliacaoId, aluno.id) : null;
      let notaValor;
      if (this.notasLocais[aluno.id] !== undefined) {
        notaValor = Number(this.notasLocais[aluno.id]);
      } else if (notaDb !== null && !isNaN(notaDb)) {
        // Se a nota no banco estiver em escala legada 0-30, converte para 0-100
        notaValor = notaDb <= 30 ? Number(((notaDb / 30) * 100).toFixed(0)) : Number(notaDb);
      } else {
        notaValor = 85.0;
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
          <td style="text-align: center;">
            <span class="badge-comp registrado" style="font-size: 11.5px; padding: 3px 8px;">Ativo</span>
          </td>
          <td style="text-align: center;">
            <input type="number" class="notas-input-field" value="${notaValor.toFixed(0)}" min="0" max="100" step="1" 
              ${bloqueado ? 'disabled readonly title="Diário fechado ou aguardando aprovação"' : ''}
              style="width: 76px; text-align: center; font-weight: 700; ${bloqueado ? 'background:#f1f5f9;cursor:not-allowed;' : ''}"
              onchange="window.notasController.atualizarNotaAluno(${aluno.id}, this.value)">
          </td>
        </tr>
      `;
    }).join('');
  }

  preencherSelectAvaliacoes(avaliacoes) {
    const select = document.getElementById('selectAvaliacaoAtiva');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecione uma avaliação...</option>' +
      avaliacoes.map(a => `<option value="${a.id}">${a.titulo} (${a.tipo})</option>`).join('');
    if (currentValue && avaliacoes.some(a => String(a.id) === currentValue)) {
      select.value = currentValue;
      this.avaliacaoAtivaId = Number(currentValue);
    } else if (avaliacoes.length > 0) {
      select.value = avaliacoes[0].id;
      this.avaliacaoAtivaId = avaliacoes[0].id;
    }
  }

  atualizarPillsAvaliacao(avaliacao) {
    const pillTipo = document.getElementById('pillAvaliacaoTipo');
    const pillPeso = document.getElementById('pillAvaliacaoPeso');
    const pillData = document.getElementById('pillAvaliacaoData');
    if (avaliacao) {
      if (pillTipo) pillTipo.innerHTML = `Tipo: <strong>${avaliacao.tipo}</strong>`;
      if (pillPeso) pillPeso.innerHTML = `Peso: <strong>${avaliacao.peso || 1}</strong>`;
      if (pillData) pillData.innerHTML = `Data: <strong>${avaliacao.data ? new Date(avaliacao.data).toLocaleDateString('pt-BR') : '—'}</strong>`;
    } else {
      if (pillTipo) pillTipo.innerHTML = 'Tipo: <strong>—</strong>';
      if (pillPeso) pillPeso.innerHTML = 'Peso: <strong>—</strong>';
      if (pillData) pillData.innerHTML = 'Data: <strong>—</strong>';
    }
  }

  onAvaliacaoChange(value) {
    this.avaliacaoAtivaId = value ? Number(value) : null;
    this.notasLocais = {};
    this.renderizarAvaliacoes();
  }

  renderizarMedias() {
    const tbody = document.getElementById('mediasFigmaTableBody');
    if (!tbody) return;

    const bloqueado = this.isDiarioBloqueado();

    let alunos = window.db ? window.db.getAlunosPorTurma(this.turmaId, this.subturma) : [];
    if (this.termoBuscaMedias) {
      alunos = alunos.filter(a => a.nome.toLowerCase().includes(this.termoBuscaMedias) || a.ra.includes(this.termoBuscaMedias));
    }

    const chave = `${this.turmaId}_${this.ucId}`;
    const mediasSalvas = (window.db && window.db.data.mediasProfessor && window.db.data.mediasProfessor[chave]) || {};

    let aprovados = 0;
    let reprovados = 0;
    let somaMedias = 0;

    tbody.innerHTML = alunos.map((aluno, idx) => {
      const numero = idx + 1;
      const avatarSrc = aluno.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}&background=0284c7&color=fff`;
      
      const resMedia = window.db ? window.db.calcularMediaAluno(this.turmaId, this.ucId, aluno.id) : { media: 80 };
      // Escala 0-100 direta
      const mediaCalculadaNum = resMedia.media <= 10 ? resMedia.media * 10 : resMedia.media;
      const mediaCalculada = Number(mediaCalculadaNum || 80.0).toFixed(1);

      const mediaProf = this.mediasProfessor[aluno.id] !== undefined 
        ? this.mediasProfessor[aluno.id] 
        : (mediasSalvas[aluno.id] !== undefined ? mediasSalvas[aluno.id] : mediaCalculada);

      const isAprovado = Number(mediaProf) >= 70.0;

      if (isAprovado) aprovados++; else reprovados++;
      somaMedias += Number(mediaProf);

      const situacaoClass = isAprovado ? 'aprovado' : (Number(mediaProf) >= 50.0 ? 'em-andamento' : 'reprovado');
      const situacaoText = isAprovado ? 'Adequado' : (Number(mediaProf) >= 50.0 ? 'Em Recuperação' : 'Necessita Reforço');

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
          <td style="text-align: center; font-weight: 700; color: #0284c7; font-size: 14px;">${mediaCalculada}</td>
          <td style="text-align: center;">
            <input type="number" class="media-professor-input" value="${Number(mediaProf).toFixed(1)}" min="0" max="100" step="1"
              ${bloqueado ? 'disabled readonly title="Diário fechado ou aguardando aprovação"' : ''}
              style="width: 76px; text-align: center; font-weight: 700; ${bloqueado ? 'background:#f1f5f9;cursor:not-allowed;' : ''}"
              onchange="window.notasController.atualizarMediaProfessor(${aluno.id}, this.value)">
          </td>
          <td style="text-align: center;">
            <span class="badge-situacao ${situacaoClass}">${situacaoText}</span>
          </td>
        </tr>
      `;
    }).join('');

    // Atualizar rodapé
    const mediaTurma = alunos.length > 0 ? (somaMedias / alunos.length).toFixed(1) : '0.0';
    const total = aprovados + reprovados;
    const pctAprovados = total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0';
    const pctReprovados = total > 0 ? ((reprovados / total) * 100).toFixed(1) : '0.0';

    const footerStats = document.getElementById('mediasFooterStats');
    if (footerStats) {
      footerStats.innerHTML = `
        <span class="resumo-stats-item">Média da Turma (0–100): <strong>${mediaTurma.replace('.', ',')}</strong></span>
        <span class="resumo-stats-item">Com desempenho adequado: <strong>${aprovados} (${pctAprovados}%)</strong></span>
        <span class="resumo-stats-item">Em acompanhamento: <strong>${reprovados} (${pctReprovados}%)</strong></span>
      `;
    }
  }

  atualizarNotaAluno(alunoId, valor) {
    this.notasLocais[alunoId] = Number(valor);
  }

  atualizarMediaProfessor(alunoId, valor) {
    this.mediasProfessor[alunoId] = Number(valor);
  }

  recalcularMedias() {
    this.mediasProfessor = {};
    this.renderizarMedias();
    window.app.mostrarToast('Médias recalculadas com base nas notas lançadas!', 'success');
  }

  limparMedias() {
    this.mediasProfessor = {};
    this.renderizarMedias();
    window.app.mostrarToast('Médias do professor limpas.', 'info');
  }

  salvarMedias() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando aprovação. Edição bloqueada.', 'warning');
      return;
    }
    if (window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada para coordenação.', 'warning');
      return;
    }
    if (window.db) {
      if (!window.db.data.mediasProfessor) {
        window.db.data.mediasProfessor = {};
      }
      const chave = `${this.turmaId}_${this.ucId}`;
      window.db.data.mediasProfessor[chave] = {
        ...(window.db.data.mediasProfessor[chave] || {}),
        ...this.mediasProfessor
      };
      window.db.persist();
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }
    window.app.mostrarToast('Médias consolidadas e salvas com sucesso!', 'success');
  }

  salvarNotasFigma() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando aprovação. Edição bloqueada.', 'warning');
      return;
    }
    if (window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada para coordenação.', 'warning');
      return;
    }
    if (!this.avaliacaoAtivaId) {
      window.app.mostrarToast('Selecione uma avaliação antes de salvar.', 'warning');
      return;
    }
    if (window.db) {
      Object.keys(this.notasLocais).forEach(alunoId => {
        const val = Number(this.notasLocais[alunoId]);
        window.db.salvarNota(this.avaliacaoAtivaId, alunoId, val);
      });
      window.db.persist();
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }
    window.app.mostrarToast('Notas de avaliação (0 a 100) consolidadas e salvas com sucesso!', 'success');
  }

  salvarNovaAvaliacao() {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando aprovação. Não é possível cadastrar novas avaliações.', 'warning');
      return;
    }
    const titulo = document.getElementById('inputNovaAvaliacaoTitulo') ? document.getElementById('inputNovaAvaliacaoTitulo').value.trim() : '';
    const tipo = document.getElementById('selectNovaAvaliacaoTipo') ? document.getElementById('selectNovaAvaliacaoTipo').value : 'PROVA';
    const peso = parseFloat(document.getElementById('inputNovaAvaliacaoPeso') ? document.getElementById('inputNovaAvaliacaoPeso').value : '1.0') || 1.0;
    const data = document.getElementById('inputNovaAvaliacaoData') ? document.getElementById('inputNovaAvaliacaoData').value : new Date().toISOString().split('T')[0];
    const valorMax = parseFloat(document.getElementById('inputNovaAvaliacaoValorMaximo') ? document.getElementById('inputNovaAvaliacaoValorMaximo').value : '100') || 100;

    if (!titulo) {
      window.app.mostrarToast('Informe o título da avaliação.', 'warning');
      return;
    }

    if (window.db && window.db.addAvaliacao) {
      window.db.addAvaliacao({
        turmaId: Number(this.turmaId),
        ucId: Number(this.ucId),
        titulo: titulo,
        tipo: tipo,
        peso: peso,
        data: data,
        notaMaxima: valorMax
      });
      window.app.fecharModal('modalNovaAvaliacao');
      window.app.mostrarToast(`Avaliação "${titulo}" cadastrada com sucesso!`, 'success');
      this.renderizarAvaliacoes();
      if (window.app && window.app.renderizarHomeProfessor) window.app.renderizarHomeProfessor();
    }
  }

  excluirAvaliacao(avaliacaoId) {
    if (this.isDiarioBloqueado()) {
      window.app.mostrarToast('O diário está fechado ou aguardando aprovação. Não é possível excluir avaliações.', 'warning');
      return;
    }
    if (!confirm('Deseja realmente excluir esta avaliação e suas notas associadas?')) return;

    if (window.db && window.db.data.avaliacoes) {
      window.db.data.avaliacoes = window.db.data.avaliacoes.filter(a => a.id !== Number(avaliacaoId));
      if (window.db.data.notas) {
        window.db.data.notas = window.db.data.notas.filter(n => n.avaliacaoId !== Number(avaliacaoId));
      }
      window.db.persist();
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
      window.app.mostrarToast('Avaliação excluída com sucesso.', 'info');
      this.renderizarAvaliacoes();
      if (window.app && window.app.renderizarHomeProfessor) window.app.renderizarHomeProfessor();
    }
  }
}

window.notasController = new NotasController();
