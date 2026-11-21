/**
 * =============================================================================
 * RENOVA SENAI - RELATÓRIOS ACADÊMICOS UNIFICADOS (relatorios.js)
 * Geração centralizada e reutilizável de PDFs para todos os portais:
 * - Docente / Professor
 * - Coordenação
 * - Aluno
 * Histórico separado por portal no localStorage (via window.db)
 * Modal compartilhado de pré-visualização e download
 * =============================================================================
 */

class RelatoriosController {
  constructor() {
    this.tipoRelatorio = 'frequencia';
    this.turmaId = 1;
    this.ucId = 1;

    // Paleta de cores oficial SENAI-SP
    this.senaiRed = [195, 22, 28];
    this.darkGray = [30, 41, 59];
    this.mediumGray = [100, 116, 139];
    this.lightGray = [226, 232, 240];
  }

  // Retorna o portal ativo do usuário logado ('ALUNO', 'PROFESSOR', 'COORDENACAO')
  _getPortal() {
    const perfil = (window.auth && typeof window.auth.getPerfilAtivo === 'function' && window.auth.getPerfilAtivo()) || '';
    if (perfil === 'ALUNO') return 'ALUNO';
    if (perfil === 'PROFESSOR' || perfil === 'DOCENTE') return 'PROFESSOR';
    if (perfil === 'COORDENADOR' || perfil === 'COORDENACAO') return 'COORDENACAO';
    return 'PROFESSOR';
  }

  _getPerfil() {
    return this._getPortal();
  }

  _getUserId() {
    return window.auth && typeof window.auth.getUser === 'function' && window.auth.getUser() ? window.auth.getUser().id : null;
  }

  init() {
    console.log('[Relatorios] init() chamado');
    // Sincroniza turmaId e ucId com a turma ativa do app se existir
    if (window.app && window.app.turmaAtiva) {
      this.turmaId = Number(window.app.turmaAtiva.id || window.app.turmaAtiva);
    }
    if (window.app && window.app.ucAtiva) {
      this.ucId = Number(window.app.ucAtiva.id || window.app.ucAtiva);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.carregarTudo());
    } else {
      this.carregarTudo();
    }
  }

  carregarTudo() {
    const portal = this._getPortal();
    if (portal === 'ALUNO') {
      this._modoAluno();
    } else {
      this.carregarTurmasSelect();
      this.carregarUCsSelect();
    }
    this.renderizarHistorico();
  }

  _modoAluno() {
    const selTurma = document.getElementById('selectRelatorioTurma');
    const selUC = document.getElementById('selectRelatorioUC');
    if (selTurma && selTurma.closest('.form-group-clean')) {
      selTurma.closest('.form-group-clean').style.display = 'none';
    }
    if (selUC && selUC.closest('.form-group-clean')) {
      selUC.closest('.form-group-clean').style.display = 'none';
    }
    const user = window.auth && typeof window.auth.getUser === 'function' ? window.auth.getUser() : null;
    const bar = document.getElementById('relatoriosTurmaInfoBar');
    if (bar && user) {
      bar.innerHTML = `Aluno: <strong>${user.nome}</strong> — seus registros acadêmicos`;
    }
    const sel = document.getElementById('selectTipoRelatorioFigma');
    if (sel) {
      sel.innerHTML = `
        <option value="aluno_frequencia" selected>Comprovante de Frequência</option>
        <option value="aluno_boletim">Boletim Acadêmico de Notas</option>
      `;
    }
    this.turmaId = (user && user.turmaId) || 1;
    this.ucId = 1;
  }

  carregarTurmasSelect() {
    const perfil = this._getPerfil();
    const sel = document.getElementById('selectRelatorioTurma');
    if (!sel) return;
    if (!window.db || typeof window.db.getTurmas !== 'function') return;

    let turmas = window.db.getTurmas('TODOS');
    if (perfil === 'PROFESSOR') {
      const ativas = window.db.getTurmas('EM_ANDAMENTO').filter(t => t.codigo && /^1-2026\./.test(t.codigo));
      turmas = ativas.length > 0 ? ativas.slice(0, 4) : window.db.getTurmas('EM_ANDAMENTO').slice(0, 4);
    }

    sel.innerHTML = '<option value="">Selecione a turma...</option>' +
      turmas.map(t => `<option value="${t.id}" ${t.id === this.turmaId ? 'selected' : ''}>${t.codigo} - ${t.nome}</option>`).join('');

    if (!this.turmaId && turmas.length > 0) {
      this.turmaId = turmas[0].id;
      sel.value = this.turmaId;
    }
    this.atualizarBarraInfo();
  }

  carregarUCsSelect() {
    const perfil = this._getPerfil();
    const userId = this._getUserId();
    const sel = document.getElementById('selectRelatorioUC');
    if (!sel) return;
    if (!this.turmaId || !window.db || typeof window.db.getUCsPorTurma !== 'function') {
      sel.innerHTML = '<option value="">Selecione a turma primeiro...</option>';
      return;
    }

    let ucs = window.db.getUCsPorTurma(this.turmaId);
    if (perfil === 'PROFESSOR' && userId) {
      const ucsFiltradas = ucs.filter(uc => uc.docenteTitularId === Number(userId));
      if (ucsFiltradas.length > 0) ucs = ucsFiltradas;
    }

    sel.innerHTML = '<option value="">Selecione a UC...</option>' +
      ucs.map(u => `<option value="${u.id}" ${u.id === this.ucId ? 'selected' : ''}>${u.codigo} - ${u.nome}</option>`).join('');

    if (ucs.length && (!this.ucId || !ucs.some(u => u.id === this.ucId))) {
      this.ucId = ucs[0].id;
      sel.value = this.ucId;
    }
  }

  onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.carregarUCsSelect();
    this.atualizarBarraInfo();
  }

  onUCChange(novaUCId) {
    this.ucId = Number(novaUCId);
  }

  atualizarBarraInfo() {
    const bar = document.getElementById('relatoriosTurmaInfoBar');
    if (!bar) return;
    if (!window.db || typeof window.db.getTurmaById !== 'function') return;
    const t = window.db.getTurmaById(this.turmaId);
    if (t) {
      bar.innerHTML = `Turma: <strong>${t.codigo}</strong> | Curso: <strong>${t.nome}</strong>`;
    } else {
      bar.textContent = 'Selecione uma turma abaixo';
    }
  }

  getTituloRelatorio(tipo) {
    tipo = tipo || this.tipoRelatorio;
    const titulos = {
      frequencia: 'Relatório Oficial de Controle de Frequência',
      rendimento: 'Relatório de Rendimento Escolar e Médias',
      notas: 'Relatório de Notas e Avaliações',
      conteudo: 'Relatório de Conteúdo das Aulas e PTDs',
      compensacao: 'Relatório de Compensação de Ausências e Atrasos',
      sintese: 'Síntese Consolidada do Fechamento da Turma',
      aluno_frequencia: 'Comprovante Oficial de Frequência Individual',
      aluno_boletim: 'Boletim Acadêmico Oficial de Notas'
    };
    return titulos[tipo] || 'Relatório Acadêmico Oficial';
  }

  getSubTituloRelatorio(tipo) {
    tipo = tipo || this.tipoRelatorio;
    const subtitulos = {
      frequencia: 'Acompanhamento consolidado de assiduidade e pontualidade discente',
      rendimento: 'Quadro geral de notas por avaliações formativas e somativas',
      notas: 'Quadro analítico de notas e médias por componente curricular',
      conteudo: 'Registro cronológico de atividades didáticas e competências ministradas',
      compensacao: 'Controle de cumprimento de atividades complementares e reposições',
      sintese: 'Quadro consolidado de desempenho e frequência da turma',
      aluno_frequencia: 'Declaração e histórico individual de presença para fins acadêmicos',
      aluno_boletim: 'Histórico de notas, médias e situação final por componente curricular'
    };
    return subtitulos[tipo] || 'Documento Oficial SENAI São Paulo';
  }

  // =========================================================================
  // CABEÇALHO E RODAPÉ PADRÃO SENAI
  // =========================================================================
  _desenharCabecalho(doc, pageWidth, margin) {
    const dataHoraEmissao = new Date().toLocaleString('pt-BR');
    // Faixa superior vermelha SENAI
    doc.setFillColor(...this.senaiRed);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Logo SENAI
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SENAI', margin, 18);

    // Identificação institucional
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Serviço Nacional de Aprendizagem Industrial - SENAI-SP', margin + 35, 12);
    doc.text('Escola SENAI Roberto Simonsen • Diretoria de Educação', margin + 35, 18);

    // Metadados
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emissão: ${dataHoraEmissao}`, pageWidth - margin, 12, { align: 'right' });
    doc.text('Sistema: Portal Acadêmico / Renova SENAI', pageWidth - margin, 18, { align: 'right' });
  }

  _preencherInfoCabecalho(doc, { turma, uc, aluno, tipo }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const yPos = 34;

    // Quadro de parâmetros
    doc.setDrawColor(...this.lightGray);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 24, 3, 3, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.mediumGray);
    doc.text('TURMA / PERÍODO:', margin + 4, yPos + 6);
    doc.text('CURSO:', margin + 4, yPos + 12);
    doc.text(aluno ? 'ALUNO / RA:' : 'UNIDADE CURRICULAR:', margin + 4, yPos + 18);

    const emitente = (window.auth && typeof window.auth.getUser === 'function' && window.auth.getUser()) ? window.auth.getUser().nome : 'DOCENTE SENAI';
    doc.text('EMITIDO POR:', pageWidth / 2 + 4, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.darkGray);
    doc.setFontSize(8);
    const turmaCodigo = turma ? turma.codigo : '1-2026.205 BA';
    const turmaPeriodo = turma ? (turma.periodo || '1º Semestre') : 'Manhã';
    const cursoNome = turma ? turma.nome : 'Técnico em Desenvolvimento de Sistemas';

    doc.text(`${turmaCodigo} - ${turmaPeriodo}`, margin + 38, yPos + 6);
    doc.text(cursoNome, margin + 18, yPos + 12);

    if (aluno) {
      doc.text(`${aluno.nome} (RA: ${aluno.ra || '-'})`, margin + 32, yPos + 18);
    } else {
      const ucTxt = uc ? `${uc.codigo} - ${uc.nome}` : 'Todas as Unidades Curriculares';
      doc.text(ucTxt, margin + 42, yPos + 18);
    }
    doc.text(emitente, pageWidth / 2 + 32, yPos + 6);

    // Título e Subtítulo centralizados
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.senaiRed);
    doc.text(this.getTituloRelatorio(tipo), pageWidth / 2, yPos + 34, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.mediumGray);
    doc.text(this.getSubTituloRelatorio(tipo), pageWidth / 2, yPos + 40, { align: 'center' });
  }

  _desenharRodape(doc, startY) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const assinaturaY = pageHeight - 32;

      doc.setDrawColor(...this.lightGray);
      doc.line(margin, assinaturaY - 5, pageWidth - margin, assinaturaY - 5);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.mediumGray);
      doc.text(`Página ${i} de ${totalPages} • Documento gerado com autenticidade eletrônica pelo Portal SENAI-SP`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Linhas de assinatura oficial
      const linhaY = assinaturaY + 10;
      doc.setDrawColor(...this.darkGray);
      doc.line(margin, linhaY, margin + 65, linhaY);
      doc.line(pageWidth - margin - 65, linhaY, pageWidth - margin, linhaY);

      const userNome = (window.auth && typeof window.auth.getUser === 'function' && window.auth.getUser()) ? window.auth.getUser().nome : 'DOCENTE RESPONSÁVEL';
      doc.setFontSize(7);
      doc.setTextColor(...this.mediumGray);
      doc.text(userNome, margin, linhaY + 4);
      doc.text('Docente / Responsável', margin, linhaY + 8);
      doc.text('PAULO RICARDO MENDONÇA', pageWidth - margin - 65, linhaY + 4);
      doc.text('Coordenação Pedagógica / Direção', pageWidth - margin - 65, linhaY + 8);
    }
  }

  // =========================================================================
  // PREENCHIMENTO DOS TIPOS DE RELATÓRIO
  // =========================================================================
  _preencherFrequencia(doc, { turma, uc, aluno }) {
    const sintese = window.db ? window.db.getSinteseConsolidada(turma.id, uc ? uc.id : null) : { alunos: [] };
    let listaAlunos = sintese.alunos || [];
    if (aluno) {
      listaAlunos = listaAlunos.filter(item => item.aluno && item.aluno.id === aluno.id);
    }

    const rows = listaAlunos.map(item => [
      (item.aluno && item.aluno.numeroChamada) ? item.aluno.numeroChamada.toString() : '-',
      (item.aluno && item.aluno.nome) || '-',
      (item.aluno && item.aluno.ra) || '-',
      item.presencas !== undefined ? item.presencas.toString() : '0',
      item.faltas !== undefined ? item.faltas.toString() : '0',
      item.atrasos !== undefined ? item.atrasos.toString() : '0',
      item.freqPorcentagem !== undefined ? item.freqPorcentagem + '%' : '100%',
      item.situacaoFinal || 'Regular'
    ]);

    doc.autoTable({
      head: [['Nº', 'Nome do Aluno', 'RA', 'Presenças', 'Faltas', 'Atrasos', '% Frequência', 'Situação']],
      body: rows.length ? rows : [['-', 'Nenhum discente registrado', '-', '-', '-', '-', '-', '-']],
      startY: 82,
      theme: 'striped',
      headStyles: {
        fillColor: this.senaiRed,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: this.darkGray
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 24 },
        7: { halign: 'center', cellWidth: 26 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  _preencherRendimento(doc, { turma, uc, aluno }) {
    if (aluno) {
      // Visão de boletim individual do aluno
      const ucs = window.db ? window.db.getUCsPorTurma(turma.id) : [];
      const rows = ucs.map(u => {
        const res = window.db.calcularMediaAluno(turma.id, u.id, aluno.id);
        return [
          u.codigo || '-',
          u.nome || '-',
          `${u.cargaHoraria || 80}h`,
          res.media !== undefined ? res.media.toFixed(1) : '-',
          res.situacao || 'Cursando'
        ];
      });

      doc.autoTable({
        head: [['Cód. UC', 'Componente Curricular', 'C.H.', 'Média Final', 'Situação']],
        body: rows.length ? rows : [['-', 'Nenhuma UC encontrada', '-', '-', '-']],
        startY: 82,
        theme: 'striped',
        headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: this.darkGray },
        columnStyles: {
          0: { halign: 'center', cellWidth: 24 },
          1: { cellWidth: 80 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 25 },
          4: { halign: 'center', cellWidth: 35 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
      return;
    }

    // Visão da turma inteira
    const avaliacoes = (window.db && uc) ? window.db.getAvaliacoesPorUC(turma.id, uc.id) : [];
    const alunos = window.db ? window.db.getAlunosPorTurma(turma.id) : [];
    const alunosAtivos = alunos.filter(a => a.statusMatricula === 'ATIVO');

    const headers = [['Nº', 'Nome do Aluno', 'RA', ...avaliacoes.map(av => av.titulo || 'Av'), 'Média Final', 'Resultado']];
    const rows = alunosAtivos.map(al => {
      const { media, situacao } = window.db.calcularMediaAluno(turma.id, uc ? uc.id : 1, al.id);
      return [
        al.numeroChamada ? al.numeroChamada.toString() : '-',
        al.nome,
        al.ra,
        ...avaliacoes.map(av => {
          const n = window.db.getNota(av.id, al.id);
          return n !== null && n !== undefined ? n.toFixed(1) : '-';
        }),
        media !== undefined ? media.toFixed(1) : '-',
        situacao || 'Regular'
      ];
    });

    doc.autoTable({
      head: headers,
      body: rows.length ? rows : [['-', 'Nenhum discente registrado', '-', '-', '-']],
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: this.darkGray },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 55 },
        2: { halign: 'center', cellWidth: 25 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  _preencherConteudo(doc, { turma, uc }) {
    const aulas = (window.db && window.db.data && window.db.data.aulas)
      ? window.db.data.aulas.filter(a => a.turmaId === Number(turma.id) && (!uc || a.ucId === Number(uc.id)))
      : [];

    const headers = [['Data', 'C.H.', 'Tipo', 'PTD Vinculado', 'Conteúdo Programático e Atividades Ministradas']];
    const rows = aulas.length ? aulas.map(a => {
      const ptd = window.db && typeof window.db.getPtdById === 'function' ? window.db.getPtdById(a.ptdId) : null;
      return [
        a.data || '-',
        `${a.quantidadeAulas || 4}h`,
        a.tipoAula || 'Presencial',
        ptd ? ptd.codigo : 'PTD-01',
        a.conteudoMinistrado || a.descricao || 'Atividades regulares'
      ];
    }) : [['-', '-', '-', '-', 'Nenhuma aula registrada para este período.']];

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: this.darkGray, cellPadding: 3.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 24 },
        1: { halign: 'center', cellWidth: 16 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 26 },
        4: { cellWidth: 90 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  _preencherCompensacao(doc, { turma }) {
    const comps = (window.db && typeof window.db.getCompensacoes === 'function')
      ? window.db.getCompensacoes(turma.id)
      : [];

    const headers = [['Aluno', 'Motivo de Origem', 'Horas', 'Prazo Limite', 'Status', 'Atividade / Cumprimento']];
    const rows = comps.length ? comps.map(c => [
      c.alunoNome || `Aluno ID ${c.alunoId}`,
      c.motivoOrigem || '-',
      `${c.horasObrigacao || 4}h`,
      c.dataLimite || '-',
      c.status || 'PENDENTE',
      c.dataCumprimento ? `Cumprido em ${c.dataCumprimento}` : (c.atividadeDescricao || 'Aguardando cumprimento')
    ]) : [['-', '-', '-', '-', '-', 'Nenhuma obrigação de compensação pendente para esta turma.']];

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: this.darkGray, cellPadding: 3.5 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 42 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 24 },
        4: { halign: 'center', cellWidth: 22 },
        5: { cellWidth: 45 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  _preencherSinteseGeral(doc, { turma, uc }) {
    const sintese = window.db ? window.db.getSinteseConsolidada(turma.id, uc ? uc.id : null) : { alunos: [] };
    const rows = (sintese.alunos || []).map(item => [
      (item.aluno && item.aluno.numeroChamada) ? item.aluno.numeroChamada.toString() : '-',
      (item.aluno && item.aluno.nome) || '-',
      (item.aluno && item.aluno.ra) || '-',
      item.totalAulasDadas !== undefined ? item.totalAulasDadas.toString() : '80',
      item.presencas !== undefined ? item.presencas.toString() : '0',
      item.faltas !== undefined ? item.faltas.toString() : '0',
      item.freqPorcentagem !== undefined ? item.freqPorcentagem + '%' : '100%',
      item.media !== undefined ? item.media.toFixed(1) : '-',
      item.situacaoFinal || 'Aprovado'
    ]);

    doc.autoTable({
      head: [['Nº', 'Nome do Aluno', 'RA', 'Aulas', 'Pres.', 'Faltas', '% Freq.', 'Média', 'Situação']],
      body: rows.length ? rows : [['-', 'Nenhum registro consolidado', '-', '-', '-', '-', '-', '-', '-']],
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: this.darkGray },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 16 },
        8: { halign: 'center', cellWidth: 25 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  _preencherComprovanteFrequenciaAluno(doc, { aluno, turma }) {
    const sintese = window.db ? window.db.getSinteseConsolidada(turma.id) : { alunos: [] };
    const itemAluno = (sintese.alunos || []).find(i => i.aluno && i.aluno.id === aluno.id);

    // Tabela de resumo executivo do aluno
    const resumo = [
      ['Total de Aulas Registradas', itemAluno ? (itemAluno.totalAulasDadas || sintese.totalAulasDadas || 80) : 80],
      ['Total de Presenças', itemAluno ? itemAluno.presencas : 76],
      ['Total de Faltas', itemAluno ? itemAluno.faltas : 4],
      ['Faltas Compensadas', itemAluno ? (itemAluno.faltasCompensadas || 0) : 0],
      ['Frequência Acumulada', itemAluno ? (itemAluno.freqPorcentagem + '%') : '95%'],
      ['Situação Perante o Regimento', (itemAluno && itemAluno.freqPorcentagem < 75) ? 'Em Risco' : 'Regular (Apto)']
    ];

    doc.autoTable({
      head: [['Indicador de Assiduidade', 'Situação Registrada']],
      body: resumo,
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: this.darkGray },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 100 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Detalhamento por Componente Curricular
    const ucs = window.db ? window.db.getUCsPorTurma(turma.id) : [];
    const rowsUcs = ucs.map(u => {
      const sintUC = window.db.getSinteseConsolidada(turma.id, u.id);
      const alUC = (sintUC.alunos || []).find(i => i.aluno && i.aluno.id === aluno.id);
      return [
        u.codigo || '-',
        u.nome || '-',
        `${u.cargaHoraria || 80}h`,
        alUC ? alUC.presencas : '-',
        alUC ? alUC.faltas : '-',
        alUC ? (alUC.freqPorcentagem + '%') : '100%'
      ];
    });

    const startYDetail = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 140;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...this.senaiRed);
    doc.text('Detalhamento por Unidade Curricular:', 15, startYDetail - 3);

    doc.autoTable({
      head: [['Código', 'Unidade Curricular', 'C.H.', 'Presenças', 'Faltas', '% Frequência']],
      body: rowsUcs.length ? rowsUcs : [['-', 'Nenhuma UC encontrada', '-', '-', '-', '-']],
      startY: startYDetail,
      theme: 'grid',
      headStyles: { fillColor: this.darkGray, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7.5, textColor: this.darkGray },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 24 }
      }
    });
  }

  _preencherBoletimAluno(doc, { aluno, turma }) {
    const ucs = window.db ? window.db.getUCsPorTurma(turma.id) : [];
    const rows = ucs.map(u => {
      const res = window.db.calcularMediaAluno(turma.id, u.id, aluno.id);
      const sintUC = window.db.getSinteseConsolidada(turma.id, u.id);
      const alUC = (sintUC.alunos || []).find(i => i.aluno && i.aluno.id === aluno.id);

      return [
        u.codigo || '-',
        u.nome || '-',
        `${u.cargaHoraria || 80}h`,
        alUC ? (alUC.freqPorcentagem + '%') : '100%',
        res.media !== undefined ? res.media.toFixed(1) : '-',
        res.situacao || 'Cursando'
      ];
    });

    doc.autoTable({
      head: [['Código', 'Componente Curricular', 'C.H.', 'Frequência', 'Média Final', 'Situação']],
      body: rows.length ? rows : [['-', 'Nenhum componente registrado', '-', '-', '-', '-']],
      startY: 82,
      theme: 'striped',
      headStyles: { fillColor: this.senaiRed, textColor: 255, fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8, textColor: this.darkGray },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 25 }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
  }

  // =========================================================================
  // CONSTRUTOR CENTRAL DE DOCUMENTOS PDF
  // =========================================================================
  _construirDocumentoPDF(tipo, opcoes = {}) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      console.error('[Relatorios] jsPDF não carregado no window.jspdf');
      window.app && window.app.mostrarToast && window.app.mostrarToast('Erro: Biblioteca de PDF não carregada', 'warning');
      return null;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Cabeçalho institucional
    this._desenharCabecalho(doc, pageW, margin);

    // Contexto de dados
    const turmaId = opcoes.turmaId || this.turmaId || 1;
    const ucId = opcoes.ucId || this.ucId || 1;
    const turma = (window.db && typeof window.db.getTurmaById === 'function') ? window.db.getTurmaById(turmaId) : { id: 1, codigo: '1-2026.205 BA', nome: 'Técnico em Desenvolvimento de Sistemas', periodo: 'Manhã' };
    const uc = (window.db && typeof window.db.getUCById === 'function') ? window.db.getUCById(ucId) : null;

    let aluno = null;
    if (opcoes.alunoId && window.db && typeof window.db.getAlunoById === 'function') {
      aluno = window.db.getAlunoById(opcoes.alunoId);
    } else if (opcoes.portal === 'ALUNO') {
      aluno = (window.db && typeof window.db.getAlunoLogado === 'function') ? window.db.getAlunoLogado() : (window.auth && typeof window.auth.getUser === 'function' ? window.auth.getUser() : null);
    }

    // Informações de cabeçalho
    this._preencherInfoCabecalho(doc, { turma, uc, aluno, tipo });

    // Conteúdo por tipo
    switch (tipo) {
      case 'frequencia':
        this._preencherFrequencia(doc, { turma, uc, aluno });
        break;
      case 'rendimento':
      case 'notas':
        this._preencherRendimento(doc, { turma, uc, aluno });
        break;
      case 'conteudo':
        this._preencherConteudo(doc, { turma, uc });
        break;
      case 'compensacao':
        this._preencherCompensacao(doc, { turma, uc });
        break;
      case 'sintese':
        this._preencherSinteseGeral(doc, { turma, uc });
        break;
      case 'aluno_frequencia':
        this._preencherComprovanteFrequenciaAluno(doc, { aluno: aluno || { id: 9, nome: 'Yasmin Costa', ra: '123456' }, turma });
        break;
      case 'aluno_boletim':
        this._preencherBoletimAluno(doc, { aluno: aluno || { id: 9, nome: 'Yasmin Costa', ra: '123456' }, turma });
        break;
      default:
        this._preencherFrequencia(doc, { turma, uc, aluno });
        break;
    }

    // Rodapé em todas as páginas
    this._desenharRodape(doc, 82);
    return doc;
  }

  // =========================================================================
  // MODAL COMPARTILHADO E AÇÕES
  // =========================================================================
  _abrirModalPDF(blobUrl, titulo, docInstance) {
    const modal = document.getElementById('pdfModal');
    if (!modal) {
      console.warn('[Relatorios] #pdfModal não encontrado, abrindo em nova guia');
      window.open(blobUrl, '_blank');
      return;
    }

    const titleEl = document.getElementById('pdfModalTitle');
    if (titleEl) titleEl.textContent = titulo;

    const iframe = document.getElementById('pdfModalIframe');
    if (iframe) iframe.src = blobUrl;

    const btnDownload = document.getElementById('pdfModalDownload');
    if (btnDownload) {
      btnDownload.onclick = () => {
        const fileName = `${titulo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        docInstance.save(fileName);
      };
    }

    const btnClose = document.getElementById('pdfModalClose');
    if (btnClose) {
      btnClose.onclick = () => {
        if (iframe) iframe.src = '';
        modal.classList.add('hidden');
      };
    }

    modal.classList.remove('hidden');
  }

  visualizarRelatorio(tipo) {
    if (!tipo) {
      const select = document.getElementById('selectTipoRelatorioFigma');
      tipo = select?.value || this.tipoRelatorio || 'frequencia';
    }
    this.tipoRelatorio = tipo;
    this.turmaId = Number(document.getElementById('selectRelatorioTurma')?.value) || this.turmaId;
    this.ucId = Number(document.getElementById('selectRelatorioUC')?.value) || this.ucId;

    const portal = this._getPortal();
    const doc = this._construirDocumentoPDF(tipo, { portal });
    if (!doc) return;

    const blobUrl = doc.output('bloburl');
    const titulo = this.getTituloRelatorio(tipo);

    if (window.db && typeof window.db.registrarRelatorio === 'function') {
      window.db.registrarRelatorio(portal, tipo, titulo, this.turmaId, this.ucId, blobUrl);
    }

    this._abrirModalPDF(blobUrl, titulo, doc);
    this.renderizarHistorico();
  }

  baixarRelatorio(tipo) {
    if (!tipo) {
      const select = document.getElementById('selectTipoRelatorioFigma');
      tipo = select?.value || this.tipoRelatorio || 'frequencia';
    }
    this.tipoRelatorio = tipo;
    this.turmaId = Number(document.getElementById('selectRelatorioTurma')?.value) || this.turmaId;
    this.ucId = Number(document.getElementById('selectRelatorioUC')?.value) || this.ucId;

    const portal = this._getPortal();
    const doc = this._construirDocumentoPDF(tipo, { portal });
    if (!doc) return;

    const titulo = this.getTituloRelatorio(tipo);
    const blobUrl = doc.output('bloburl');

    if (window.db && typeof window.db.registrarRelatorio === 'function') {
      window.db.registrarRelatorio(portal, tipo, titulo, this.turmaId, this.ucId, blobUrl);
    }

    const fileName = `${titulo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    window.app && window.app.mostrarToast && window.app.mostrarToast(`${titulo} baixado com sucesso!`, 'success');
    this.renderizarHistorico();
  }

  gerarRelatorioFigma() {
    const select = document.getElementById('selectTipoRelatorioFigma');
    const tipo = select?.value || 'frequencia';
    this.visualizarRelatorio(tipo);
  }

  exportarPDFAluno(tipo) {
    tipo = tipo || 'aluno_frequencia';
    const user = (window.auth && typeof window.auth.getUser === 'function') ? window.auth.getUser() : null;
    const aluno = (window.db && typeof window.db.getAlunoLogado === 'function') ? window.db.getAlunoLogado() : user;
    const alunoRef = aluno || { id: 9, nome: 'Yasmin Costa', turmaId: 1, ra: '123456' };

    this.turmaId = alunoRef.turmaId || 1;
    this.ucId = 1;

    const doc = this._construirDocumentoPDF(tipo, { alunoId: alunoRef.id, portal: 'ALUNO' });
    if (!doc) return;

    const titulo = this.getTituloRelatorio(tipo);
    const blobUrl = doc.output('bloburl');

    if (window.db && typeof window.db.registrarRelatorio === 'function') {
      window.db.registrarRelatorio('ALUNO', tipo, titulo, this.turmaId, null, blobUrl);
    }

    this._abrirModalPDF(blobUrl, titulo, doc);
    this.renderizarHistorico();
  }

  limparFormularioFigma() {
    const sel = document.getElementById('selectTipoRelatorioFigma');
    if (sel) sel.selectedIndex = 0;
    window.app && window.app.mostrarToast && window.app.mostrarToast('Filtros limpos.', 'info');
  }

  // =========================================================================
  // RENDERIZAÇÃO DO HISTÓRICO DE RELATÓRIOS (POR PORTAL)
  // =========================================================================
  renderizarHistorico() {
    const portal = this._getPortal();
    const tbody = document.getElementById('historicoRelatoriosBody');
    if (!tbody) return;

    const historico = (window.db && typeof window.db.getHistoricoRelatorios === 'function')
      ? window.db.getHistoricoRelatorios(portal)
      : ((window.db && window.db.data && window.db.data.historicoRelatorios) ? window.db.data.historicoRelatorios.filter(r => r.portal === portal) : []);

    if (!historico || !historico.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:24px;">Nenhum relatório gerado neste portal ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = historico.slice().reverse().map((r, i) => {
      const data = new Date(r.dataGeracao).toLocaleString('pt-BR');
      const tipoLabel = {
        frequencia: 'Frequência',
        rendimento: 'Rendimento',
        notas: 'Notas',
        conteudo: 'Conteúdo',
        compensacao: 'Compensação',
        sintese: 'Síntese',
        aluno_frequencia: 'Comprovante',
        aluno_boletim: 'Boletim'
      }[r.tipo] || r.tipo;

      const urlSafe = r.blobUrl ? `'${r.blobUrl}'` : 'null';
      const tipoEscaped = `'${r.tipo}'`;

      return `
        <tr>
          <td style="text-align:center;">${historico.length - i}</td>
          <td><strong>${r.titulo || '-'}</strong></td>
          <td style="font-size:12px; color:#64748b;">${data}</td>
          <td><span style="background:#f1f5f9; border-radius:4px; padding:2px 7px; font-size:11px; font-weight:600; color:#334155;">${tipoLabel}</span></td>
          <td style="text-align:center;">
            <div style="display:inline-flex; gap:6px;">
              <button type="button" class="btn-hist-view" onclick="window.relatoriosController.visualizarRelatorio(${tipoEscaped})" title="Visualizar">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Ver
              </button>
              <button type="button" class="btn-hist-dl" onclick="window.relatoriosController.baixarRelatorio(${tipoEscaped})" title="Baixar">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Baixar
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }
}

// Instância global singleton
window.relatoriosController = new RelatoriosController();
