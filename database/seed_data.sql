-- =============================================================================
-- RENOVA SENAI - DADOS INICIAIS (SEED DATA)
-- População inicial do banco para testes e homologação
-- =============================================================================

USE `renova_senai`;

-- 1. Instituição & Escola
INSERT INTO `instituicoes` (`id`, `nome`, `sigla`, `codigo_mec`) VALUES
(1, 'Serviço Nacional de Aprendizagem Industrial', 'SENAI-SP', 'SP-001');

INSERT INTO `escolas` (`id`, `instituicao_id`, `nome`, `codigo_unidade`, `cidade`, `estado`) VALUES
(1, 1, 'Escola SENAI Roberto Simonsen (Brás)', '1.01', 'São Paulo', 'SP'),
(2, 1, 'Escola SENAI Suíço-Brasileira Paulo Ernesto Tolle', '1.15', 'São Paulo', 'SP');

-- 2. Usuários
INSERT INTO `usuarios` (`id`, `cpf`, `email`, `senha_hash`, `nome`, `perfil`, `avatar_url`, `ativo`) VALUES
(1, '123.456.789-00', 'matosnathan2015@gmail.com', '123456', 'NATHAN SANTANA MATOS', 'PROFESSOR', 'assets/images/avatar_nathan.png', 1),
(2, '987.654.321-11', 'coord.paulo@sp.senai.br', '123456', 'PAULO RICARDO MENDONÇA', 'COORDENACAO', 'assets/images/avatar_coord.png', 1),
(3, '111.222.333-44', 'prof.ana@sp.senai.br', '123456', 'ANA CLAUDIA SILVEIRA', 'PROFESSOR', 'assets/images/avatar_ana.png', 1);

-- 3. Professores
INSERT INTO `professores` (`id`, `usuario_id`, `matricula_funcional`, `formacao`, `regime_trabalho`) VALUES
(1, 1, 'SENAI-DOC-2026-089', 'Engenharia de Software / Redes', 'INTEGRAL'),
(2, 3, 'SENAI-DOC-2024-042', 'Ciência da Computação', 'HORISTA');

-- 4. Cursos
INSERT INTO `cursos` (`id`, `escola_id`, `nome`, `codigo`, `modalidade`, `nivel`, `carga_horaria_total`) VALUES
(1, 1, 'Técnico em Desenvolvimento de Sistemas', 'TDS-SP', 'PRESENCIAL', 'TECNICO', 1200),
(2, 1, 'Técnico em Redes de Computadores', 'TRC-SP', 'PRESENCIAL', 'TECNICO', 1000),
(3, 1, 'Mecatrônica Industrial', 'MEC-SP', 'PRESENCIAL', 'TECNICO', 1200);

-- 5. Turmas
INSERT INTO `turmas` (`id`, `curso_id`, `escola_id`, `codigo`, `ano`, `semestre`, `periodo`, `data_inicio`, `data_fim`, `status`) VALUES
(1, 1, 1, 'TDS-2026-1A', 2026, 1, 'TARDE', '2026-02-02', '2026-06-30', 'EM_ANDAMENTO'),
(2, 1, 1, 'TDS-2026-1N', 2026, 1, 'NOITE', '2026-02-02', '2026-06-30', 'EM_ANDAMENTO'),
(3, 2, 1, 'TRC-2025-2A', 2025, 2, 'MANHA', '2025-08-01', '2025-12-15', 'CONCLUIDA');

-- 6. Unidades Curriculares (UCs)
INSERT INTO `unidades_curriculares` (`id`, `curso_id`, `nome`, `codigo`, `carga_horaria`, `modulo_periodo`) VALUES
(1, 1, 'Desenvolvimento Web Back-End', 'UC-04-WEB-BACK', 120, 2),
(2, 1, 'Banco de Dados para Aplicações', 'UC-03-BD', 80, 2),
(3, 1, 'Desenvolvimento de Projetos e Inovação', 'UC-06-PROJ', 100, 3),
(4, 2, 'Segurança de Redes e Infraestrutura', 'UC-08-SEG', 80, 2);

-- 7. Vínculos Professor x Turma x UC
INSERT INTO `professor_turma_uc` (`id`, `professor_id`, `turma_id`, `uc_id`, `ano_letivo`, `semestre`, `eh_titular`) VALUES
(1, 1, 1, 1, 2026, 1, 1),
(2, 1, 1, 2, 2026, 1, 1),
(3, 1, 2, 1, 2026, 1, 1),
(4, 2, 1, 3, 2026, 1, 1);

-- 8. Alunos
INSERT INTO `alunos` (`id`, `usuario_id`, `ra`, `nome`, `cpf`, `email`, `foto_url`, `situacao_geral`) VALUES
(1, NULL, 'RA2026001', 'Arthur Ribeiro Santos', '450.111.222-33', 'arthur.ribeiro@aluno.senai.br', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'ATIVO'),
(2, NULL, 'RA2026002', 'Beatriz Lima Fernandes', '450.222.333-44', 'beatriz.lima@aluno.senai.br', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'ATIVO'),
(3, NULL, 'RA2026003', 'Carlos Eduardo Moreira', '450.333.444-55', 'carlos.moreira@aluno.senai.br', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'ATIVO'),
(4, NULL, 'RA2026004', 'Daniela Costa Xavier', '450.444.555-66', 'daniela.xavier@aluno.senai.br', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'ATIVO'),
(5, NULL, 'RA2026005', 'Enzo Gabriel Castro', '450.555.666-77', 'enzo.castro@aluno.senai.br', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'ATIVO'),
(6, NULL, 'RA2026006', 'Fernanda Souza Nogueira', '450.666.777-88', 'fernanda.nogueira@aluno.senai.br', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'ATIVO'),
(7, NULL, 'RA2026007', 'Gabriel Henrique Ramos', '450.777.888-99', 'gabriel.ramos@aluno.senai.br', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'ATIVO'),
(8, NULL, 'RA2026008', 'Helena Meireles Silva', '450.888.999-00', 'helena.meireles@aluno.senai.br', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'ATIVO'),
(9, NULL, 'RA2026009', 'Igor Vasconcelos Prado', '450.999.000-11', 'igor.prado@aluno.senai.br', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', 'ATIVO'),
(10, NULL, 'RA2026010', 'Julia Martins de Toledo', '450.000.111-22', 'julia.toledo@aluno.senai.br', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'ATIVO'),
(11, NULL, 'RA2026011', 'Lucas Alcantara Dias', '450.112.233-44', 'lucas.alcantara@aluno.senai.br', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'ATIVO'),
(12, NULL, 'RA2026012', 'Mariana Rocha Peixoto', '450.223.344-55', 'mariana.peixoto@aluno.senai.br', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', 'ATIVO');

-- 9. Matrículas na Turma TDS-2026-1A (10 alunos ativos, 1 trancado [Status X], 1 cancelado [Status X])
INSERT INTO `matriculas` (`id`, `aluno_id`, `turma_id`, `numero_chamada`, `data_matricula`, `status`) VALUES
(1, 1, 1, 1, '2026-01-15', 'ATIVO'),
(2, 2, 1, 2, '2026-01-15', 'ATIVO'),
(3, 3, 1, 3, '2026-01-16', 'ATIVO'),
(4, 4, 1, 4, '2026-01-16', 'ATIVO'),
(5, 5, 1, 5, '2026-01-16', 'ATIVO'),
(6, 6, 1, 6, '2026-01-17', 'ATIVO'),
(7, 7, 1, 7, '2026-01-17', 'ATIVO'),
(8, 8, 1, 8, '2026-01-18', 'ATIVO'),
(9, 9, 1, 9, '2026-01-18', 'ATIVO'),
(10, 10, 1, 10, '2026-01-19', 'ATIVO'),
(11, 11, 1, 11, '2026-01-19', 'TRANCADO'), -- Status X: Professor não pode alterar frequência!
(12, 12, 1, 12, '2026-01-20', 'CANCELADO'); -- Status X: Professor não pode alterar frequência!

-- 10. Subturmas
INSERT INTO `subturmas` (`id`, `turma_id`, `codigo_subturma`, `descricao`) VALUES
(1, 1, 'A', 'Laboratório 101 - Grupo A'),
(2, 1, 'B', 'Laboratório 102 - Grupo B');

-- Alunos na Subturma A (ímpares 1, 3, 5, 7, 9)
INSERT INTO `subturma_alunos` (`subturma_id`, `matricula_id`) VALUES
(1, 1), (1, 3), (1, 5), (1, 7), (1, 9);

-- Alunos na Subturma B (pares 2, 4, 6, 8, 10)
INSERT INTO `subturma_alunos` (`subturma_id`, `matricula_id`) VALUES
(2, 2), (2, 4), (2, 6), (2, 8), (2, 10);

-- Docentes de Subturma
INSERT INTO `subturma_professores` (`subturma_id`, `professor_id`, `uc_id`) VALUES
(1, 1, 1),
(2, 2, 1);

-- 11. PTDs (Planos de Trabalho Docente)
INSERT INTO `ptds` (`id`, `uc_id`, `codigo_plano`, `titulo`, `competencias`, `conhecimentos`, `ativo`) VALUES
(1, 1, 'PTD-WEB-01', 'Fundamentos de APIs e Arquitetura RESTful', 'Desenvolver serviços web seguros e escaláveis.', 'Padrão REST, verbos HTTP, JSON, status codes, validação de payload.', 1),
(2, 1, 'PTD-WEB-02', 'Autenticação, Tokens JWT e Segurança Web', 'Implementar autenticação stateless robusta e autorização RBAC.', 'JWT, bcrypt, hashing, refresh tokens, proteção contra CSRF e XSS.', 1),
(3, 1, 'PTD-WEB-03', 'Integração com Bancos Relacionais e ORMs', 'Mapear entidades de domínio e persistir dados com integridade referencial.', 'Transações SQL, migrations, pools de conexões, integridade e queries.', 1),
(4, 2, 'PTD-BD-01', 'Modelagem Entidade-Relacionamento e Normalização', 'Projetar modelos conceituais, lógicos e físicos.', 'DER, 1FN, 2FN, 3FN, chaves primárias, estrangeiras e constraints.', 1);

-- 12. Justificativas (Atestado Médico cadastrado pela coordenação para Carlos Eduardo Moreira - matricula 3)
INSERT INTO `justificativas` (`id`, `matricula_id`, `data_inicio`, `data_fim`, `motivo`, `documento_anexo`, `observacoes`, `cadastrado_por_usuario_id`, `aprovado`) VALUES
(1, 3, '2026-10-20', '2026-10-24', 'ATESTADO_MEDICO', 'atestado_medico_carlos.pdf', 'Cirurgia de urgência com repouso médico de 5 dias homologado pela Coordenação Médica SENAI.', 2, 1);

-- 13. Ocorrências (Registros Pedagógicos e Disciplinares)
INSERT INTO `ocorrencias` (`id`, `matricula_id`, `autor_usuario_id`, `origem`, `uc_id`, `tipo`, `titulo`, `descricao`, `data_ocorrencia`, `status`, `notificar_responsaveis`) VALUES
(1, 1, 1, 'UNIDADE_CURRICULAR', 1, 'ELOGIO', 'Excelente desempenho em projeto prático', 'Aluno Arthur demonstrou liderança técnica destacada na concepção do protótipo de software.', '2026-10-15', 'RESOLVIDO', 0),
(2, 5, 2, 'COORDENACAO', NULL, 'DISCIPLINAR', 'Acúmulo de atrasos no portão escolar', 'Aluno Enzo chegou com mais de 25 minutos de atraso em 4 dias nesta quinzena.', '2026-10-18', 'EM_ANALISE', 1),
(3, 7, 1, 'GERAL', NULL, 'PEDAGOGICA', 'Dificuldade de entrega de atividade assíncrona', 'Orientado a comparecer no plantão de dúvidas no contraturno para reforço em lógica.', '2026-10-19', 'PENDENTE', 0);

-- 14. Avaliações
INSERT INTO `avaliacoes` (`id`, `turma_id`, `uc_id`, `titulo`, `tipo`, `peso`, `data_avaliacao`, `valor_maximo`) VALUES
(1, 1, 1, 'Avaliação Formativa 1: Arquitetura & Endpoints', 'PROVA', 3.00, '2026-09-20', 10.00),
(2, 1, 1, 'Projeto Prático 1: API RESTful Completa', 'PROJETO', 4.00, '2026-10-10', 10.00),
(3, 1, 1, 'Atividades Práticas de Laboratório', 'PRATICA', 3.00, '2026-10-22', 10.00);

-- 15. Notas Lançadas (Exemplos)
INSERT INTO `notas` (`avaliacao_id`, `matricula_id`, `valor_nota`, `professor_id`) VALUES
(1, 1, 9.50, 1), (2, 1, 10.00, 1), (3, 1, 9.80, 1),
(1, 2, 8.00, 1), (2, 2, 8.50, 1), (3, 2, 8.20, 1),
(1, 4, 7.50, 1), (2, 4, 7.00, 1), (3, 4, 7.20, 1),
(1, 5, 5.00, 1), (2, 5, 4.50, 1), (3, 5, 5.50, 1);

-- 16. Compensações (Aluno 5 atingiu 5 atrasos, gerando obrigação de compensação)
INSERT INTO `compensacoes` (`id`, `matricula_id`, `motivo_origem`, `horas_a_compensar`, `data_limite`, `data_cumprimento`, `status`, `professor_avaliador_id`, `descricao_atividade`, `notificacao_coord_enviada`) VALUES
(1, 5, 'Limite de 5 atrasos atingido no diário de classe', 2, '2026-11-10', NULL, 'PENDENTE', 1, 'Elaboração de resumo técnico dos tópicos 1 e 2 do PTD em horário complementar.', 1);
