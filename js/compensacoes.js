/**
 * =============================================================================
 * RENOVA SENAI - MÓDULO DE COMPENSAÇÕES (compensacoes.js)
 * Controle de Obrigações geradas por 5 atrasos ou faltas e registro de cumprimento
 * =============================================================================
 */

class CompensacoesController {
  constructor() {
    this.filtroTipo = 'TODOS'; // 'TODOS', 'ATRASOS', 'FALTAS'
  }

  init() {
    this.renderizar();
  }

  renderizar() {
    const tbody = document.getElementById('compensacoesTableBody');
    if (!tbody) return;

    let lista = window.db.getCompensacoes();
    
    // Aplicar filtro
    if (this.filtroTipo === 'ATRASOS') {
      lista = lista.filter(c => c.tipoOrigem === 'ATRASOS' || c.motivoOrigem.includes('atrasos'));
    } else if (this.filtroTipo === 'FALTAS') {
      lista = lista.filter(c => c.tipoOrigem === 'FALTAS' || c.motivoOrigem.includes('Frequência abaixo'));
    }

    tbody.innerHTML = lista.map(c => {
      const isAtrasos = c.tipoOrigem === 'ATRASOS' || c.motivoOrigem.includes('atrasos');
      const isFaltas = c.tipoOrigem === 'FALTAS' || c.motivoOrigem.includes('Frequência abaixo');
      const tipoBadge = isFaltas 
        ? '<span class="portal-tag-pill" style="background:#fee2e2; color:#991b1b; font-size:10px;"> FALTAS</span>'
        : '<span class="portal-tag-pill" style="background:#fef3c7; color:#b45309; font-size:10px;"> ATRASOS</span>';
      
      return `
        <tr class="${isFaltas ? 'row-freq-critical' : ''}">
          <td><strong>${c.alunoNome}</strong></td>
          <td>
            ${tipoBadge}
            <div style="font-weight:600; margin-top:4px;">${c.motivoOrigem}</div>
            <div style="font-size:11.5px; color:var(--text-muted);">Carga: <strong>${c.horasObrigacao} horas</strong> &bull; Prazo Limite: ${c.dataLimite}</div>
          </td>
          <td>
            ${c.status === 'PENDENTE' 
              ? '<span class="delays-warning-chip" style="font-size:12px;"> PENDENTE</span>' 
              : '<span style="color:#16a34a; font-weight:700; font-size:12px;"> CUMPRIDA</span>'}
          </td>
          <td>
            <div style="font-size:12.5px;">${c.atividadeDescricao || 'Atividade a definir'}</div>
            ${c.dataCumprimento ? `<div style="font-size:11px; color:#16a34a;">Cumprida em: ${c.dataCumprimento}</div>` : ''}
          </td>
          <td style="text-align: right;">
            ${c.status === 'PENDENTE' ? `
              <button type="button" class="btn btn-sm btn-primary" onclick="window.compensacoesController.abrirModalCumprimento(${c.id})">
                Registrar Cumprimento
              </button>
            ` : `
              <span style="font-size:12px; color:var(--text-muted);">Homologado</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Renderizar filtros se não existirem
    this.renderizarFiltros();
  }

  renderizarFiltros() {
    const headerRow = document.querySelector('#tabSection_compensacoes .section-header-row');
    if (!headerRow || headerRow.querySelector('.compensacoes-filtro')) return;

    const filtroHtml = `
      <div class="compensacoes-filtro" style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-sm ${this.filtroTipo === 'TODOS' ? 'btn-primary' : 'btn-outline'}" 
          onclick="window.compensacoesController.setFiltro('TODOS')">Todas</button>
        <button type="button" class="btn btn-sm ${this.filtroTipo === 'ATRASOS' ? 'btn-primary' : 'btn-outline'}" 
          onclick="window.compensacoesController.setFiltro('ATRASOS')" style="border-color:#fcd34d; color:#b45309;">
          <span class="portal-tag-pill" style="background:#fef3c7; color:#b45309; padding:0 8px;"> Atrasos</span>
        </button>
        <button type="button" class="btn btn-sm ${this.filtroTipo === 'FALTAS' ? 'btn-primary' : 'btn-outline'}" 
          onclick="window.compensacoesController.setFiltro('FALTAS')" style="border-color:#fca5a5; color:#991b1b;">
          <span class="portal-tag-pill" style="background:#fee2e2; color:#991b1b; padding:0 8px;"> Faltas</span>
        </button>
      </div>
    `;
    
    headerRow.insertAdjacentHTML('beforeend', filtroHtml);
  }

  setFiltro(tipo) {
    this.filtroTipo = tipo;
    this.renderizar();
  }

  // [Alteração 6]: Métodos para inserção e definição manual de compensação pelo professor
  carregarAlunosParaModalCompensacao() {
    const sel = document.getElementById('selectNovaCompensacaoAluno');
    if (!sel) return;

    // Obtém alunos ativos de todas as turmas em andamento
    const turmas = window.db.getTurmas('EM_ANDAMENTO');
    let optionsHtml = '';
    turmas.forEach(t => {
      const alunosTurma = window.db.getAlunosPorTurma(t.id).filter(a => a.statusMatricula === 'ATIVO');
      if (alunosTurma.length) {
        optionsHtml += `<optgroup label="${t.codigo} - ${t.nome}">`;
        alunosTurma.forEach(a => {
          optionsHtml += `<option value="${a.id}">${a.nome} (${a.ra}) - Subturma ${a.subturma}</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
    });

    sel.innerHTML = optionsHtml;
  }

  abrirModalNovaCompensacao() {
    this.carregarAlunosParaModalCompensacao();
    
    // Configura data limite padrão para 20 dias à frente
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 20);
    const inputData = document.getElementById('inputNovaCompensacaoDataLimite');
    if (inputData) inputData.value = dataLimite.toISOString().split('T')[0];

    const inputHoras = document.getElementById('inputNovaCompensacaoHoras');
    if (inputHoras) inputHoras.value = '2';

    const inputMotivo = document.getElementById('inputNovaCompensacaoMotivo');
    if (inputMotivo) inputMotivo.value = '';

    const textDesc = document.getElementById('textNovaCompensacaoDescricao');
    if (textDesc) textDesc.value = '';

    window.app.abrirModal('modalNovaCompensacao');
  }

  salvarNovaCompensacao() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    const alunoId = document.getElementById('selectNovaCompensacaoAluno')?.value;
    const horas = document.getElementById('inputNovaCompensacaoHoras')?.value;
    const dataLimite = document.getElementById('inputNovaCompensacaoDataLimite')?.value;
    const motivo = document.getElementById('inputNovaCompensacaoMotivo')?.value;
    const atividadeDescricao = document.getElementById('textNovaCompensacaoDescricao')?.value;

    if (!alunoId) {
      window.app.mostrarToast('Selecione um aluno para definir a compensação.', 'warning');
      return;
    }
    if (!horas || Number(horas) <= 0) {
      window.app.mostrarToast('Informe a carga horária a ser compensada.', 'warning');
      return;
    }
    if (!dataLimite) {
      window.app.mostrarToast('Informe a data limite para cumprimento.', 'warning');
      return;
    }
    if (!motivo) {
      window.app.mostrarToast('Descreva o motivo da obrigação de compensação.', 'warning');
      return;
    }

    // [Alteração 6]: Compensação inserida e definida manualmente pelo professor
    window.db.addCompensacao({
      alunoId: Number(alunoId),
      horasObrigacao: Number(horas),
      dataLimite,
      motivoOrigem: motivo,
      atividadeDescricao: atividadeDescricao || 'Atividade prescrita pelo professor.',
      tipoOrigem: 'MANUAL'
    });

    window.app.fecharModal('modalNovaCompensacao');
    window.app.mostrarToast('Compensação manual definida com sucesso pelo professor!', 'success');
    this.renderizar();
  }

  abrirModalCumprimento(compId) {
    document.getElementById('inputCompensacaoId').value = compId;
    window.app.abrirModal('modalRegistrarCompensacao');
  }

  salvarCumprimento() {
    if (window.auth && window.auth.isCoordenacao()) {
      window.app.mostrarToast('Ação bloqueada: a Coordenação atua exclusivamente em Modo Observador.', 'warning');
      return;
    }
    const compId = document.getElementById('inputCompensacaoId').value;
    const desc = document.getElementById('textCompensacaoRelato').value;

    if (!desc) {
      window.app.mostrarToast('Descreva a atividade realizada pelo aluno.', 'warning');
      return;
    }

    window.db.registrarCompensacaoCumprida(compId, desc);
    window.app.fecharModal('modalRegistrarCompensacao');
    window.app.mostrarToast('Compensação registrada e homologada com sucesso!', 'success');
    this.renderizar();
  }
}

window.compensacoesController = new CompensacoesController();
