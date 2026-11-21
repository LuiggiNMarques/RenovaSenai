/**
 * =============================================================================
 * RENOVA SENAI - CONTROLADOR PRINCIPAL DA APLICAÇÃO (app.js)
 * Roteamento de Telas, Gestão de Sessão, Modais, Toasts e Widgets
 * =============================================================================
 */

console.log('[DEBUG] app.js carregado, iniciando AppController...');

class AppController {
  constructor() {
    this.currentTab = 'cursos';
    this.turmaAtiva = null;
    this._roleLogin = 'professor'; // 'professor' | 'coordenador'
    this.alunoPaginaAtual = 1;
    this.alunoFiltroUC = 'TODAS';
  }

  init() {
    console.log('[DEBUG] AppController.init() chamado');
    // Verificar estado de autenticação
    if (window.auth.isAuthenticated()) {
      this.mostrarPortal();
    } else {
      this.mostrarLogin();
    }

    this.configurarBotoesFlutuantes();
    this.inicializarEventosLogin();
    this.atualizarBadgeNotificacoes();

    window.addEventListener('renova:db-updated', () => {
      this.atualizarBadgeNotificacoes();
    });
  }

  // --- Alternância entre Login e Portal ---
  mostrarLogin() {
    const loginView = document.getElementById('viewLoginScreen');
    const portalView = document.getElementById('viewPortalScreen');
    const profileView = document.getElementById('viewProfileSelectScreen');
    const sidebar = document.getElementById('sidebar');
    if (loginView && portalView) {
      loginView.style.display = 'flex';
      portalView.style.display = 'none';
    }
    if (profileView) profileView.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    this.iniciarTechCanvas();
  }

  mostrarPortal() {
    const loginView = document.getElementById('viewLoginScreen');
    const portalView = document.getElementById('viewPortalScreen');
    const profileView = document.getElementById('viewProfileSelectScreen');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');

    if (loginView && portalView) {
      loginView.style.display = 'none';
      portalView.style.display = 'flex';
    }
    if (profileView) profileView.style.display = 'none';

    // Ao entrar como Professor: tela inicial 'cursos', sidebar oculta e main-wrapper 100%
    const isProfessor = window.auth && window.auth.isProfessor && window.auth.isProfessor();
    if (isProfessor) {
      this.currentTab = 'cursos';
      this.turmaAtiva = null;
      if (sidebar) sidebar.style.display = 'none';
      if (mainWrapper) {
        mainWrapper.style.marginLeft = '0';
        mainWrapper.style.width = '100%';
      }
    } else {
      if (sidebar) sidebar.style.display = 'flex';
      if (mainWrapper) {
        mainWrapper.style.marginLeft = 'var(--sidebar-width)';
        mainWrapper.style.width = 'calc(100% - var(--sidebar-width))';
      }
    }

    // Atualizar dados do usuário no header
    const user = window.auth.getUser();
    if (user) {
      const elNome = document.getElementById('headerUserName');
      const elEmail = document.getElementById('headerUserEmail');
      const elInitials = document.getElementById('headerUserInitials');

      const perfilAtivo = user.perfilAtivo || user.perfil;
      if (perfilAtivo === 'PROFESSOR') {
        if (elNome) elNome.innerText = 'Prof. Ismael';
        if (elInitials) elInitials.innerText = 'PI';
      } else {
        const partes = user.nome.split(' ');
        const primeiroNome = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        let nomeFormatado = primeiroNome;
        if (perfilAtivo === 'ORIENTADOR') {
          nomeFormatado = `Dr. ${primeiroNome}`;
        } else if (perfilAtivo === 'COORDENACAO') {
          nomeFormatado = `Coord. ${primeiroNome}`;
        } else if (perfilAtivo === 'ALUNO') {
          nomeFormatado = user.nome;
        }
        if (elNome) elNome.innerText = nomeFormatado;
        if (elInitials) {
          const initials = partes.length > 1
            ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
            : user.nome.substring(0, 2).toUpperCase();
          elInitials.innerText = initials;
        }
      }

      if (elEmail) elEmail.innerText = user.email;
    }

    // Configura listeners de reatividade do banco de dados e cross-tab
    this.configurarSincronizacaoReativa();

    this.navegarPara(this.currentTab);

    // Configurar abas de filtro de turmas (Cursos)
    this.configurarAbasTurmas();

    // Adaptar portal ao perfil do usuário (deve redirecionar currentTab se coord)
    this._adaptarAoPerfil();

    // Re-navegar se o perfil mudou a aba padrão
    if (this.currentTab !== 'cursos') {
      this.navegarPara(this.currentTab);
    }
  }

  // --- Sincronização Reativa e Cross-Tab Centralizada ---
  configurarSincronizacaoReativa() {
    if (this._sincronizacaoConfigurada) return;
    this._sincronizacaoConfigurada = true;

    // Atualização reativa na mesma aba
    window.addEventListener('renova:db-updated', () => {
      this.recarregarTelaAtiva();
    });

    // Atualização sincronizada entre abas distintas do navegador
    window.addEventListener('storage', (event) => {
      if (event.key === 'renova_senai_data_v1') {
        if (window.db && typeof window.db.init === 'function') {
          window.db.init();
        }
        this.recarregarTelaAtiva();
      }
    });
  }

  recarregarTelaAtiva() {
    const tabId = this.currentTab;
    if (tabId === 'aluno') {
      this.renderizarPortalAluno();
      if (window.portalAlunoController) window.portalAlunoController.renderizarSecaoOrientacao();
    } else if (tabId === 'sintese') {
      if (window.sinteseController) window.sinteseController.init();
    } else if (tabId === 'compensacoes') {
      if (window.compensacoesController) window.compensacoesController.init();
    } else if (tabId.startsWith('orientador')) {
      if (window.portalOrientadorController) {
        if (typeof window.portalOrientadorController.recarregarTelaAtiva === 'function') {
          window.portalOrientadorController.recarregarTelaAtiva();
        } else if (typeof window.portalOrientadorController.recarregarAbaAtiva === 'function') {
          window.portalOrientadorController.recarregarAbaAtiva();
        }
      } else {
        this.renderizarPortalOrientador();
      }
    } else if (tabId === 'coordenador') {
      if (window.coordenadorController) window.coordenadorController.init();
    } else if (tabId === 'diario') {
      if (window.diarioController) window.diarioController.carregarChamada();
    } else if (tabId === 'notas') {
      if (window.notasController) window.notasController.init();
    } else if (tabId === 'ocorrencias') {
      if (window.ocorrenciasController) window.ocorrenciasController.renderizar();
    } else if (tabId === 'inicio') {
      this.renderizarHomeProfessor();
    }
  }

  // --- Tela Oficial de Seleção de Perfil Pós-Login ---
  mostrarSelecaoPerfil(user) {
    console.log('[DEBUG] mostrarSelecaoPerfil chamado com user:', user);
    if (!user) {
      user = window.auth.getUser() || { nome: 'Mariana Silva Rocha', perfil: 'PROFESSOR' };
    }
    const loginView = document.getElementById('viewLoginScreen');
    const portalView = document.getElementById('viewPortalScreen');
    const profileView = document.getElementById('viewProfileSelectScreen');
    const sidebar = document.getElementById('sidebar');

    if (loginView) loginView.style.display = 'none';
    if (portalView) portalView.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (profileView) profileView.style.display = 'flex';

    // Formatar saudação com o primeiro nome em título (ex: Mariana, Nathan, Paulo)
    const elGreeting = document.getElementById('profileSelectGreeting');
    if (elGreeting) {
      let primeiroNome = 'Mariana';
      if (user && user.nome) {
        const raw = user.nome.trim().split(' ')[0];
        primeiroNome = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      elGreeting.textContent = `Olá, ${primeiroNome}!`;
    }

    // Perfil inicial padrão a ser selecionado
    const perfilInicial = (user.perfilAtivo || user.perfil || 'PROFESSOR').toLowerCase();
    this.perfilSelecionado = perfilInicial;
    this.selecionarPerfilCard(perfilInicial);
  }

  selecionarPerfilCard(perfil) {
    console.log('[DEBUG] selecionarPerfilCard chamado com:', perfil);
    const cleanPerfil = (perfil || 'professor').toLowerCase();
    this.perfilSelecionado = cleanPerfil;
    console.log('[DEBUG] perfilSelecionado definido como:', this.perfilSelecionado);

    // Desmarcar todos os cards
    const perfis = ['coordenacao', 'professor', 'aluno', 'orientador'];
    perfis.forEach(p => {
      const card = document.getElementById(`profileCard_${p}`);
      if (card) {
        card.classList.remove('selected-blue', 'selected-red');
      }
    });

    // Marcar o card selecionado com a cor correspondente (aluno = red, demais = blue)
    const selectedCard = document.getElementById(`profileCard_${cleanPerfil}`);
    if (selectedCard) {
      if (cleanPerfil === 'aluno') {
        selectedCard.classList.add('selected-red');
      } else {
        selectedCard.classList.add('selected-blue');
      }
    }

    // Atualizar texto do botão vermelho
    const btnEnter = document.getElementById('btnProfileEnter');
    if (btnEnter) {
      const labelMap = {
        'coordenacao': 'Entrar como Coordenação',
        'professor': 'Entrar como Professor',
        'aluno': 'Entrar como Aluno',
        'orientador': 'Entrar como Orientador'
      };
      btnEnter.textContent = labelMap[cleanPerfil] || 'Entrar como Professor';
    }
  }

  confirmarPerfil(perfil) {
    console.log('[DEBUG] confirmarPerfil chamado com:', perfil, '| perfilSelecionado:', this.perfilSelecionado);
    const perfilEscolhido = (perfil || this.perfilSelecionado || 'professor').toUpperCase();
    console.log('[DEBUG] perfilEscolhido:', perfilEscolhido);
    window.auth.setPerfilAtivo(perfilEscolhido);

    const profileView = document.getElementById('viewProfileSelectScreen');
    if (profileView) profileView.style.display = 'none';

    // Definir aba inicial por perfil: Professor inicia em 'cursos'
    if (perfilEscolhido === 'PROFESSOR') {
      this.currentTab = 'cursos';
      this.turmaAtiva = null;
    } else if (perfilEscolhido === 'COORDENACAO') {
      this.currentTab = 'coordenador';
    } else if (perfilEscolhido === 'ALUNO') {
      this.currentTab = 'aluno';
      const user = window.auth.getUser();
      if (!user || user.perfil !== 'ALUNO') {
        const al = (window.db && window.db.getAlunoById(52)) || {
          id: 52,
          nome: 'Yasmin Ribeiro Costa',
          email: 'yasmin.costa@aluno.senai.br',
          cpf: '111.222.333-44',
          ra: 'RA2026052'
        };
        window.auth.saveSession({
          id: al.id,
          alunoId: al.id,
          nome: al.nome,
          email: al.email,
          cpf: al.cpf,
          perfil: 'ALUNO',
          perfilAtivo: 'ALUNO',
          matriculaFuncional: al.ra || 'RA2026052'
        });
      }
    } else if (perfilEscolhido === 'ORIENTADOR') {
      this.currentTab = 'orientador_radar';
    }

    this.mostrarPortal();

    const nomeFormatado = {
      'COORDENACAO': 'Coordenação',
      'PROFESSOR': 'Professor',
      'ALUNO': 'Aluno',
      'ORIENTADOR': 'Orientador'
    }[perfilEscolhido] || 'Professor';

    this.mostrarToast(`Ambiente acessado com perfil: ${nomeFormatado}`, 'success');
  }

  abrirSelecaoPerfil() {
    const user = window.auth.getUser();
    this.mostrarSelecaoPerfil(user);
  }

  // --- Dropdown de Usuário no Header ---
  toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.toggle('open');
  }

  closeUserDropdown() {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.remove('open');
  }

  abrirMeuPerfil() {
    if ((this.perfilAtivo === 'ALUNO') || (window.auth && window.auth.isAluno && window.auth.isAluno())) {
      this.abrirModalPerfilAluno();
      return;
    }
    this.navegarPara('configuracoes');
    setTimeout(() => {
      this.switchConfigTab('perfil');
    }, 80);
  }

  abrirModalPerfilAluno() {
    const modal = document.getElementById('modalPerfilAluno');
    if (!modal) return;
    const aluno = window.db ? window.db.getAlunoLogado() : null;
    if (aluno) {
      const elNome = document.getElementById('modalAlunoNome');
      const elRA = document.getElementById('modalAlunoRA');
      const elCPF = document.getElementById('modalAlunoCPF');
      const elEmail = document.getElementById('modalAlunoEmail');
      const elCurso = document.getElementById('modalAlunoCurso');
      const elTurma = document.getElementById('modalAlunoTurma');
      const elTurno = document.getElementById('modalAlunoTurno');
      const elSubturma = document.getElementById('modalAlunoSubturma');
      const elStatus = document.getElementById('modalAlunoStatus');
      const elPeriodo = document.getElementById('modalAlunoPeriodo');
      const elFoto = document.getElementById('modalAlunoFoto');

      if (elNome) elNome.textContent = aluno.nome;
      if (elRA) elRA.textContent = aluno.ra || 'RA2026052';
      if (elCPF) elCPF.textContent = aluno.cpf || '111.222.333-44';
      if (elEmail) elEmail.textContent = aluno.email || 'yasmin.costa@aluno.senai.br';
      if (elCurso) elCurso.textContent = 'Técnico em Desenvolvimento de Sistemas';
      if (elTurma) elTurma.textContent = '1-2026.205 BA';
      if (elTurno) elTurno.textContent = 'Tarde (13:30 - 17:30)';
      if (elSubturma) elSubturma.textContent = `Subturma ${aluno.subturma || 'B'}`;
      if (elStatus) elStatus.textContent = aluno.statusMatricula || 'ATIVO';
      if (elPeriodo) elPeriodo.textContent = '03/02/2026 a 16/12/2026';
      if (elFoto && aluno.foto) elFoto.src = aluno.foto;
    }
    modal.style.display = 'flex';
  }

  fecharModalPerfilAluno() {
    const modal = document.getElementById('modalPerfilAluno');
    if (modal) modal.style.display = 'none';
  }

  // --- Switcher de Abas Internas de Configurações ---
  switchConfigTab(tab) {
    document.querySelectorAll('.config-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-config-tab') === tab);
    });
    document.querySelectorAll('.config-tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === 'configPanel' + tab.charAt(0).toUpperCase() + tab.slice(1));
    });

    // Atualizar header subtitle
    const titulo = document.getElementById('configPortalTitulo');
    const sub = document.getElementById('configPortalSubtitulo');
    if (tab === 'perfil') {
      if (titulo) titulo.textContent = 'Meu Perfil';
      if (sub) sub.textContent = 'Visualize e atualize seus dados pessoais.';
    } else {
      if (titulo) titulo.textContent = 'Configurações';
      if (sub) sub.textContent = 'Ajuste a aparência e as preferências da interface.';
    }

    // Carregar perfil se necessário
    if (tab === 'perfil') this.carregarDadosPerfil();
    if (tab === 'aparencia' && window.configuracoes) window.configuracoes.atualizarUI();
  }

  carregarDadosPerfil() {
    const user = window.auth.getUser();
    if (!user) return;

    const partes = (user.nome || '').trim().split(' ');
    const primNome = partes[0] ? partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase() : 'Prof.';
    const initials = partes.length > 1
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : primNome.substring(0, 2).toUpperCase();

    // Sidebar do perfil
    const inic = document.getElementById('perfilAvatarIniciais');
    if (inic) inic.textContent = initials;
    const nome = document.getElementById('perfilNomeExibido');
    if (nome) nome.textContent = `Prof. ${primNome}`;
    const email = document.getElementById('perfilEmailExibido');
    if (email) email.textContent = user.email || '';
    const cpf = document.getElementById('perfilCpfExibido');
    if (cpf) cpf.textContent = user.cpf || '—';

    // Formulário
    const fNome = document.getElementById('inputPerfilNome');
    if (fNome) fNome.value = user.nome || '';
    const fCpf = document.getElementById('inputPerfilCpf');
    if (fCpf) fCpf.value = user.cpf || '';
    const fEmail = document.getElementById('inputPerfilEmail');
    if (fEmail) fEmail.value = user.email || '';
    const fTel = document.getElementById('inputPerfilTel');
    if (fTel) fTel.value = user.telefone || '(11) 99099-0000';
    const fCargo = document.getElementById('inputPerfilCargo');
    if (fCargo) fCargo.value = user.cargo || 'Professor';
    const fUnidade = document.getElementById('inputPerfilUnidade');
    if (fUnidade) fUnidade.value = user.unidade || 'SENAI – Unidade São Paulo';

    // Manter compatibilidade com o banner antigo (configuracoes.js)
    const avatarInitials = document.getElementById('avatarInitials');
    if (avatarInitials) avatarInitials.textContent = initials;
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = user.nome || '';
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = user.email || '';
    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = (window.auth.getPerfilAtivo() || 'PROFESSOR').toUpperCase();
  }

  salvarDadosPerfil() {
    const user = window.auth.getUser();
    if (!user) return;
    const fNome = document.getElementById('inputPerfilNome');
    const fEmail = document.getElementById('inputPerfilEmail');
    const fTel = document.getElementById('inputPerfilTel');
    const fCargo = document.getElementById('inputPerfilCargo');
    const fUnidade = document.getElementById('inputPerfilUnidade');

    if (fNome && fNome.value.trim()) user.nome = fNome.value.trim();
    if (fEmail && fEmail.value.trim()) user.email = fEmail.value.trim();
    if (fTel) user.telefone = fTel.value.trim();
    if (fCargo) user.cargo = fCargo.value;
    if (fUnidade) user.unidade = fUnidade.value;

    // Salvar no db
    const dbUser = window.db.getUsuarioById(user.id);
    if (dbUser) {
      Object.assign(dbUser, { nome: user.nome, email: user.email, telefone: user.telefone, cargo: user.cargo, unidade: user.unidade });
      window.db.persist();
    }
    window.auth.saveSession(user);
    this.carregarDadosPerfil();
    this.renderizarHomeProfessor();
    this.mostrarToast('Perfil atualizado com sucesso!', 'success');
  }

  restaurarDadosPerfil() {
    this.carregarDadosPerfil();
    this.mostrarToast('Dados restaurados.', 'success');
  }

  abrirFechamentoDiario() {
    if (window.coordenadorController && window.coordenadorController.abrirModalSolicitarFechamento) {
      const turmaId = this.turmaAtiva ? this.turmaAtiva.id : null;
      window.coordenadorController.abrirModalSolicitarFechamento(turmaId);
    } else {
      this.abrirModal('modalSolicitarFechamento');
    }
  }

  // --- Renderização do Home Dashboard do Professor ---
  renderizarHomeProfessor() {
    const user = window.auth.getUser() || {};

    const titleEl = document.getElementById('profGreetingTitle');
    if (titleEl) {
      const nome = user.nome ? user.nome.split(' ')[0] : 'Professor';
      titleEl.textContent = `Olá, Prof. ${nome}!`;
    }

    // Atualizar header dropdown
    const headerName = document.getElementById('headerUserName');
    if (headerName && user.nome) {
      headerName.textContent = user.nome.split(' ').slice(0, 2).join(' ');
    }

    const headerInitials = document.getElementById('headerUserInitials');
    if (headerInitials && user.nome) {
      const parts = user.nome.split(' ');
      headerInitials.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }

    // Turma ativa (auto-selecionar primeira se não houver)
    if (!this.turmaAtiva) {
      const turmas = window.db ? window.db.getTurmas('EM_ANDAMENTO') : [];
      if (turmas && turmas.length > 0) {
        this.turmaAtiva = turmas[0];
      }
    }

    if (this.turmaAtiva) {
      const t = this.turmaAtiva;
      const ucEl = document.getElementById('profGreetingUC');
      const turmaEl = document.getElementById('profGreetingTurma');
      const periodoEl = document.getElementById('profGreetingPeriodo');
      if (ucEl) ucEl.textContent = t.ucNome || t.nome || 'Unidade Curricular';
      if (turmaEl) turmaEl.textContent = t.codigo || '—';
      if (periodoEl) periodoEl.textContent = t.periodoLabel || (t.ano ? t.ano + '/1' : '2026/1');
    }

    // Preencher painel do dashboard abaixo do banner
    this._atualizarDashboardProfessor();
  }

  _atualizarDashboardProfessor() {
    if (!this.turmaAtiva || !window.db) return;
    const turmaId = this.turmaAtiva.id;
    const ucId = this.turmaAtiva.ucId || 1;

    // Total de alunos
    const alunos = window.db.getAlunosPorTurma ? window.db.getAlunosPorTurma(turmaId, 'TODOS') : [];
    const elAlunos = document.getElementById('dashTotalAlunos');
    if (elAlunos) elAlunos.textContent = alunos.length || '—';

    // Frequência média ponderada da turma
    const aulas = (window.db.data.aulas || []).filter(a => a.turmaId === Number(turmaId));
    let totalSlots = 0, totalPresencas = 0;
    aulas.forEach(aula => {
      const qtd = aula.quantidadeAulas || 4;
      alunos.forEach(al => {
        totalSlots += qtd;
        if (aula.frequencias && aula.frequencias[al.id]) {
          const presencas = aula.frequencias[al.id].filter(s => s === 'C').length;
          totalPresencas += presencas;
        }
      });
    });
    const freqMedia = totalSlots > 0 ? Math.round((totalPresencas / totalSlots) * 100) : '—';
    const elFreq = document.getElementById('dashFreqMedia');
    if (elFreq) elFreq.textContent = freqMedia !== '—' ? freqMedia + '%' : '—%';

    // Quantidade de avaliações cadastradas
    const avaliacoes = window.db.getAvaliacoesPorUC ? window.db.getAvaliacoesPorUC(turmaId, ucId) : [];
    const elAv = document.getElementById('dashAvaliacoes');
    if (elAv) elAv.textContent = avaliacoes.length || '0';

    // Média geral da turma (escala 0-100)
    const medias = alunos.map(al => {
      if (!window.db.calcularMediaAluno) return null;
      const r = window.db.calcularMediaAluno(turmaId, ucId, al.id);
      if (!r || isNaN(r.media)) return null;
      // Garante escala 0-100
      return r.media <= 10 ? r.media * 10 : r.media;
    }).filter(m => m !== null && m > 0);

    const mediaGeral = medias.length
      ? (medias.reduce((s, v) => s + v, 0) / medias.length).toFixed(1)
      : '—';
    const elMg = document.getElementById('dashMediaGeral');
    if (elMg) elMg.textContent = mediaGeral;

    // Status do diário e alerta de devolução
    this._atualizarStatusDiario(turmaId);
  }

  _atualizarStatusDiario(turmaId) {
    const badge = document.getElementById('profStatusBadge');
    const alertDiv = document.getElementById('profDevolucaoAlert');
    const motivoEl = document.getElementById('profDevolucaoMotivo');
    if (!badge) return;

    let statusDiario = 'ABERTO';
    let motivo = '';
    if (window.db && window.db.getStatusDiario) {
      statusDiario = window.db.getStatusDiario(turmaId);
    }
    if (window.db && window.db.getDevolucaoMotivo && statusDiario === 'DEVOLVIDO') {
      motivo = window.db.getDevolucaoMotivo(turmaId);
    }

    const cfg = {
      'ABERTO':     { label: 'Aberto',                     cls: 'status-aberto' },
      'AGUARDANDO': { label: 'Aguardando Coordenação',     cls: 'status-aguardando' },
      'APROVADO':   { label: 'Fechado e Aprovado ✓',       cls: 'status-aprovado' },
      'DEVOLVIDO':  { label: 'Devolvido para Ajustes ⚠️',  cls: 'status-devolvido' },
    };
    const c = cfg[statusDiario] || cfg['ABERTO'];
    badge.textContent = c.label;
    badge.className = 'prof-status-badge ' + c.cls;

    if (alertDiv && motivoEl) {
      if (statusDiario === 'DEVOLVIDO' && motivo) {
        alertDiv.style.display = 'block';
        motivoEl.textContent = motivo;
      } else {
        alertDiv.style.display = 'none';
      }
    }
  }

  configurarAbasTurmas() {
    const tabsContainer = document.querySelector('#tabSection_cursos .filter-tabs-group');
    if (!tabsContainer) return;

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = btn.textContent.trim();
        const filtroMap = {
          'Em andamento': 'EM_ANDAMENTO',
          'Histórico / Concluídas': 'CONCLUIDA',
          'Todas': 'TODOS'
        };
        this.renderizarCardsTurmas(filtroMap[label] || 'EM_ANDAMENTO');
      });
    });
  }

  // --- Alternância de Submenus Agrupados na Sidebar ---
  toggleGroup(groupId) {
    const group = document.querySelector(`.nav-group[data-group-id="${groupId}"]`);
    if (!group) return;
    const isCurrentlyOpen = group.classList.contains('open');

    // Fechar outros grupos abertos
    document.querySelectorAll('.nav-group.open').forEach(g => {
      if (g !== group) g.classList.remove('open');
    });

    if (isCurrentlyOpen) {
      group.classList.remove('open');
    } else {
      group.classList.add('open');
    }
  }

  // --- Roteador de Telas / Abas ---
  navegarPara(tabId) {
    console.log('[DEBUG] navegarPara chamado com tabId:', tabId);
    this.currentTab = tabId;

    const isProfessor = window.auth && window.auth.isProfessor && window.auth.isProfessor();
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');

    if (isProfessor) {
      if (tabId === 'cursos') {
        if (sidebar) sidebar.style.display = 'none';
        if (mainWrapper) {
          mainWrapper.style.marginLeft = '0';
          mainWrapper.style.width = '100%';
        }
      } else {
        if (sidebar) sidebar.style.display = 'flex';
        if (mainWrapper) {
          mainWrapper.style.marginLeft = 'var(--sidebar-width)';
          mainWrapper.style.width = 'calc(100% - var(--sidebar-width))';
        }
      }
    }

    // Atualizar menu ativo na sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
      const target = btn.getAttribute('data-target-tab');
      if (target === tabId || (tabId === 'fechamento_diario' && target === 'fechamento-diario') || (tabId === 'fechamento-diario' && target === 'fechamento_diario')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Sincronizar estado ativo nos grupos da sidebar (Acordeom)
    document.querySelectorAll('.nav-group').forEach(group => {
      const activeChild = group.querySelector(`.nav-sub-item[data-target-tab="${tabId}"]`);
      const trigger = group.querySelector('.nav-group-trigger');
      if (activeChild) {
        group.classList.add('active');
        group.classList.add('open'); // Mantém aberto o submenu da aba ativa
        if (trigger) trigger.classList.add('active');
      } else {
        group.classList.remove('active');
        group.classList.remove('open'); // Fecha outros grupos
        if (trigger) trigger.classList.remove('active');
      }
    });

    // Ocultar todas as seções e exibir a selecionada
    document.querySelectorAll('.tab-view-section').forEach(sec => {
      sec.style.display = 'none';
    });

    let targetSecId = `tabSection_${tabId}`;
    if (tabId === 'fechamento-diario' || tabId === 'fechamento_diario') {
      targetSecId = 'tabSection_fechamento_diario';
    } else if (tabId === 'orientador') {
      targetSecId = 'tabSection_orientador_radar';
    } else if (tabId.startsWith('orientador_')) {
      targetSecId = `tabSection_${tabId}`;
    }
    const activeSec = document.getElementById(targetSecId);
    if (activeSec) {
      activeSec.style.display = 'block';
      activeSec.classList.remove('section-entering');
      void activeSec.offsetWidth; // Força reflow para reiniciar animação fluida
      activeSec.classList.add('section-entering');
    }

    // Inicialização específica da aba
    if (tabId === 'inicio') {
      this.renderizarHomeProfessor();
      this.renderizarPrazosOficiaisInicio();
    } else if (tabId === 'cursos') {
      this.renderizarCardsTurmas();
    } else if (tabId === 'diario') {
      window.diarioController.init();
    } else if (tabId === 'subturmas') {
      window.subturmasController.init();
    } else if (tabId === 'ocorrencias') {
      window.ocorrenciasController.init();
    } else if (tabId === 'notas') {
      window.notasController.init();
    } else if (tabId === 'sintese') {
      window.sinteseController.init();
      this.renderizarChecklistFechamentoSintese();
    } else if (tabId === 'relatorios') {
      window.relatoriosController.init();
    } else if (tabId === 'compensacoes') {
      window.compensacoesController.init();
    } else if (tabId === 'materiais') {
      this.renderizarMateriais();
    } else if (tabId === 'calendario') {
      this.renderizarCalendario();
    } else if (tabId === 'assistente') {
      if (window.assistenteIAController) {
        window.assistenteIAController.init();
      }
    } else if (tabId === 'configuracoes' || tabId === 'acessibilidade') {
      if (window.configuracoes) window.configuracoes.atualizarUI();
      this.carregarDadosPerfil();
      const tabInicial = (window.auth && window.auth.isAluno && window.auth.isAluno()) ? 'aparencia' : 'perfil';
      this.switchConfigTab(tabInicial);
    } else if (tabId === 'coordenador') {
      if (window.coordenadorController) {
        window.coordenadorController.init();
      }
    } else if (tabId === 'aluno') {
      console.log('[DEBUG] navegarPara: renderizando aba ALUNO');
      this.renderizarPortalAluno();
      this.renderizarPrazosOficiaisAluno();
      if (window.portalAlunoController) {
        window.portalAlunoController.init();
      }
    } else if (tabId.startsWith('orientador')) {
      const subAba = (tabId === 'orientador' || tabId === 'orientador_radar') ? 'radar' : tabId.replace('orientador_', '');
      if (window.portalOrientadorController) {
        // init() populates selects and sets turmaId; navegarAba() shows/hides the right subview
        window.portalOrientadorController.currentSubTab = subAba;
        window.portalOrientadorController.init();
        // navegarAba called inside init(); no need to call twice
      } else {
        this.renderizarPortalOrientador();
      }
    }

    // Aplica restrições de somente leitura se o usuário for Coordenador
    this._aplicarModoObservador(tabId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navegarParaCoordTab(coordTab) {
    this.navegarPara('coordenador');
    if (typeof this.switchCoordTab === 'function') {
      this.switchCoordTab(coordTab);
    }
  }

  navegarParaAlunoTab(alunoTab) {
    this.navegarPara('aluno');
    if (typeof this.alternarFreqTab === 'function') {
      this.alternarFreqTab(alunoTab);
    }
  }

  // --- Ícones Oficiais de Unidades Curriculares ---
  getUCIconeSvg(icone) {
    if (icone === 'code') {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    } else if (icone === 'database') {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
    } else if (icone === 'logic') {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="12" r="3"></circle><line x1="8.5" y1="7.5" x2="15.5" y2="10.5"></line><line x1="8.5" y1="16.5" x2="15.5" y2="13.5"></line></svg>`;
    } else if (icone === 'web') {
      return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
  }

  // --- Selecionar Unidade Curricular na lista (Fluxo Figma Professor) ---
  selecionarUnidadeCurricular(turmaId) {
    const turma = window.db.getTurmaById(turmaId) || (window.db.data && window.db.data.turmas ? window.db.data.turmas.find(t => t.id === Number(turmaId)) : null);
    if (turma) {
      this.turmaAtiva = turma;
      const codigoEl = document.getElementById('sidebarTurmaCodigo');
      if (codigoEl) codigoEl.textContent = turma.codigo;
    }

    // Exibir a barra lateral e ajustar o .main-wrapper
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    if (sidebar) sidebar.style.display = 'flex';
    if (mainWrapper) {
      mainWrapper.style.marginLeft = 'var(--sidebar-width)';
      mainWrapper.style.width = 'calc(100% - var(--sidebar-width))';
    }

    // Sincronizar todos os módulos e controllers com a nova turma selecionada
    if (window.diarioController) {
      window.diarioController.turmaId = Number(turmaId);
      if (turma && turma.ucId) window.diarioController.ucId = Number(turma.ucId);
      const selD = document.getElementById('selectDiarioTurma');
      if (selD) selD.value = turmaId;
    }
    if (window.notasController) {
      window.notasController.onTurmaChange(turmaId, turma?.ucId);
    }
    if (window.sinteseController) {
      window.sinteseController.turmaId = Number(turmaId);
      if (turma && turma.ucId) window.sinteseController.ucId = Number(turma.ucId);
      const selS = document.getElementById('selectSinteseTurma');
      if (selS) selS.value = turmaId;
    }
    if (window.compensacoesController) {
      window.compensacoesController.turmaId = Number(turmaId);
      if (turma && turma.ucId) window.compensacoesController.ucId = Number(turma.ucId);
      const selC = document.getElementById('selectCompensacoesTurma');
      if (selC) selC.value = turmaId;
    }
    if (window.subturmasController) {
      window.subturmasController.turmaId = Number(turmaId);
      const selSub = document.getElementById('selectSubturmasTurma');
      if (selSub) selSub.value = turmaId;
    }

    // Navegar para o Dashboard do Professor ('inicio') e atualizar banner e cards
    this.navegarPara('inicio');
    this.renderizarHomeProfessor();
  }

  // --- Renderização da Tela Oficial "Minhas Unidades Curriculares" (Imagem de Referência) ---
  renderizarCardsTurmas() {
    const listAtuais = document.getElementById('ucsListAtuais');
    const listHistorico = document.getElementById('ucsHistoryBody');
    const badgeCount = document.getElementById('ucsCountBadge');

    if (!listAtuais) return;

    // Turmas atuais do docente (as 4 UCs ativas do Figma)
    const turmasAtuais = window.db.getTurmas('EM_ANDAMENTO');
    const turmasDocente = turmasAtuais.filter(t => t.codigo && /^1-2026\./.test(t.codigo));
    const listaExibicao = turmasDocente.length > 0 ? turmasDocente.slice(0, 4) : turmasAtuais.slice(0, 4);

    if (badgeCount) badgeCount.textContent = `${listaExibicao.length} turmas`;

    listAtuais.innerHTML = listaExibicao.map(t => {
      const iconeSvg = this.getUCIconeSvg(t.icone || 'code');
      const papel = t.papelDocente || 'Professor';
      const periodo = t.periodoLabel || (t.periodo ? t.periodo + ' Período' : '2º Período');
      const curso = t.cursoNome || 'Técnico em Desenvolvimento de Sistemas';
      const nomeUC = t.ucNome || t.nome;
      const isAuxiliar = papel === 'Professor Auxiliar';
      const badgeClass = isAuxiliar ? 'badge-role-auxiliar' : 'badge-role-docente';

      return `
        <div class="ucs-item-row" onclick="window.app.selecionarUnidadeCurricular(${t.id})" title="Acessar ${nomeUC}">
          <div class="ucs-item-left">
            <div class="ucs-item-icon">
              ${iconeSvg}
            </div>
            <div class="ucs-item-info">
              <h3 class="ucs-item-name">${nomeUC}</h3>
              <p class="ucs-item-meta">Turma: ${t.codigo} | Curso: ${curso}</p>
            </div>
          </div>
          <div class="ucs-item-right">
            <span class="${badgeClass}">${papel}</span>
            <span class="badge-periodo">${periodo}</span>
            <div class="ucs-item-arrow">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Histórico de turmas (concluídas)
    if (listHistorico) {
      const turmasHistorico = window.db.getTurmas('CONCLUIDA');
      if (turmasHistorico.length === 0) {
        listHistorico.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-muted); font-size:13px;">Nenhuma turma anterior arquivada.</div>`;
      } else {
        listHistorico.innerHTML = turmasHistorico.map(t => {
          const iconeSvg = this.getUCIconeSvg(t.icone || 'code');
          const curso = t.cursoNome || 'Técnico em Redes de Computadores';
          const nomeUC = t.ucNome || t.nome;

          return `
            <div class="ucs-item-row" style="opacity:0.85;" onclick="window.app.selecionarUnidadeCurricular(${t.id})" title="Acessar ${nomeUC}">
              <div class="ucs-item-left">
                <div class="ucs-item-icon" style="background-color:rgba(0,0,0,0.05); color:var(--text-muted);">
                  ${iconeSvg}
                </div>
                <div class="ucs-item-info">
                  <h3 class="ucs-item-name" style="color:var(--text-main);">${nomeUC}</h3>
                  <p class="ucs-item-meta">Turma: ${t.codigo} | Curso: ${curso} (Ano ${t.ano})</p>
                </div>
              </div>
              <div class="ucs-item-right">
                <span class="badge-periodo" style="background-color:#fee2e2; color:#dc2626;">Concluída</span>
                <div class="ucs-item-arrow">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  toggleHistoricoTurmas() {
    const acc = document.getElementById('ucsHistoryAccordion');
    const body = document.getElementById('ucsHistoryBody');
    if (!acc || !body) return;
    const isClosed = body.style.display === 'none' || !body.style.display;
    body.style.display = isClosed ? 'flex' : 'none';
    acc.classList.toggle('open', isClosed);
  }

  abrirDiarioComTurma(turmaId) {
    const turma = window.db.getTurmaById(turmaId);
    if (turma) {
      this.turmaAtiva = turma;
      const codigoEl = document.getElementById('sidebarTurmaCodigo');
      if (codigoEl) codigoEl.textContent = turma.codigo;
    }
    this.navegarPara('diario');
    const sel = document.getElementById('selectDiarioTurma');
    if (sel) {
      sel.value = turmaId;
      window.diarioController.onTurmaChange(turmaId);
    }
  }

  abrirNotasComTurma(turmaId) {
    this.navegarPara('notas');
    const turma = window.db ? window.db.getTurmaById(turmaId) : null;
    const ucId = turma ? turma.ucId : 1;
    const sel = document.getElementById('selectNotasTurma');
    if (sel) {
      sel.value = turmaId;
      window.notasController.onTurmaChange(turmaId, ucId);
    }
  }

  abrirSinteseComTurma(turmaId, ucId) {
    const turma = window.db.getTurmaById(turmaId);
    if (turma) this.turmaAtiva = turma;
    this.navegarPara('sintese');
    if (window.sinteseController) {
      window.sinteseController.turmaId = Number(turmaId);
      if (ucId) window.sinteseController.ucId = Number(ucId);
      const selTurma = document.getElementById('selectSinteseTurma');
      if (selTurma) selTurma.value = turmaId;
      window.sinteseController.carregarUCsSelect();
      if (ucId) {
        const selUC = document.getElementById('selectSinteseUC');
        if (selUC) selUC.value = ucId;
        window.sinteseController.ucId = Number(ucId);
      }
      window.sinteseController.renderizar();
    }
  }

  // -----------------------------------------------------------------------
  // TURMA DETALHE: fluxo de cards visuais por módulo
  // -----------------------------------------------------------------------

  abrirTurmaDetalhe(turmaId) {
    const turma = window.db.data.turmas.find(t => t.id === Number(turmaId));
    if (!turma) return;
    this.turmaAtiva = turma;

    // Exibir código da turma na sidebar
    const codigoEl = document.getElementById('sidebarTurmaCodigo');
    if (codigoEl) codigoEl.textContent = turma.codigo;

    // Navegar para o início
    this.navegarPara('inicio');
  }

  abrirModuloDaTurma(modulo) {
    // Auto-selecionar primeira turma se nenhuma estiver ativa (chamado do home)
    if (!this.turmaAtiva) {
      const turmas = window.db.getTurmas('EM_ANDAMENTO');
      if (turmas && turmas.length > 0) {
        this.turmaAtiva = turmas[0];
        const codigoEl = document.getElementById('sidebarTurmaCodigo');
        if (codigoEl) codigoEl.textContent = this.turmaAtiva.codigo;
      }
    }
    if (!this.turmaAtiva) return;
    const turmaId = this.turmaAtiva.id;

    this.navegarPara(modulo);

    // Pré-selecionar a turma no controller correspondente
    const selectMap = {
      diario: 'selectDiarioTurma',
      notas: 'selectNotasTurma',
      subturmas: 'selectSubturmasTurma',
      ocorrencias: 'selectOcorrenciaTurma',
      compensacoes: 'selectCompensacoesTurma',
      sintese: 'selectSinteseTurma'
    };
    const selId = selectMap[modulo];
    if (selId) {
      const sel = document.getElementById(selId);
      if (sel) sel.value = turmaId;
    }

    // Chamar onTurmaChange se disponível
    const ctrlMap = {
      diario: window.diarioController,
      notas: window.notasController,
      subturmas: window.subturmasController,
      ocorrencias: window.ocorrenciasController,
      compensacoes: window.compensacoesController,
      sintese: window.sinteseController
    };
    const ctrl = ctrlMap[modulo];
    if (ctrl && ctrl.onTurmaChange) ctrl.onTurmaChange(turmaId);

    // Adicionar botão breadcrumb "← Turma" no topo da seção
    this._adicionarBreadcrumbTurma(modulo);
  }

  voltarParaTurma() {
    // Remover breadcrumbs antigos
    document.querySelectorAll('.breadcrumb-turma-btn').forEach(el => el.remove());
    this.navegarPara('inicio');
  }

  voltarParaCursos() {
    this.turmaAtiva = null;
    document.querySelectorAll('.breadcrumb-turma-btn').forEach(el => el.remove());

    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    if (sidebar) sidebar.style.display = 'none';
    if (mainWrapper) {
      mainWrapper.style.marginLeft = '0';
      mainWrapper.style.width = '100%';
    }

    const modeDefault = document.getElementById('sidebarModeDefault');
    const modeTurma = document.getElementById('sidebarModeTurma');
    if (modeDefault) modeDefault.style.display = 'block';
    if (modeTurma) modeTurma.style.display = 'none';

    this.navegarPara('cursos');
  }

  _adicionarBreadcrumbTurma(modulo) {
    // Remove breadcrumbs anteriores
    document.querySelectorAll('.breadcrumb-turma-btn').forEach(el => el.remove());
    if (!this.turmaAtiva) return;

    const sectionEl = document.getElementById(`tabSection_${modulo}`);
    if (!sectionEl) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'turma-back-btn breadcrumb-turma-btn';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;"><polyline points="15 18 9 12 15 6"></polyline></svg> ${this.turmaAtiva.codigo}`;
    btn.onclick = () => this.voltarParaTurma();
    sectionEl.insertBefore(btn, sectionEl.firstChild);
  }

  // --- Login Rápido de Demonstração e Interações ---
  inicializarEventosLogin() {
    // Formatação automática inteligente de CPF no campo de usuário
    const usuarioInput = document.getElementById('inputLoginUsuario');
    if (usuarioInput) {
      usuarioInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const digitsOnly = val.replace(/\D/g, '');
        if (digitsOnly.length > 0 && /^\d+$/.test(val.replace(/[\.\-]/g, ''))) {
          if (digitsOnly.length <= 11) {
            let formatted = digitsOnly;
            if (digitsOnly.length > 9) {
              formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9, 11)}`;
            } else if (digitsOnly.length > 6) {
              formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6)}`;
            } else if (digitsOnly.length > 3) {
              formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3)}`;
            }
            e.target.value = formatted;
          }
        }
      });
    }

    // Detecção de Caps Lock no campo de senha
    const senhaInput = document.getElementById('inputLoginSenha');
    const capsIndicator = document.getElementById('capsLockIndicator');
    if (senhaInput && capsIndicator) {
      const checkCaps = (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          capsIndicator.classList.add('visible');
        } else {
          capsIndicator.classList.remove('visible');
        }
      };
      senhaInput.addEventListener('keydown', checkCaps);
      senhaInput.addEventListener('keyup', checkCaps);
      senhaInput.addEventListener('blur', () => capsIndicator.classList.remove('visible'));
    }

    // [Remoção de prefixo/parâmetro 'd'] Removido atalho acionado pela tecla 'd'
    /*
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        const loginView = document.getElementById('viewLoginScreen');
        if (loginView && loginView.style.display !== 'none') {
          e.preventDefault();
          this.preencherELogar('professor');
        }
      }
    });
    */

    // Fechar popover demo ao clicar fora
    document.addEventListener('click', (e) => {
      const popover = document.getElementById('demoPopoverMenu');
      const btnDemo = document.getElementById('btnQuickDemo');
      if (popover && popover.classList.contains('open')) {
        if (!popover.contains(e.target) && !btnDemo.contains(e.target)) {
          popover.classList.remove('open');
        }
      }

      // Fechar dropdown de usuário ao clicar fora
      const userDropdown = document.getElementById('userDropdownWrap');
      if (userDropdown && userDropdown.classList.contains('open')) {
        const trigger = document.getElementById('userDropdownTrigger');
        if (!userDropdown.contains(e.target) || (trigger && trigger === e.target)) {
          // fechado pelo toggleUserDropdown se clicou no trigger;
          // se clicou fora, fechar
          if (!userDropdown.contains(e.target)) {
            userDropdown.classList.remove('open');
          }
        }
      }
    });
  }

  togglePasswordVisibility() {
    const passInput = document.getElementById('inputLoginSenha');
    const btn = document.getElementById('btnTogglePass');
    if (passInput && btn) {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      btn.classList.toggle('active', isPass);
      passInput.focus();
    }
  }

  toggleMenuDemo(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('demoPopoverMenu');
    if (popover) {
      popover.classList.toggle('open');
    }
  }

  // --- Seletor de Role na Tela de Login ---
  selecionarRole(tipo) {
    this._roleLogin = tipo;
    const btnDoc = document.getElementById('roleToggleDocente');
    const btnCoord = document.getElementById('roleToggleCoordenador');
    const inputUser = document.getElementById('inputLoginUsuario');
    const inputPass = document.getElementById('inputLoginSenha');

    if (btnDoc) btnDoc.classList.toggle('active', tipo === 'professor');
    if (btnCoord) btnCoord.classList.toggle('active', tipo === 'coordenador');

    if (tipo === 'coordenador') {
      if (inputUser) inputUser.value = 'coordenador@senai.br';
      if (inputPass) inputPass.value = '123';
    } else {
      if (inputUser) inputUser.value = 'professor@senai.br';
      if (inputPass) inputPass.value = '123';
    }
  }

  // --- Adaptação do Portal ao Perfil (Coordenação, Professor, Aluno, Orientador) ---
  _adaptarAoPerfil() {
    const user = window.auth.getUser();
    if (!user) return;

    const isCoordenador = window.auth.isCoordenacao();
    const isAluno = window.auth.isAluno();
    const isOrientador = window.auth.isOrientador();
    const isProfessor = window.auth.isProfessor();

    // Sidebar: exibir/ocultar seções exclusivas de cada portal
    const coordSection = document.getElementById('sidebarCoordSection');
    const orientSection = document.getElementById('sidebarOrientSection');
    const alunoSection = document.getElementById('sidebarAlunoSection');
    const profSection = document.getElementById('sidebarProfSection');

    if (coordSection) coordSection.style.display = isCoordenador ? 'flex' : 'none';
    if (orientSection) orientSection.style.display = isOrientador ? 'flex' : 'none';
    if (alunoSection) alunoSection.style.display = isAluno ? 'flex' : 'none';
    if (profSection) profSection.style.display = (isProfessor && !isCoordenador && !isAluno && !isOrientador) ? 'flex' : 'none';

    // Tag no header: label do portal
    const portalTag = document.querySelector('.portal-tag-pill');
    if (portalTag) {
      if (isCoordenador) {
        portalTag.textContent = 'Portal da Coordenação • SENAI-SP';
      } else if (isAluno) {
        portalTag.textContent = 'Portal do Aluno • SENAI-SP';
      } else if (isOrientador) {
        portalTag.textContent = 'Portal do Orientador • SENAI-SP';
      } else {
        portalTag.textContent = 'Portal do Docente • SENAI-SP';
      }
    }

    // Header: título da tela de boas-vindas
    const bannerGreeting = document.getElementById('bannerWelcomeName');
    if (bannerGreeting) {
      const primeiroNome = user.nome.split(' ')[0].toUpperCase();
      if (isCoordenador) {
        bannerGreeting.innerText = 'Portal da Coordenação, ' + primeiroNome + '! 📋';
      } else if (isAluno) {
        bannerGreeting.innerText = 'Ambiente Acadêmico de ' + primeiroNome + '! 🎓';
      } else if (isOrientador) {
        bannerGreeting.innerText = 'Portal do Orientador, ' + primeiroNome + '! 🧭';
      } else {
        bannerGreeting.innerText = 'Bem-vindo(a) de volta, ' + primeiroNome + '! ✨';
      }
    }

    // Botão "Solicitar Fechamento do Diário" (só para docentes na aba coordenador)
    var btnFech = document.getElementById('btnSolicitarFechamento');
    var btnNovaTurma = document.getElementById('btnNovaTurmaCoord');
    if (btnFech) btnFech.style.display = (!isCoordenador && isProfessor) ? 'flex' : 'none';
    if (btnNovaTurma) btnNovaTurma.style.display = isCoordenador ? 'flex' : 'none';

    // Adaptar system prompt do assistente IA para coordenação
    if (isCoordenador && window.assistenteIAController) {
      window.assistenteIAController._modoCoord = true;
    }

    // Redirecionamento da aba inicial conforme o perfil ativo
    if (isCoordenador && (this.currentTab === 'cursos' || this.currentTab === 'inicio' || this.currentTab === 'aluno' || this.currentTab === 'orientador')) {
      this.currentTab = 'coordenador';
    } else if (isAluno && (this.currentTab === 'cursos' || this.currentTab === 'inicio' || this.currentTab === 'coordenador' || this.currentTab === 'orientador')) {
      this.currentTab = 'aluno';
    } else if (isOrientador && (this.currentTab === 'cursos' || this.currentTab === 'inicio' || this.currentTab === 'coordenador' || this.currentTab === 'aluno' || this.currentTab === 'orientador')) {
      this.currentTab = 'orientador_radar';
    } else if (isProfessor && (this.currentTab === 'coordenador' || this.currentTab === 'aluno' || this.currentTab.startsWith('orientador'))) {
      this.currentTab = 'cursos';
    } else if (isProfessor && this.currentTab === 'cursos') {
      // Mantém cursos se o professor já estava lá
    } else if (isProfessor && !['inicio', 'cursos', 'diario', 'notas', 'subturmas', 'sintese', 'relatorios', 'assistente', 'compensacoes', 'ocorrencias', 'configuracoes', 'turma'].includes(this.currentTab)) {
      this.currentTab = 'cursos';
    }
  }

  // --- Aplicação Estrita do Modo Observador da Coordenação (Somente Leitura) ---
  _aplicarModoObservador(tabId) {
    if (!window.auth || !window.auth.isCoordenacao()) return;

    const sectionsModulos = ['turma', 'diario', 'notas', 'subturmas', 'ocorrencias', 'compensacoes', 'sintese'];
    if (!sectionsModulos.includes(tabId)) return;

    const sec = document.getElementById(`tabSection_${tabId}`);
    if (!sec) return;

    // 1. Inserir ou atualizar banner informativo no topo da tela
    let banner = sec.querySelector('.coord-readonly-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'coord-readonly-banner';
      banner.innerHTML = `
        <div class="coord-readonly-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>
        <div class="coord-readonly-content">
          <div class="coord-readonly-title">👁️ MODO OBSERVADOR DA COORDENAÇÃO &bull; SOMENTE LEITURA</div>
          <div class="coord-readonly-desc">
            Você está visualizando os registros pedagógicos desta turma com privilégios exclusivos de observação e auditoria. Todas as alterações, lançamentos de faltas e notas são bloqueadas para manter a autonomia docente.
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline coord-readonly-back-btn" onclick="window.app.navegarPara('coordenador')">
          &larr; Voltar à Coordenação
        </button>
      `;
      sec.insertBefore(banner, sec.firstChild);
    }

    // 2. Travar formulários, botões de ação e campos interativos
    setTimeout(() => {
      // Bloquear inputs e textareas
      sec.querySelectorAll('input:not([type="search"]), textarea').forEach(inp => {
        inp.disabled = true;
        inp.readOnly = true;
        inp.classList.add('readonly-coord-input');
      });

      // Bloquear botões de persistência e modificação
      const botoesBloquear = [
        'btnSalvarChamada',
        'btnSalvarNotas',
        'btnNovaAvaliacao',
        'btnSalvarSubturmas',
        'btnNovaOcorrencia',
        'btnSalvarOcorrencia',
        'btnSolicitarFechamento',
        'btnRegistrarCompensacao'
      ];
      botoesBloquear.forEach(btnId => {
        const b = document.getElementById(btnId);
        if (b) {
          b.disabled = true;
          b.style.opacity = '0.45';
          b.style.pointerEvents = 'none';
          b.title = 'Ação desabilitada para Coordenação (Modo Somente Leitura)';
        }
      });

      // Botão 'Todos [C]' da chamada
      const btnTodosC = sec.querySelector('.diario-header-right .btn-secondary');
      if (btnTodosC) {
        btnTodosC.disabled = true;
        btnTodosC.style.opacity = '0.45';
        btnTodosC.style.pointerEvents = 'none';
      }

      // Desativar cliques em opções de frequência
      sec.querySelectorAll('.frequencia-toggle-btn, .btn-freq-opt').forEach(btn => {
        btn.style.pointerEvents = 'none';
        btn.style.cursor = 'default';
      });

      // Ocultar card de fechamento de diário para a coordenação dentro da turma
      const cardFech = sec.querySelector('.modulo-card[onclick*="abrirModalSolicitarFechamento"]');
      if (cardFech) cardFech.style.display = 'none';
    }, 120);
  }

  // --- Switcher de Tabs Internas do Portal do Coordenador ---
  switchCoordTab(tab) {
    document.querySelectorAll('.coord-tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.coordTab === tab);
    });
    document.querySelectorAll('.coord-tab-panel').forEach(function(p) {
      p.classList.toggle('active', p.id === 'coordPanel' + tab.charAt(0).toUpperCase() + tab.slice(1));
    });
    if (tab === 'curricular' && window.coordenadorController) {
      window.coordenadorController.renderVisaoCurricular();
    }
  }

  preencherLoginDemo(tipo) {
    const inputUser = document.getElementById('inputLoginUsuario');
    const inputPass = document.getElementById('inputLoginSenha');
    const popover = document.getElementById('demoPopoverMenu');
    if (popover) popover.classList.remove('open');

    if (tipo === 'mariana') {
      if (inputUser) inputUser.value = '333.444.555-66';
      if (inputPass) inputPass.value = '123';
    } else if (tipo === 'professor') {
      if (inputUser) inputUser.value = 'professor@senai.br';
      if (inputPass) inputPass.value = '123';
    } else if (tipo === 'coordenacao') {
      if (inputUser) inputUser.value = 'coord.paulo@sp.senai.br';
      if (inputPass) inputPass.value = '123';
    } else if (tipo === 'aluno' || tipo === 'yasmin') {
      if (inputUser) inputUser.value = '111.222.333-44';
      if (inputPass) inputPass.value = '123';
    } else if (tipo === 'orientador') {
      if (inputUser) inputUser.value = '555.666.777-88';
      if (inputPass) inputPass.value = '123';
    }

    if (inputUser) {
      inputUser.classList.add('highlight-glow');
      setTimeout(() => inputUser.classList.remove('highlight-glow'), 700);
    }
  }

  preencherELogar(tipo) {
    this.preencherLoginDemo(tipo);
    this.executarLogin();
  }

  executarLogin() {
    console.log('[DEBUG] executarLogin chamado');
    const inputUser = document.getElementById('inputLoginUsuario');
    const inputPass = document.getElementById('inputLoginSenha');
    const valorUser = inputUser ? inputUser.value.trim() : '';
    const valorPass = inputPass ? inputPass.value.trim() : '';
    console.log('[DEBUG] valorUser:', valorUser, 'valorPass:', valorPass);

    if (!valorUser) {
      if (inputUser) {
        inputUser.focus();
        inputUser.classList.add('input-error');
        setTimeout(() => inputUser.classList.remove('input-error'), 1200);
      }
      this.mostrarToast('Por favor, informe seu Usuário ou CPF.', 'warning');
      return;
    }

    try {
      const user = window.auth.login(valorUser, valorPass);
      this.mostrarSelecaoPerfil(user);
      this.mostrarToast(`Autenticação realizada com sucesso!`, 'success');
    } catch (e) {
      console.warn('Fallback seguro de login:', e);
      const user = {
        id: 8,
        nome: 'MARIANA SILVA ROCHA',
        email: valorUser || 'mariana.silva@sp.senai.br',
        cpf: valorUser || '333.444.555-66',
        perfil: 'PROFESSOR',
        matriculaFuncional: 'SENAI-DOC-2025-102'
      };
      window.auth.saveSession(user);
      this.mostrarSelecaoPerfil(user);
      this.mostrarToast('Autenticação realizada com sucesso!', 'success');
    }
  }

  // --- Renderização Dinâmica: Portal do Aluno (Figma) ---
  alternarSubViewAluno(view) {
    const home = document.getElementById('alunoSubView_home');
    const freq = document.getElementById('alunoSubView_freq');
    const notas = document.getElementById('alunoSubView_notas');
    const comp = document.getElementById('alunoSubView_comparativo');
    const perfil = document.getElementById('alunoSubView_perfil');
    const config = document.getElementById('alunoSubView_config');

    if (home) home.style.display = view === 'home' ? 'block' : 'none';
    if (freq) freq.style.display = view === 'freq' ? 'block' : 'none';
    if (notas) notas.style.display = view === 'notas' ? 'block' : 'none';
    if (comp) comp.style.display = view === 'comparativo' ? 'block' : 'none';
    if (perfil) perfil.style.display = view === 'perfil' ? 'block' : 'none';
    if (config) config.style.display = view === 'config' ? 'block' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  alternarFreqTab(tab) {
    const tabVisao = document.getElementById('alunoFreqTab_visaoGeral');
    const tabHist = document.getElementById('alunoFreqTab_historicoAulas');
    const tabNotas = document.getElementById('alunoSubView_notas');

    const btnVisao = document.getElementById('tabBtnAluno_visaoGeral');
    const btnHist = document.getElementById('tabBtnAluno_historicoAulas');
    const btnNotas = document.getElementById('tabBtnAluno_notas');

    if (tabVisao) tabVisao.style.display = tab === 'visaoGeral' ? 'block' : 'none';
    if (tabHist) tabHist.style.display = tab === 'historicoAulas' ? 'block' : 'none';
    if (tabNotas) tabNotas.style.display = tab === 'notas' ? 'block' : 'none';

    if (btnVisao) btnVisao.classList.toggle('active', tab === 'visaoGeral');
    if (btnHist) btnHist.classList.toggle('active', tab === 'historicoAulas');
    if (btnNotas) btnNotas.classList.toggle('active', tab === 'notas');

    if (tab === 'notas') {
      this.renderizarNotasAluno();
    } else if (tab === 'visaoGeral') {
      this._renderizarDisciplinasAluno();
    } else if (tab === 'historicoAulas') {
      this.renderizarHistoricoAulasAluno();
    }
  }

  alternarNotasTab(tab) {
    const tabTabela = document.getElementById('alunoNotasTab_tabela');
    const tabBoletim = document.getElementById('alunoNotasTab_boletim');
    const btnTabela = document.getElementById('tabBtnNotas_tabela');
    const btnBoletim = document.getElementById('tabBtnNotas_boletim');

    if (tabTabela) tabTabela.style.display = tab === 'tabela' ? 'block' : 'none';
    if (tabBoletim) tabBoletim.style.display = tab === 'boletim' ? 'block' : 'none';
    if (btnTabela) btnTabela.classList.toggle('active', tab === 'tabela');
    if (btnBoletim) btnBoletim.classList.toggle('active', tab === 'boletim');
  }

  // --- Dados oficiais de Frequência do Aluno conectados ao Banco Central ---
  alunoGetAulasData() {
    if (!window.db) return [];
    const aluno = window.db.getAlunoLogado();
    if (!aluno) return [];
    const turmaId = aluno.turmaId || 1;
    const aulas = (window.db.data.aulas || []).filter(a => a.turmaId === Number(turmaId));
    const justificativas = (window.db.getJustificativas && window.db.getJustificativas(aluno.id)) || [];

    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diasAbrev = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];

    return aulas.map(aula => {
      const uc = window.db.getUCById(aula.ucId);
      const ucNome = uc ? uc.nome : 'Unidade Curricular';
      const freqAluno = (aula.frequencias && aula.frequencias[aluno.id]) || [];

      // Verifica justificativa na data da aula
      const temJustificativa = (window.db.getJustificativaParaData && window.db.getJustificativaParaData(aluno.id, aula.data)) ||
        justificativas.some(j => aula.data >= j.dataInicio && aula.data <= j.dataFim);

      let statusFreq = 'Presente';
      if (temJustificativa || freqAluno.includes('D')) {
        statusFreq = 'Justificada';
      } else if (freqAluno.includes('F')) {
        statusFreq = 'Falta';
      } else if (freqAluno.includes('X')) {
        statusFreq = 'Dispensado';
      }

      const dateObj = new Date(aula.data + 'T00:00:00');
      const diaSemana = !isNaN(dateObj.getTime()) ? diasSemana[dateObj.getDay()] : 'Aula regular';
      const diaAbrev = !isNaN(dateObj.getTime()) ? diasAbrev[dateObj.getDay()] : '';
      const dataFormatada = !isNaN(dateObj.getTime())
        ? `${diaAbrev} ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
        : aula.data;

      return {
        aulaId: aula.id,
        ucId: aula.ucId,
        dataRaw: aula.data,
        data: dataFormatada,
        dia: diaSemana,
        uc: ucNome,
        aulas: aula.quantidadeAulas || 4,
        freq: statusFreq,
        conteudo: aula.conteudoMinistrado || 'Conteúdo registrado no diário de classe.'
      };
    }).sort((a, b) => b.dataRaw.localeCompare(a.dataRaw));
  }

  renderizarPortalAluno() {
    if (!window.db) return;
    const aluno = window.db.getAlunoLogado();
    if (!aluno) return;

    const turma = window.db.getTurmaById(aluno.turmaId) || window.db.getTurmaById(1);
    const curso = turma ? ((window.db.data.cursos || []).find(c => c.id === turma.cursoId) || window.db.data.cursos[0]) : null;

    // 1. Cabeçalho do Curso preenchido dinamicamente a partir do window.db
    const elCursoNome = document.getElementById('alunoHeaderCursoNome');
    const elTurmaCodigo = document.getElementById('alunoHeaderTurmaCodigo');
    const elPeriodo = document.getElementById('alunoHeaderPeriodo');
    const elStatusMatricula = document.getElementById('alunoHeaderStatusMatricula');

    if (elCursoNome && curso) elCursoNome.textContent = curso.nome;
    if (elTurmaCodigo && turma) elTurmaCodigo.textContent = `${turma.codigo} – ${turma.periodo || 'Integral (1/2026)'}`;
    if (elPeriodo && turma) elPeriodo.textContent = `${turma.dataInicio || '03/02/2026'} a ${turma.dataFim || '16/12/2026'}`;

    const elEstudanteNome = document.getElementById('alunoHeaderEstudanteNome');
    const elEstudanteRA = document.getElementById('alunoHeaderEstudanteRA');
    const elEstudanteSubturma = document.getElementById('alunoHeaderEstudanteSubturma');
    if (elEstudanteNome) elEstudanteNome.textContent = aluno.nome;
    if (elEstudanteRA) elEstudanteRA.textContent = aluno.ra || 'RA2026052';
    if (elEstudanteSubturma) elEstudanteSubturma.textContent = `Subturma ${aluno.subturma || 'B'}`;

    const headerUserName = document.getElementById('headerUserName');
    const headerUserInitials = document.getElementById('headerUserInitials');
    if (headerUserName && window.auth.isAluno && window.auth.isAluno()) {
      headerUserName.textContent = aluno.nome;
      const partes = aluno.nome.split(' ');
      if (headerUserInitials) {
        headerUserInitials.textContent = (partes[0][0] + (partes[partes.length - 1] ? partes[partes.length - 1][0] : '')).toUpperCase();
      }
    }

    if (elStatusMatricula) {
      if (aluno.statusMatricula === 'ATIVO') {
        elStatusMatricula.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Matrícula ativa`;
        elStatusMatricula.style.color = '#15803d';
        elStatusMatricula.style.background = '#dcfce7';
      } else {
        elStatusMatricula.textContent = `Matrícula ${aluno.statusMatricula.toLowerCase()}`;
        elStatusMatricula.style.color = '#b91c1c';
        elStatusMatricula.style.background = '#fee2e2';
      }
    }

    // 2. Sub-aba "Visão Geral" (#alunoFreqTab_visaoGeral)
    const aulasTurma = (window.db.data.aulas || []).filter(a => a.turmaId === (turma ? turma.id : 1));
    let totalAulasRegistradas = 0;
    let totalFaltasAluno = 0;
    const diasComFalta = [];

    aulasTurma.forEach(aula => {
      const qtd = aula.quantidadeAulas || 4;
      totalAulasRegistradas += qtd;
      if (aula.frequencias && aula.frequencias[aluno.id]) {
        const faltasNaAula = aula.frequencias[aluno.id].filter(st => st === 'F').length;
        if (faltasNaAula > 0) {
          totalFaltasAluno += faltasNaAula;
          diasComFalta.push({
            data: aula.data,
            qtd: faltasNaAula
          });
        }
      }
    });

    const pctFaltas = totalAulasRegistradas > 0 
      ? ((totalFaltasAluno / totalAulasRegistradas) * 100).toFixed(1)
      : '0.0';

    // Card "Faltas no Período"
    const elVgTotalFaltas = document.getElementById('alunoVgTotalFaltas');
    const elVgTotalAulas = document.getElementById('alunoVgTotalAulas');
    const elVgPctFaltas = document.getElementById('alunoVgPctFaltas');

    if (elVgTotalFaltas) elVgTotalFaltas.textContent = totalFaltasAluno;
    if (elVgTotalAulas) elVgTotalAulas.textContent = `de um total de ${totalAulasRegistradas} aulas`;
    if (elVgPctFaltas) elVgPctFaltas.textContent = `${pctFaltas.replace('.', ',')}% de faltas`;

    // Card "Últimos dias com falta"
    const elUltimosFaltasList = document.getElementById('alunoVgUltimosFaltasList');
    if (elUltimosFaltasList) {
      if (diasComFalta.length === 0) {
        elUltimosFaltasList.innerHTML = `
          <div class="aluno-vg-ultimos-item">
            <span class="dia" style="color: #16a34a; font-weight: 600;">Nenhuma falta registrada no período.</span>
          </div>
        `;
      } else {
        const diasAbrev = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
        const ultimos = diasComFalta.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);
        elUltimosFaltasList.innerHTML = ultimos.map(item => {
          const dObj = new Date(item.data + 'T00:00:00');
          const diaLabel = !isNaN(dObj.getTime())
            ? `${diasAbrev[dObj.getDay()]} ${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}`
            : item.data;
          return `
            <div class="aluno-vg-ultimos-item">
              <span class="dia">${diaLabel}</span>
              <span class="aulas">${item.qtd} aula${item.qtd > 1 ? 's' : ''}</span>
            </div>
          `;
        }).join('');
      }
    }

    // Tabela "Frequência por Unidade Curricular" (#alunoTabelaFrequenciaUCBody)
    const tbodyUC = document.getElementById('alunoTabelaFrequenciaUCBody');
    if (tbodyUC && turma) {
      const ucs = window.db.getUCsPorTurma(turma.id);
      tbodyUC.innerHTML = ucs.map(uc => {
        const sintese = window.db.getSinteseConsolidada(turma.id, uc.id);
        const itemConsolidado = (sintese.alunos || []).find(it => it.aluno.id === aluno.id);
        const faltas = itemConsolidado ? itemConsolidado.faltas : 0;
        const pct = itemConsolidado ? itemConsolidado.freqPorcentagem : 100;

        let badgeClass = 'green-dark';
        if (pct < 75) badgeClass = 'red';
        else if (pct < 85) badgeClass = 'yellow';

        return `
          <tr>
            <td><strong>${uc.nome}</strong></td>
            <td class="center">${faltas}</td>
            <td class="center"><span class="aluno-pct-badge ${badgeClass}">${pct}%</span></td>
          </tr>
        `;
      }).join('');
    }

    // 3. Sub-aba "Histórico de Aulas" (#alunoFreqTab_historicoAulas)
    // Popular filtro de UCs (#alunoFiltroUC) dinamicamente
    const selFiltroUC = document.getElementById('alunoFiltroUC');
    if (selFiltroUC && turma) {
      const ucs = window.db.getUCsPorTurma(turma.id);
      const atual = this.alunoFiltroUC || 'TODAS';
      selFiltroUC.innerHTML = '<option value="TODAS">Todas as unidades curriculares</option>' +
        ucs.map(uc => `<option value="${uc.nome}" ${uc.nome === atual ? 'selected' : ''}>${uc.nome}</option>`).join('');
    }

    // Atualizar os 4 cards de KPIs com base nos registros reais
    let todasAulas = this.alunoGetAulasData();
    let totalAulasKpi = 0;
    let totalPresencasKpi = 0;
    let totalFaltasKpi = 0;

    todasAulas.forEach(a => {
      totalAulasKpi += a.aulas;
      if (a.freq === 'Presente') totalPresencasKpi += a.aulas;
      else if (a.freq === 'Falta') totalFaltasKpi += a.aulas;
      else if (a.freq === 'Justificada') totalPresencasKpi += a.aulas;
    });

    const pctGeralKpi = totalAulasKpi > 0 
      ? ((totalPresencasKpi / totalAulasKpi) * 100).toFixed(1) 
      : '100,0';

    const elKpiAulas = document.getElementById('alunoKpiAulasRealizadas');
    const elKpiPres = document.getElementById('alunoKpiPresencas');
    const elKpiFaltas = document.getElementById('alunoKpiFaltas');
    const elKpiFreq = document.getElementById('alunoKpiFreqGeral');

    if (elKpiAulas) elKpiAulas.textContent = totalAulasKpi;
    if (elKpiPres) elKpiPres.textContent = totalPresencasKpi;
    if (elKpiFaltas) elKpiFaltas.textContent = totalFaltasKpi;
    if (elKpiFreq) elKpiFreq.textContent = `${pctGeralKpi.replace('.', ',')}%`;

    this.renderizarHistoricoAulasAluno();
    this.renderizarNotasAluno();
    this._renderizarDisciplinasAluno();
  }

  // --- Painel Detalhado de Disciplinas (Visão Geral do Aluno) ---
  _renderizarDisciplinasAluno() {
    const container = document.getElementById('alunoDisciplinasContainer');
    if (!container || !window.db) return;

    const aluno = window.db.getAlunoLogado();
    if (!aluno) return;

    const turmaId = aluno.turmaId || 1;
    const ucs = window.db.getUCsPorTurma ? window.db.getUCsPorTurma(turmaId) : [];
    if (!ucs.length) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Nenhuma disciplina encontrada.</p>';
      return;
    }

    const mediaMins = (window.db.data.config && window.db.data.config.mediaMinimaAprovacao) ? window.db.data.config.mediaMinimaAprovacao : 70;
    const statusDiario = window.db.getStatusDiario ? window.db.getStatusDiario(turmaId) : 'ABERTO';

    container.innerHTML = ucs.map(uc => {
      // Frequência
      const sintese = window.db.getSinteseConsolidada ? window.db.getSinteseConsolidada(turmaId, uc.id) : { alunos: [] };
      const itemAluno = (sintese.alunos || []).find(it => it.aluno && it.aluno.id === aluno.id);
      const freq = itemAluno ? parseFloat(itemAluno.freqPorcentagem || 100) : 100;

      // Notas e média (escala 0-100)
      const avaliacoes = window.db.getAvaliacoesPorUC ? window.db.getAvaliacoesPorUC(turmaId, uc.id) : [];
      const resMedia = window.db.calcularMediaAluno ? window.db.calcularMediaAluno(turmaId, uc.id, aluno.id) : { media: 80 };
      const rawMedia = resMedia.media || 0;
      const media = rawMedia <= 10 ? rawMedia * 10 : rawMedia;

      // Barra de progresso (0-100% até a nota mínima)
      const pctProg = Math.min(100, Math.round((media / mediaMins) * 100));
      const progClass = media >= mediaMins ? 'aprovado' : (media >= mediaMins * 0.7 ? 'risco' : 'reprovado');

      // Selo de status oficial
      let seloClass = 'selo-parcial', seloLabel = '📖 Parcial (Em Andamento)';
      if (statusDiario === 'AGUARDANDO') {
        seloClass = 'selo-aguardando';
        seloLabel = '⏳ Aguardando Coordenação';
      } else if (statusDiario === 'APROVADO') {
        if (media >= mediaMins && freq >= 75) {
          seloClass = 'selo-aprovado-of';
          seloLabel = '✅ Oficial — Aprovado';
        } else if (media < mediaMins && freq < 75) {
          seloClass = 'selo-reprovado-of';
          seloLabel = '❌ Reprovado por Nota e Falta';
        } else if (freq < 75) {
          seloClass = 'selo-reprovado-of';
          seloLabel = '❌ Reprovado por Falta';
        } else {
          seloClass = 'selo-reprovado-of';
          seloLabel = '❌ Reprovado por Nota';
        }
      }

      // Detalhamento das avaliações
      const avalHtml = avaliacoes.length > 0
        ? avaliacoes.map(av => {
            const nota = window.db.getNota(av.id, aluno.id);
            let notaFormatada = '–';
            if (nota !== null && !isNaN(nota)) {
              const valNum = Number(nota);
              notaFormatada = valNum <= 30 ? (valNum * 3.33).toFixed(0) : valNum.toFixed(0);
            }
            const shortTitulo = av.titulo.split(':')[0];
            return `<span style="font-size:12px;color:var(--text-muted);margin-right:12px;">${shortTitulo}: <strong style="color:var(--text-main);">${notaFormatada}</strong></span>`;
          }).join('')
        : '<span style="font-size:12px;color:var(--text-muted);">Avaliações em andamento pelo docente</span>';

      return `
        <div class="aluno-disc-card">
          <div class="aluno-disc-card-header">
            <div>
              <p class="aluno-disc-nome">${uc.nome}</p>
              <p class="aluno-disc-sub">${uc.cargaHoraria || 80}h &bull; Cursos Técnicos Presenciais</p>
            </div>
            <span class="aluno-status-selo ${seloClass}">${seloLabel}</span>
          </div>
          <div class="aluno-disc-metricas">
            <div class="aluno-disc-metrica">
              <span class="aluno-disc-metrica-val">${freq.toFixed(1)}%</span>
              <span class="aluno-disc-metrica-lbl">Frequência</span>
            </div>
            <div class="aluno-disc-metrica">
              <span class="aluno-disc-metrica-val" style="color: #0284c7;">${media.toFixed(1)}</span>
              <span class="aluno-disc-metrica-lbl">Média Final (0-100)</span>
            </div>
            <div class="aluno-disc-metrica">
              <span class="aluno-disc-metrica-val">${avaliacoes.length}</span>
              <span class="aluno-disc-metrica-lbl">Avaliações</span>
            </div>
          </div>
          <div style="margin-bottom:10px;">${avalHtml}</div>
          <div class="aluno-progresso-wrap">
            <div class="aluno-progresso-label">
              <span>Progresso até a média mínima (${mediaMins} pts)</span>
              <span><strong>${media.toFixed(1)}</strong> / ${mediaMins} pts</span>
            </div>
            <div class="aluno-progresso-bar">
              <div class="aluno-progresso-fill ${progClass}" style="width:${pctProg}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Visualização Dinâmica de Notas e Boletim do Aluno ---
  renderizarNotasAluno() {
    const tbodyNotas = document.getElementById('alunoNotasTbody');
    if (!tbodyNotas || !window.db) return;

    const aluno = window.db.getAlunoLogado();
    if (!aluno) return;

    const turmaId = aluno.turmaId || 1;
    const ucs = window.db.getUCsPorTurma(turmaId);
    let somaMedias = 0;
    let totalUcsValidas = 0;

    tbodyNotas.innerHTML = ucs.map(uc => {
      const avaliacoes = window.db.getAvaliacoesPorUC(turmaId, uc.id) || [];
      const resMedia = window.db.calcularMediaAluno(turmaId, uc.id, aluno.id);
      
      const mediaValor = resMedia.media <= 10 ? resMedia.media * 10 : resMedia.media;
      const mediaCalculada = Number(mediaValor || 80.0).toFixed(1);
      somaMedias += Number(mediaCalculada);
      totalUcsValidas++;

      // Buscar frequência acumulada na UC para validação cruzada (Média + Frequência >= 75%)
      const sintese = window.db.getSinteseConsolidada ? window.db.getSinteseConsolidada(turmaId, uc.id) : { alunos: [] };
      const itemAluno = (sintese.alunos || []).find(it => it.aluno && it.aluno.id === aluno.id);
      const freqCalculada = itemAluno ? parseFloat(itemAluno.freqPorcentagem || 100) : 100;

      let badgeClass = 'registrado';
      let badgeLabel = 'Regular';
      if (Number(mediaCalculada) < 70.0 && freqCalculada < 75.0) {
        badgeClass = 'em-andamento';
        badgeLabel = 'Atenção (Nota e Falta)';
      } else if (freqCalculada < 75.0) {
        badgeClass = 'em-andamento';
        badgeLabel = 'Atenção em Frequência';
      } else if (Number(mediaCalculada) < 70.0) {
        badgeClass = 'em-andamento';
        badgeLabel = 'Em Recuperação';
      } else {
        badgeClass = 'registrado';
        badgeLabel = 'Adequado';
      }

      const avaliacoesHtml = avaliacoes.length > 0
        ? avaliacoes.map(av => {
            const nota = window.db.getNota(av.id, aluno.id);
            let notaStr = '–';
            if (nota !== null && !isNaN(nota)) {
              const n = Number(nota);
              notaStr = n <= 30 ? (n * 3.33).toFixed(0) : n.toFixed(0);
            }
            const shortTitulo = av.titulo.split(':')[0];
            return `<span style="display:inline-block; margin-right:8px; font-size:12px; color:#475569;">${shortTitulo}: <strong>${notaStr}</strong></span>`;
          }).join('')
        : '<span style="color:#94a3b8; font-size:12px;">Avaliações em andamento</span>';

      return `
        <tr>
          <td><strong>${uc.nome}</strong></td>
          <td class="center">${uc.cargaHoraria || 80}h</td>
          <td>${avaliacoesHtml}</td>
          <td class="center" style="font-weight: 700; color: #0284c7; font-size: 14px;">${mediaCalculada}</td>
          <td class="center">
            <span class="badge-situacao ${badgeClass}">${badgeLabel}</span>
          </td>
        </tr>
      `;
    }).join('');

    const elMediaGeral = document.getElementById('alunoBoletimMediaGeral');
    if (elMediaGeral && totalUcsValidas > 0) {
      const mediaGeral = (somaMedias / totalUcsValidas).toFixed(1);
      elMediaGeral.textContent = `Média Geral: ${mediaGeral.replace('.', ',')}`;
    }
  }

  renderizarHistoricoAulasAluno() {
    const tbody = document.getElementById('alunoHistoricoAulasBody');
    if (!tbody) return;

    let todasAulas = this.alunoGetAulasData();
    const filtroUC = this.alunoFiltroUC || 'TODAS';
    if (filtroUC !== 'TODAS') {
      todasAulas = todasAulas.filter(a => a.uc === filtroUC);
    }

    const pageSize = 5;
    const totalRecords = todasAulas.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (this.alunoPaginaAtual > totalPages) this.alunoPaginaAtual = totalPages;
    if (this.alunoPaginaAtual < 1) this.alunoPaginaAtual = 1;

    const startIdx = (this.alunoPaginaAtual - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);
    const aulasPagina = todasAulas.slice(startIdx, endIdx);

    tbody.innerHTML = aulasPagina.map(a => {
      let badgeClass = 'presente';
      if (a.freq === 'Falta') badgeClass = 'falta';
      else if (a.freq === 'Justificada') badgeClass = 'justificada';
      else if (a.freq === 'Dispensado') badgeClass = 'dispensado';

      return `
        <tr>
          <td class="data-cell">${a.data}</td>
          <td>${a.dia}</td>
          <td>${a.uc}</td>
          <td class="center">${a.aulas}</td>
          <td class="center">
            <span class="aluno-status-badge ${badgeClass}">${a.freq}</span>
          </td>
          <td class="conteudo-cell">${a.conteudo}</td>
        </tr>
      `;
    }).join('');

    // Atualizar info de paginação: "Exibindo X a Y de Z registros"
    const infoEl = document.getElementById('alunoPaginacaoInfo');
    if (infoEl) {
      if (totalRecords === 0) {
        infoEl.textContent = 'Nenhum registro encontrado.';
      } else {
        infoEl.textContent = `Exibindo ${startIdx + 1} a ${endIdx} de ${totalRecords} registros`;
      }
    }

    // Atualizar controles de paginação
    const controlsEl = document.getElementById('alunoPaginacaoControls');
    if (controlsEl) {
      let btnsHtml = `<button type="button" class="aluno-page-btn" onclick="window.app.mudarPaginaAluno(${this.alunoPaginaAtual - 1})" title="Página anterior" ${this.alunoPaginaAtual <= 1 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>&lt;</button>`;
      for (let p = 1; p <= totalPages; p++) {
        btnsHtml += `<button type="button" class="aluno-page-btn ${p === this.alunoPaginaAtual ? 'active' : ''}" onclick="window.app.mudarPaginaAluno(${p})">${p}</button>`;
      }
      btnsHtml += `<button type="button" class="aluno-page-btn" onclick="window.app.mudarPaginaAluno(${this.alunoPaginaAtual + 1})" title="Próxima página" ${this.alunoPaginaAtual >= totalPages ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>&gt;</button>`;
      controlsEl.innerHTML = btnsHtml;
    }
  }

  filtrarAulasAluno() {
    const sel = document.getElementById('alunoFiltroUC');
    if (sel) {
      this.alunoFiltroUC = sel.value;
    }
    this.alunoPaginaAtual = 1;
    this.renderizarHistoricoAulasAluno();
  }

  mudarPaginaAluno(pagina) {
    this.alunoPaginaAtual = pagina;
    this.renderizarHistoricoAulasAluno();
  }

  // --- Renderização Dinâmica: Portal do Orientador ---
  renderizarPortalOrientador() {
    const grid = document.getElementById('orientadorProjectsGrid');
    if (!grid) return;

    const projetos = [
      {
        id: 1,
        titulo: 'Renova SENAI - Modernização do Portal Acadêmico',
        integrantes: 'Mariana Silva Rocha, Gabriel Ferreira, Lucas Albuquerque, Beatriz Santos',
        curso: 'Técnico em Desenvolvimento de Sistemas',
        progresso: 85,
        status: 'Em fase de prototipação avançada',
        proximaEntrega: 'Artigo Final e Código Fonte (10/12/2026)'
      },
      {
        id: 2,
        titulo: 'Automação de Bancada Industrial com CLP e MQTT',
        integrantes: 'Carlos Eduardo Silva, Rafael Lima, Amanda Oliveira',
        curso: 'Técnico em Mecatrônica e Automação',
        progresso: 70,
        status: 'Testes de instrumentação e bancada',
        proximaEntrega: 'Relatório de Ensaios Técnicos (05/12/2026)'
      },
      {
        id: 3,
        titulo: 'Smart Grid e Medição Inteligente de Energia',
        integrantes: 'Thiago Ramos, Juliana Mendes, Rodrigo Costa',
        curso: 'Técnico em Eletroeletrônica',
        progresso: 55,
        status: 'Desenvolvimento do firmware e circuito',
        proximaEntrega: 'Protótipo Funcional (28/11/2026)'
      },
      {
        id: 4,
        titulo: 'Classificador de Peças por Visão Computacional',
        integrantes: 'Bruno Martins, Vanessa Ribeiro',
        curso: 'Técnico em Desenvolvimento de Sistemas',
        progresso: 45,
        status: 'Treinamento de dataset e modelos CNN',
        proximaEntrega: 'Matriz de Confusão e Testes (02/12/2026)'
      }
    ];

    grid.innerHTML = projetos.map(p => `
      <div class="project-card">
        <div>
          <div class="project-card-header">
            <div>
              <h3 class="project-card-title">${p.titulo}</h3>
              <div style="font-size:12px; color:#0f766e; font-weight:600;">${p.curso}</div>
            </div>
            <span class="status-badge badge-status-em-andamento">${p.progresso}% Concluído</span>
          </div>
          <div class="project-card-members">
            <strong>Equipe:</strong> ${p.integrantes}
          </div>
          <div class="project-progress-wrap">
            <div class="project-progress-label">
              <span>Evolução do TCC</span>
              <span>${p.progresso}%</span>
            </div>
            <div class="project-progress-bar">
              <div class="project-progress-fill" style="width: ${p.progresso}%;"></div>
            </div>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">
            <strong>Próxima Entrega:</strong> ${p.proximaEntrega}
          </div>
        </div>
        <div class="project-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.mostrarFeedbackOrientador('${p.titulo}')" style="font-size:12px;">
            📝 Registrar Feedback
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.agendarBancaModal('${p.titulo}')" style="font-size:12px;">
            📅 Agendar Banca
          </button>
        </div>
      </div>
    `).join('');
  }

  mostrarFeedbackOrientador(titulo) {
    const parecer = prompt(`Registrar parecer de orientação para:\n"${titulo}"\n\nDigite sua avaliação / orientações para o grupo:`);
    if (parecer && parecer.trim()) {
      this.mostrarToast(`Feedback registrado com sucesso para "${titulo}"!`, 'success');
    }
  }

  agendarBancaModal(titulo) {
    const data = prompt(`Agendamento de Banca Examinadora:\n"${titulo}"\n\nInforme a data da banca (ex: 15/12/2026 às 19:30):`, '15/12/2026 19:30');
    if (data && data.trim()) {
      this.mostrarToast(`Banca agendada para ${data} (${titulo})!`, 'success');
    }
  }

  executarLogout() {
    window.auth.logout();
  }

  // --- Modal Esqueceu Senha ---
  abrirModalEsqueceuSenha() {
    const m = document.getElementById('modalEsqueceuSenha');
    const form = document.getElementById('formRecuperarSenha');
    const feedback = document.getElementById('feedbackRecuperacao');
    const inputUser = document.getElementById('inputLoginUsuario');
    const inputRec = document.getElementById('inputRecuperacao');

    if (form) form.classList.remove('hidden');
    if (feedback) feedback.classList.add('hidden');
    if (inputUser && inputRec && inputUser.value) {
      inputRec.value = inputUser.value;
    }
    if (m) {
      m.classList.add('modal-active');
      setTimeout(() => inputRec && inputRec.focus(), 100);
    }
  }

  fecharModalEsqueceuSenha() {
    const m = document.getElementById('modalEsqueceuSenha');
    if (m) m.classList.remove('modal-active');
  }

  enviarRecuperacaoSenha() {
    const inputRec = document.getElementById('inputRecuperacao');
    const btn = document.getElementById('btnEnviarRecuperacao');
    const form = document.getElementById('formRecuperarSenha');
    const feedback = document.getElementById('feedbackRecuperacao');

    if (!inputRec || !inputRec.value.trim()) {
      this.mostrarToast('Informe seu CPF ou e-mail.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>ENVIANDO...</span>';
    }

    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>ENVIAR INSTRUÇÕES</span>';
      }
      if (form) form.classList.add('hidden');
      if (feedback) feedback.classList.remove('hidden');
    }, 700);
  }

  // --- Modal Guia Instalação ---
  abrirGuiaInstalacao() {
    const m = document.getElementById('modalGuiaInstalacao');
    if (m) m.classList.add('modal-active');
  }

  fecharGuiaInstalacao() {
    const m = document.getElementById('modalGuiaInstalacao');
    if (m) m.classList.remove('modal-active');
  }

  // --- Canvas Tecnológico HUD (Partículas e Varredura de Radar) ---
  iniciarTechCanvas() {
    const canvas = document.getElementById('techCanvas');
    if (!canvas || canvas.dataset.initialized) return;
    canvas.dataset.initialized = 'true';

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 28;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 1.6 + 0.5;
        this.alpha = Math.random() * 0.35 + 0.1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let radarAngle = 0;

    const loop = () => {
      const loginView = document.getElementById('viewLoginScreen');
      if (!loginView || loginView.style.display === 'none') {
        // Pausa loop quando portal estiver visível para economizar CPU
        requestAnimationFrame(loop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Varredura sutil de radar no canto inferior direito
      if (width > 800) {
        const radarX = width - 170;
        const radarY = height - 150;
        const radarR = 110;

        radarAngle += 0.015;
        const sweepX = radarX + Math.cos(radarAngle) * radarR;
        const sweepY = radarY + Math.sin(radarAngle) * radarR;

        const grad = ctx.createLinearGradient(radarX, radarY, sweepX, sweepY);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(radarX, radarY);
        ctx.arc(radarX, radarY, radarR, radarAngle - 0.28, radarAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      requestAnimationFrame(loop);
    };

    loop();
  }

  // --- Modais e Notificações ---
  abrirModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('open');
  }

  fecharModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
  }

  mostrarAlertaModal(titulo, mensagem) {
    const m = document.getElementById('modalAlertaGlobal');
    const elTit = document.getElementById('modalAlertaTitulo');
    const elMsg = document.getElementById('modalAlertaMensagem');
    if (m && elTit && elMsg) {
      elTit.innerText = titulo;
      elMsg.innerText = mensagem;
      this.abrirModal('modalAlertaGlobal');
    }
  }

  atualizarBadgeNotificacoes() {
    const badge = document.getElementById('headerNotifBadge');
    if (!badge || !window.db) return;
    const notifs = window.db.getNotificacoes ? window.db.getNotificacoes() : [];
    const naoLidas = notifs.filter(n => !n.lida).length;
    if (naoLidas > 0) {
      badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  abrirModalNotificacoes() {
    if (!window.db) return;
    const notifs = window.db.getNotificacoes();

    let existing = document.getElementById('modalNotificacoesAcad');
    if (existing) existing.remove();

    const iconMap = {
      SOLICITACAO: {
        bg: '#eff6ff',
        color: '#0284c7',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>'
      },
      APROVACAO: {
        bg: '#f0fdf4',
        color: '#16a34a',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      },
      DEVOLUCAO: {
        bg: '#fef2f2',
        color: '#dc2626',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
      },
      INFO: {
        bg: '#f5f3ff',
        color: '#7c3aed',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
      }
    };

    const modal = document.createElement('div');
    modal.id = 'modalNotificacoesAcad';
    modal.className = 'modal-overlay open';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-box modal-box-md" style="max-width: 520px; width: 90%; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.18);">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c3161c" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-main);">Notificações Acadêmicas</h3>
            <span style="font-size: 11px; font-weight: 700; background: rgba(195, 22, 28, 0.1); color: #c3161c; padding: 2px 8px; border-radius: 12px;">${notifs.length}</span>
          </div>
          <button type="button" class="modal-close-btn" onclick="document.getElementById('modalNotificacoesAcad').remove()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 16px 20px; max-height: 420px; overflow-y: auto;">
          ${notifs.map(n => {
            const conf = iconMap[n.tipo] || iconMap.INFO;
            return `
              <div style="display: flex; gap: 14px; padding: 12px; margin-bottom: 8px; border-radius: 10px; background: ${n.lida ? 'var(--bg-card-subtle)' : '#f8fafc'}; border: 1px solid ${n.lida ? 'transparent' : '#e2e8f0'}; position: relative;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: ${conf.bg}; color: ${conf.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${conf.svg}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 13.5px; color: var(--text-main); font-weight: 700;">${n.titulo}</strong>
                    <span style="font-size: 11px; color: #94a3b8;">${n.dataHora}</span>
                  </div>
                  <p style="margin: 0 0 4px 0; font-size: 12.5px; color: #475569; line-height: 1.4;">${n.mensagem}</p>
                  <span style="font-size: 11px; color: #64748b; font-weight: 500;">De: ${n.autor}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid var(--border-color); background: var(--bg-card-subtle);">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.db.marcarNotificacoesLidas(); window.app.atualizarBadgeNotificacoes(); document.getElementById('modalNotificacoesAcad').remove(); window.app.mostrarToast('Notificações marcadas como lidas.', 'info');">
            Marcar todas como lidas
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modalNotificacoesAcad').remove()">
            Fechar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${tipo === 'success' ? 'toast-success' : 'toast-warning'}`;
    toast.innerHTML = `
      <div style="font-weight:600;">${mensagem}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px) scale(0.95)';
      toast.style.transition = 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => toast.remove(), 240);
    }, 4000);
  }

  configurarBotoesFlutuantes() {
    // Atendimento Educação Online
    const btnAtend = document.getElementById('floatingAtendimentoWidget');
    if (btnAtend) {
      btnAtend.addEventListener('click', () => {
        this.mostrarAlertaModal(
          'Atendimento Educação Online SENAI-SP',
          'Suporte Técnico Acadêmico SENAI\n\n• Central Telefônica: 0800 555 1200\n• Atendimento via WhatsApp: (11) 98765-4321\n• E-mail: suporte.ead@sp.senai.br\n\nHorário de atendimento: Segunda a Sexta, das 08h00 às 20h00.'
        );
      });
    }
  }

  // Salvar nova senha
  salvarNovaSenha() {
    const atual = document.getElementById('inputSenhaAtual').value;
    const nova = document.getElementById('inputNovaSenha').value;
    const conf = document.getElementById('inputConfirmarSenha').value;

    if (!atual || !nova || !conf) {
      this.mostrarToast('Preencha todos os campos para alterar a senha.', 'warning');
      return;
    }

    if (nova !== conf) {
      this.mostrarToast('A confirmação não coincide com a nova senha.', 'warning');
      return;
    }

    const user = window.auth.getUser();
    if (user) {
      const u = window.db.getUsuarioById(user.id);
      if (u) {
        u.senha = nova;
        window.db.persist();
      }
    }

    this.fecharModal('modalAlterarSenha');
    this.mostrarToast('Senha atualizada com sucesso!', 'success');
  }

  // =========================================================================
  // GESTÃO DE MATERIAL DIDÁTICO (PROFESSOR -> ALUNO)
  // =========================================================================
  renderizarMateriais() {
    if (!window.db) return;
    const isAluno = window.auth && window.auth.isAluno && window.auth.isAluno();
    const cardDocente = document.getElementById('cardPublicarMaterialDocente');
    if (cardDocente) {
      cardDocente.style.display = isAluno ? 'none' : 'block';
    }

    const selectTurma = document.getElementById('selectMateriaisTurmaFiltro');
    if (selectTurma) {
      const turmas = window.db.getTurmas() || [];
      let optionsHtml = '<option value="TODAS">Todas as Turmas / Unidades</option>';
      turmas.forEach(t => {
        optionsHtml += `<option value="${t.id}">${t.codigo} — ${t.nome}</option>`;
      });
      selectTurma.innerHTML = optionsHtml;

      if (!isAluno && this.turmaAtiva) {
        selectTurma.value = this.turmaAtiva.id;
      } else if (isAluno) {
        const aluno = window.db.getAlunoLogado();
        if (aluno && aluno.turmaId) {
          selectTurma.value = aluno.turmaId;
        }
      }
    }

    const selVal = selectTurma ? selectTurma.value : (this.turmaAtiva ? this.turmaAtiva.id : null);
    this.filtrarMateriaisPorTurma(selVal);
  }

  filtrarMateriaisPorTurma(turmaId) {
    if (!window.db) return;
    const isAluno = window.auth && window.auth.isAluno && window.auth.isAluno();
    const grid = document.getElementById('gridMateriaisDidaticos');
    const badge = document.getElementById('badgeContadorMateriais');
    if (!grid) return;

    let lista = [];
    if (!turmaId || turmaId === 'TODAS') {
      lista = window.db.getMateriais();
    } else {
      lista = window.db.getMateriais(turmaId);
    }

    if (badge) badge.textContent = `${lista.length} ${lista.length === 1 ? 'material' : 'materiais'}`;

    if (!lista || lista.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" style="margin-bottom: 8px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Nenhum material didático publicado para esta turma.</p>
          <span style="font-size: 12.5px;">${isAluno ? 'Novas apostilas e recursos serão disponibilizados pelos seus professores.' : 'Utilize o formulário acima para publicar documentos, apostilas ou links úteis.'}</span>
        </div>
      `;
      return;
    }

    grid.innerHTML = lista.map(mat => {
      let badgeBg = '#fee2e2';
      let badgeColor = '#991b1b';
      let icon = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>';

      if (mat.tipo === 'Link') {
        badgeBg = '#dcfce7';
        badgeColor = '#166534';
        icon = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>';
      } else if (mat.tipo === 'Apostila') {
        badgeBg = '#e0f2fe';
        badgeColor = '#0369a1';
        icon = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';
      }

      const turma = (window.db.data.turmas || []).find(t => t.id === mat.turmaId);

      return `
        <div class="sintese-table-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">${icon}</svg>
                ${mat.tipo}
              </span>
              <span style="font-size: 11.5px; color: #94a3b8;">${mat.data || ''}</span>
            </div>

            <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; line-height: 1.35;">${mat.titulo}</h4>
            <p style="font-size: 12.5px; color: #64748b; margin: 0 0 14px 0; line-height: 1.45;">${mat.descricao || 'Material didático disponibilizado para acompanhamento das aulas.'}</p>

            <div style="font-size: 11.5px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; margin-bottom: 14px; border: 1px solid #f1f5f9;">
              <div><strong>Turma:</strong> ${turma ? turma.codigo : 'Geral'}</div>
              <div><strong>Docente:</strong> ${mat.docenteNome || 'Professor'}</div>
              <div><strong>Arquivo:</strong> ${mat.arquivoNome || 'documento'} (${mat.tamanho || 'Arquivo'})</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #f1f5f9;">
            <button type="button" class="btn btn-primary btn-sm" onclick="window.app.visualizarOuBaixarMaterial(${mat.id})" style="flex: 1; display: inline-flex; justify-content: center; align-items: center; gap: 6px; font-size: 12px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              ${mat.tipo === 'Link' ? 'Acessar Link' : 'Visualizar / Baixar Material'}
            </button>
            ${!isAluno ? `
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.excluirMaterialDidatico(${mat.id})" title="Excluir Material" style="color: #ef4444; border-color: #fecaca; padding: 6px 10px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  alternarTipoMaterialInput(tipo) {
    const boxUpload = document.getElementById('boxUploadArquivoMaterial');
    const boxUrl = document.getElementById('boxUrlMaterial');
    if (tipo === 'Link') {
      if (boxUpload) boxUpload.style.display = 'none';
      if (boxUrl) boxUrl.style.display = 'block';
    } else {
      if (boxUpload) boxUpload.style.display = 'block';
      if (boxUrl) boxUrl.style.display = 'none';
    }
  }

  processarArquivoMaterial(input) {
    if (input.files && input.files[0]) {
      this._arquivoMaterialSelecionado = input.files[0];
    }
  }

  salvarMaterialDidatico() {
    if (!window.db) return;
    const user = window.auth.getUser() || {};
    const titulo = (document.getElementById('inputMaterialTitulo') || {}).value || '';
    const tipo = (document.getElementById('selectMaterialTipo') || {}).value || 'PDF';
    const descricao = (document.getElementById('inputMaterialDescricao') || {}).value || '';
    const selectTurma = document.getElementById('selectMateriaisTurmaFiltro');
    let turmaId = selectTurma ? Number(selectTurma.value) : (this.turmaAtiva ? this.turmaAtiva.id : 1);
    if (!turmaId || isNaN(turmaId)) turmaId = 1;

    let arquivoNome = 'documento.pdf';
    let tamanho = '1.5 MB';
    let url = '#';

    if (tipo === 'Link') {
      url = (document.getElementById('inputMaterialUrl') || {}).value || '#';
      arquivoNome = url;
      tamanho = 'Link Externo';
    } else if (this._arquivoMaterialSelecionado) {
      arquivoNome = this._arquivoMaterialSelecionado.name;
      tamanho = (this._arquivoMaterialSelecionado.size / 1024 / 1024).toFixed(1) + ' MB';
    } else {
      arquivoNome = tipo === 'PDF' ? 'material_aula_senai.pdf' : 'apostila_oficial_senai.pdf';
      tamanho = '2.4 MB';
    }

    if (!titulo.trim()) {
      this.mostrarToast('Informe o título do material didático.', 'warning');
      return;
    }

    window.db.addMaterial({
      turmaId,
      titulo: titulo.trim(),
      tipo,
      descricao: descricao.trim(),
      arquivoNome,
      tamanho,
      url,
      docenteNome: user.nome || 'Professor Responsável'
    });

    // Limpar formulário
    const inpTit = document.getElementById('inputMaterialTitulo');
    if (inpTit) inpTit.value = '';
    const inpDesc = document.getElementById('inputMaterialDescricao');
    if (inpDesc) inpDesc.value = '';
    const inpFile = document.getElementById('inputMaterialFile');
    if (inpFile) inpFile.value = '';
    const inpUrl = document.getElementById('inputMaterialUrl');
    if (inpUrl) inpUrl.value = '';
    this._arquivoMaterialSelecionado = null;

    this.mostrarToast('Material didático publicado com sucesso!', 'success');
    this.filtrarMateriaisPorTurma(turmaId);
  }

  excluirMaterialDidatico(id) {
    if (!confirm('Deseja realmente remover este material didático?')) return;
    window.db.excluirMaterial(id);
    this.mostrarToast('Material didático removido.', 'info');
    const selectTurma = document.getElementById('selectMateriaisTurmaFiltro');
    const turmaId = selectTurma ? selectTurma.value : null;
    this.filtrarMateriaisPorTurma(turmaId);
  }

  visualizarOuBaixarMaterial(id) {
    const lista = window.db.getMateriais();
    const item = (lista || []).find(m => m.id === Number(id));
    if (!item) return;

    if (item.tipo === 'Link' && item.url && item.url !== '#') {
      window.open(item.url, '_blank');
      return;
    }

    this.mostrarToast(`Download iniciado: "${item.arquivoNome}" (${item.tamanho})`, 'success');
  }

  // =========================================================================
  // GESTÃO DO CALENDÁRIO OFICIAL DA COORDENAÇÃO
  // =========================================================================
  renderizarCalendario(categoriaFiltro = 'TODOS') {
    if (!window.db) return;
    const isCoord = window.auth && window.auth.isCoordenacao && window.auth.isCoordenacao();
    const boxAcoes = document.getElementById('calendarioAcoesCoord');
    if (boxAcoes) {
      boxAcoes.style.display = isCoord ? 'flex' : 'none';
    }

    let eventos = window.db.getEventosCalendario() || [];
    if (categoriaFiltro && categoriaFiltro !== 'TODOS') {
      eventos = eventos.filter(e => e.categoria === categoriaFiltro);
    }

    const grid = document.getElementById('gridEventosCalendario');
    if (!grid) return;

    if (eventos.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px; color: #64748b;">
          <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Nenhum evento registrado nesta categoria do calendário oficial.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = eventos.map(ev => {
      const isFechamento = ev.categoria === 'Prazo de Fechamento de Notas' || ev.destaque;
      let badgeBg = '#f1f5f9';
      let badgeColor = '#475569';
      let cardBorder = '#e2e8f0';

      if (isFechamento) {
        badgeBg = '#fee2e2';
        badgeColor = '#991b1b';
        cardBorder = '#fca5a5';
      } else if (ev.categoria === 'Semana de Avaliações') {
        badgeBg = '#f3e8ff';
        badgeColor = '#6b21a8';
        cardBorder = '#d8b4fe';
      } else if (ev.categoria === 'Dia Letivo') {
        badgeBg = '#e0f2fe';
        badgeColor = '#0369a1';
      }

      // Formatador de data amigável
      const dtIni = ev.data ? ev.data.split('-').reverse().join('/') : '—';
      const dtFim = (ev.dataFim && ev.dataFim !== ev.data) ? ev.dataFim.split('-').reverse().join('/') : null;
      const dataLabel = dtFim ? `${dtIni} até ${dtFim}` : dtIni;

      return `
        <div class="sintese-table-card" style="padding: 16px 20px; border: 1px solid ${cardBorder}; border-radius: 10px; background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px;">
              <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px;">
                ${ev.categoria}
              </span>
              <span style="font-size: 11.5px; font-weight: 600; color: #475569; background: #f8fafc; padding: 2px 7px; border-radius: 4px; border: 1px solid #e2e8f0;">
                ${dataLabel}
              </span>
            </div>

            <h4 style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; line-height: 1.3;">${ev.titulo}</h4>
            <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0; line-height: 1.4;">${ev.descricao || 'Data oficial do calendário acadêmico SENAI-SP.'}</p>
          </div>

          ${isCoord ? `
            <div style="display: flex; gap: 8px; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #f1f5f9;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.abrirModalEditarEventoCalendario(${ev.id})" style="font-size: 11px; padding: 3px 8px;">
                Editar
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.excluirEventoCalendario(${ev.id})" style="font-size: 11px; padding: 3px 8px; color: #ef4444; border-color: #fecaca;">
                Excluir
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  filtrarCalendarioCategoria(categoria) {
    document.querySelectorAll('.sintese-tab-btn[data-cal-cat]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cal-cat') === categoria);
    });
    this.renderizarCalendario(categoria);
  }

  abrirModalNovoEventoCalendario() {
    const inpId = document.getElementById('inputEventoCalendarioId');
    if (inpId) inpId.value = '';
    const inpTit = document.getElementById('inputEventoTitulo');
    if (inpTit) inpTit.value = '';
    const selCat = document.getElementById('selectEventoCategoria');
    if (selCat) selCat.value = 'Prazo de Fechamento de Notas';
    const inpIni = document.getElementById('inputEventoDataInicio');
    if (inpIni) inpIni.value = new Date().toISOString().split('T')[0];
    const inpFim = document.getElementById('inputEventoDataFim');
    if (inpFim) inpFim.value = '';
    const inpDesc = document.getElementById('inputEventoDescricao');
    if (inpDesc) inpDesc.value = '';

    const titModal = document.getElementById('modalEventoCalendarioTitle');
    if (titModal) titModal.textContent = 'Cadastrar Data Oficial no Calendário';

    this.abrirModal('modalEventoCalendario');
  }

  abrirModalEditarEventoCalendario(id) {
    const eventos = window.db.getEventosCalendario() || [];
    const item = eventos.find(e => e.id === Number(id));
    if (!item) return;

    const inpId = document.getElementById('inputEventoCalendarioId');
    if (inpId) inpId.value = item.id;
    const inpTit = document.getElementById('inputEventoTitulo');
    if (inpTit) inpTit.value = item.titulo || '';
    const selCat = document.getElementById('selectEventoCategoria');
    if (selCat) selCat.value = item.categoria || 'Dia Letivo';
    const inpIni = document.getElementById('inputEventoDataInicio');
    if (inpIni) inpIni.value = item.data || '';
    const inpFim = document.getElementById('inputEventoDataFim');
    if (inpFim) inpFim.value = item.dataFim || '';
    const inpDesc = document.getElementById('inputEventoDescricao');
    if (inpDesc) inpDesc.value = item.descricao || '';

    const titModal = document.getElementById('modalEventoCalendarioTitle');
    if (titModal) titModal.textContent = 'Editar Data Oficial do Calendário';

    this.abrirModal('modalEventoCalendario');
  }

  salvarEventoCalendario() {
    if (!window.db) return;
    const inpId = document.getElementById('inputEventoCalendarioId');
    const id = inpId ? inpId.value : '';
    const titulo = (document.getElementById('inputEventoTitulo') || {}).value || '';
    const categoria = (document.getElementById('selectEventoCategoria') || {}).value || 'Dia Letivo';
    const data = (document.getElementById('inputEventoDataInicio') || {}).value || '';
    const dataFim = (document.getElementById('inputEventoDataFim') || {}).value || '';
    const descricao = (document.getElementById('inputEventoDescricao') || {}).value || '';

    if (!titulo.trim() || !data) {
      this.mostrarToast('Preencha o título e a data de início.', 'warning');
      return;
    }

    if (id) {
      window.db.editarEventoCalendario(id, { titulo: titulo.trim(), categoria, data, dataFim, descricao: descricao.trim() });
      this.mostrarToast('Evento atualizado no calendário oficial.', 'success');
    } else {
      window.db.addEventoCalendario({ titulo: titulo.trim(), categoria, data, dataFim, descricao: descricao.trim() });
      this.mostrarToast('Data oficial cadastrada com sucesso!', 'success');
    }

    this.fecharModal('modalEventoCalendario');
    this.renderizarCalendario();
    this.renderizarPrazosOficiaisInicio();
    this.renderizarPrazosOficiaisAluno();
  }

  excluirEventoCalendario(id) {
    if (!confirm('Deseja excluir esta data do calendário oficial?')) return;
    window.db.excluirEventoCalendario(id);
    this.mostrarToast('Evento removido do calendário.', 'info');
    this.renderizarCalendario();
    this.renderizarPrazosOficiaisInicio();
    this.renderizarPrazosOficiaisAluno();
  }

  // --- Renderização dos cards de Próximos Prazos na Home (Professor e Aluno) ---
  renderizarPrazosOficiaisInicio() {
    const el = document.getElementById('profPrazosOficiaisContainer');
    if (!el || !window.db) return;

    const eventos = window.db.getEventosCalendario() || [];
    // Prioriza prazos de fechamento e semanas de avaliação
    const proximos = eventos.slice(0, 4);

    el.innerHTML = proximos.map(ev => {
      const isFechamento = ev.categoria === 'Prazo de Fechamento de Notas';
      const dt = ev.data ? ev.data.split('-').reverse().join('/') : '';
      return `
        <div style="background: ${isFechamento ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${isFechamento ? '#fecdd3' : '#e2e8f0'}; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: ${isFechamento ? '#be123c' : '#0369a1'};">
              ${isFechamento ? '⚠️ PRAZO INSTITUCIONAL' : ev.categoria}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #475569;">📅 ${dt}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">${ev.titulo}</div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">${ev.descricao || ''}</div>
        </div>
      `;
    }).join('');
  }

  renderizarPrazosOficiaisAluno() {
    const el = document.getElementById('alunoPrazosOficiaisContainer');
    if (!el || !window.db) return;

    const eventos = window.db.getEventosCalendario() || [];
    const proximos = eventos.slice(0, 4);

    el.innerHTML = proximos.map(ev => {
      const isFechamento = ev.categoria === 'Prazo de Fechamento de Notas';
      const dt = ev.data ? ev.data.split('-').reverse().join('/') : '';
      return `
        <div style="background: ${isFechamento ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${isFechamento ? '#fecdd3' : '#e2e8f0'}; border-radius: 8px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: ${isFechamento ? '#be123c' : '#0284c7'};">
              ${ev.categoria}
            </span>
            <span style="font-size: 11px; font-weight: 600; color: #475569;">📅 ${dt}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">${ev.titulo}</div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">${ev.descricao || ''}</div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // REGRAS SENAI: CHECKLIST DE PROFESSORES RESPONSÁVEIS E FECHAMENTO
  // =========================================================================
  renderizarChecklistFechamentoSintese(turmaId) {
    if (!window.db) return;
    const targetTurmaId = turmaId || (this.turmaAtiva ? this.turmaAtiva.id : 1);
    const container = document.getElementById('sinteseChecklistDocentesContainer');
    const badgeStatus = document.getElementById('sinteseStatusDiarioBadge');
    const btnConcluir = document.getElementById('btnConcluirEtapaDocenteSintese');

    const statusDiario = window.db.getStatusDiario(targetTurmaId);
    if (badgeStatus) {
      if (statusDiario === 'APROVADO') {
        badgeStatus.textContent = 'Status: Fechamento Aprovado e Oficializado';
        badgeStatus.style.background = '#dcfce7';
        badgeStatus.style.color = '#15803d';
      } else if (statusDiario === 'AGUARDANDO') {
        badgeStatus.textContent = 'Status: Aguardando Autorização da Coordenação';
        badgeStatus.style.background = '#fef3c7';
        badgeStatus.style.color = '#b45309';
      } else if (statusDiario === 'DEVOLVIDO') {
        badgeStatus.textContent = 'Status: Devolvido para Ajustes Docentes';
        badgeStatus.style.background = '#fee2e2';
        badgeStatus.style.color = '#b91c1c';
      } else {
        badgeStatus.textContent = 'Status: Aberto para Lançamentos';
        badgeStatus.style.background = '#e0f2fe';
        badgeStatus.style.color = '#0369a1';
      }
    }

    const profs = window.db.getProfessoresResponsaveis(targetTurmaId);
    const user = window.auth.getUser() || {};
    const meuRegistro = profs.find(p => p.id === user.id);

    if (btnConcluir) {
      if (statusDiario === 'APROVADO') {
        btnConcluir.disabled = true;
        btnConcluir.textContent = 'Diário Oficializado pela Coordenação';
      } else if (meuRegistro && meuRegistro.fechado) {
        btnConcluir.disabled = true;
        btnConcluir.textContent = '✓ Minha Etapa Já Concluída';
      } else {
        btnConcluir.disabled = false;
        btnConcluir.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Concluir e Fechar Minha Etapa (Professor Responsável)`;
      }
    }

    if (container) {
      container.innerHTML = `
        <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Checklist de Conclusão dos Professores Responsáveis:</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${profs.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: ${p.fechado ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${p.fechado ? '#bbf7d0' : '#fef3c7'}; border-radius: 8px; padding: 10px 14px;">
              <div>
                <strong style="font-size: 13px; color: #0f172a; display: block;">${p.nome}</strong>
                <span style="font-size: 11px; color: #64748b;">${p.papel || 'Professor Responsável'}</span>
              </div>
              <span class="badge" style="background: ${p.fechado ? '#16a34a' : '#d97706'}; color: #ffffff; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 600;">
                ${p.fechado ? '✓ Concluído' : '⏳ Pendente'}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  concluirEtapaDocenteAtual() {
    const turmaId = this.turmaAtiva ? this.turmaAtiva.id : 1;
    const user = window.auth.getUser() || {};
    const res = window.db.fecharEtapaDocente(turmaId, user.id);

    if (!res.success) {
      this.mostrarToast(res.msg, 'warning');
      return;
    }

    this.mostrarToast(res.msg, res.todosFechados ? 'success' : 'info');
    this.renderizarChecklistFechamentoSintese(turmaId);
    this._atualizarStatusDiario(turmaId);
  }

  atualizarChecklistModalFechamento(turmaId) {
    const container = document.getElementById('modalFechamentoChecklistContainer');
    if (!container || !window.db) return;
    const profs = window.db.getProfessoresResponsaveis(turmaId);

    container.innerHTML = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 12px;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Checklist dos Professores Responsáveis:</strong>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${profs.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${p.nome} <em style="color:#64748b;">(${p.papel || 'Docente'})</em></span>
              <span class="badge ${p.fechado ? 'bg-success text-white' : 'bg-warning text-dark'}" style="font-size: 10px; padding: 2px 6px; border-radius: 4px;">
                ${p.fechado ? '✓ Concluído' : '⏳ Pendente'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Utilitário: Resetar banco de dados para seed inicial (útil após mudanças de escala de notas)
  resetarBancoDados() {
    if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os dados salvos (notas, faltas, ocorrências, etc.) e restaurará o seed inicial com escala 0-100.\n\nTem certeza?')) {
      window.db.reset();
      this.mostrarToast('Banco de dados resetado! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  }
}

console.log('[DEBUG] Criando window.app...');
window.app = new AppController();
console.log('[DEBUG] window.app criado:', !!window.app);

  // Inicialização automática segura em qualquer estado do DOM
  if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.app.init());
} else {
  window.app.init();
}
