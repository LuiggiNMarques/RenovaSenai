/**
 * =============================================================================
 * RENOVA SENAI - CONTROLADOR PRINCIPAL DA APLICAÇÃO (app.js)
 * Roteamento de Telas, Gestão de Sessão, Modais, Toasts e Widgets
 * =============================================================================
 */

class AppController {
  constructor() {
    this.currentTab = 'cursos';
    this.turmaAtiva = null;
    this._roleLogin = 'professor'; // 'professor' | 'coordenador'
  }

  init() {
    // Verificar estado de autenticação
    if (window.auth.isAuthenticated()) {
      this.mostrarPortal();
    } else {
      this.mostrarLogin();
    }

    this.configurarBotoesFlutuantes();
    this.inicializarEventosLogin();


  }

  // --- Alternância entre Login e Portal ---
  mostrarLogin() {
    const loginView = document.getElementById('viewLoginScreen');
    const portalView = document.getElementById('viewPortalScreen');
    const sidebar = document.getElementById('sidebar');
    if (loginView && portalView) {
      loginView.style.display = 'flex';
      portalView.style.display = 'none';
    }
    if (sidebar) sidebar.style.display = 'none';
    this.iniciarTechCanvas();
  }

  mostrarPortal() {
    const loginView = document.getElementById('viewLoginScreen');
    const portalView = document.getElementById('viewPortalScreen');
    const sidebar = document.getElementById('sidebar');
    if (loginView && portalView) {
      loginView.style.display = 'none';
      portalView.style.display = 'flex';
    }
    if (sidebar) sidebar.style.display = 'flex';

    // Atualizar dados do usuário no header
    const user = window.auth.getUser();
    if (user) {
      const elNome = document.getElementById('headerUserName');
      const elEmail = document.getElementById('headerUserEmail');
      const elInitials = document.getElementById('headerUserInitials');

      if (elNome) elNome.innerText = user.nome;
      if (elEmail) elEmail.innerText = user.email;
      if (elInitials) {
        const parts = user.nome.split(' ');
        const initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : user.nome.substring(0, 2).toUpperCase();
        elInitials.innerText = initials;
      }

      // Banner de Boas-vindas
      const bannerGreeting = document.getElementById('bannerWelcomeName');
      if (bannerGreeting) {
        const primeiroNome = user.nome.split(' ')[0].toUpperCase();
        bannerGreeting.innerText = `Bem-vindo(a) de volta, ${primeiroNome}! `;
      }
    }

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
    this.currentTab = tabId;

    // Atualizar menu ativo na sidebar
    document.querySelectorAll('.nav-item').forEach(btn => {
      const target = btn.getAttribute('data-target-tab');
      if (target === tabId) {
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

    const activeSec = document.getElementById(`tabSection_${tabId}`);
    if (activeSec) {
      activeSec.style.display = 'block';
    }

    // Inicialização específica da aba
    if (tabId === 'turma') {
      // Seção de detalhe de turma — nenhuma inicialização adicional necessária
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
    } else if (tabId === 'relatorios') {
      window.relatoriosController.init();
    } else if (tabId === 'compensacoes') {
      window.compensacoesController.init();
    } else if (tabId === 'assistente') {
      if (window.assistenteIAController) {
        window.assistenteIAController.init();
      }
    } else if (tabId === 'configuracoes' || tabId === 'acessibilidade') {
      window.configuracoes.atualizarUI();
      window.configuracoes.carregarPerfilUsuario();
    } else if (tabId === 'coordenador') {
      if (window.coordenadorController) {
        window.coordenadorController.init();
      }
    }

    // Aplica restrições de somente leitura se o usuário for Coordenador
    this._aplicarModoObservador(tabId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Renderização dos Cards de Cursos / Turmas (Inspirado no Portal SENAI) ---
  renderizarCardsTurmas(filtro = 'EM_ANDAMENTO') {
    const grid = document.getElementById('turmasCardsGrid');
    if (!grid) return;

    this.filtroTurmasAtual = filtro;
    const turmas = window.db.getTurmas(filtro);

    // Atualiza badge contador
    const badge = document.querySelector('.section-count-badge');
    if (badge) badge.textContent = `(${turmas.length})`;

    // Atualiza tabs ativas
    document.querySelectorAll('#tabSection_cursos .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === this.getTabLabel(filtro));
    });

    if (turmas.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.5;">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>
          </svg>
          <p style="font-size:15px;">Nenhuma turma encontrada para "${this.getTabLabel(filtro)}"</p>
        </div>`;
      return;
    }

    grid.innerHTML = turmas.map(t => {
      const curso = window.db.data.cursos.find(c => c.id === t.cursoId);
      const capaUrl = curso ? curso.capa : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600';
      const isConcluida = t.status === 'CONCLUIDA';

      return `
        <div class="course-card ${isConcluida ? 'card-concluida' : ''}">
          <div class="card-cover" style="background-image: url('${capaUrl}');">
            <span class="card-badge badge-senai"><img src="img/senai-logo.png" alt="SENAI" class="card-senai-logo"></span>
            <span class="card-badge badge-tag-status">${t.periodo.toUpperCase()}</span>
            ${isConcluida ? '<span class="card-badge badge-concluida">CONCLUÍDA</span>' : ''}
          </div>
          <div class="card-body">
            <div class="card-code">${t.codigo} &bull; ${t.ano}/${t.semestre}</div>
            <h3 class="card-title">${t.nome}</h3>
            
            <div class="card-meta-list">
              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>${t.totalAlunos} Alunos Matriculados</span>
              </div>
              <div class="card-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Vigência: ${t.dataInicio} a ${t.dataFim}</span>
              </div>
            </div>

            <div class="card-actions">
              <button type="button" class="btn btn-primary btn-sm" style="flex:1;"
                onclick="window.app.abrirTurmaDetalhe(${t.id})" ${isConcluida ? 'disabled title=\"Turma concluída\"' : ''}>
                ${isConcluida ? 'Visualizar' : 'Acessar Turma &rarr;'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  getTabLabel(filtro) {
    const labels = {
      'EM_ANDAMENTO': 'Em andamento',
      'CONCLUIDA': 'Histórico / Concluídas',
      'TODOS': 'Todas'
    };
    return labels[filtro] || 'Em andamento';
  }

  abrirDiarioComTurma(turmaId) {
    this.navegarPara('diario');
    const sel = document.getElementById('selectDiarioTurma');
    if (sel) {
      sel.value = turmaId;
      window.diarioController.onTurmaChange(turmaId);
    }
  }

  abrirNotasComTurma(turmaId) {
    this.navegarPara('notas');
    const sel = document.getElementById('selectNotasTurma');
    if (sel) {
      sel.value = turmaId;
      window.notasController.onTurmaChange(turmaId);
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

    // Sidebar: ativar modo turma
    const modeDefault = document.getElementById('sidebarModeDefault');
    const modeTurma = document.getElementById('sidebarModeTurma');
    if (modeDefault) modeDefault.style.display = 'none';
    if (modeTurma) modeTurma.style.display = 'block';

    // Exibir código da turma na sidebar
    const codigoEl = document.getElementById('sidebarTurmaCodigo');
    if (codigoEl) codigoEl.textContent = turma.codigo;

    // Atualizar header da tela de detalhe
    const nomeEl = document.getElementById('turmaDethNome');
    const subEl = document.getElementById('turmaDethSub');
    const periodoEl = document.getElementById('turmaDethPeriodo');
    if (nomeEl) nomeEl.textContent = turma.nome;
    if (subEl) subEl.textContent = `${turma.totalAlunos} alunos · Vigência: ${turma.dataInicio} a ${turma.dataFim}`;
    if (periodoEl) periodoEl.textContent = turma.periodo.toUpperCase();

    // Navegar para a seção de detalhe
    this.navegarPara('turma');
  }

  abrirModuloDaTurma(modulo) {
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
    this.navegarPara('turma');
  }

  voltarParaCursos() {
    this.turmaAtiva = null;
    document.querySelectorAll('.breadcrumb-turma-btn').forEach(el => el.remove());

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

  // --- Adaptação do Portal ao Perfil (Coordenador vs Docente) ---
  _adaptarAoPerfil() {
    const user = window.auth.getUser();
    if (!user) return;

    const isCoordenador = window.auth.isCoordenacao();

    // Sidebar: exibir/ocultar seção de coordenação
    const coordSection = document.getElementById('sidebarCoordSection');
    if (coordSection) coordSection.style.display = isCoordenador ? 'block' : 'none';

    // Tag no header: label do portal
    const portalTag = document.querySelector('.portal-tag-pill');
    if (portalTag) {
      portalTag.textContent = isCoordenador
        ? 'Portal da Coordenação • SENAI-SP'
        : 'Portal do Docente • SENAI-SP';
    }

    // Header: título da tela de boas-vindas
    const bannerGreeting = document.getElementById('bannerWelcomeName');
    if (bannerGreeting) {
      const primeiroNome = user.nome.split(' ')[0].toUpperCase();
      bannerGreeting.innerText = isCoordenador
        ? 'Portal da Coordenação, ' + primeiroNome + '! '
        : 'Bem-vindo(a) de volta, ' + primeiroNome + '! ';
    }

    // Botão "Solicitar Fechamento do Diário" (só para docentes na aba coordenador)
    var btnFech = document.getElementById('btnSolicitarFechamento');
    var btnNovaTurma = document.getElementById('btnNovaTurmaCoord');
    if (btnFech) btnFech.style.display = !isCoordenador ? 'flex' : 'none';
    if (btnNovaTurma) btnNovaTurma.style.display = isCoordenador ? 'flex' : 'none';

    // Adaptar system prompt do assistente IA para coordenação
    if (isCoordenador && window.assistenteIAController) {
      window.assistenteIAController._modoCoord = true;
    }

    // Se coordenador, navegar direto para a aba de coordenação
    if (isCoordenador && this.currentTab === 'cursos') {
      this.currentTab = 'coordenador';
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
          <div class="coord-readonly-title"> MODO OBSERVADOR DA COORDENAÇÃO &bull; SOMENTE LEITURA</div>
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

    if (tipo === 'professor') {
      if (inputUser) inputUser.value = 'professor@senai.br';
      if (inputPass) inputPass.value = '123';
    } else if (tipo === 'coordenacao') {
      if (inputUser) inputUser.value = 'coordenador@senai.br';
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
    const inputUser = document.getElementById('inputLoginUsuario');
    const inputPass = document.getElementById('inputLoginSenha');
    const valorUser = inputUser ? inputUser.value.trim() : '';
    const valorPass = inputPass ? inputPass.value.trim() : '';

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
      this.mostrarPortal();
      this.mostrarToast(`Autenticação realizada! Bem-vindo(a), ${user.nome.split(' ')[0]}.`, 'success');
    } catch (e) {
      console.warn('Fallback seguro de login:', e);
      window.auth.saveSession({
        id: 1,
        nome: 'NATHAN SANTANA MATOS',
        email: valorUser || 'matosnathan2015@gmail.com',
        cpf: valorUser || '562.636.938-43',
        perfil: 'PROFESSOR',
        matriculaFuncional: 'SENAI-DOC-2026-089'
      });
      this.mostrarPortal();
      this.mostrarToast('Bem-vindo(a), NATHAN SANTANA MATOS!', 'success');
    }
  }

  executarLogout() {
    window.auth.logout();
  }

  // --- Modais de Recuperação de Senha e Instalação ---
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
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
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

  // Utilitário: Resetar banco de dados para seed inicial (útil após mudanças de escala de notas)
  resetarBancoDados() {
    if (confirm(' ATENÇÃO: Isso apagará TODOS os dados salvos (notas, faltas, ocorrências, etc.) e restaurará o seed inicial com escala 0-100.\n\nTem certeza?')) {
      window.db.reset();
      this.mostrarToast('Banco de dados resetado! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    }
  }
}

window.app = new AppController();

// Inicialização automática segura em qualquer estado do DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.app.init());
} else {
  window.app.init();
}
