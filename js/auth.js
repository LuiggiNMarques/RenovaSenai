/**
 * =============================================================================
 * RENOVA SENAI - AUTENTICAÇÃO E SESSÃO (auth.js)
 * Login por CPF ou E-mail, Perfis de Coordenação, Professor, Aluno e Orientador
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
    return null;
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  login(identificador, senha) {
    let clean = (identificador || '').trim().toLowerCase();
    if (!clean) {
      clean = 'mariana@senai.br';
    }

    // Busca usuário no banco local
    let usuario = window.db ? window.db.getUsuarioPorCpfOuEmail(clean) : null;

    // Se não encontrou usuário exato, mapeia inteligentemente pelo que foi digitado
    if (!usuario) {
      if (clean.includes('coord') || clean.includes('paulo')) {
        usuario = window.db ? window.db.getUsuarioById(2) : null; // Paulo Ricardo (Coordenação)
      } else if (clean.includes('mariana')) {
        usuario = window.db ? window.db.getUsuarioById(8) : null; // Mariana Silva Rocha
        if (!usuario) {
          usuario = {
            id: 8,
            nome: 'MARIANA SILVA ROCHA',
            email: 'mariana.silva@sp.senai.br',
            cpf: '333.444.555-66',
            perfil: 'PROFESSOR',
            matriculaFuncional: 'SENAI-DOC-2025-102'
          };
        }
      } else if (clean.includes('aluno') || clean.includes('gabriel') || clean.includes('yasmin') || clean.includes('111.222.333-44')) {
        usuario = {
          id: 52,
          nome: 'Yasmin Ribeiro Costa',
          email: 'yasmin.costa@aluno.senai.br',
          cpf: '111.222.333-44',
          perfil: 'ALUNO',
          matriculaFuncional: 'SENAI-ALU-2026-052'
        };
      } else if (clean.includes('orientador')) {
        usuario = {
          id: 102,
          nome: 'DR. MARCELO NOGUEIRA',
          email: 'marcelo.orientador@sp.senai.br',
          cpf: '555.666.777-88',
          perfil: 'ORIENTADOR',
          matriculaFuncional: 'SENAI-ORI-2024-015'
        };
      } else {
        usuario = window.db ? window.db.getUsuarioById(1) : null; // Nathan Santana Matos (Docente)
        if (usuario) {
          if (clean.includes('@') && clean !== 'professor@senai.br') {
            usuario.email = clean;
          } else if (clean.replace(/\D/g, '').length >= 6) {
            usuario.cpf = identificador.trim();
          }
        }
      }
    }

    if (!usuario) {
      // Fallback padrão Mariana Silva Rocha garantido
      usuario = {
        id: 8,
        nome: 'MARIANA SILVA ROCHA',
        email: 'mariana.silva@sp.senai.br',
        cpf: '333.444.555-66',
        perfil: 'PROFESSOR',
        matriculaFuncional: 'SENAI-DOC-2025-102'
      };
    }

    const perfilInicial = usuario.perfilAtivo || usuario.perfil || 'PROFESSOR';

    this.saveSession({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      perfil: usuario.perfil,
      perfilAtivo: perfilInicial,
      matriculaFuncional: usuario.matriculaFuncional
    });

    return this.currentUser;
  }

  setPerfilAtivo(perfil) {
    if (this.currentUser) {
      this.currentUser.perfilAtivo = perfil.toUpperCase();
      this.saveSession(this.currentUser);
    }
  }

  getPerfilAtivo() {
    return (this.currentUser && this.currentUser.perfilAtivo) || (this.currentUser && this.currentUser.perfil) || 'PROFESSOR';
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
    return this.getPerfilAtivo() === 'PROFESSOR';
  }

  isCoordenacao() {
    const p = this.getPerfilAtivo();
    return p === 'COORDENACAO' || p === 'ADMINISTRADOR';
  }

  isAluno() {
    return this.getPerfilAtivo() === 'ALUNO';
  }

  isOrientador() {
    return this.getPerfilAtivo() === 'ORIENTADOR';
  }
}

window.auth = new AuthService();
