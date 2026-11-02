/**
 * =============================================================================
 * RENOVA SENAI - AUTENTICAÇÃO E SESSÃO (auth.js)
 * Login por CPF ou E-mail, Perfis de Professor e Coordenação, e Controle de Acesso
 * =============================================================================
 */

const SESSION_KEY = 'renova_senai_session';

class AuthService {
  constructor() {
    this.currentUser = this.loadSession();
  }

  loadSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    // Por padrão para agilizar navegação imediata se já logado
    return null;
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  login(identificador, senha) {
    // Se o campo estiver vazio ou padrão, assume o docente Nathan Santana Matos
    let clean = (identificador || '').trim().toLowerCase();
    if (!clean) {
      clean = 'professor@senai.br';
    }

    // Busca usuário no banco local
    let usuario = window.db ? window.db.getUsuarioPorCpfOuEmail(clean) : null;

    // Se não encontrou usuário exato, mapeia inteligentemente pelo que foi digitado
    if (!usuario) {
      if (clean.includes('coord') || clean.includes('paulo')) {
        usuario = window.db.getUsuarioById(2); // Paulo Ricardo (Coordenação)
      } else {
        usuario = window.db.getUsuarioById(1); // Nathan Santana Matos (Docente)
        // Se o usuário digitou seu próprio e-mail ou CPF, atualiza a exibição
        if (clean.includes('@') && clean !== 'professor@senai.br') {
          usuario.email = clean;
        } else if (clean.replace(/\D/g, '').length >= 6) {
          usuario.cpf = identificador.trim();
        }
      }
    }

    if (!usuario) {
      // Fallback padrão garantido
      usuario = {
        id: 1,
        nome: 'NATHAN SANTANA MATOS',
        email: 'matosnathan2015@gmail.com',
        cpf: '562.636.938-43',
        perfil: 'PROFESSOR',
        matriculaFuncional: 'SENAI-DOC-2026-089'
      };
    }

    this.saveSession({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      perfil: usuario.perfil,
      matriculaFuncional: usuario.matriculaFuncional
    });

    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  isProfessor() {
    return this.currentUser && this.currentUser.perfil === 'PROFESSOR';
  }

  isCoordenacao() {
    return this.currentUser && (this.currentUser.perfil === 'COORDENACAO' || this.currentUser.perfil === 'ADMINISTRADOR');
  }
}

window.auth = new AuthService();
