/**
 * =============================================================================
 * RENOVA SENAI - CARÔMETRO E OCORRÊNCIAS (ocorrencias.js)
 * Consulta de Alunos com Foto, Filtros por Origem (Coordenação, Geral, UC)
 * =============================================================================
 */

class OcorrenciasController {
  constructor() {
    this.turmaId = 1;
    this.filtroOrigem = 'TODAS';
    this.visualizacao = 'carometro'; // 'carometro' ou 'tabela'
  }

  init() {
    this.carregarTurmasSelect();
    this.carregarAlunosParaModalSelect();
    this.renderizar();
  }

  carregarTurmasSelect() {
    const sel = document.getElementById('selectOcorrenciaTurma');
    if (!sel) return;
    const turmas = window.db.getTurmas('EM_ANDAMENTO');
    sel.innerHTML = turmas.map(t => `<option value="${t.id}">${t.codigo} - ${t.nome}</option>`).join('');
    sel.value = this.turmaId;
  }

  carregarAlunosParaModalSelect() {
    const sel = document.getElementById('selectNovaOcorrenciaAluno');
    if (!sel) return;
    const alunos = window.db.getAlunosPorTurma(this.turmaId);
    sel.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome} (${a.ra})</option>`).join('');
  }

  setVisualizacao(modo) {
    this.visualizacao = modo;
    const btnCar = document.getElementById('btnViewCarometro');
    const btnTab = document.getElementById('btnViewTabela');
    if (btnCar && btnTab) {
      if (modo === 'carometro') {
        btnCar.classList.add('active');
        btnTab.classList.remove('active');
      } else {
        btnTab.classList.add('active');
        btnCar.classList.remove('active');
      }
    }
    this.renderizar();
  }

  setFiltroOrigem(origem) {
    this.filtroOrigem = origem;
    this.renderizar();
  }

  onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.carregarAlunosParaModalSelect();
    this.renderizar();
  }

  renderizar() {
    const container = document.getElementById('ocorrenciasConteudo');
    if (!container) return;

    const alunos = window.db.getAlunosPorTurma(this.turmaId);
    const ocorrencias = window.db.getOcorrencias(this.filtroOrigem);

    if (this.visualizacao === 'carometro') {
      container.innerHTML = `
        <div class="carometro-grid">
          ${alunos.map(aluno => {
            const ocsAluno = ocorrencias.filter(o => o.alunoId === aluno.id);
            const atrasos = window.db.getAtrasosAcumulados(aluno.id, 1);
            return `
              <!-- [Alteração 1]: Clique no card ou na foto abre o modal de nova ocorrência pré-selecionando o aluno -->
              <div class="carometro-card" style="cursor:pointer;" onclick="window.ocorrenciasController.abrirNovaOcorrenciaParaAluno(${aluno.id})" title="Clique para abrir nova ocorrência para ${aluno.nome}">
                <img src="${aluno.foto}" alt="${aluno.nome}" class="carometro-photo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(aluno.nome)}'" onclick="event.stopPropagation(); window.ocorrenciasController.abrirNovaOcorrenciaParaAluno(${aluno.id})">
                <div class="carometro-name">${aluno.nome}</div>
                <div class="carometro-ra">${aluno.ra} &bull; Subturma ${aluno.subturma}</div>
                
                <div class="carometro-stats-strip">
                  <div>
                    <span class="carometro-stat-val" style="color:${ocsAluno.length ? 'var(--senai-red)' : 'inherit'};">${ocsAluno.length}</span>
                    <span style="color:var(--text-muted); font-size:11px;">Ocorrências</span>
                  </div>
                  <div>
                    <span class="carometro-stat-val" style="color:${atrasos >= 5 ? '#b45309' : 'inherit'};">${atrasos}</span>
                    <span style="color:var(--text-muted); font-size:11px;">Atrasos</span>
                  </div>
                  <div>
                    <span class="carometro-stat-val" style="color:${aluno.statusMatricula === 'ATIVO' ? '#16a34a' : '#ef4444'};">${aluno.statusMatricula}</span>
                    <span style="color:var(--text-muted); font-size:11px;">Status</span>
                  </div>
                </div>

                <div style="display:flex; gap:8px; width:100%; margin-top:6px;">
                  <button type="button" class="btn btn-sm btn-primary" style="flex:1;" onclick="event.stopPropagation(); window.ocorrenciasController.abrirNovaOcorrenciaParaAluno(${aluno.id})" title="Registrar Nova Ocorrência">
                    + Ocorrência
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" style="flex:1;" onclick="event.stopPropagation(); window.ocorrenciasController.abrirDetalhesAluno(${aluno.id})">
                    Histórico
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Visualização em Tabela detalhada
      container.innerHTML = `
        <div class="table-responsive">
          <table class="academic-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Aluno</th>
                <th>Origem</th>
                <th>Tipo</th>
                <th>Título / Descrição</th>
                <!-- [Alteração 5]: Coluna de andamento/status da ocorrência para acompanhamento pelo professor -->
                <th>Status / Andamento</th>
                <th>Registrado Por</th>
              </tr>
            </thead>
            <tbody>
              ${ocorrencias.length ? ocorrencias.map(o => `
                <tr>
                  <td>${o.data}</td>
                  <td><strong>${o.alunoNome}</strong></td>
                  <td><span class="portal-tag-pill" style="font-size:11px;">${o.origem}</span></td>
                  <td><span style="font-weight:700; color:${o.tipo === 'ELOGIO' ? '#16a34a' : o.tipo === 'DISCIPLINAR' ? '#b45309' : 'inherit'};">${o.tipo}</span></td>
                  <td>
                    <strong>${o.titulo}</strong>
                    <div style="font-size:12px; color:var(--text-muted);">${o.descricao}</div>
                  </td>
                  <!-- [Alteração 5]: Exibição do status atualizado (Pendente, Em Análise, Resolvido) -->
                  <td>${this.obterBadgeStatus(o.status)}</td>
                  <td>${o.autor}</td>
                </tr>
              `).join('') : '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">Nenhuma ocorrência encontrada para o filtro selecionado.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // [Alteração 5]: Badge visual para visualização rápida do status da ocorrência
  obterBadgeStatus(status) {
    const s = (status || 'PENDENTE').toUpperCase();
    if (s === 'RESOLVIDO' || s === 'CONCLUIDO') {
      return '<span class="portal-tag-pill" style="background:#dcfce7; color:#15803d; font-weight:700; font-size:11px;"> Resolvido</span>';
    } else if (s === 'EM_ANALISE' || s === 'ANALISE') {
      return '<span class="portal-tag-pill" style="background:#dbeafe; color:#1d4ed8; font-weight:700; font-size:11px;"> Em Análise</span>';
    }
    return '<span class="portal-tag-pill" style="background:#fef3c7; color:#b45309; font-weight:700; font-size:11px;"> Pendente</span>';
  }

  abrirNovaOcorrenciaParaAluno(alunoId) {
    this.carregarAlunosParaModalSelect();
    const sel = document.getElementById('selectNovaOcorrenciaAluno');
    if (sel) {
      sel.value = String(alunoId);
    }
    const inputTitulo = document.getElementById('inputNovaOcorrenciaTitulo');
    const textDesc = document.getElementById('textNovaOcorrenciaDescricao');
    if (inputTitulo) inputTitulo.value = '';
    if (textDesc) textDesc.value = '';

    window.app.abrirModal('modalNovaOcorrencia');
  }

  obterOrigemPorContexto() {
    const user = window.auth ? window.auth.getUser() : null;
    if (user && user.perfil === 'COORDENACAO') {
      return 'COORDENACAO';
    }
    return 'UNIDADE_CURRICULAR';
  }

  abrirDetalhesAluno(alunoId) {
    const aluno = window.db.getAlunoById(alunoId);
    if (!aluno) return;

    const ocs = window.db.getOcorrencias('TODAS', alunoId);
    const modalBody = document.getElementById('modalAlunoDetalhesBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display:flex; gap:20px; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
        <img src="${aluno.foto}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:2px solid var(--senai-red);">
        <div>
          <h3 style="margin-bottom:4px;">${aluno.nome}</h3>
          <div style="font-size:13px; color:var(--text-muted);">RA: ${aluno.ra} &bull; Matrícula: ${aluno.statusMatricula}</div>
          <div style="font-size:13px; color:var(--text-muted);">${aluno.email}</div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h4 style="margin-bottom:0; font-size:15px;">Histórico de Ocorrências (${ocs.length})</h4>
        <button type="button" class="btn btn-sm btn-primary" onclick="window.app.fecharModal('modalAlunoDetalhes'); window.ocorrenciasController.abrirNovaOcorrenciaParaAluno(${aluno.id})">
          + Nova Ocorrência
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto;">
        ${ocs.length ? ocs.map(o => `
          <div style="border:1px solid var(--border-color); border-radius:8px; padding:12px; background:var(--bg-card-subtle);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:var(--senai-red); font-size:13.5px;">${o.titulo}</strong>
              <div style="display:flex; align-items:center; gap:8px;">
                <!-- [Alteração 5]: Visualização do status no histórico do aluno -->
                ${this.obterBadgeStatus(o.status)}
                <span style="font-size:11.5px; color:var(--text-muted);">${o.data}</span>
              </div>
            </div>
            <div style="font-size:12.5px; margin-bottom:6px;">${o.descricao}</div>
            <div style="font-size:11px; color:var(--text-muted);">Origem: <strong>${o.origem}</strong> &bull; Autor: ${o.autor}</div>
          </div>
        `).join('') : '<p style="color:var(--text-muted); font-size:13px;">Nenhuma ocorrência registrada para este aluno.</p>'}
      </div>
    `;

    window.app.abrirModal('modalAlunoDetalhes');
  }

  salvarNovaOcorrencia() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    const alunoId = document.getElementById('selectNovaOcorrenciaAluno').value;
    const origem = this.obterOrigemPorContexto();
    const tipo = document.getElementById('selectNovaOcorrenciaTipo').value;
    const titulo = document.getElementById('inputNovaOcorrenciaTitulo').value;
    const descricao = document.getElementById('textNovaOcorrenciaDescricao').value;
    const status = 'PENDENTE';

    if (!titulo || !descricao) {
      window.app.mostrarToast('Preencha o título e a descrição da ocorrência.', 'warning');
      return;
    }

    const user = window.auth ? window.auth.getUser() : null;
    const aluno = window.db.getAlunoById(alunoId);

    window.db.addOcorrencia({
      alunoId: Number(alunoId),
      alunoNome: aluno ? aluno.nome : 'Aluno',
      origem,
      tipo,
      titulo,
      descricao,
      status,
      autor: user ? user.nome : 'NATHAN SANTANA MATOS'
    });

    window.app.fecharModal('modalNovaOcorrencia');
    window.app.mostrarToast('Ocorrência registrada com sucesso!', 'success');
    this.renderizar();
  }
}

window.ocorrenciasController = new OcorrenciasController();
