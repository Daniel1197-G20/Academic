-- =============================================================================
-- Migration: 20261007000000_seed_new_subject_questions.sql
-- Purpose  : Add topics and assessment questions for the five new subjects
--            introduced in Phase 5.5 that shipped without question-bank content.
--            Subjects: subj_se, subj_cyber, subj_english, subj_masscomm, subj_nursing
-- Safety   : ON CONFLICT DO NOTHING on topics (idempotent).
--            ON CONFLICT (id) DO UPDATE on questions so re-running is safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Topics for new subjects
-- ---------------------------------------------------------------------------
INSERT INTO public.topics (id, subject_id, name, code, description, display_order)
VALUES
  -- Software Engineering
  ('top_se_sdlc',     'subj_se', 'Software Development Life Cycle', 'SE101',
   'Waterfall, Agile, Scrum, Kanban, and DevOps principles', 1),
  ('top_se_design',   'subj_se', 'Software Design & Architecture', 'SE201',
   'Design patterns, SOLID principles, UML, and system architecture', 2),
  ('top_se_testing',  'subj_se', 'Software Testing & Quality',     'SE202',
   'Unit testing, integration testing, TDD, BDD, and CI/CD', 3),

  -- Cybersecurity
  ('top_cyber_net',   'subj_cyber', 'Network Security',           'CYB101',
   'Firewalls, VPNs, intrusion detection, and network protocols', 1),
  ('top_cyber_crypto','subj_cyber', 'Cryptography',               'CYB201',
   'Symmetric/asymmetric encryption, hashing, PKI, and TLS', 2),
  ('top_cyber_threat','subj_cyber', 'Threats & Vulnerability Management', 'CYB202',
   'OWASP Top 10, CVE, penetration testing, and incident response', 3),

  -- English
  ('top_eng_gram',    'subj_english', 'Grammar & Composition',     'ENG101',
   'Parts of speech, sentence structure, punctuation, and essay writing', 1),
  ('top_eng_lit',     'subj_english', 'Literature & Literary Devices', 'ENG201',
   'Prose, poetry, drama, figures of speech, and critical analysis', 2),
  ('top_eng_comm',    'subj_english', 'Communication Skills',      'ENG202',
   'Academic writing, oral presentation, rhetoric, and argumentation', 3),

  -- Mass Communication
  ('top_mc_theory',   'subj_masscomm', 'Communication Theory',    'MC101',
   'Agenda-setting, framing, uses and gratifications, and media effects', 1),
  ('top_mc_journal',  'subj_masscomm', 'Journalism & Reporting',  'MC201',
   'News writing, investigative journalism, ethics, and media law', 2),
  ('top_mc_pr',       'subj_masscomm', 'Public Relations & Advertising', 'MC202',
   'PR campaigns, brand management, advertising strategy, and media buying', 3),

  -- Nursing
  ('top_nurs_anat',   'subj_nursing', 'Anatomy & Physiology',     'NURS101',
   'Body systems, homeostasis, cellular biology, and organ function', 1),
  ('top_nurs_pharm',  'subj_nursing', 'Pharmacology',             'NURS201',
   'Drug classifications, mechanisms, dosage calculation, and nursing implications', 2),
  ('top_nurs_care',   'subj_nursing', 'Clinical Nursing Practice', 'NURS202',
   'Nursing process, patient assessment, infection control, and evidence-based care', 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Assessment questions for new subjects (10 per subject = 50 total)
-- ---------------------------------------------------------------------------
INSERT INTO public.question_bank
  (id, subject_id, topic_id, question, question_type, difficulty, options, correct_answer, explanation, status)
VALUES

  -- ═══════════════════════════════
  --  SOFTWARE ENGINEERING (10 Qs)
  -- ═══════════════════════════════
  (
    'a0000000-0000-0000-0000-000000000001', 'subj_se', 'top_se_sdlc',
    'Which Agile ceremony is specifically designed to allow the team to reflect on its working process and improve it for the next sprint?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Sprint Planning"},{"id":"B","text":"Daily Stand-up"},{"id":"C","text":"Sprint Retrospective"},{"id":"D","text":"Backlog Refinement"}]'::jsonb,
    'C',
    'The Sprint Retrospective focuses on team process improvements: what went well, what to change, and action items for the next sprint.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000002', 'subj_se', 'top_se_sdlc',
    'In Scrum, who is responsible for maximising the value of the product and managing the Product Backlog?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Scrum Master"},{"id":"B","text":"Development Team"},{"id":"C","text":"Project Manager"},{"id":"D","text":"Product Owner"}]'::jsonb,
    'D',
    'The Product Owner owns and prioritises the Product Backlog and is accountable for maximising the value the Scrum Team delivers.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000003', 'subj_se', 'top_se_design',
    'Which SOLID principle states that a class should have only one reason to change?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Open/Closed Principle"},{"id":"B","text":"Single Responsibility Principle"},{"id":"C","text":"Liskov Substitution Principle"},{"id":"D","text":"Dependency Inversion Principle"}]'::jsonb,
    'B',
    'The Single Responsibility Principle (SRP) mandates that each class should have exactly one responsibility, reducing the likelihood of breaking changes.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000004', 'subj_se', 'top_se_design',
    'Which design pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Observer"},{"id":"B","text":"Decorator"},{"id":"C","text":"Strategy"},{"id":"D","text":"Template Method"}]'::jsonb,
    'C',
    'The Strategy pattern encapsulates a set of behaviours (algorithms) in separate classes and lets the client switch between them at runtime.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000005', 'subj_se', 'top_se_design',
    'What does UML stand for in the context of software engineering?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Universal Modelling Language"},{"id":"B","text":"Unified Modelling Language"},{"id":"C","text":"User Management Language"},{"id":"D","text":"Unified Method Language"}]'::jsonb,
    'B',
    'UML (Unified Modelling Language) is a standardised visual language used to model and document software architecture and design.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000006', 'subj_se', 'top_se_testing',
    'In Test-Driven Development (TDD), what is the correct order of the development cycle?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Code → Test → Refactor"},{"id":"B","text":"Test → Code → Refactor"},{"id":"C","text":"Refactor → Test → Code"},{"id":"D","text":"Code → Refactor → Test"}]'::jsonb,
    'B',
    'TDD follows the Red-Green-Refactor cycle: write a failing test (Red), write the minimum code to pass it (Green), then refactor for quality.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000007', 'subj_se', 'top_se_testing',
    'Which type of testing verifies that different software modules work correctly when combined?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Unit Testing"},{"id":"B","text":"Acceptance Testing"},{"id":"C","text":"Integration Testing"},{"id":"D","text":"Regression Testing"}]'::jsonb,
    'C',
    'Integration testing checks that separately developed modules interact correctly when connected together, revealing interface defects.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000008', 'subj_se', 'top_se_sdlc',
    'Which software development model delivers software in successive, refined iterations, with each cycle including planning, design, implementation, and testing?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Waterfall Model"},{"id":"B","text":"Spiral Model"},{"id":"C","text":"Iterative & Incremental Model"},{"id":"D","text":"V-Model"}]'::jsonb,
    'C',
    'The Iterative and Incremental model builds software in repeated cycles (iterations), with each cycle adding functionality, enabling early feedback.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000009', 'subj_se', 'top_se_design',
    'Which architectural style exposes application functionality through a set of stateless, resource-oriented endpoints over HTTP?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"SOAP"},{"id":"B","text":"REST"},{"id":"C","text":"CORBA"},{"id":"D","text":"RPC"}]'::jsonb,
    'B',
    'REST (Representational State Transfer) uses stateless HTTP operations on resources identified by URIs, making it the dominant web API style.',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000010', 'subj_se', 'top_se_testing',
    'In Continuous Integration (CI), what is the primary purpose of an automated build pipeline?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Replacing manual code reviews"},{"id":"B","text":"Detecting integration errors early by automatically building and testing every commit"},{"id":"C","text":"Deploying code directly to production without human approval"},{"id":"D","text":"Managing feature branches for all developers"}]'::jsonb,
    'B',
    'CI pipelines automatically build and run tests on every commit, surfacing integration failures quickly so they can be fixed before they accumulate.',
    'active'
  ),

  -- ═══════════════════════════════
  --  CYBERSECURITY (10 Qs)
  -- ═══════════════════════════════
  (
    'b0000000-0000-0000-0000-000000000001', 'subj_cyber', 'top_cyber_crypto',
    'Which encryption algorithm is an example of a symmetric-key cipher widely used for securing sensitive data?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"RSA"},{"id":"B","text":"AES"},{"id":"C","text":"ECC"},{"id":"D","text":"Diffie-Hellman"}]'::jsonb,
    'B',
    'AES (Advanced Encryption Standard) is a symmetric-key block cipher adopted by NIST, used globally to protect classified and commercial data.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000002', 'subj_cyber', 'top_cyber_crypto',
    'In public-key cryptography, which key is used to encrypt a message intended for a specific recipient?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"The sender''s private key"},{"id":"B","text":"The recipient''s private key"},{"id":"C","text":"The recipient''s public key"},{"id":"D","text":"A shared session key"}]'::jsonb,
    'C',
    'The recipient''s public key encrypts the message; only the corresponding private key (held solely by the recipient) can decrypt it.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000003', 'subj_cyber', 'top_cyber_net',
    'What is the primary function of a firewall in a network security architecture?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Encrypting all network traffic end-to-end"},{"id":"B","text":"Filtering incoming and outgoing network traffic based on security rules"},{"id":"C","text":"Detecting malware on endpoint devices"},{"id":"D","text":"Assigning IP addresses to devices"}]'::jsonb,
    'B',
    'Firewalls inspect and control network traffic based on predefined rules, blocking unauthorised access while allowing legitimate communications.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000004', 'subj_cyber', 'top_cyber_net',
    'Which protocol provides secure, encrypted remote access to a server over an unsecured network?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Telnet"},{"id":"B","text":"FTP"},{"id":"C","text":"SSH"},{"id":"D","text":"SNMP"}]'::jsonb,
    'C',
    'SSH (Secure Shell) encrypts the command channel and data transfer, replacing the plaintext Telnet protocol for secure remote administration.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000005', 'subj_cyber', 'top_cyber_threat',
    'Which OWASP Top 10 vulnerability occurs when untrusted data is sent to an interpreter as part of a command or query?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Broken Authentication"},{"id":"B","text":"Injection"},{"id":"C","text":"Security Misconfiguration"},{"id":"D","text":"Insecure Deserialisation"}]'::jsonb,
    'B',
    'Injection flaws (SQL, NoSQL, OS, LDAP) occur when user-supplied data is passed to an interpreter without proper validation or parameterisation.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000006', 'subj_cyber', 'top_cyber_threat',
    'A penetration tester who only knows the target system''s IP range with no other information is conducting which type of test?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"White-box testing"},{"id":"B","text":"Grey-box testing"},{"id":"C","text":"Black-box testing"},{"id":"D","text":"Crystal-box testing"}]'::jsonb,
    'C',
    'Black-box penetration testing simulates an external attacker with no prior knowledge of the target''s internal structure or source code.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000007', 'subj_cyber', 'top_cyber_crypto',
    'What property of a cryptographic hash function ensures that it is computationally infeasible to find two different inputs that produce the same output?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Pre-image resistance"},{"id":"B","text":"Collision resistance"},{"id":"C","text":"Diffusion"},{"id":"D","text":"Confusion"}]'::jsonb,
    'B',
    'Collision resistance means it is computationally infeasible to find two distinct inputs x ≠ y such that H(x) = H(y).',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000008', 'subj_cyber', 'top_cyber_net',
    'Which type of attack floods a target server with traffic from a large number of compromised machines to exhaust its resources?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Man-in-the-Middle Attack"},{"id":"B","text":"SQL Injection"},{"id":"C","text":"Distributed Denial of Service (DDoS)"},{"id":"D","text":"Phishing"}]'::jsonb,
    'C',
    'A DDoS attack uses many compromised hosts (a botnet) to overwhelm a target with traffic, denying service to legitimate users.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000009', 'subj_cyber', 'top_cyber_threat',
    'The CIA triad in information security stands for:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Confidentiality, Integrity, Availability"},{"id":"B","text":"Compliance, Integrity, Authenticity"},{"id":"C","text":"Confidentiality, Identification, Authorisation"},{"id":"D","text":"Control, Integrity, Access"}]'::jsonb,
    'A',
    'The CIA triad — Confidentiality, Integrity, Availability — is the foundational model for designing and evaluating information-security systems.',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000010', 'subj_cyber', 'top_cyber_net',
    'What does TLS (Transport Layer Security) primarily provide in HTTPS communications?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"IP address masking for clients"},{"id":"B","text":"Encrypted and authenticated communication between browser and server"},{"id":"C","text":"Load balancing across web servers"},{"id":"D","text":"Compression of HTTP response bodies"}]'::jsonb,
    'B',
    'TLS provides encryption (confidentiality), server authentication via certificates, and data integrity checks for HTTPS connections.',
    'active'
  ),

  -- ═══════════════════════════════
  --  ENGLISH (10 Qs)
  -- ═══════════════════════════════
  (
    'c0000000-0000-0000-0000-000000000001', 'subj_english', 'top_eng_gram',
    'Identify the sentence that correctly uses a semicolon.',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"She studied hard; and passed the exam."},{"id":"B","text":"She studied hard; she passed the exam."},{"id":"C","text":"She studied; hard, and passed."},{"id":"D","text":"She; studied hard and passed the exam."}]'::jsonb,
    'B',
    'A semicolon joins two independent clauses without a coordinating conjunction. "She studied hard; she passed the exam." correctly links two complete sentences.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000002', 'subj_english', 'top_eng_gram',
    'Which of the following is an example of a dangling modifier?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Running quickly, she caught the bus."},{"id":"B","text":"Walking to the store, the rain began to fall."},{"id":"C","text":"Exhausted from the hike, he sat down to rest."},{"id":"D","text":"Studying all night, Maria aced her exam."}]'::jsonb,
    'B',
    '"Walking to the store, the rain began to fall" is a dangling modifier — the rain cannot walk; the introductory phrase has no clear subject to modify.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000003', 'subj_english', 'top_eng_lit',
    'Which literary device gives human qualities or characteristics to non-human objects or abstract ideas?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Simile"},{"id":"B","text":"Alliteration"},{"id":"C","text":"Personification"},{"id":"D","text":"Hyperbole"}]'::jsonb,
    'C',
    'Personification attributes human qualities to non-human entities, as in "the wind whispered through the trees."',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000004', 'subj_english', 'top_eng_lit',
    'A 14-line poem written in iambic pentameter with a specific rhyme scheme is called:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Haiku"},{"id":"B","text":"Ballad"},{"id":"C","text":"Ode"},{"id":"D","text":"Sonnet"}]'::jsonb,
    'D',
    'A sonnet is a 14-line poem in iambic pentameter. The two main forms are the Petrarchan (Italian) and the Shakespearean (English) sonnet.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000005', 'subj_english', 'top_eng_gram',
    'Which sentence demonstrates correct subject–verb agreement?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"The team are playing well."},{"id":"B","text":"Neither the manager nor the players was prepared."},{"id":"C","text":"Each of the students have submitted their work."},{"id":"D","text":"The committee has reached its decision."}]'::jsonb,
    'D',
    '"The committee has reached its decision" treats the collective noun as a single unit with a singular verb, which is standard in formal written English.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000006', 'subj_english', 'top_eng_comm',
    'In academic writing, which type of evidence is generally considered most credible?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Personal anecdotes"},{"id":"B","text":"Peer-reviewed empirical research"},{"id":"C","text":"Social media posts"},{"id":"D","text":"Opinions of well-known celebrities"}]'::jsonb,
    'B',
    'Peer-reviewed research has undergone expert scrutiny before publication, making it the gold standard of academic evidence.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000007', 'subj_english', 'top_eng_lit',
    'What rhetorical device is used when a speaker directly addresses an absent or imaginary person or an abstract idea?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Apostrophe"},{"id":"B","text":"Anaphora"},{"id":"C","text":"Chiasmus"},{"id":"D","text":"Metonymy"}]'::jsonb,
    'A',
    'Apostrophe (as a rhetorical device) is the direct address to an absent person, deity, or personified idea, e.g., "O Death, where is thy sting?"',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000008', 'subj_english', 'top_eng_comm',
    'Which paragraph structure places the topic sentence at the beginning, followed by supporting details and a concluding sentence?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Climactic order"},{"id":"B","text":"Deductive paragraph structure"},{"id":"C","text":"Inductive paragraph structure"},{"id":"D","text":"Problem-solution structure"}]'::jsonb,
    'B',
    'A deductive (or direct) paragraph opens with the main claim (topic sentence) and then supports it with evidence — the most common academic paragraph form.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000009', 'subj_english', 'top_eng_gram',
    'Which verb tense is used to describe an action that started in the past and continues into the present?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Simple Past"},{"id":"B","text":"Past Perfect"},{"id":"C","text":"Present Perfect"},{"id":"D","text":"Future Perfect"}]'::jsonb,
    'C',
    'The Present Perfect (e.g., "She has lived here for ten years") indicates an action that began in the past and has ongoing relevance to the present.',
    'active'
  ),
  (
    'c0000000-0000-0000-0000-000000000010', 'subj_english', 'top_eng_comm',
    'What is the primary purpose of a thesis statement in an academic essay?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"To summarise all available literature on the topic"},{"id":"B","text":"To state the writer''s central argument or claim that the essay will support"},{"id":"C","text":"To provide background context for unfamiliar readers"},{"id":"D","text":"To list the sources that will be cited in the body"}]'::jsonb,
    'B',
    'A thesis statement concisely expresses the essay''s main argument or position, guiding both the writer''s organisation and the reader''s expectations.',
    'active'
  ),

  -- ═══════════════════════════════
  --  MASS COMMUNICATION (10 Qs)
  -- ═══════════════════════════════
  (
    'd0000000-0000-0000-0000-000000000001', 'subj_masscomm', 'top_mc_theory',
    'The Agenda-Setting Theory, proposed by McCombs and Shaw, argues that mass media primarily influences:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"What the public thinks about an issue"},{"id":"B","text":"Which issues the public thinks about"},{"id":"C","text":"How government policy is formulated"},{"id":"D","text":"The revenue models of news organisations"}]'::jsonb,
    'B',
    'Agenda-setting proposes that media does not tell people what to think but determines which topics are salient — what people think about.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000002', 'subj_masscomm', 'top_mc_theory',
    'The "Uses and Gratifications" theory views audiences as:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Passive receivers of media messages"},{"id":"B","text":"Active users who choose media to satisfy personal needs"},{"id":"C","text":"Victims of media manipulation and propaganda"},{"id":"D","text":"Producers of media content rather than consumers"}]'::jsonb,
    'B',
    'Uses and Gratifications (Katz, Blumler, Gurevitch) reframes audiences as active agents who select media to fulfil needs like information, entertainment, or socialisation.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000003', 'subj_masscomm', 'top_mc_journal',
    'The inverted pyramid structure in news writing places information in which order?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Chronological: beginning to end of events"},{"id":"B","text":"Most important facts first, decreasing in importance"},{"id":"C","text":"Background context first, then the news peg"},{"id":"D","text":"Opinion and analysis first, then supporting facts"}]'::jsonb,
    'B',
    'The inverted pyramid leads with the most newsworthy information (the 5 W''s) and tapers to less critical details, allowing editors to cut from the bottom.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000004', 'subj_masscomm', 'top_mc_journal',
    'Which ethical principle requires journalists to clearly separate their personal opinions from factual reporting?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Objectivity"},{"id":"B","text":"Sensationalism"},{"id":"C","text":"Convergence"},{"id":"D","text":"Checkbook journalism"}]'::jsonb,
    'A',
    'Objectivity requires journalists to report facts impartially, distinguishing news from opinion, and attributing claims to identifiable sources.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000005', 'subj_masscomm', 'top_mc_pr',
    'In public relations, what is a "press release"?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"A court order preventing media publication"},{"id":"B","text":"A written statement distributed to news media to announce a newsworthy event"},{"id":"C","text":"An advertisement placed in a newspaper"},{"id":"D","text":"A legal document releasing an organisation from liability"}]'::jsonb,
    'B',
    'A press release (or news release) is an official written communication sent to journalists and media outlets to announce newsworthy information.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000006', 'subj_masscomm', 'top_mc_pr',
    'Which concept describes the practice of tailoring a communication message differently for distinct target audiences?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Narrowcasting"},{"id":"B","text":"Broadcasting"},{"id":"C","text":"Gatekeeping"},{"id":"D","text":"Encoding"}]'::jsonb,
    'A',
    'Narrowcasting targets specific, segmented audiences with tailored messages, contrasting with broadcasting which sends one message to a mass audience.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000007', 'subj_masscomm', 'top_mc_theory',
    'Harold Lasswell''s communication model is best summarised as:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Source → Message → Channel → Receiver → Effect"},{"id":"B","text":"Who says what in which channel to whom with what effect"},{"id":"C","text":"Encoding → Noise → Decoding → Feedback"},{"id":"D","text":"Sender → Medium → Audience → Response"}]'::jsonb,
    'B',
    'Lasswell''s (1948) model: "Who says What in Which channel to Whom with What effect" — a linear model identifying five components of communication.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000008', 'subj_masscomm', 'top_mc_journal',
    'The term "fourth estate" traditionally refers to:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"The judiciary system"},{"id":"B","text":"The press and news media"},{"id":"C","text":"The legislative branch of government"},{"id":"D","text":"Civil society organisations"}]'::jsonb,
    'B',
    'The "fourth estate" refers to the press and news media, recognised as an informal but powerful societal force alongside the three branches of government.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000009', 'subj_masscomm', 'top_mc_pr',
    'Which element is NOT typically part of the PESO model used in modern PR and communication strategy?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Paid media"},{"id":"B","text":"Earned media"},{"id":"C","text":"Segmented media"},{"id":"D","text":"Owned media"}]'::jsonb,
    'C',
    'PESO stands for Paid, Earned, Shared, and Owned media. "Segmented media" is not a component of this model.',
    'active'
  ),
  (
    'd0000000-0000-0000-0000-000000000010', 'subj_masscomm', 'top_mc_theory',
    'The "spiral of silence" theory, proposed by Elisabeth Noelle-Neumann, suggests that individuals are less likely to express their opinions when they perceive:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"They are in the majority"},{"id":"B","text":"Their views are in the minority and risk social isolation"},{"id":"C","text":"The media reports their view favourably"},{"id":"D","text":"Government regulation is absent"}]'::jsonb,
    'B',
    'The spiral of silence posits that fear of social isolation leads people with minority views to remain silent, reinforcing the perceived dominance of majority opinion.',
    'active'
  ),

  -- ═══════════════════════════════
  --  NURSING (10 Qs)
  -- ═══════════════════════════════
  (
    'e0000000-0000-0000-0000-000000000001', 'subj_nursing', 'top_nurs_anat',
    'Which chamber of the heart pumps oxygenated blood into the aorta for systemic circulation?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Right Atrium"},{"id":"B","text":"Right Ventricle"},{"id":"C","text":"Left Atrium"},{"id":"D","text":"Left Ventricle"}]'::jsonb,
    'D',
    'The left ventricle contracts to eject oxygenated blood into the aorta, driving it through the systemic circulation to supply the body.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000002', 'subj_nursing', 'top_nurs_anat',
    'What is the normal adult resting heart rate range?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"40–60 beats per minute"},{"id":"B","text":"60–100 beats per minute"},{"id":"C","text":"100–120 beats per minute"},{"id":"D","text":"120–160 beats per minute"}]'::jsonb,
    'B',
    'A normal adult resting heart rate is 60–100 beats per minute. Values below 60 (bradycardia) or above 100 (tachycardia) may require evaluation.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000003', 'subj_nursing', 'top_nurs_pharm',
    'A patient is prescribed 250 mg of amoxicillin oral suspension. The available concentration is 125 mg/5 mL. How many mL should the nurse administer?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"5 mL"},{"id":"B","text":"7.5 mL"},{"id":"C","text":"10 mL"},{"id":"D","text":"12.5 mL"}]'::jsonb,
    'C',
    'Using the formula: Volume = (Desired dose / Available dose) × Volume on hand = (250 / 125) × 5 = 10 mL.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000004', 'subj_nursing', 'top_nurs_pharm',
    'Which medication class is primarily used to reduce pain and inflammation by inhibiting prostaglandin synthesis?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Beta-blockers"},{"id":"B","text":"NSAIDs"},{"id":"C","text":"ACE inhibitors"},{"id":"D","text":"Benzodiazepines"}]'::jsonb,
    'B',
    'NSAIDs (Non-Steroidal Anti-Inflammatory Drugs) inhibit COX enzymes, reducing prostaglandin synthesis and thereby decreasing pain, fever, and inflammation.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000005', 'subj_nursing', 'top_nurs_care',
    'What are the five steps of the nursing process in correct sequential order?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Assessment, Diagnosis, Planning, Implementation, Evaluation"},{"id":"B","text":"Planning, Assessment, Diagnosis, Implementation, Evaluation"},{"id":"C","text":"Diagnosis, Planning, Assessment, Implementation, Evaluation"},{"id":"D","text":"Assessment, Planning, Diagnosis, Implementation, Evaluation"}]'::jsonb,
    'A',
    'The nursing process (ADPIE): Assessment → Diagnosis → Planning → Implementation → Evaluation, is a systematic problem-solving framework for patient care.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000006', 'subj_nursing', 'top_nurs_care',
    'Standard precautions in infection control should be applied:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Only when caring for patients known to have an infectious disease"},{"id":"B","text":"Only in intensive care and surgical settings"},{"id":"C","text":"With all patients, regardless of their diagnosis or infection status"},{"id":"D","text":"Only when blood or body fluids are visible"}]'::jsonb,
    'C',
    'Standard precautions treat all blood, body fluids, secretions, and excretions (except sweat) as potentially infectious and are applied universally.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000007', 'subj_nursing', 'top_nurs_anat',
    'Which organ system is primarily responsible for filtering waste products from the blood and excreting them as urine?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Endocrine system"},{"id":"B","text":"Lymphatic system"},{"id":"C","text":"Renal (urinary) system"},{"id":"D","text":"Hepatic system"}]'::jsonb,
    'C',
    'The renal (urinary) system — primarily the kidneys — filters blood, reabsorbs nutrients, and excretes metabolic waste products as urine.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000008', 'subj_nursing', 'top_nurs_pharm',
    'When administering medications, the "Six Rights" of medication administration include the right patient, drug, dose, route, time, and:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Right nurse"},{"id":"B","text":"Right documentation"},{"id":"C","text":"Right ward"},{"id":"D","text":"Right prescriber"}]'::jsonb,
    'B',
    'The sixth right is "Right Documentation" — recording the medication given immediately after administration to ensure accuracy and legal accountability.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000009', 'subj_nursing', 'top_nurs_care',
    'A patient''s oxygen saturation (SpO₂) reading of 88% on room air should prompt the nurse to:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Continue routine monitoring with no immediate action"},{"id":"B","text":"Notify the physician and prepare to administer supplemental oxygen"},{"id":"C","text":"Recheck the reading in one hour"},{"id":"D","text":"Position the patient supine immediately"}]'::jsonb,
    'B',
    'Normal SpO₂ is 95–100%. A reading of 88% indicates hypoxaemia requiring prompt intervention: notify the provider and initiate supplemental oxygen.',
    'active'
  ),
  (
    'e0000000-0000-0000-0000-000000000010', 'subj_nursing', 'top_nurs_anat',
    'The autonomic nervous system is divided into two main divisions. Which one prepares the body for "fight or flight" responses?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Somatic nervous system"},{"id":"B","text":"Parasympathetic nervous system"},{"id":"C","text":"Sympathetic nervous system"},{"id":"D","text":"Enteric nervous system"}]'::jsonb,
    'C',
    'The sympathetic division triggers fight-or-flight: increased heart rate, dilated pupils, inhibited digestion, and release of adrenaline (epinephrine).',
    'active'
  )

ON CONFLICT (id) DO UPDATE SET
  question      = EXCLUDED.question,
  options       = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation   = EXCLUDED.explanation,
  status        = EXCLUDED.status;
