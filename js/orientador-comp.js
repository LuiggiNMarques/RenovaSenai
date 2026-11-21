/**
 * =============================================================================
 * RENOVA SENAI — PORTAL DO ORIENTADOR: COMPENSAÇÃO DE AUSÊNCIA (orientador-comp.js)
 * Tabela dinâmica: selects de Curso/Turma populados do db.js, consulta real e sincronização no DB central.
 * =============================================================================
 */

class OrientadorCompController {
  constructor() {
    this._statusMap = {};
  }

  /* ------------------------------------------------------------------ */
  /*  Inicialização: popula selects e renderiza com a primeira turma     */
  /* ------------------------------------------------------------------ */
  init() {
    this._popularSelectCurso();
    this.onCursoChange();   // popula turmas do curso inicial
    this.consultar();       // renderiza tabela já na abertura
  }

  /* ------------------------------------------------------------------ */
  /*  Popula select de Curso a partir do db                              */
  /* ------------------------------------------------------------------ */
  _popularSelectCurso() {
    const sel = document.getElementById('orientadorFiltroCurso');
    if (!sel || !window.db) return;

    const cursos = (window.db.data.cursos || []);
    sel.innerHTML = '<option value="">Todos os cursos</option>' +
      cursos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    // Pré-selecionar primeiro curso
    if (cursos.length > 0) sel.value = cursos[0].id;
  }

  /* ------------------------------------------------------------------ */
  /*  Ao trocar o Curso → repopula o select de Turma                     */
  /* ------------------------------------------------------------------ */
  onCursoChange() {
    const cursoSel = document.getElementById('orientadorFiltroCurso');
    const turmaSel = document.getElementById('orientadorFiltroTurma');
    if (!turmaSel || !window.db) return;

    const cursoId = cursoSel ? Number(cursoSel.value) : null;

    // Filtrar turmas ativas do curso selecionado
    let turmas = window.db.getTurmas('EM_ANDAMENTO');
    if (cursoId) {
      turmas = turmas.filter(t => t.cursoId === cursoId);
    }

    turmaSel.innerHTML = turmas.length
      ? turmas.map(t => `<option value="${t.id}">${t.codigo} — ${t.nome || t.ucNome}</option>`).join('')
      : '<option value="">Nenhuma turma encontrada</option>';
  }

  /* ------------------------------------------------------------------ */
  /*  Consultar: busca alunos da turma selecionada e renderiza tabela    */
  /* ------------------------------------------------------------------ */
  consultar() {
    const turmaSel   = document.getElementById('orientadorFiltroTurma');
    const statusSel  = document.getElementById('orientadorFiltroStatus');
    const tbody      = document.getElementById('orientadorAlunosTbody');
    const countBadge = document.getElementById('orientadorAlunosCount');
    if (!tbody || !window.db) return;

    const turmaId    = turmaSel ? Number(turmaSel.value) : null;
    const filtroStatus = statusSel ? statusSel.value : '';

    if (!turmaId) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#94a3b8;font-size:14px;">
        Selecione uma turma e clique em <strong>Consultar</strong>.
      </td></tr>`;
      if (countBadge) countBadge.textContent = '0 alunos';
      return;
    }

    // Buscar alunos ativos da turma
    const alunos = window.db.getAlunosPorTurma(turmaId)
      .filter(a => a.statusMatricula === 'ATIVO');

    // Cálculo real de frequência via window.db.getSinteseConsolidada
    const sintese = window.db.getSinteseConsolidada(turmaId);
    const sinteseMap = new Map();
    (sintese.alunos || []).forEach(item => {
      sinteseMap.set(item.aluno.id, item);
    });

    // Sincronizar status das compensações com window.db.getCompensacoes()
    const compensacoes = window.db.getCompensacoes(turmaId);

    const comFreq = alunos.map(a => {
      let freq = 100;
      let ausencias = 0;
      if (sinteseMap.has(a.id)) {
        const item = sinteseMap.get(a.id);
        freq = item.freqPorcentagem !== undefined ? item.freqPorcentagem : 100;
        ausencias = item.faltas || 0;
      }

      const compsAluno = compensacoes.filter(c => c.alunoId === a.id);
      let statusComp = 'nao-registrado';
      if (compsAluno.some(c => c.status === 'CUMPRIDO' || c.status === 'HOMOLOGADO' || c.status === 'REGISTRADO')) {
        statusComp = 'registrado';
      } else if (compsAluno.some(c => c.status === 'PENDENTE' || c.status === 'EM_ANDAMENTO')) {
        statusComp = 'em-andamento';
      }

      return { ...a, freq, ausencias, statusComp };
    });

    // Filtrar apenas alunos com frequência < 75% (precisam de compensação)
    let resultado = comFreq.filter(a => a.freq < 75);

    // Aplicar filtro de status se selecionado
    if (filtroStatus) {
      resultado = resultado.filter(a => a.statusComp === filtroStatus);
    }

    if (countBadge) {
      countBadge.textContent = `${resultado.length} aluno${resultado.length !== 1 ? 's' : ''}`;
    }

    if (resultado.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#22c55e;font-size:14px;">
        ✅ Nenhum aluno com ausência a compensar nesta turma.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = resultado.map(a => {
      const freqStr = a.freq.toFixed(1) + '%';
      const { badgeHtml, btnHtml } = this._getBadgeEBotao(a);
      return `
        <tr>
          <td class="col-matricula">${a.ra || ('RA' + String(a.id).padStart(7, '0'))}</td>
          <td class="col-nome">${a.nome}</td>
          <td style="text-align:center;"><span class="badge-freq-red">${freqStr}</span></td>
          <td style="text-align:center;">${a.ausencias}</td>
          <td style="text-align:center;">${badgeHtml}</td>
          <td style="text-align:center;">${btnHtml}</td>
        </tr>`;
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers de renderização                                            */
  /* ------------------------------------------------------------------ */
  _getBadgeEBotao(aluno) {
    const labels = {
      'nao-registrado': 'Não registrado',
      'em-andamento':   'Em andamento',
      'registrado':     'Registrado'
    };
    const label = labels[aluno.statusComp] || 'Não registrado';
    const badgeHtml = `<span class="badge-comp-status ${aluno.statusComp}">${label}</span>`;

    let btnHtml;
    if (aluno.statusComp === 'registrado') {
      btnHtml = `
        <button type="button" class="btn-acao-purple"
          onclick="window.app.mostrarToast('Compensação homologada e registrada para ${aluno.nome}.', 'info')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Visualizar
        </button>`;
    } else {
      btnHtml = `
        <button type="button" class="btn-acao-purple"
          onclick="window.orientadorCompController.registrarCompensacao(${aluno.id}, '${aluno.nome}')">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Registrar
        </button>`;
    }
    return { badgeHtml, btnHtml };
  }

  /**
   * Registra compensação para um aluno e sincroniza no banco central
   */
  registrarCompensacao(alunoId, nome) {
    const turmaSel = document.getElementById('orientadorFiltroTurma');
    const turmaId = turmaSel ? Number(turmaSel.value) : 1;

    // Busca compensação existente do aluno no banco
    const comps = window.db.getCompensacoes(turmaId).filter(c => c.alunoId === Number(alunoId));
    let novoStatus = 'em-andamento';

    if (comps.length === 0) {
      // Cria nova compensação no banco
      window.db.addCompensacao({
        alunoId: Number(alunoId),
        alunoNome: nome,
        turmaId,
        horasObrigacao: 4,
        dataLimite: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        motivoOrigem: 'Compensação de Ausência iniciada pelo Orientador',
        atividadeDescricao: 'Elaboração e entrega de atividade prática de reposição acadêmica.',
        tipoOrigem: 'ORIENTADOR',
        status: 'PENDENTE'
      });
      novoStatus = 'em-andamento';
    } else {
      const comp = comps[0];
      if (comp.status === 'PENDENTE' || comp.status === 'EM_ANDAMENTO') {
        comp.status = 'CUMPRIDO';
        comp.dataCumprimento = new Date().toISOString().split('T')[0];
        novoStatus = 'registrado';
      } else {
        novoStatus = 'registrado';
      }
    }

    if (window.db && window.db.persist) {
      window.db.persist();
    }
    window.dispatchEvent(new CustomEvent('renova:db-updated'));

    const msgMap = {
      'em-andamento': `Compensação iniciada para ${nome}. Status: Em andamento.`,
      'registrado': `Compensação registrada e homologada para ${nome}!`
    };
    window.app.mostrarToast(msgMap[novoStatus] || 'Atualizado com sucesso.', 'success');
    this.consultar();
  }
}

// Instância global
window.orientadorCompController = new OrientadorCompController();
