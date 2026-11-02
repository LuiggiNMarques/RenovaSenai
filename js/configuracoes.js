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
    this.vlibrasAtivo = localStorage.getItem('renova_senai_vlibras') !== 'false';
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
  }

  atualizarBotaoVLibras() {
    const btn = document.getElementById('floatingVlibrasWidget');
    if (btn) {
      if (this.vlibrasAtivo) {
        btn.classList.add('active');
        btn.title = 'VLibras - Desativar Tradução para Libras';
      } else {
        btn.classList.remove('active');
        btn.title = 'VLibras - Ativar Tradução para Libras';
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

    // VLibras floating button visibility
    const vlibrasBtn = document.getElementById('floatingVlibrasWidget');
    if (vlibrasBtn) {
      vlibrasBtn.style.display = this.vlibrasAtivo ? 'flex' : 'none';
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
    // Verifica se o VLibras já foi carregado
    if (window.VLibrasWidget) {
      try {
        // Remove instância anterior se existir
        if (this.vlibrasInstance) {
          this.vlibrasInstance.destroy();
        }
        
        // Inicializa o widget VLibras oficial
        this.vlibrasInstance = new window.VLibrasWidget('https://vlibras.gov.br/app');
        console.log('[VLibras] Widget inicializado com sucesso');
      } catch (error) {
        console.error('[VLibras] Erro ao inicializar:', error);
      }
    } else {
      // Se o script ainda não carregou, tenta novamente após um tempo
      console.log('[VLibras] Aguardando carregamento do script...');
      setTimeout(() => this.inicializarVLibras(), 500);
    }
  }

  removerVLibras() {
    if (this.vlibrasInstance) {
      try {
        this.vlibrasInstance.destroy();
        this.vlibrasInstance = null;
        console.log('[VLibras] Widget removido');
      } catch (error) {
        console.error('[VLibras] Erro ao remover:', error);
      }
    }
    // Remove o elemento do widget se existir
    const widget = document.querySelector('.vlibras-widget, [data-vlibras], .vlibras');
    if (widget) widget.remove();
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
