/**
 * =============================================================================
 * RENOVA SENAI - RELATÓRIOS ACADÊMICOS (relatorios.js)
 * Geração dos 4 Relatórios: Frequência, Rendimento, Conteúdo/PTD e Compensações
 * Exportação direta para PDF via jsPDF (download direto)
 * =============================================================================
 */

class RelatoriosController {
  constructor() {
    this.tipoRelatorio = 'frequencia'; // 'frequencia', 'rendimento', 'conteudo', 'compensacao'
    this.turmaId = 1;
    this.ucId = 1;
    
    // Cores SENAI - definidas como propriedades da classe para acesso em todos métodos
    this.senaiRed = [195, 22, 28];
    this.darkGray = [30, 41, 59];
    this.mediumGray = [100, 116, 139];
    this.lightGray = [226, 232, 240];
  }

  init() {
    console.log('[Relatórios] init() chamado');
    
    // Aguarda DOM se necessário
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.carregarTudo());
    } else {
      this.carregarTudo();
    }
  }

  carregarTudo() {
    this.carregarTurmasSelect();
    this.carregarUCsSelect();
  }

  carregarTurmasSelect() {
    console.log('[Relatórios] carregarTurmasSelect()');
    const sel = document.getElementById('selectRelatorioTurma');
    if (!sel) {
      console.error('[Relatórios] selectRelatorioTurma NÃO ENCONTRADO!');
      // Tenta novamente após um tempo
      setTimeout(() => this.carregarTurmasSelect(), 100);
      return;
    }
    const turmas = window.db.getTurmas('TODOS');
    console.log('[Relatórios] Turmas encontradas:', turmas);
    sel.innerHTML = turmas.map(t => `<option value="${t.id}">${t.codigo} - ${t.nome}</option>`).join('');
    sel.value = this.turmaId;
  }

  carregarUCsSelect() {
    console.log('[Relatórios] carregarUCsSelect()', this.turmaId);
    const sel = document.getElementById('selectRelatorioUC');
    if (!sel) {
      console.error('[Relatórios] selectRelatorioUC NÃO ENCONTRADO!');
      return;
    }
    const ucs = window.db.getUCsPorTurma(this.turmaId);
    console.log('[Relatórios] UCs encontradas:', ucs);
    sel.innerHTML = ucs.map(u => `<option value="${u.id}">${u.codigo} - ${u.nome}</option>`).join('');
    if (ucs.length) {
      this.ucId = ucs[0].id;
      sel.value = this.ucId;
    }
  }

  onTipoRelatorioChange(tipo) {
    this.tipoRelatorio = tipo;
  }

  onTurmaChange(novaTurmaId) {
    this.turmaId = Number(novaTurmaId);
    this.carregarUCsSelect();
  }

  onUCChange(novaUCId) {
    this.ucId = Number(novaUCId);
  }

  exportarPDF() {
    console.log('[Relatórios] exportarPDF() chamado');
    try {
      const { jsPDF } = window.jspdf;
      if (!jsPDF) {
        console.error('[Relatórios] jsPDF NÃO CARREGADO!');
        window.app.mostrarToast('Erro: Biblioteca PDF não carregada', 'warning');
        return;
      }
      console.log('[Relatórios] jsPDF OK, gerando PDF...');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      const turma = window.db.getTurmaById(this.turmaId);
      const uc = window.db.getUCById(this.ucId);
      const docente = window.auth.getUser() ? window.auth.getUser().nome : 'NATHAN SANTANA MATOS';
      const dataHoraEmissao = new Date().toLocaleString('pt-BR');

      // Função auxiliar para desenhar cabeçalho oficial
      const desenharCabecalho = () => {
        // Barra superior vermelha
        doc.setFillColor(...this.senaiRed);
        doc.rect(0, 0, pageWidth, 28, 'F');
        
        // Logo SENAI
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SENAI', margin, 18);
        
        // Info da instituição
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Serviço Nacional de Aprendizagem Industrial - SENAI-SP', margin + 35, 12);
        doc.text('Escola SENAI Roberto Simonsen • Diretoria de Educação', margin + 35, 18);
        
        // Metadados à direita
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`Emissão: ${dataHoraEmissao}`, pageWidth - margin, 12, { align: 'right' });
        doc.text('Sistema: Portal do Docente / Renova SENAI', pageWidth - margin, 18, { align: 'right' });
        
        yPos = 35;
        
        // Parâmetros do relatório
        doc.setDrawColor(...this.lightGray);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 22, 3, 3, 'FD');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...this.mediumGray);
        doc.text('TURMA / PERÍODO:', margin + 4, yPos + 6);
        doc.text('CURSO:', margin + 4, yPos + 12);
        doc.text('UNIDADE CURRICULAR:', margin + 4, yPos + 18);
        doc.text('DOCENTE RESPONSÁVEL:', pageWidth / 2 + 4, yPos + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...this.darkGray);
        doc.setFontSize(8);
        doc.text(`${turma ? turma.codigo : ''} - ${turma ? turma.periodo : ''}`, margin + 38, yPos + 6);
        doc.text(`${turma ? turma.nome : ''}`, margin + 18, yPos + 12);
        doc.text(`${uc ? uc.codigo + ' - ' + uc.nome : ''}`, margin + 42, yPos + 18);
        doc.text(`${docente}`, pageWidth / 2 + 48, yPos + 6);
        
        yPos += 28;
        
        // Título do relatório
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...this.senaiRed);
        const tituloRelatorio = this.getTituloRelatorio();
        doc.text(tituloRelatorio, pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
doc.setTextColor(...this.mediumGray);
        doc.text(this.getSubTituloRelatorio(), pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
      };

      // Função auxiliar para rodapé de assinaturas
      const desenharRodape = (startY) => {
        const assinaturaY = Math.max(startY, pageHeight - 50);
        
        doc.setDrawColor(...this.lightGray);
      doc.line(margin, assinaturaY - 5, pageWidth - margin, assinaturaY - 5);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.mediumGray);
      doc.text('Página ' + doc.internal.getNumberOfPages(), pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // Linhas de assinatura
      const linhaY = assinaturaY + 10;
      doc.setDrawColor(...this.darkGray);
      doc.line(margin, linhaY, margin + 70, linhaY);
      doc.line(pageWidth - margin - 70, linhaY, pageWidth - margin, linhaY);
      
      doc.setFontSize(7);
      doc.setTextColor(...this.mediumGray);
      doc.text(docente, margin, linhaY + 5);
      doc.text('Docente Titular', margin, linhaY + 10);
      doc.text('PAULO RICARDO MENDONÇA', pageWidth - margin - 70, linhaY + 5, { align: 'right' });
      doc.text('Coordenação Pedagógica / Direção', pageWidth - margin - 70, linhaY + 10, { align: 'right' });
    };

    desenharCabecalho();

    // Gerar conteúdo específico do relatório
    if (this.tipoRelatorio === 'frequencia') {
      this.gerarPDF_Frequencia(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape);
    } else if (this.tipoRelatorio === 'rendimento') {
      this.gerarPDF_Rendimento(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape);
    } else if (this.tipoRelatorio === 'conteudo') {
      this.gerarPDF_Conteudo(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape);
    } else if (this.tipoRelatorio === 'compensacao') {
      this.gerarPDF_Compensacao(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape);
    }

    // Salvar PDF
    const fileName = `Relatorio_${this.tipoRelatorio}_${turma ? turma.codigo : 'Turma'}_${uc ? uc.codigo : 'UC'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    window.app.mostrarToast(`Relatório ${this.getTituloRelatorio()} exportado com sucesso!`, 'success');
    console.log('[Relatórios] PDF salvo:', fileName);
  } catch (error) {
    console.error('[Relatórios] ERRO ao gerar PDF:', error);
    window.app.mostrarToast('Erro ao gerar PDF: ' + error.message, 'warning');
  }
  } // FECHA exportarPDF()

  getTituloRelatorio() {
    const titulos = {
      frequencia: 'Relatório Oficial de Controle de Frequência',
      rendimento: 'Relatório de Rendimento Escolar e Médias',
      conteudo: 'Relatório de Conteúdo das Aulas e PTDs por Período',
      compensacao: 'Relatório de Compensação de Ausências e Atrasos'
    };
    return titulos[this.tipoRelatorio] || 'Relatório Acadêmico';
  }

  getSubTituloRelatorio() {
    const subtitulos = {
      frequencia: 'Acompanhamento consolidado de assiduidade e pontualidade discente',
      rendimento: 'Quadro geral de notas por avaliações formativas e somativas',
      conteudo: 'Registro cronológico de atividades didáticas e competências ministradas',
      compensacao: 'Controle de cumprimento de atividades complementares e reposições'
    };
    return subtitulos[this.tipoRelatorio] || '';
  }

  // Verificar se precisa de nova página
  checkNewPage(doc, yPos, neededHeight, margin, pageHeight, desenharCabecalho, desenharRodape) {
    if (yPos + neededHeight > pageHeight - 30) {
      desenharRodape(yPos);
      doc.addPage();
      desenharCabecalho();
      return 35; // Nova posição Y após cabeçalho
    }
    return yPos;
  }

  gerarPDF_Frequencia(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape) {
    const dados = window.db.getSinteseConsolidada(this.turmaId, this.ucId);
    
    const headers = [['Nº', 'Nome do Aluno', 'RA', 'Presenças', 'Faltas', 'Atrasos', 'Faltas Comp.', 'Freq. Total (%)']];
    const rows = dados.alunos.map(item => [
      item.aluno.numeroChamada.toString(),
      item.aluno.nome,
      item.aluno.ra,
      item.presencas.toString(),
      item.faltas.toString(),
      item.atrasos.toString(),
      item.faltasCompensadas.toString(),
      item.freqPorcentagem + '%'
    ]);

    doc.autoTable({
      startY: yPos,
      head: headers,
      body: rows,
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
        6: { halign: 'center', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 25 },
        8: { halign: 'center', cellWidth: 35 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          // Redesenhar cabeçalho simplificado nas páginas seguintes
          doc.setFillColor(...this.senaiRed);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(this.getTituloRelatorio() + ' (continuação)', pageWidth / 2, 10, { align: 'center' });
        }
      }
    });

    desenharRodape(doc.lastAutoTable.finalY + 10);
  }

  gerarPDF_Rendimento(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape) {
    const avaliacoes = window.db.getAvaliacoesPorUC(this.turmaId, this.ucId);
    const alunos = window.db.getAlunosPorTurma(this.turmaId);
    const alunosAtivos = alunos.filter(a => a.statusMatricula === 'ATIVO');

    const headers = [['Nº', 'Nome do Aluno', 'RA', ...avaliacoes.map(av => av.titulo), 'Média Final']];
    const rows = alunosAtivos.map(aluno => {
      const { media } = window.db.calcularMediaAluno(this.turmaId, this.ucId, aluno.id);
      return [
        aluno.numeroChamada.toString(),
        aluno.nome,
        aluno.ra,
        ...avaliacoes.map(av => {
          const n = window.db.getNota(av.id, aluno.id);
          return n !== null ? n.toFixed(1) : '-';
        }),
        media.toFixed(1)
      ];
    });

    doc.autoTable({
      startY: yPos,
      head: headers,
      body: rows,
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
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 25 }
      },
alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(...this.senaiRed);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(this.getTituloRelatorio() + ' (continuação)', pageWidth / 2, 10, { align: 'center' });
        }
      }
    });

    desenharRodape(doc.lastAutoTable.finalY + 10);
  }

  gerarPDF_Conteudo(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape) {
    const aulas = window.db.data.aulas.filter(a => a.turmaId === Number(this.turmaId) && a.ucId === Number(this.ucId));

    const headers = [['Data', 'Aulas', 'Tipo', 'PTD Vinculado', 'Conteúdo Programático e Atividades Ministradas']];
    const rows = aulas.length ? aulas.map(a => {
      const ptd = window.db.getPtdById(a.ptdId);
      return [
        a.data,
        `${a.quantidadeAulas}h`,
        a.tipoAula,
        ptd ? ptd.codigo : '-',
        a.conteudoMinistrado || 'Nenhum conteúdo digitado'
      ];
    }) : [['', '', '', '', 'Nenhuma aula registrada para esta UC.']];

    doc.autoTable({
      startY: yPos,
      head: headers,
      body: rows,
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
        textColor: this.darkGray,
        cellPadding: 4
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 35 },
        4: { cellWidth: pageWidth - 2 * margin - 95 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(...this.senaiRed);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(this.getTituloRelatorio() + ' (continuação)', pageWidth / 2, 10, { align: 'center' });
        }
      }
    });

    desenharRodape(doc.lastAutoTable.finalY + 10);
  }

  gerarPDF_Compensacao(doc, yPos, margin, pageWidth, pageHeight, desenharCabecalho, desenharRodape) {
    const comps = window.db.getCompensacoes(this.turmaId);

    const headers = [['Aluno', 'Motivo de Origem', 'Horas a Compensar', 'Prazo Limite', 'Status', 'Data Cumprimento / Relato da Atividade']];
    const rows = comps.length ? comps.map(c => [
      c.alunoNome,
      c.motivoOrigem,
      `${c.horasObrigacao}h`,
      c.dataLimite,
      c.status,
      c.dataCumprimento ? `Homologado em ${c.dataCumprimento}\n${c.atividadeDescricao || ''}` : (c.atividadeDescricao || 'Aguardando cumprimento')
    ]) : [['', '', '', '', '', 'Nenhuma obrigação de compensação pendente para esta turma.']];

    doc.autoTable({
      startY: yPos,
      head: headers,
      body: rows,
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
        textColor: this.darkGray,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 20 },
        5: { cellWidth: pageWidth - 2 * margin - 150 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(...this.senaiRed);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(this.getTituloRelatorio() + ' (continuação)', pageWidth / 2, 10, { align: 'center' });
        }
      }
    });

    desenharRodape(doc.lastAutoTable.finalY + 10);
  }
}

window.relatoriosController = new RelatoriosController();
