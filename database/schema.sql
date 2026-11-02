-- =============================================================================
-- RENOVA SENAI - BANCO DE DADOS ACADÊMICO (MODELAGEM COMPLETA MYSQL)
-- Portal do Docente & Gestão Acadêmica SENAI-SP
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `renova_senai` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `renova_senai`;

-- 1. Tabela: usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `cpf` VARCHAR(14) NOT NULL UNIQUE,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `senha_hash` VARCHAR(255) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `perfil` ENUM('PROFESSOR', 'COORDENACAO', 'SECRETARIA', 'ADMINISTRADOR') NOT NULL DEFAULT 'PROFESSOR',
    `avatar_url` VARCHAR(255) NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabela: professores
CREATE TABLE IF NOT EXISTS `professores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL UNIQUE,
    `matricula_funcional` VARCHAR(30) NOT NULL UNIQUE,
    `formacao` VARCHAR(150) NULL,
    `regime_trabalho` ENUM('HORISTA', 'INTEGRAL', 'PARCIAL') DEFAULT 'INTEGRAL',
    CONSTRAINT `fk_professores_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tabela: alunos
CREATE TABLE IF NOT EXISTS `alunos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NULL UNIQUE,
    `ra` VARCHAR(20) NOT NULL UNIQUE,
    `nome` VARCHAR(150) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL UNIQUE,
    `email` VARCHAR(120) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `foto_url` VARCHAR(255) NULL,
    `data_nascimento` DATE NULL,
    `situacao_geral` ENUM('ATIVO', 'INATIVO', 'FORMADO') DEFAULT 'ATIVO',
    CONSTRAINT `fk_alunos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Tabela: instituicoes
CREATE TABLE IF NOT EXISTS `instituicoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `sigla` VARCHAR(30) NOT NULL DEFAULT 'SENAI-SP',
    `codigo_mec` VARCHAR(30) NULL
) ENGINE=InnoDB;

-- 5. Tabela: escolas
CREATE TABLE IF NOT EXISTS `escolas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `instituicao_id` INT NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `codigo_unidade` VARCHAR(20) NOT NULL UNIQUE,
    `cidade` VARCHAR(100) NOT NULL,
    `estado` CHAR(2) NOT NULL DEFAULT 'SP',
    CONSTRAINT `fk_escolas_instituicao` FOREIGN KEY (`instituicao_id`) REFERENCES `instituicoes` (`id`)
) ENGINE=InnoDB;

-- 6. Tabela: cursos
CREATE TABLE IF NOT EXISTS `cursos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `escola_id` INT NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `modalidade` ENUM('PRESENCIAL', 'EAD', 'SEMIPRESENCIAL') DEFAULT 'PRESENCIAL',
    `nivel` ENUM('TECNICO', 'QUALIFICACAO', 'APERFEICOAMENTO', 'SUPERIOR') DEFAULT 'TECNICO',
    `carga_horaria_total` INT NOT NULL,
    CONSTRAINT `fk_cursos_escola` FOREIGN KEY (`escola_id`) REFERENCES `escolas` (`id`)
) ENGINE=InnoDB;

-- 7. Tabela: turmas
CREATE TABLE IF NOT EXISTS `turmas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `curso_id` INT NOT NULL,
    `escola_id` INT NOT NULL,
    `codigo` VARCHAR(50) NOT NULL UNIQUE,
    `ano` INT NOT NULL,
    `semestre` TINYINT NOT NULL DEFAULT 1,
    `periodo` ENUM('MANHA', 'TARDE', 'NOITE', 'INTEGRAL') NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `status` ENUM('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') DEFAULT 'EM_ANDAMENTO',
    CONSTRAINT `fk_turmas_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`),
    CONSTRAINT `fk_turmas_escola` FOREIGN KEY (`escola_id`) REFERENCES `escolas` (`id`)
) ENGINE=InnoDB;

-- 8. Tabela: unidades_curriculares (Disciplinas)
CREATE TABLE IF NOT EXISTS `unidades_curriculares` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `curso_id` INT NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `codigo` VARCHAR(30) NOT NULL,
    `carga_horaria` INT NOT NULL,
    `modulo_periodo` INT NOT NULL DEFAULT 1,
    CONSTRAINT `fk_ucs_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos` (`id`)
) ENGINE=InnoDB;

-- 9. Tabela: professor_turma_uc (Vínculos docentes)
CREATE TABLE IF NOT EXISTS `professor_turma_uc` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `professor_id` INT NOT NULL,
    `turma_id` INT NOT NULL,
    `uc_id` INT NOT NULL,
    `ano_letivo` INT NOT NULL,
    `semestre` TINYINT NOT NULL,
    `eh_titular` TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT `fk_ptuc_professor` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`),
    CONSTRAINT `fk_ptuc_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
    CONSTRAINT `fk_ptuc_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`),
    UNIQUE KEY `uk_prof_turma_uc` (`professor_id`, `turma_id`, `uc_id`, `ano_letivo`, `semestre`)
) ENGINE=InnoDB;

-- 10. Tabela: matriculas (Status de Matrícula - Regra do status X)
CREATE TABLE IF NOT EXISTS `matriculas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `aluno_id` INT NOT NULL,
    `turma_id` INT NOT NULL,
    `numero_chamada` INT NOT NULL,
    `data_matricula` DATE NOT NULL,
    `status` ENUM('ATIVO', 'TRANCADO', 'CANCELADO', 'TRANSFERIDO', 'CONCLUIDO') DEFAULT 'ATIVO',
    `bloqueia_frequencia_x` TINYINT(1) GENERATED ALWAYS AS (IF(status IN ('TRANCADO', 'CANCELADO', 'TRANSFERIDO'), 1, 0)) STORED,
    CONSTRAINT `fk_matriculas_aluno` FOREIGN KEY (`aluno_id`) REFERENCES `alunos` (`id`),
    CONSTRAINT `fk_matriculas_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
    UNIQUE KEY `uk_aluno_turma` (`aluno_id`, `turma_id`)
) ENGINE=InnoDB;

-- 11. Tabela: subturmas (Divisões A e B)
CREATE TABLE IF NOT EXISTS `subturmas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `turma_id` INT NOT NULL,
    `codigo_subturma` CHAR(1) NOT NULL, -- 'A' ou 'B'
    `descricao` VARCHAR(100) NULL,
    CONSTRAINT `fk_subturmas_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
    UNIQUE KEY `uk_turma_subturma` (`turma_id`, `codigo_subturma`)
) ENGINE=InnoDB;

-- 12. Tabela: subturma_alunos
CREATE TABLE IF NOT EXISTS `subturma_alunos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subturma_id` INT NOT NULL,
    `matricula_id` INT NOT NULL,
    `data_associacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sta_subturma` FOREIGN KEY (`subturma_id`) REFERENCES `subturmas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sta_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_subturma_matricula` (`subturma_id`, `matricula_id`)
) ENGINE=InnoDB;

-- 13. Tabela: subturma_professores
CREATE TABLE IF NOT EXISTS `subturma_professores` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subturma_id` INT NOT NULL,
    `professor_id` INT NOT NULL,
    `uc_id` INT NOT NULL,
    CONSTRAINT `fk_stp_subturma` FOREIGN KEY (`subturma_id`) REFERENCES `subturmas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_stp_prof` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`),
    CONSTRAINT `fk_stp_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`)
) ENGINE=InnoDB;

-- 14. Tabela: aulas
CREATE TABLE IF NOT EXISTS `aulas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `professor_id` INT NOT NULL,
    `turma_id` INT NOT NULL,
    `uc_id` INT NOT NULL,
    `subturma_id` INT NULL, -- NULL se for a turma inteira
    `data_aula` DATE NOT NULL,
    `periodo` ENUM('MANHA', 'TARDE', 'NOITE') NOT NULL,
    `quantidade_aulas` TINYINT NOT NULL DEFAULT 4,
    `tipo_aula` ENUM('TEORICA', 'PRATICA', 'HIBRIDA') NOT NULL DEFAULT 'TEORICA',
    `status` ENUM('RASCUNHO', 'FINALIZADA', 'BLOQUEADA_PRAZO') NOT NULL DEFAULT 'FINALIZADA',
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_aulas_prof` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`),
    CONSTRAINT `fk_aulas_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
    CONSTRAINT `fk_aulas_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`),
    CONSTRAINT `fk_aulas_subturma` FOREIGN KEY (`subturma_id`) REFERENCES `subturmas` (`id`)
) ENGINE=InnoDB;

-- 15. Tabela: frequencias (Valores: C, F, A, D)
CREATE TABLE IF NOT EXISTS `frequencias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `aula_id` INT NOT NULL,
    `matricula_id` INT NOT NULL,
    `numero_aula` TINYINT NOT NULL, -- 1 a 4
    `status_frequencia` ENUM('C', 'F', 'A', 'D', 'X') NOT NULL DEFAULT 'C',
    `atraso_minutos` INT NULL DEFAULT 0,
    `observacao` VARCHAR(255) NULL,
    CONSTRAINT `fk_freq_aula` FOREIGN KEY (`aula_id`) REFERENCES `aulas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_freq_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`),
    UNIQUE KEY `uk_freq_aula_matricula_numero` (`aula_id`, `matricula_id`, `numero_aula`)
) ENGINE=InnoDB;

-- 16. Tabela: justificativas (Cadastradas pela Coordenação - Bloqueia Faltas)
CREATE TABLE IF NOT EXISTS `justificativas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `matricula_id` INT NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `motivo` ENUM('ATESTADO_MEDICO', 'TRABALHO', 'LUTO', 'JURIDICO', 'OUTRO') NOT NULL,
    `documento_anexo` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `cadastrado_por_usuario_id` INT NOT NULL,
    `aprovado` TINYINT(1) NOT NULL DEFAULT 1,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_just_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`),
    CONSTRAINT `fk_just_usuario` FOREIGN KEY (`cadastrado_por_usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- 17. Tabela: ptds (Planos de Trabalho Docente)
CREATE TABLE IF NOT EXISTS `ptds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `uc_id` INT NOT NULL,
    `codigo_plano` VARCHAR(50) NOT NULL,
    `titulo` VARCHAR(200) NOT NULL,
    `competencias` TEXT NOT NULL,
    `conhecimentos` TEXT NOT NULL,
    `habilidades` TEXT NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT `fk_ptd_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`)
) ENGINE=InnoDB;

-- 18. Tabela: conteudos_aula (Associação de Aula ao PTD)
CREATE TABLE IF NOT EXISTS `conteudos_aula` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `aula_id` INT NOT NULL,
    `ptd_id` INT NULL,
    `descricao_atividades` TEXT NOT NULL,
    `recursos_didaticos` VARCHAR(255) NULL,
    `tarefas_casa` VARCHAR(255) NULL,
    CONSTRAINT `fk_ca_aula` FOREIGN KEY (`aula_id`) REFERENCES `aulas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ca_ptd` FOREIGN KEY (`ptd_id`) REFERENCES `ptds` (`id`)
) ENGINE=InnoDB;

-- 19. Tabela: ocorrencias (Carômetro e Registro)
CREATE TABLE IF NOT EXISTS `ocorrencias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `matricula_id` INT NOT NULL,
    `autor_usuario_id` INT NOT NULL,
    `origem` ENUM('COORDENACAO', 'GERAL', 'UNIDADE_CURRICULAR') NOT NULL DEFAULT 'UNIDADE_CURRICULAR',
    `uc_id` INT NULL,
    `tipo` ENUM('PEDAGOGICA', 'DISCIPLINAR', 'MEDICA', 'ELOGIO', 'OUTRA') NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descricao` TEXT NOT NULL,
    `data_ocorrencia` DATE NOT NULL,
    `status` ENUM('PENDENTE', 'EM_ANALISE', 'RESOLVIDO') NOT NULL DEFAULT 'PENDENTE', -- [Acompanhamento de Status pelo Professor]
    `notificar_responsaveis` TINYINT(1) DEFAULT 0,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ocorrencias_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`),
    CONSTRAINT `fk_ocorrencias_autor` FOREIGN KEY (`autor_usuario_id`) REFERENCES `usuarios` (`id`),
    CONSTRAINT `fk_ocorrencias_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`)
) ENGINE=InnoDB;

-- 20. Tabela: avaliacoes
CREATE TABLE IF NOT EXISTS `avaliacoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `turma_id` INT NOT NULL,
    `uc_id` INT NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `tipo` ENUM('PROVA', 'TRABALHO', 'SEMINARIO', 'PRATICA', 'PROJETO') NOT NULL DEFAULT 'PROVA',
    `peso` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    `data_avaliacao` DATE NOT NULL,
    `valor_maximo` DECIMAL(4,2) NOT NULL DEFAULT 10.00,
    CONSTRAINT `fk_avaliacoes_turma` FOREIGN KEY (`turma_id`) REFERENCES `turmas` (`id`),
    CONSTRAINT `fk_avaliacoes_uc` FOREIGN KEY (`uc_id`) REFERENCES `unidades_curriculares` (`id`)
) ENGINE=InnoDB;

-- 21. Tabela: notas
CREATE TABLE IF NOT EXISTS `notas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `avaliacao_id` INT NOT NULL,
    `matricula_id` INT NOT NULL,
    `valor_nota` DECIMAL(4,2) NOT NULL,
    `professor_id` INT NOT NULL,
    `data_lancamento` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notas_avaliacao` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacoes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_notas_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`),
    CONSTRAINT `fk_notas_prof` FOREIGN KEY (`professor_id`) REFERENCES `professores` (`id`),
    UNIQUE KEY `uk_nota_aval_matricula` (`avaliacao_id`, `matricula_id`)
) ENGINE=InnoDB;

-- 22. Tabela: compensacoes (Controle de obrigações por atrasos e faltas)
CREATE TABLE IF NOT EXISTS `compensacoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `matricula_id` INT NOT NULL,
    `motivo_origem` VARCHAR(150) NOT NULL, -- Ex: '5 atrasos acumulados', 'Falta justificada'
    `horas_a_compensar` INT NOT NULL DEFAULT 2,
    `data_limite` DATE NOT NULL,
    `data_cumprimento` DATE NULL,
    `status` ENUM('PENDENTE', 'CUMPRIDO', 'EXPIRADO') NOT NULL DEFAULT 'PENDENTE',
    `professor_avaliador_id` INT NULL,
    `descricao_atividade` TEXT NULL,
    `notificacao_coord_enviada` TINYINT(1) DEFAULT 1,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_comp_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas` (`id`),
    CONSTRAINT `fk_comp_prof` FOREIGN KEY (`professor_avaliador_id`) REFERENCES `professores` (`id`)
) ENGINE=InnoDB;

-- 23. Tabela: auditoria (Histórico de alterações e conformidade)
CREATE TABLE IF NOT EXISTS `auditoria` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NULL,
    `tabela_afetada` VARCHAR(60) NOT NULL,
    `registro_id` INT NOT NULL,
    `acao` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    `dados_anteriores` JSON NULL,
    `dados_novos` JSON NULL,
    `data_hora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `ip_origem` VARCHAR(45) NULL,
    CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB;

-- Índices adicionais para performance em consultas acadêmicas
CREATE INDEX `idx_freq_aula_matricula` ON `frequencias` (`aula_id`, `matricula_id`);
CREATE INDEX `idx_aulas_turma_uc_data` ON `aulas` (`turma_id`, `uc_id`, `data_aula`);
CREATE INDEX `idx_justificativas_periodo` ON `justificativas` (`matricula_id`, `data_inicio`, `data_fim`);
CREATE INDEX `idx_compensacoes_status` ON `compensacoes` (`matricula_id`, `status`);
