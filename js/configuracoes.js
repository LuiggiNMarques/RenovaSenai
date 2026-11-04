/**
 * =============================================================================
 * RENOVA SENAI - CONFIGURAÇÕES E MEU PERFIL (configuracoes.js)
 * Reprodução fiel dos comportamentos das Imagens 4 e 5:
 * Temas (Sistema, Claro, Escuro) e Acessibilidade (Fonte, VLibras, Daltônico, Monocromático)
 * =============================================================================
 */

class ConfiguracoesService {
  constructor() {
    this.theme = localStorage.getItem('renova_senai_theme') || 'sistema';
    this.fontSize = localStorage.getItem('renova_senai_fontsize') || 'normal';
    this.vlibrasAtivo = localStorage.getItem('renova_senai_vlibras') === 'true';
    this.monocromaticoAtivo = localStorage.getItem('renova_senai_monocromatico') === 'true';
    this.vlibrasInstance = null; // Instância do widget VLibras

    this.init();
  }

  init() {
    this.aplicarTema(this.theme);
    this.aplicarTamanhoFonte(this.fontSize);
    this.aplicarAcessibilidade();
    this.atualizarBotaoVLibras();
    this.carregarPerfilUsuario();

    // Ouvinte para mudanças no tema do sistema operacional
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.theme === 'sistema') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }

  // --- Carregar Perfil do Usuário ---
  carregarPerfilUsuario() {
    // Busca usuário do localStorage via AuthService
    const user = window.auth?.getUser?.();

    if (!user || !user.nome) {
      console.warn('[Configurações] Usuário não encontrado');
      return;
    }

    // Popula dados com optional chaining e fallbacks
    const nome = user?.nome || 'Usuário';
    const email = user?.email || 'Não informado';
    const perfil = user?.perfil || 'PROFESSOR';
    const matricula = user?.matriculaFuncional || 'Não informado';

    // Gera iniciais do nome
    const partes = nome.trim().split(/\s+/);
    const iniciais = partes.length > 1
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : nome.substring(0, 2).toUpperCase();

    // Popula elementos do DOM
    const avatarInitials = document.getElementById('avatarInitials');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    const profileRegistration = document.getElementById('profileRegistration');

    if (avatarInitials) avatarInitials.textContent = iniciais;
    if (profileName) profileName.textContent = nome;
    if (profileEmail) profileEmail.textContent = email;
    if (profileRole) profileRole.textContent = perfil;
    if (profileRegistration) profileRegistration.textContent = matricula;

    // Atualiza visibilidade do botão flutuante VLibras
    this.atualizarBotaoVLibras();
  }
  definirTema(novoTema) {
    this.theme = novoTema;
    localStorage.setItem('renova_senai_theme', novoTema);
    this.aplicarTema(novoTema);
    this.atualizarUI();
  }

  aplicarTema(tema) {
    if (tema === 'escuro') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (tema === 'claro') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      // Sistema
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isSystemDark ? 'dark' : 'light');
    }
  }

  // --- Tamanho da Fonte ---
  definirTamanhoFonte(tamanho) {
    this.fontSize = tamanho;
    localStorage.setItem('renova_senai_fontsize', tamanho);
    this.aplicarTamanhoFonte(tamanho);
  }

  aplicarTamanhoFonte(tamanho) {
    document.documentElement.setAttribute('data-font-size', tamanho);
  }

  // --- VLibras ---
  toggleVLibras(ativo) {
    this.vlibrasAtivo = ativo;
    localStorage.setItem('renova_senai_vlibras', ativo);
    this.aplicarAcessibilidade();
    this.atualizarBotaoVLibras();

    // Se houver wrapper oficial do VLibras, sincroniza a visibilidade
    const vwWrapper = document.querySelector('.vw-plugin-top-wrapper');
    if (vwWrapper) {
      vwWrapper.style.display = this.vlibrasAtivo ? '' : 'none';
    }
  }

  atualizarBotaoVLibras() {
    const btn = document.getElementById('floatingVlibrasWidget');
    if (btn) {
      btn.style.display = 'flex';
      btn.style.backgroundColor = '#0c326f';
      if (this.vlibrasAtivo) {
        btn.classList.add('active');
        btn.title = 'VLibras - Tradução para Libras (Ativo)';
      } else {
        btn.classList.remove('active');
        btn.title = 'VLibras - Tradução para Libras';
      }
    }
  }

  // --- Modo Monocromático ---
  toggleMonocromatico(ativo) {
    this.monocromaticoAtivo = ativo;
    localStorage.setItem('renova_senai_monocromatico', ativo);
    this.aplicarAcessibilidade();
    this.atualizarUI();
  }

  aplicarAcessibilidade() {
    const wrapper = document.getElementById('mainContentWrapper');
    
    // VLibras Widget Oficial
    if (this.vlibrasAtivo) {
      this.inicializarVLibras();
    } else {
      this.removerVLibras();
    }

    // VLibras floating button: always visible (toggle controls VLibras state only)
    const vlibrasBtn = document.getElementById('floatingVlibrasWidget');
    if (vlibrasBtn) {
      vlibrasBtn.style.display = 'flex';
    }

    // Modo Monocromático - aplica filter no wrapper (não afeta elementos fixed)
    if (wrapper) {
      if (this.monocromaticoAtivo) {
        wrapper.classList.add('mode-monochrome');
      } else {
        wrapper.classList.remove('mode-monochrome');
      }
    }
  }

  inicializarVLibras() {
    // O script vlibras-plugin.js injeta o elemento <div vw> com o widget completo.
    // Verifica se o script já criou o construtor VLibras.Widget
    if (typeof window.VLibras !== 'undefined' && window.VLibras.Widget) {
      try {
        if (!this.vlibrasInstance) {
          this.vlibrasInstance = new window.VLibras.Widget('https://vlibras.gov.br/app');
          console.log('[VLibras] Widget inicializado com sucesso');
        }
        // Mostra o wrapper do plugin (tradução ativa)
        const vwWrapper = document.querySelector('.vw-plugin-top-wrapper');
        if (vwWrapper) vwWrapper.style.display = '';
      } catch (error) {
        console.error('[VLibras] Erro ao inicializar:', error);
      }
    } else {
      // Se o script ainda não carregou, tenta novamente após um tempo
      console.log('[VLibras] Aguardando carregamento do script...');
      if (!this._vlibrasRetries) this._vlibrasRetries = 0;
      this._vlibrasRetries++;
      if (this._vlibrasRetries < 20) {
        setTimeout(() => this.inicializarVLibras(), 800);
      } else {
        console.warn('[VLibras] Script não carregou após 20 tentativas.');
      }
    }
  }

  removerVLibras() {
    // Apenas oculta o widget de tradução, sem destruir a instância
    const vwWrapper = document.querySelector('.vw-plugin-top-wrapper');
    if (vwWrapper) vwWrapper.style.display = 'none';
    console.log('[VLibras] Widget ocultado');
  }

  atualizarUI() {
    // Sincroniza os cards de tema na tela de configurações
    document.querySelectorAll('.theme-card-option').forEach(card => {
      const cardTheme = card.getAttribute('data-theme-choice');
      if (cardTheme === this.theme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Sincroniza controles de acessibilidade
    const selectFonte = document.getElementById('selectTamanhoFonte');
    if (selectFonte) selectFonte.value = this.fontSize;

    const switchMonocromatico = document.getElementById('switchMonocromatico');
    if (switchMonocromatico) switchMonocromatico.checked = this.monocromaticoAtivo;

    // Atualiza botão flutuante do VLibras
    this.atualizarBotaoVLibras();
  }
}

window.configuracoes = new ConfiguracoesService();
