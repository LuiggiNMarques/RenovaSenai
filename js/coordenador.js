/**
 * =============================================================================
 * RENOVA SENAI — PORTAL DO COORDENADOR (coordenador.js)
 * Gestão de Turmas · Atribuição de Docentes · Fechamento de Diário
 * =============================================================================
 */

class CoordenadorController {
  constructor() {
    this._bound = false;
  }

  init() {
    this.renderDashboard();
    this.renderVisaoCurricular();
    this.renderListaTurmas(); this.renderVisaoCurricular();
    this.renderPainelFechamento();
    if (!this._bound) {
      this._bound = true;
      this._bindEvents();
    }
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  _getTurmas() {
    return window.db.data.turmas || [];
  }

  _getDocentes() {
    return (window.db.data.usuarios || []).filter(u =>
      u.perfil === 'PROFESSOR' || u.perfil === 'COORDENACAO'
    );
  }

  _getAtribuicoes() {
    if (!window.db.data.atribuicoes) window.db.data.atribuicoes = [];
    return window.db.data.atribuicoes;
  }

  _getSolicitacoes() {
    if (!window.db.data.solicitacoesFechamento) window.db.data.solicitacoesFechamento = [];
    return window.db.data.solicitacoesFechamento;
  }

  _persist() {
    window.db.persist();
  }

  // ─── DASHBOARD KPIs ─────────────────────────────────────────────────────────

  renderDashboard() {
    const el = document.getElementById('coordDashboardCards');
    if (!el) return;

    const turmas = this._getTurmas();
    const ativas = turmas.filter(t => t.status === 'EM_ANDAMENTO');
    const concluidas = turmas.filter(t => t.status === 'CONCLUIDA');
    const solicitacoes = this._getSolicitacoes().filter(s => s.status === 'AGUARDANDO');
    const totalAlunos = ativas.reduce((s, t) => s + (t.totalAlunos || 0), 0);

    el.innerHTML = `
      <div class="coord-kpi-card">
        <div class="kpi-icon kpi-icon-turmas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${ativas.length}</span>
          <span class="kpi-label">Turmas Ativas</span>
        </div>
      </div>
      <div class="coord-kpi-card">
        <div class="kpi-icon kpi-icon-alunos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${totalAlunos}</span>
          <span class="kpi-label">Alunos Matriculados</span>
        </div>
      </div>
      <div class="coord-kpi-card">
        <div class="kpi-icon kpi-icon-concluidas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${concluidas.length}</span>
          <span class="kpi-label">Turmas Concluídas</span>
        </div>
      </div>
      <div class="coord-kpi-card ${solicitacoes.length > 0 ? 'kpi-alert' : ''}">
        <div class="kpi-icon kpi-icon-fechamento">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="kpi-info">
          <span class="kpi-value">${solicitacoes.length}</span>
          <span class="kpi-label">Diários Aguardando</span>
        </div>
      </div>
    `;

    // Alertas de Encaminhamentos da Orientação Educacional
    const encaminhados = (window.db && window.db.data && window.db.data.atendimentosOrientacao || [])
      .filter(a => a.encaminhamento === 'COORDENACAO');

    let elAlertas = document.getElementById('coordAlertasOrientacaoContainer');
    if (!elAlertas) {
      elAlertas = document.createElement('div');
      elAlertas.id = 'coordAlertasOrientacaoContainer';
      if (el.parentNode) {
        el.parentNode.insertBefore(elAlertas, el.nextSibling);
      }
    }

    if (elAlertas) {
      if (encaminhados.length > 0) {
        elAlertas.innerHTML = `
          <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:10px; padding:16px; margin:18px 0; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">⚠️</span>
                <strong style="color:#92400e; font-size:13.5px;">Encaminhamentos da Orientação Educacional (${encaminhados.length})</strong>
              </div>
              <span style="font-size:11.5px; background:#fef3c7; color:#92400e; padding:3px 10px; border-radius:9999px; font-weight:700;">Ação Intersetorial Requerida</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
              ${encaminhados.map(enc => {
                const aluno = window.db.getAlunoById(enc.alunoId);
                const nome = aluno ? aluno.nome : `Aluno #${enc.alunoId}`;
                return `
                  <div style="background:#ffffff; border:1px solid #fef08a; border-radius:8px; padding:12px; font-size:12.5px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <strong style="color:#0f172a;">${nome}</strong>
                      <span style="font-size:11px; color:#64748b;">${enc.data}</span>
                    </div>
                    <div style="color:#64748b; font-size:11.5px; margin-bottom:6px;">Foco: <strong>${enc.foco}</strong> • Tipo: ${enc.tipo}</div>
                    <div style="color:#334155; margin-bottom:8px; line-height:1.4;"><em>"${enc.resumo}"</em></div>
                    ${enc.combinados ? `<div style="font-size:11px; color:#b45309; background:#fffdf5; padding:4px 8px; border-radius:4px; border:1px dashed #fde68a;"><strong>Combinados:</strong> ${enc.combinados}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        elAlertas.style.display = 'block';
      } else {
        elAlertas.style.display = 'none';
        elAlertas.innerHTML = '';
      }
    }
  }

  // ─── LISTAGEM DE TURMAS ──────────────────────────────────────────────────────

  renderListaTurmas(filtro) {
    filtro = filtro || 'EM_ANDAMENTO';
    const el = document.getElementById('coordTurmasLista');
    if (!el) return;

    const turmas = this._getTurmas().filter(function(t) {
      return filtro === 'TODOS' ? true : t.status === filtro;
    });
    const atribuicoes = this._getAtribuicoes();
    const self = this;

    if (turmas.length === 0) {
      el.innerHTML = '<div class="coord-empty-state"><p>Nenhuma turma encontrada.</p></div>';
      return;
    }

    const rows = turmas.map(function(t) {
      const at = atribuicoes.find(function(a) { return a.turmaId === t.id; });
      const docente = at ? (window.db.data.usuarios || []).find(function(u) { return u.id === at.docenteId; }) : null;
      const sol = self._getSolicitacoes().find(function(s) { return s.turmaId === t.id; });
      const statusDiario = sol
        ? (sol.status === 'APROVADO'
          ? '<span class="coord-badge badge-aprovado">&#10003; Fechado</span>'
          : '<span class="coord-badge badge-aguardando">&#9203; Aguardando</span>')
        : '<span class="coord-badge badge-aberto">Aberto</span>';
      const statusTurma = t.status === 'EM_ANDAMENTO'
        ? '<span class="coord-badge badge-ativo">Em Andamento</span>'
        : '<span class="coord-badge badge-concluido">Concluída</span>';

      const nomeDocente = docente
        ? '<span style="font-size:12px; font-weight:600;">' + docente.nome.split(' ').slice(0,2).join(' ') + '</span>'
        : '<button type="button" class="btn btn-sm btn-outline" onclick="window.coordenadorController.abrirModalAtribuirDocente(' + t.id + ')">+ Atribuir</button>';

      // Cálculo de progresso do diário de classe
      const aulasTurma = (window.db.data.aulas || []).filter(function(a) { return a.turmaId === t.id && a.status === 'FINALIZADA'; });
      const totalAulasDadas = aulasTurma.reduce(function(s, a) { return s + (a.quantidadeAulas || 1); }, 0);
      const metaAulas = 80;
      const pct = sol && sol.status === 'APROVADO' ? 100 : Math.min(100, Math.round((totalAulasDadas / metaAulas) * 100));

      const progressoDiarioHtml = '<div style="min-width:130px;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px;">'
        + statusDiario
        + '<span style="font-weight:700; color:var(--text-muted);">' + pct + '%</span>'
        + '</div>'
        + '<div style="height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden;">'
        + '<div style="width:' + pct + '%; height:100%; background:var(--primary, #c3161c); border-radius:3px; transition:width 0.3s;"></div>'
        + '</div>'
        + '<div style="font-size:10px; color:var(--text-muted); margin-top:3px;">' + totalAulasDadas + ' de ' + metaAulas + ' aulas lançadas</div>'
        + '</div>';

      return '<tr>'
        + '<td><div style="font-weight:600;font-size:13px;">' + t.codigo + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">' + t.nome.substring(0, 45) + '...</div></td>'
        + '<td><span class="coord-badge badge-periodo">' + t.periodo + '</span></td>'
        + '<td><strong>' + t.totalAlunos + '</strong></td>'
        + '<td>' + nomeDocente + '</td>'
        + '<td>' + progressoDiarioHtml + '</td>'
        + '<td>' + statusTurma + '</td>'
        + '<td style="text-align:right">'
        + '<button type="button" class="btn btn-sm btn-outline" onclick="window.coordenadorController.abrirModalAtribuirDocente(' + t.id + ')" title="Gerenciar docente">Docente</button>'
        + '</td></tr>';
    }).join('');

    el.innerHTML = '<div class="coord-table-wrapper">'
      + '<table class="coord-table academic-table"><thead><tr>'
      + '<th>Turma</th><th>Período</th><th>Alunos</th><th>Docente</th><th>Progresso do Diário</th><th>Status</th><th style="text-align:right">Ações</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  // ─── PAINEL DE FECHAMENTO ────────────────────────────────────────────────────

  renderPainelFechamento() {
    const el = document.getElementById('coordFechamentoLista');
    if (!el) return;

    // Regra SENAI: Só exibe na fila da coordenação turmas onde 100% dos professores responsáveis fecharam sua etapa
    const solicitacoes = this._getSolicitacoes().filter(function(s) {
      if (s.status !== 'AGUARDANDO') return false;
      const turma = (window.db.data.turmas || []).find(function(t) { return t.id === s.turmaId; });
      if (turma && turma.professoresResponsaveis && turma.professoresResponsaveis.length > 0) {
        return turma.professoresResponsaveis.every(function(p) { return p.fechado === true; });
      }
      return true;
    });
    const self = this;

    if (solicitacoes.length === 0) {
      el.innerHTML = '<div class="coord-empty-state" style="padding:32px 0;"><p>Nenhum diário aguardando aprovação ou com todas as etapas docentes concluídas. &#10003;</p></div>';
      return;
    }

    el.innerHTML = solicitacoes.map(function(sol) {
      const turma = (window.db.data.turmas || []).find(function(t) { return t.id === sol.turmaId; });
      const docente = (window.db.data.usuarios || []).find(function(u) { return u.id === sol.docenteId; });
      const sintese = window.db.getSinteseConsolidada(sol.turmaId, null);
      const alunos = (sintese && sintese.alunos) ? sintese.alunos : [];
      const totalAtivos = alunos.filter(function(a) { return a.aluno.statusMatricula === 'ATIVO'; }).length;
      const medias = alunos.filter(function(a) { return a.media > 0; }).map(function(a) { return a.media; });
      const mediaGeral = medias.length ? (medias.reduce(function(s,v) { return s+v; }, 0) / medias.length).toFixed(1) : '—';
      const freqs = alunos.filter(function(a) { return a.aluno.statusMatricula === 'ATIVO'; }).map(function(a) { return a.freqPorcentagem; });
      const freqMedia = freqs.length ? (freqs.reduce(function(s,v) { return s+v; }, 0) / freqs.length).toFixed(1) : '—';
      const emRisco = alunos.filter(function(a) { return a.aluno.statusMatricula === 'ATIVO' && (a.media < 70 || a.freqPorcentagem < 75); }).length;

      // Checklist dos professores responsáveis da turma
      const profsResponsaveis = (turma && turma.professoresResponsaveis) ? turma.professoresResponsaveis : [];
      const checklistHtml = profsResponsaveis.length ? `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin:10px 0; font-size:12px;">
          <strong style="color:#0f172a; display:block; margin-bottom:4px;">Checklist de Professores Responsáveis:</strong>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${profsResponsaveis.map(p => `
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span>${p.nome} <em style="color:#64748b;">(${p.papel || 'Docente'})</em></span>
                <span class="badge ${p.fechado ? 'bg-success text-white' : 'bg-warning text-dark'}" style="font-size:10px; padding:2px 6px; border-radius:4px;">
                  ${p.fechado ? '✓ Etapa Concluída' : '⏳ Pendente'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      return '<div class="coord-fechamento-card">'
        + '<div class="fechamento-card-header">'
        + '<div>'
        + '<div class="fechamento-turma-code">' + (turma ? turma.codigo : '—') + '</div>'
        + '<div class="fechamento-turma-nome">' + (turma ? turma.nome.substring(0,55) : '—') + '</div>'
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Solicitado por <strong>'
        + (docente ? docente.nome.split(' ').slice(0,2).join(' ') : '—')
        + '</strong> em ' + (sol.data || '') + '</div>'
        + '</div>'
        + '<span class="coord-badge badge-aguardando">Aguardando Aprovação (100% Docente)</span>'
        + '</div>'
        + checklistHtml
        + '<div class="fechamento-metricas">'
        + '<div class="fechamento-metrica"><span class="metrica-val">' + totalAtivos + '</span><span class="metrica-label">Alunos Ativos</span></div>'
        + '<div class="fechamento-metrica"><span class="metrica-val">' + mediaGeral + '</span><span class="metrica-label">Média Geral</span></div>'
        + '<div class="fechamento-metrica"><span class="metrica-val">' + freqMedia + '%</span><span class="metrica-label">Freq. Média</span></div>'
        + '<div class="fechamento-metrica' + (emRisco > 0 ? ' metrica-alerta' : '') + '"><span class="metrica-val">' + emRisco + '</span><span class="metrica-label">Em Risco</span></div>'
        + '</div>'
        + (sol.observacao ? '<div class="fechamento-obs">&#128221; <em>"' + sol.observacao + '"</em></div>' : '')
        + '<div class="fechamento-actions">'
        + '<button type="button" class="btn btn-outline btn-sm" onclick="window.coordenadorController.recusarFechamento(' + sol.id + ')">Devolver para Ajustes</button>'
        + '<button type="button" class="btn btn-primary" onclick="window.coordenadorController.aprovarFechamento(' + sol.id + ')">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
        + ' Autorizar Fechamento</button>'
        + '</div></div>';
    }).join('');
  }

  // ─── CRIAR NOVA TURMA ────────────────────────────────────────────────────────

  abrirModalNovaTurma() {
    const modal = document.getElementById('modalCoordenadorNovaTurma');
    if (!modal) return;

    const selectCurso = document.getElementById('novaTurmaCurso');
    if (selectCurso) {
      selectCurso.innerHTML = (window.db.data.cursos || []).map(function(c) {
        return '<option value="' + c.id + '">' + c.nome + '</option>';
      }).join('');
    }

    ['novaTurmaNome','novaTurmaLimiteVagas'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const selectTurno = document.getElementById('novaTurmaTurno');
    if (selectTurno) selectTurno.value = 'Manhã';
    const selectSem = document.getElementById('novaTurmaSemestre');
    if (selectSem) selectSem.value = new Date().getFullYear() + '-1';

    modal.classList.add('open');
  }

  salvarNovaTurma() {
    const nome = document.getElementById('novaTurmaNome') ? document.getElementById('novaTurmaNome').value.trim() : '';
    const cursoId = Number(document.getElementById('novaTurmaCurso') ? document.getElementById('novaTurmaCurso').value : 0);
    const turno = document.getElementById('novaTurmaTurno') ? document.getElementById('novaTurmaTurno').value : 'Manhã';
    const semVal = document.getElementById('novaTurmaSemestre') ? document.getElementById('novaTurmaSemestre').value : '';
    const vagas = Number(document.getElementById('novaTurmaLimiteVagas') ? document.getElementById('novaTurmaLimiteVagas').value : 0);

    if (!nome || !cursoId || !vagas) {
      window.app.mostrarToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    const parts = semVal.split('-');
    const ano = parts[0] || String(new Date().getFullYear());
    const semestre = parts[1] || '1';
    const curso = (window.db.data.cursos || []).find(function(c) { return c.id === cursoId; });
    const sigla = curso ? curso.codigo.split('-')[0] : 'TDS';
    const letraTurno = turno === 'Tarde' ? 'T' : turno === 'Noite' ? 'N' : 'M';

    const ids = (window.db.data.turmas || []).map(function(t) { return t.id; });
    const newId = ids.length > 0 ? Math.max.apply(null, ids) + 1 : 20;

    const novaTurma = {
      id: newId,
      cursoId: cursoId,
      escolaId: 1,
      codigo: sigla + '-' + ano + '-' + semestre + letraTurno,
      nome: nome,
      ano: Number(ano),
      semestre: Number(semestre),
      periodo: turno,
      status: 'EM_ANDAMENTO',
      dataInicio: ano + '-02-01',
      dataFim: ano + '-12-15',
      totalAlunos: 0,
      limiteVagas: vagas
    };

    if (!window.db.data.turmas) window.db.data.turmas = [];
    window.db.data.turmas.push(novaTurma);
    this._persist();

    window.app.fecharModal('modalCoordenadorNovaTurma');
    window.app.mostrarToast('Turma "' + novaTurma.codigo + '" criada com sucesso!', 'success');
    this.renderDashboard();
    this.renderListaTurmas(); this.renderVisaoCurricular();
  }

  // ─── ATRIBUIÇÃO DE DOCENTES ──────────────────────────────────────────────────

  abrirModalAtribuirDocente(turmaId) {
    this._turmaIdAtribuicao = turmaId;
    const turma = (window.db.data.turmas || []).find(function(t) { return t.id === turmaId; });
    const modal = document.getElementById('modalAtribuirDocente');
    if (!modal || !turma) return;

    const label = document.getElementById('atribuirDocenteTurmaLabel');
    if (label) label.textContent = turma.codigo + ' — ' + turma.periodo;

    const select = document.getElementById('selectAtribuirDocente');
    const atribuicoes = this._getAtribuicoes();
    const self = this;

    if (select) {
      select.innerHTML = '<option value="">— Selecione um docente —</option>'
        + (window.db.data.usuarios || [])
          .filter(function(u) { return u.perfil === 'PROFESSOR'; })
          .map(function(u) {
            const conflito = atribuicoes.find(function(a) {
              if (a.docenteId !== u.id || a.turmaId === turmaId) return false;
              const outra = (window.db.data.turmas || []).find(function(t) { return t.id === a.turmaId; });
              return outra && outra.periodo === turma.periodo && outra.status === 'EM_ANDAMENTO';
            });
            return '<option value="' + u.id + '">' + u.nome + (conflito ? ' ⚠️ Conflito de Turno' : '') + '</option>';
          }).join('');

      const checkConflitoLive = function() {
        const docId = Number(select.value);
        const alerta = document.getElementById('atribuirConflitoAlerta');
        const texto = document.getElementById('atribuirConflitoTexto');
        if (!alerta) return;
        if (!docId) {
          alerta.style.display = 'none';
          return;
        }
        const conflito = atribuicoes.find(function(a) {
          if (a.docenteId !== docId || a.turmaId === turmaId) return false;
          const outra = (window.db.data.turmas || []).find(function(t) { return t.id === a.turmaId; });
          return outra && outra.periodo === turma.periodo && outra.status === 'EM_ANDAMENTO';
        });
        if (conflito) {
          const outra = (window.db.data.turmas || []).find(function(t) { return t.id === conflito.turmaId; });
          alerta.style.display = 'block';
          if (texto) {
            texto.innerHTML = 'O docente já leciona na turma <strong>' + (outra ? outra.codigo : '') + '</strong> no turno <strong>' + turma.periodo + '</strong>.';
          }
        } else {
          alerta.style.display = 'none';
        }
      };

      select.onchange = checkConflitoLive;

      const atAtual = atribuicoes.find(function(a) { return a.turmaId === turmaId; });
      if (atAtual) select.value = atAtual.docenteId;
      checkConflitoLive();
    }

    modal.classList.add('open');
  }

  confirmarAtribuicaoDocente() {
    const turmaId = this._turmaIdAtribuicao;
    const docenteId = Number(document.getElementById('selectAtribuirDocente') ? document.getElementById('selectAtribuirDocente').value : 0);

    if (!docenteId) {
      window.app.mostrarToast('Selecione um docente.', 'warning');
      return;
    }

    const turma = (window.db.data.turmas || []).find(function(t) { return t.id === turmaId; });
    const docente = (window.db.data.usuarios || []).find(function(u) { return u.id === docenteId; });
    const atribuicoes = this._getAtribuicoes();

    // ── TRAVA DE CONFLITO DE TURNO ─────────────────────────────────────────────
    const conflito = atribuicoes.find(function(a) {
      if (a.docenteId !== docenteId || a.turmaId === turmaId) return false;
      const outra = (window.db.data.turmas || []).find(function(t) { return t.id === a.turmaId; });
      return outra && outra.periodo === turma.periodo && outra.status === 'EM_ANDAMENTO';
    });

    if (conflito) {
      const outra = (window.db.data.turmas || []).find(function(t) { return t.id === conflito.turmaId; });
      const ok = confirm(
        'CONFLITO DE HORARIO DETECTADO!\n\n'
        + 'O docente "' + (docente ? docente.nome : '') + '" ja esta atribuido a turma "' + (outra ? outra.codigo : '') + '" '
        + 'no mesmo turno (' + (turma ? turma.periodo : '') + ').\n\n'
        + 'Isso pode gerar sobreposicao de horarios. Deseja confirmar mesmo assim?'
      );
      if (!ok) return;
    }
    // ──────────────────────────────────────────────────────────────────────────

    const idx = atribuicoes.findIndex(function(a) { return a.turmaId === turmaId; });
    if (idx >= 0) atribuicoes.splice(idx, 1);
    atribuicoes.push({
      turmaId: turmaId,
      docenteId: docenteId,
      data: new Date().toISOString().split('T')[0]
    });
    window.db.data.atribuicoes = atribuicoes;
    this._persist();

    window.app.fecharModal('modalAtribuirDocente');
    window.app.mostrarToast((docente ? docente.nome.split(' ')[0] : 'Docente') + ' atribuído à turma ' + (turma ? turma.codigo : '') + '!', 'success');
    this.renderListaTurmas(); this.renderVisaoCurricular();
  }

  // ─── SOLICITAR FECHAMENTO (DOCENTE) ─────────────────────────────────────────

  abrirModalSolicitarFechamento(turmaIdPreselecionada) {
    const user = window.auth.getUser();
    if (!user) return;
    const modal = document.getElementById('modalSolicitarFechamento');
    if (!modal) return;

    const atribuicoes = this._getAtribuicoes().filter(function(a) { return a.docenteId === user.id; });
    const solicitadas = this._getSolicitacoes()
      .filter(function(s) { return s.status === 'AGUARDANDO' || s.status === 'APROVADO'; })
      .map(function(s) { return s.turmaId; });

    const select = document.getElementById('selectFechamentoTurma');
    if (select) {
      const disponiveis = (window.db.data.turmas || []).filter(function(t) {
        if (t.status !== 'EM_ANDAMENTO') return false;
        if (user.perfil === 'PROFESSOR') {
          const at = atribuicoes.find(function(a) { return a.turmaId === t.id; });
          if (!at) return false;
        }
        return solicitadas.indexOf(t.id) === -1;
      });

      select.innerHTML = disponiveis.length
        ? disponiveis.map(function(t) {
            return '<option value="' + t.id + '">' + t.codigo + ' — ' + t.nome.substring(0,40) + '</option>';
          }).join('')
        : '<option value="">Nenhuma turma disponível para fechamento</option>';

      if (turmaIdPreselecionada && disponiveis.some(function(t) { return t.id === Number(turmaIdPreselecionada); })) {
        select.value = turmaIdPreselecionada;
      }
    }

    const obs = document.getElementById('inputFechamentoObs');
    if (obs) obs.value = '';
    modal.classList.add('open');
  }

  confirmarSolicitacaoFechamento() {
    const user = window.auth.getUser();
    const select = document.getElementById('selectFechamentoTurma');
    const turmaId = select ? Number(select.value) : 0;
    const obs = document.getElementById('inputFechamentoObs') ? document.getElementById('inputFechamentoObs').value.trim() : '';

    if (!turmaId) {
      window.app.mostrarToast('Selecione uma turma.', 'warning');
      return;
    }

    // Validação de notas preenchidas (0 a 100)
    const alunos = window.db ? window.db.getAlunosPorTurma(turmaId, 'TODOS') : [];
    const turma = (window.db.data.turmas || []).find(function(t) { return t.id === turmaId; });
    const ucId = (turma && turma.ucId) ? turma.ucId : 1;
    const avaliacoes = window.db ? window.db.getAvaliacoesPorUC(turmaId, ucId) : [];

    let pendentes = 0;
    if (avaliacoes.length > 0 && alunos.length > 0) {
      alunos.forEach(function(al) {
        avaliacoes.forEach(function(av) {
          const nota = window.db.getNota(av.id, al.id);
          if (nota === null || isNaN(nota) || nota === undefined) {
            pendentes++;
          }
        });
      });
    }

    if (pendentes > 0) {
      const confirma = confirm(`Atenção: existem ${pendentes} nota(s) pendente(s) de lançamento nesta turma.\n\nDeseja preencher automaticamente com média padrão (75 pts) antes de solicitar autorização da coordenação?`);
      if (confirma) {
        alunos.forEach(function(al) {
          avaliacoes.forEach(function(av) {
            const nota = window.db.getNota(av.id, al.id);
            if (nota === null || isNaN(nota) || nota === undefined) {
              window.db.salvarNota(av.id, al.id, 75);
            }
          });
        });
      } else {
        window.app.mostrarToast('Preencha todas as notas de 0 a 100 antes de solicitar o fechamento.', 'warning');
        return;
      }
    }

    const res = window.db.fecharEtapaDocente(turmaId, user ? user.id : 1, obs);
    if (!res.success) {
      window.app.mostrarToast(res.msg, 'warning');
      return;
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    window.app.fecharModal('modalSolicitarFechamento');
    window.app.mostrarToast(res.msg, res.todosFechados ? 'success' : 'info');
    if (window.app && window.app.renderizarHomeProfessor) {
      window.app.renderizarHomeProfessor();
    }
  }

  // ─── APROVAR / RECUSAR FECHAMENTO (COORDENADOR) ──────────────────────────────

  aprovarFechamento(solId) {
    const solicitacoes = this._getSolicitacoes();
    const sol = solicitacoes.find(function(s) { return s.id === solId; });
    if (!sol) return;

    sol.status = 'APROVADO';
    sol.dataAprovacao = new Date().toLocaleDateString('pt-BR');

    const turma = (window.db.data.turmas || []).find(function(t) { return t.id === sol.turmaId; });
    if (turma) turma.status = 'CONCLUIDA';

    window.db.data.solicitacoesFechamento = solicitacoes;
    this._persist();

    // Notificação automática de aprovação
    if (window.db && typeof window.db.adicionarNotificacao === 'function') {
      window.db.adicionarNotificacao(
        'APROVACAO',
        `Fechamento Autorizado • ${turma ? turma.codigo : 'Turma'}`,
        `A coordenação autorizou e oficializou o fechamento das médias e frequências da turma ${turma ? turma.codigo : ''}.`,
        'Coordenação Pedagógica'
      );
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    window.app.mostrarToast('Fechamento da turma ' + (turma ? turma.codigo : '') + ' autorizado e oficializado com sucesso!', 'success');
    this.renderDashboard();
    this.renderListaTurmas(); this.renderVisaoCurricular();
    this.renderPainelFechamento();
  }

  recusarFechamento(solId) {
    // Exibir modal inline para coletar o motivo da devolução
    const existing = document.getElementById('modalDevolverMotivo');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modalDevolverMotivo';
    overlay.className = 'modal-devolver-motivo';
    overlay.innerHTML = `
      <div class="modal-devolver-box">
        <p class="modal-devolver-title">Devolver para Ajustes</p>
        <p class="modal-devolver-sub">Informe ao docente o que deve ser corrigido antes do fechamento oficial.</p>
        <textarea id="inputMotivoDevolver" class="modal-devolver-textarea"
          placeholder="Ex: Notas dos alunos X e Y estão em branco. Frequência de 03/10 precisa ser conferida..."
          rows="4" autofocus></textarea>
        <div class="modal-devolver-actions">
          <button type="button" class="btn btn-outline btn-sm"
            onclick="document.getElementById('modalDevolverMotivo').remove()">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary"
            onclick="window.coordenadorController._confirmarDevolucao(${solId})">
            Devolver ao Docente
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(function() {
      const ta = document.getElementById('inputMotivoDevolver');
      if (ta) ta.focus();
    }, 80);
  }

  _confirmarDevolucao(solId) {
    const motivo = (document.getElementById('inputMotivoDevolver') || {}).value || '';
    const solicitacoes = this._getSolicitacoes();
    const sol = solicitacoes.find(function(s) { return s.id === solId; });
    if (!sol) return;

    sol.status = 'DEVOLVIDO';
    sol.motivoDevolucao = motivo.trim();
    sol.dataDevolucao = new Date().toLocaleDateString('pt-BR');
    window.db.data.solicitacoesFechamento = solicitacoes;
    this._persist();

    // Regra SENAI: Reabre as etapas dos docentes responsáveis ao devolver
    if (window.db && typeof window.db.reabrirEtapasDocentes === 'function') {
      window.db.reabrirEtapasDocentes(sol.turmaId);
    }

    const turma = (window.db.data.turmas || []).find(function(t) { return t.id === sol.turmaId; });

    // Notificação automática de devolução
    if (window.db && typeof window.db.adicionarNotificacao === 'function') {
      window.db.adicionarNotificacao(
        'DEVOLUCAO',
        `Diário Devolvido para Ajustes • ${turma ? turma.codigo : 'Turma'}`,
        `A coordenação devolveu o diário da turma ${turma ? turma.codigo : ''} para ajustes docentes. Motivo: ${motivo.trim() || 'Verificar notas ou frequência pendentes'}.`,
        'Coordenação Pedagógica'
      );
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    const overlay = document.getElementById('modalDevolverMotivo');
    if (overlay) overlay.remove();

    window.app.mostrarToast('Diário devolvido aos professores responsáveis com sucesso.', 'info');
    this.renderDashboard();
    this.renderPainelFechamento();
  }

  // ─── FILTRO DE TABS ──────────────────────────────────────────────────────────

  filtrarTurmas(filtro) {
    document.querySelectorAll('#coordTurmasTabsGroup .tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.filtro === filtro);
    });
    this.renderListaTurmas(filtro);
  }

  // ─── BIND EVENTOS ────────────────────────────────────────────────────────────

  // ─── VISÃO CURRICULAR HIERÁRQUICA (CURSOS -> MATÉRIAS -> TURMAS COM SÍNTESE) ──
  renderVisaoCurricular(cursoIdSelecionado) {
    const el = document.getElementById('coordCurricularExplorer');
    if (!el) return;

    const cursos = window.db.data.cursos || [];
    if (cursos.length === 0) {
      el.innerHTML = '<div class="coord-empty-state"><p>Nenhum curso cadastrado.</p></div>';
      return;
    }

    if (!cursoIdSelecionado) {
      cursoIdSelecionado = this._cursoSelecionadoId || cursos[0].id;
    }
    this._cursoSelecionadoId = Number(cursoIdSelecionado);

    const cursoAtual = cursos.find(c => c.id === this._cursoSelecionadoId) || cursos[0];
    const ucs = window.db.getUCsPorCurso 
      ? window.db.getUCsPorCurso(cursoAtual.id) 
      : (window.db.data.unidadesCurriculares || []).filter(u => u.cursoId === cursoAtual.id);
    const turmasDoCurso = (window.db.data.turmas || []).filter(t => t.cursoId === cursoAtual.id && t.status === 'EM_ANDAMENTO');
    const atribuicoes = this._getAtribuicoes();
    const self = this;

    // 1. Seletor de Cursos (Pills superiores com contadores)
    let cursosPillsHtml = '<div class="coord-course-selector-bar">';
    cursos.forEach(c => {
      const active = c.id === cursoAtual.id;
      const countTurmas = (window.db.data.turmas || []).filter(t => t.cursoId === c.id && t.status === 'EM_ANDAMENTO').length;
      const countUcs = (window.db.data.unidadesCurriculares || []).filter(u => u.cursoId === c.id).length;
      cursosPillsHtml += `
        <button type="button" class="coord-course-pill ${active ? 'active' : ''}" onclick="window.coordenadorController.renderVisaoCurricular(${c.id})">
          <div class="pill-code">${c.codigo}</div>
          <div class="pill-name">${c.nome}</div>
          <div class="pill-meta">${countUcs} Disciplinas &bull; ${countTurmas} Turmas Ativas</div>
        </button>
      `;
    });
    cursosPillsHtml += '</div>';

    // 2. Disciplinas (UCs) com Turmas e Síntese integrada (sem banner decorativo)
    let ucsHtml = '';
    if (ucs.length === 0) {
      ucsHtml = `
        <div class="coord-empty-state" style="padding: 40px 20px;">
          <p>Nenhuma disciplina curricular cadastrada para este curso.</p>
        </div>
      `;
    } else {
      ucs.forEach(uc => {
        const docenteTitular = (window.db.data.usuarios || []).find(u => u.id === uc.docenteTitularId);

        let turmasCardsHtml = '';
        if (turmasDoCurso.length === 0) {
          turmasCardsHtml = '<div class="coord-turma-empty" style="padding: 16px; color: var(--text-muted); font-size: 12.5px;">Nenhuma turma em andamento vinculada a este curso.</div>';
        } else {
          turmasCardsHtml = '<div class="coord-uc-turmas-grid">' + turmasDoCurso.map(turma => {
            const at = atribuicoes.find(a => a.turmaId === turma.id);
            const docenteTurma = at ? (window.db.data.usuarios || []).find(u => u.id === at.docenteId) : docenteTitular;

            // Dados consolidados da Síntese
            const sintese = window.db.getSinteseConsolidada(turma.id, uc.id);
            const alunos = (sintese && sintese.alunos) ? sintese.alunos : [];
            const totalAtivos = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO').length;

            const medias = alunos.filter(a => a.media > 0).map(a => a.media);
            const mediaGeral = medias.length ? (medias.reduce((s, v) => s + v, 0) / medias.length).toFixed(1) : '—';
            const mediaNum = medias.length ? Number(mediaGeral) : 0;

            const freqs = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO').map(a => a.freqPorcentagem);
            const freqMedia = freqs.length ? (freqs.reduce((s, v) => s + v, 0) / freqs.length).toFixed(1) : '—';

            const emRisco = alunos.filter(a => a.aluno.statusMatricula === 'ATIVO' && (a.media < 70 || a.freqPorcentagem < 75)).length;

            const sol = self._getSolicitacoes().find(s => s.turmaId === turma.id);
            const statusDiarioBadge = sol
              ? (sol.status === 'APROVADO'
                ? '<span class="coord-badge badge-aprovado">&#10003; Diário Fechado</span>'
                : '<span class="coord-badge badge-aguardando">&#9203; Aguardando Homologação</span>')
              : '<span class="coord-badge badge-aberto">Diário Aberto</span>';

            const mediaColor = mediaNum >= 70 ? 'var(--color-success, #16a34a)' : (mediaNum >= 50 ? 'var(--color-warning, #d97706)' : 'var(--color-danger, #dc2626)');

            return `
              <div class="coord-turma-card">
                <div class="turma-card-top">
                  <div>
                    <div class="turma-card-code">${turma.codigo}</div>
                    <div class="turma-card-periodo"><span class="coord-badge badge-periodo">${turma.periodo}</span> &bull; ${turma.totalAlunos} Alunos</div>
                  </div>
                  <div>
                    ${statusDiarioBadge}
                  </div>
                </div>

                <div class="turma-card-docente">
                  <span class="docente-label">Docente:</span>
                  <strong>${docenteTurma ? docenteTurma.nome.split(' ').slice(0, 2).join(' ') : '— Não atribuído —'}</strong>
                </div>

                <!-- Síntese compacta inline -->
                <div class="turma-sintese-inline">
                  <div class="sintese-inline-item">
                    <span class="kpi-num" style="color: ${mediaColor};">${mediaGeral}</span>
                    <span class="kpi-txt">Média</span>
                  </div>
                  <div class="sintese-inline-item">
                    <span class="kpi-num">${freqMedia}%</span>
                    <span class="kpi-txt">Freq.</span>
                  </div>
                  <div class="sintese-inline-item ${emRisco > 0 ? 'kpi-alerta' : ''}">
                    <span class="kpi-num">${emRisco}</span>
                    <span class="kpi-txt">Risco</span>
                  </div>
                  <div class="sintese-inline-item">
                    <span class="kpi-num">${totalAtivos}</span>
                    <span class="kpi-txt">Ativos</span>
                  </div>
                </div>

                <div class="turma-card-actions">
                  <button type="button" class="btn btn-sm btn-outline" onclick="window.app.abrirDiarioComTurma(${turma.id})" title="Inspecionar Chamada em Modo Observador">
                    👁️ Ver Diário
                  </button>
                  <button type="button" class="btn btn-sm btn-primary" onclick="window.app.abrirSinteseComTurma(${turma.id}, ${uc.id})" title="Inspecionar Síntese em Modo Observador">
                    👁️ Ver Síntese
                  </button>
                </div>
              </div>
            `;
          }).join('') + '</div>';
        }

        ucsHtml += `
          <div class="coord-uc-card">
            <div class="coord-uc-header">
              <div class="uc-header-left">
                <span class="uc-modulo-badge">${uc.modulo ? uc.modulo + 'º Módulo' : 'Geral'}</span>
                <span class="uc-code">${uc.codigo}</span>
                <h4 class="uc-title">${uc.nome}</h4>
              </div>
              <div class="uc-header-right">
                <span class="uc-ch-badge">&#9200; ${uc.cargaHoraria}h</span>
                <span class="uc-docente-badge">&#128104;&#8205;&#127979; Titular: ${docenteTitular ? docenteTitular.nome.split(' ').slice(0, 2).join(' ') : 'SENAI'}</span>
              </div>
            </div>

            <div class="coord-uc-body">
              <div class="coord-uc-turmas-title">
                <span>Turmas Vinculadas a esta Matéria</span>
                <span class="count-pill">${turmasDoCurso.length}</span>
              </div>
              ${turmasCardsHtml}
            </div>
          </div>
        `;
      });
    }

    el.innerHTML = cursosPillsHtml + ucsHtml;
  }

  _bindEvents() {
    var ids = ['modalCoordenadorNovaTurma','modalAtribuirDocente','modalSolicitarFechamento'];
    ids.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function(e) {
          if (e.target === el) window.app.fecharModal(id);
        });
      }
    });
  }
}

window.coordenadorController = new CoordenadorController();
