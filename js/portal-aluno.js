/**
 * RENOVA SENAI - Portal do Aluno Controller (js/portal-aluno.js)
 * 100% Integrado ao window.db (Zero Mocks Estáticos)
 * Comunicação bidirecional com Portal do Orientador e Diário Docente
 */

class PortalAlunoController {
  constructor() {
    this._iniciado = false;
  }

  init() {
    if (!this._iniciado) {
      this._iniciado = true;
      if (typeof window !== 'undefined') {
        window.addEventListener('renova:db-updated', () => {
          if (window.app && (window.app.currentTab === 'aluno' || (window.auth && window.auth.isAluno && window.auth.isAluno()))) {
            this.renderizarSecaoOrientacao();
          }
        });
      }
    }
    this.renderizarSecaoOrientacao();
  }

  getAlunoAtivo() {
    if (!window.db) return null;
    return window.db.getAlunoLogado();
  }

  // Renderiza a seção de Acompanhamento com a Orientação Educacional dentro do portal do aluno
  renderizarSecaoOrientacao() {
    const container = document.getElementById('alunoOrientacaoSecaoContainer');
    if (!container) return;

    const aluno = this.getAlunoAtivo();
    if (!aluno) {
      container.innerHTML = '<p class="text-muted">Dados do aluno não encontrados.</p>';
      return;
    }

    const justificativas = window.db.getJustificativas ? window.db.getJustificativas(aluno.id) : [];
    const compensacoes = (window.db.data.compensacoes || []).filter(c => c.alunoId === aluno.id);
    const atendimentos = (window.db.data.atendimentosOrientacao || []).filter(a => a.alunoId === aluno.id && a.status === 'REALIZADO');

    // Estatísticas rápidas
    const atestadosPendentes = justificativas.filter(j => j.status === 'PENDENTE').length;
    const atestadosAbonados = justificativas.filter(j => j.status === 'ABONADA' || j.status === 'DEFERIDO').length;
    const compAgendadas = compensacoes.filter(c => c.status === 'AGENDADA').length;

    container.innerHTML = `
      <div class="aluno-orient-card" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:22px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <!-- Topo da Seção -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; border-bottom:1px solid #f1f5f9; padding-bottom:14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:10px; background:#eff6ff; color:#0284c7; display:flex; align-items:center; justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div>
              <h3 style="font-size:15px; font-weight:800; color:#0f172a; margin:0;">Acompanhamento com a Orientação Educacional</h3>
              <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Canal oficial para envio de atestados médicos, justificativas e acompanhamento de compensações.</p>
            </div>
          </div>

          <!-- Botão de Ação Principal -->
          <button type="button" class="btn btn-primary" onclick="window.portalAlunoController.abrirModalSolicitarJustificativa()" style="background:#0284c7; border-color:#0284c7; font-weight:700; font-size:13px; display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            <span>+ Solicitar Compensação / Enviar Atestado</span>
          </button>
        </div>

                <!-- Indicadores Diretos Consolidados -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:18px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Atestados Homologados</div>
            <div style="font-size:20px; font-weight:800; color:#16a34a; margin-top:2px;">${atestadosAbonados}</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Em Análise</div>
            <div style="font-size:20px; font-weight:800; color:#f59e0b; margin-top:2px;">${atestadosPendentes}</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Compensações Pendentes</div>
            <div style="font-size:20px; font-weight:800; color:#0284c7; margin-top:2px;">${compAgendadas}</div>
          </div>
        </div>

        <!-- Grade com 2 Colunas: Atestados & Compensações + Combinados -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
          
          <!-- Coluna 1: Atestados e Justificativas de Ausência -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h4 style="font-size:13px; font-weight:700; color:#0f172a; margin:0;">Meus Atestados & Justificativas</h4>
              <span style="font-size:11px; color:#64748b; background:#e2e8f0; padding:2px 8px; border-radius:9999px;">${justificativas.length} registro(s)</span>
            </div>

            ${justificativas.length === 0 ? `
              <div style="text-align:center; padding:24px 10px; color:#94a3b8; font-size:12.5px;">
                Nenhuma justificativa enviada até o momento.
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px;">
                ${justificativas.map(j => {
                  let badge = `<span style="background:#fef3c7; color:#92400e; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:9999px;">Em Análise</span>`;
                  if (j.status === 'ABONADA' || j.status === 'DEFERIDO') {
                    badge = `<span style="background:#dcfce7; color:#166534; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:9999px;">Abonada (Dispensa D)</span>`;
                  } else if (j.status === 'A_COMPENSAR') {
                    badge = `<span style="background:#e0f2fe; color:#0369a1; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:9999px;">A Compensar</span>`;
                  } else if (j.status === 'INJUSTIFICADA' || j.status === 'INDEFERIDO') {
                    badge = `<span style="background:#fee2e2; color:#991b1b; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:9999px;">Injustificada</span>`;
                  }

                  const periodoStr = j.dataInicio === j.dataFim ? j.dataInicio : `${j.dataInicio} a ${j.dataFim}`;

                  return `
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; font-size:12px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:#0f172a;">${periodoStr}</strong>
                        ${badge}
                      </div>
                      <div style="color:#475569; margin-bottom:4px;"><strong>Motivo:</strong> ${j.motivo || 'Motivo de saúde'}</div>
                      ${j.anexo ? `<div style="color:#64748b; font-size:11px; margin-bottom:4px;">Documento: ${j.anexo}</div>` : ''}
                      ${j.parecer ? `<div style="background:#f1f5f9; border-radius:6px; padding:6px 8px; font-size:11px; color:#334155; margin-top:4px;"><strong>Parecer da Orientação:</strong> ${j.parecer}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Coluna 2: Compensações Agendadas e Orientações -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h4 style="font-size:13px; font-weight:700; color:#0f172a; margin:0;">Atividades de Compensação & Combinados</h4>
              <span style="font-size:11px; color:#64748b; background:#e2e8f0; padding:2px 8px; border-radius:9999px;">${compensacoes.length} compensação(ões)</span>
            </div>

            ${compensacoes.length === 0 && atendimentos.length === 0 ? `
              <div style="text-align:center; padding:24px 10px; color:#94a3b8; font-size:12.5px;">
                Nenhuma compensação ou combinado pendente. Situação regular!
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px; max-height:260px; overflow-y:auto; padding-right:4px;">
                ${compensacoes.map(c => {
                  const cumprido = c.status === 'CUMPRIDO';
                  return `
                    <div style="background:#ffffff; border:1px solid ${cumprido ? '#bbf7d0' : '#bae6fd'}; border-left:3px solid ${cumprido ? '#16a34a' : '#0284c7'}; border-radius:8px; padding:10px 12px; font-size:12px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:#0f172a;">${c.atividade || 'Atividade de Reposição'}</strong>
                        <span style="background:${cumprido ? '#dcfce7' : '#e0f2fe'}; color:${cumprido ? '#166534' : '#0369a1'}; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:9999px;">
                          ${cumprido ? '✓ Cumprida' : 'Agendada'}
                        </span>
                      </div>
                      <div style="color:#475569;">
                        <strong>Data Agendada:</strong> ${c.dataAgendada || c.data || 'A definir'} • <strong>Turno:</strong> ${c.turno || 'Contraturno'}
                      </div>
                      ${c.observacao ? `<div style="color:#64748b; font-size:11px; margin-top:4px;"><em>"${c.observacao}"</em></div>` : ''}
                    </div>
                  `;
                }).join('')}

                ${atendimentos.map(at => {
                  return `
                    <div style="background:#ffffff; border:1px solid #fed7aa; border-left:3px solid #f97316; border-radius:8px; padding:10px 12px; font-size:12px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:#9a3412;">Combinado com a Orientadora</strong>
                        <span style="font-size:10.5px; color:#7c2d12; font-weight:600;">${at.data}</span>
                      </div>
                      <div style="color:#334155; font-size:11.5px; margin-bottom:4px;">${at.resumo}</div>
                      ${at.combinados ? `<div style="background:#fff7ed; padding:5px 8px; border-radius:6px; font-size:11px; color:#9a3412;"><strong>Combinado:</strong> ${at.combinados}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

        </div>
      </div>
    `;
  }

  abrirModalSolicitarJustificativa() {
    const modal = document.getElementById('modalEnviarAtestadoAluno');
    if (!modal) return;

    const dataHoje = new Date().toISOString().split('T')[0];
    const inpInicio = document.getElementById('alunoAtestadoDataInicio');
    const inpFim = document.getElementById('alunoAtestadoDataFim');
    const inpMotivo = document.getElementById('alunoAtestadoMotivo');
    const inpDescricao = document.getElementById('alunoAtestadoDescricao');

    if (inpInicio) inpInicio.value = dataHoje;
    if (inpFim) inpFim.value = dataHoje;
    if (inpMotivo) inpMotivo.selectedIndex = 0;
    if (inpDescricao) inpDescricao.value = '';

    modal.style.display = 'flex';
  }

  fecharModalSolicitarJustificativa() {
    const modal = document.getElementById('modalEnviarAtestadoAluno');
    if (modal) modal.style.display = 'none';
  }

  salvarSolicitacaoJustificativa() {
    const aluno = this.getAlunoAtivo();
    if (!aluno) {
      if (window.app) window.app.mostrarToast('Erro ao identificar aluno logado.', 'danger');
      return;
    }

    const inpInicio = document.getElementById('alunoAtestadoDataInicio');
    const inpFim = document.getElementById('alunoAtestadoDataFim');
    const inpMotivo = document.getElementById('alunoAtestadoMotivo');
    const inpDescricao = document.getElementById('alunoAtestadoDescricao');

    const dataInicio = inpInicio ? inpInicio.value : '';
    const dataFim = inpFim ? inpFim.value : '';
    const motivo = inpMotivo ? inpMotivo.value : 'Atestado Médico';
    const descricao = inpDescricao ? inpDescricao.value.trim() : '';

    if (!dataInicio) {
      if (window.app) window.app.mostrarToast('Informe a data de início da ausência.', 'warning');
      return;
    }

    const dataFimFinal = dataFim || dataInicio;
    const nomeDoc = descricao ? `Documento_${motivo.substring(0, 10).replace(/\s+/g, '_')}.pdf` : 'atestado_medico.pdf';

    const payload = {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turmaId: aluno.turmaId || 1,
      tipo: motivo,
      dataInicio: dataInicio,
      dataFim: dataFimFinal,
      motivo: descricao || motivo,
      documento: nomeDoc,
      anexo: descricao ? `Documento: ${descricao}` : 'Documento comprobatório anexado pelo estudante',
      status: 'PENDENTE',
      cadastradoPor: `${aluno.nome} (Estudante)`,
      criadoEm: new Date().toISOString()
    };

    if (window.db && window.db.addJustificativa) {
      window.db.addJustificativa(payload);
    }

    this.fecharModalSolicitarJustificativa();

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('renova:db-updated'));
    }

    if (window.app) {
      window.app.mostrarToast('Justificativa de ausência enviada à Orientação Educacional com sucesso!', 'success');
    }

    this.renderizarSecaoOrientacao();
  }
}

// Inicializa a instância global
if (typeof window !== 'undefined') {
  window.portalAlunoController = new PortalAlunoController();
  document.addEventListener('DOMContentLoaded', () => {
    window.portalAlunoController.init();
  });
}
