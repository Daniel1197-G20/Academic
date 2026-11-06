-- =============================================================================
-- Migration: 20261007010000_seed_core_subjects_to_min10.sql
-- Purpose  : Seed topics and questions for the 5 core subjects so each subject
--            has at least 10 valid active questions, unlocking assessments.
-- Subjects : subj_cs (4 Qs), subj_math (6 Qs), subj_eng (9 Qs), subj_phys (10 Qs), subj_econ (9 Qs)
-- Total    : 38 new high-quality academic questions + 7 new topics
-- Safety   : ON CONFLICT (id) DO NOTHING (idempotent, preserves all existing records).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Topics for Core Subjects (Missing topic coverage)
-- ---------------------------------------------------------------------------
INSERT INTO public.topics (id, subject_id, name, code, description, display_order)
VALUES
  -- Engineering additions
  ('top_eng_thermo',   'subj_eng',  'Thermodynamics & Energy Systems', 'ENG202',
   'Laws of thermodynamics, heat transfer, entropy, and thermodynamic cycles', 2),
  ('top_eng_materials','subj_eng',  'Materials Science & Mechanics',   'ENG203',
   'Stress-strain analysis, material properties, deformation, and failure criteria', 3),

  -- Physics additions
  ('top_phys_em',      'subj_phys', 'Electromagnetism & Waves',        'PHY102',
   'Coulomb law, Gauss law, magnetic fields, Maxwell equations, and wave phenomena', 2),
  ('top_phys_quantum', 'subj_phys', 'Thermodynamics & Modern Physics',  'PHY201',
   'Thermal physics, photoelectric effect, special relativity, and quantum models', 3),

  -- Economics additions
  ('top_econ_macro',   'subj_econ', 'Macroeconomics',                  'ECN102',
   'GDP determination, inflation, unemployment, fiscal policy, and monetary policy', 2),
  ('top_econ_metrics', 'subj_econ', 'Quantitative Economics & Finance','ECN201',
   'Econometric modeling, time value of money, market structures, and game theory', 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Assessment questions for Core Subjects (38 questions)
-- ---------------------------------------------------------------------------
INSERT INTO public.question_bank
  (id, subject_id, topic_id, question, question_type, difficulty, options, correct_answer, explanation, status)
VALUES

  -- ═══════════════════════════════════════════════════════════════════════════
  --  1. COMPUTER SCIENCE (4 Questions: brings subj_cs from 6 to 10)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    '00000000-0000-0000-0001-000000000001', 'subj_cs', 'top_cs_algo',
    'Which algorithmic paradigm does Dijkstra''s single-source shortest path algorithm utilize for graphs with non-negative edge weights?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Divide and Conquer"},{"id":"B","text":"Greedy Algorithm"},{"id":"C","text":"Dynamic Programming"},{"id":"D","text":"Backtracking"}]'::jsonb,
    'B',
    'Dijkstra''s algorithm is a greedy algorithm because it always chooses the unvisited vertex with the smallest tentative distance at each step.',
    'active'
  ),
  (
    '00000000-0000-0000-0001-000000000002', 'subj_cs', 'top_cs_os',
    'In virtual memory management, what phenomenon occurs when a system spends more time servicing page faults than executing instructions?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"External Fragmentation"},{"id":"B","text":"Thrashing"},{"id":"C","text":"Starvation"},{"id":"D","text":"Priority Inversion"}]'::jsonb,
    'B',
    'Thrashing occurs when the active working set exceeds available physical memory, forcing the OS to continuously swap pages between RAM and secondary storage.',
    'active'
  ),
  (
    '00000000-0000-0000-0001-000000000003', 'subj_cs', 'top_cs_db',
    'Which ACID property ensures that all operations within a database transaction are completed successfully or none are applied?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Atomicity"},{"id":"B","text":"Consistency"},{"id":"C","text":"Isolation"},{"id":"D","text":"Durability"}]'::jsonb,
    'A',
    'Atomicity guarantees that all tasks of a transaction are performed or none are, preventing partial updates from leaving the database in an inconsistent state.',
    'active'
  ),
  (
    '00000000-0000-0000-0001-000000000004', 'subj_cs', 'top_cs_ds',
    'In a balanced Binary Search Tree (such as an AVL tree or Red-Black tree) with n elements, what is the worst-case lookup time complexity?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"O(1)"},{"id":"B","text":"O(log n)"},{"id":"C","text":"O(n)"},{"id":"D","text":"O(n log n)"}]'::jsonb,
    'B',
    'Self-balancing binary search trees maintain a maximum height proportional to log2(n), guaranteeing O(log n) worst-case search, insertion, and deletion.',
    'active'
  ),

  -- ═══════════════════════════════════════════════════════════════════════════
  --  2. MATHEMATICS (6 Questions: brings subj_math from 4 to 10)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    '00000000-0000-0000-0002-000000000001', 'subj_math', 'top_math_calc',
    'According to the Fundamental Theorem of Calculus, if F''(x) = f(x) is continuous on [a, b], then the definite integral ∫[a, b] f(x) dx is equal to:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"F''(b) - F''(a)"},{"id":"B","text":"F(b) - F(a)"},{"id":"C","text":"f(b) - f(a)"},{"id":"D","text":"F(b) * F(a)"}]'::jsonb,
    'B',
    'The Fundamental Theorem of Calculus states that the definite integral of a function f(x) over [a, b] is given by F(b) - F(a), where F is an antiderivative of f.',
    'active'
  ),
  (
    '00000000-0000-0000-0002-000000000002', 'subj_math', 'top_math_linalg',
    'For a square matrix A and scalar λ, the characteristic equation used to solve for eigenvalues λ is given by:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"det(A - λI) = 0"},{"id":"B","text":"Trace(A) = λ"},{"id":"C","text":"A^T = λA"},{"id":"D","text":"det(A) * det(I) = λ"}]'::jsonb,
    'A',
    'Eigenvalues satisfy Av = λv, equivalent to (A - λI)v = 0. Non-trivial eigenvectors v exist if and only if det(A - λI) = 0.',
    'active'
  ),
  (
    '00000000-0000-0000-0002-000000000003', 'subj_math', 'top_math_stats',
    'Under the Central Limit Theorem, the distribution of the sample mean approaches which distribution as sample size n becomes large, regardless of the population distribution shape?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Uniform Distribution"},{"id":"B","text":"Exponential Distribution"},{"id":"C","text":"Normal (Gaussian) Distribution"},{"id":"D","text":"Poisson Distribution"}]'::jsonb,
    'C',
    'The Central Limit Theorem asserts that given sufficiently large samples, the sampling distribution of the sample mean approaches a normal distribution.',
    'active'
  ),
  (
    '00000000-0000-0000-0002-000000000004', 'subj_math', 'top_math_calc',
    'What is the limit of (sin x) / x as x approaches 0?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"0"},{"id":"B","text":"1"},{"id":"C","text":"Infinity"},{"id":"D","text":"Undefined"}]'::jsonb,
    'B',
    'The standard limit lim (x->0) (sin x)/x = 1 can be proven geometrically via the Squeeze Theorem or algebraically via L''Hôpital''s Rule.',
    'active'
  ),
  (
    '00000000-0000-0000-0002-000000000005', 'subj_math', 'top_math_linalg',
    'Two non-zero vectors u and v in an inner product space are orthogonal if and only if their dot product u · v equals:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"1"},{"id":"B","text":"0"},{"id":"C","text":"-1"},{"id":"D","text":"||u|| * ||v||"}]'::jsonb,
    'B',
    'Orthogonality by definition means that the inner (dot) product of the two vectors is zero: u · v = 0.',
    'active'
  ),
  (
    '00000000-0000-0000-0002-000000000006', 'subj_math', 'top_math_stats',
    'If two events A and B are statistically independent with P(A) = 0.4 and P(B) = 0.5, what is the joint probability P(A ∩ B)?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"0.90"},{"id":"B","text":"0.20"},{"id":"C","text":"0.10"},{"id":"D","text":"0.70"}]'::jsonb,
    'B',
    'For statistically independent events, P(A ∩ B) = P(A) * P(B) = 0.4 * 0.5 = 0.20.',
    'active'
  ),

  -- ═══════════════════════════════════════════════════════════════════════════
  --  3. ENGINEERING (9 Questions: brings subj_eng from 1 to 10)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    '00000000-0000-0000-0003-000000000001', 'subj_eng', 'top_eng_circuits',
    'According to Ohm''s Law, what is the current I flowing through an electrical resistor with resistance R = 5 Ω connected across a voltage source V = 20 V?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"100 A"},{"id":"B","text":"4 A"},{"id":"C","text":"0.25 A"},{"id":"D","text":"15 A"}]'::jsonb,
    'B',
    'Ohm''s law states I = V / R. With V = 20 V and R = 5 Ω, I = 20 / 5 = 4 A.',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000002', 'subj_eng', 'top_eng_circuits',
    'Thevenin''s theorem states that any linear two-terminal circuit can be replaced by an equivalent circuit consisting of:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"A current source in parallel with a resistor"},{"id":"B","text":"An independent voltage source in series with a resistor"},{"id":"C","text":"An ideal capacitor in series with an inductor"},{"id":"D","text":"A dependent voltage source only"}]'::jsonb,
    'B',
    'Thevenin''s theorem models linear two-terminal networks as an independent equivalent open-circuit voltage source (V_th) in series with an equivalent resistance (R_th).',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000003', 'subj_eng', 'top_eng_thermo',
    'The First Law of Thermodynamics is an expression of which fundamental physical principle?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Conservation of Mass"},{"id":"B","text":"Conservation of Momentum"},{"id":"C","text":"Conservation of Energy"},{"id":"D","text":"Increase of Entropy"}]'::jsonb,
    'C',
    'The First Law of Thermodynamics states that energy cannot be created or destroyed, only transformed: ΔU = Q - W.',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000004', 'subj_eng', 'top_eng_thermo',
    'Which theoretical thermodynamic cycle establishes the upper limit on thermal efficiency for any heat engine operating between two temperatures?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Rankine Cycle"},{"id":"B","text":"Brayton Cycle"},{"id":"C","text":"Carnot Cycle"},{"id":"D","text":"Otto Cycle"}]'::jsonb,
    'C',
    'The Carnot cycle consists of reversible isothermal and adiabatic processes, providing the maximum possible theoretical efficiency η = 1 - (T_C / T_H).',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000005', 'subj_eng', 'top_eng_materials',
    'In mechanical materials testing, the ratio of tensile stress (σ) to tensile strain (ε) within the linear elastic deformation region is known as:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Poisson''s Ratio"},{"id":"B","text":"Young''s Modulus (Modulus of Elasticity)"},{"id":"C","text":"Shear Modulus"},{"id":"D","text":"Bulk Modulus"}]'::jsonb,
    'B',
    'Hooke''s Law states σ = E * ε in linear elasticity, where E is Young''s Modulus, representing material stiffness.',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000006', 'subj_eng', 'top_eng_materials',
    'On a stress-strain curve for ductile steel, the point beyond which material deformation becomes permanent and non-recoverable upon unloading is the:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Proportional Limit"},{"id":"B","text":"Yield Point"},{"id":"C","text":"Ultimate Tensile Strength"},{"id":"D","text":"Fracture Point"}]'::jsonb,
    'B',
    'The yield point marks the transition from reversible elastic deformation to permanent plastic deformation.',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000007', 'subj_eng', 'top_eng_circuits',
    'In an ideal operational amplifier (op-amp) configured with negative feedback, what is the ideal input impedance across the inverting and non-inverting terminals?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Zero"},{"id":"B","text":"50 Ω"},{"id":"C","text":"Infinite"},{"id":"D","text":"1 kΩ"}]'::jsonb,
    'C',
    'An ideal operational amplifier exhibits infinite input impedance (drawing zero input current) and zero output impedance.',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000008', 'subj_eng', 'top_eng_thermo',
    'The Second Law of Thermodynamics dictates that in any spontaneous natural process, the total entropy of an isolated system must:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Always decrease"},{"id":"B","text":"Always remain exactly zero"},{"id":"C","text":"Always increase or remain constant"},{"id":"D","text":"Oscillate periodically"}]'::jsonb,
    'C',
    'The Second Law states that the entropy of an isolated system never decreases over time (ΔS_total >= 0).',
    'active'
  ),
  (
    '00000000-0000-0000-0003-000000000009', 'subj_eng', 'top_eng_materials',
    'A material property that describes the ability of a material to absorb energy and plastically deform without fracturing is defined as:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Hardness"},{"id":"B","text":"Toughness"},{"id":"C","text":"Brittleness"},{"id":"D","text":"Creep Resistance"}]'::jsonb,
    'B',
    'Toughness represents the total area under the stress-strain curve up to the point of fracture, quantifying energy absorption capability.',
    'active'
  ),

  -- ═══════════════════════════════════════════════════════════════════════════
  --  4. PHYSICS (10 Questions: brings subj_phys from 0 to 10)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    '00000000-0000-0000-0004-000000000001', 'subj_phys', 'top_phys_mech',
    'According to Newton''s Second Law of Motion, the net force F acting on an object of constant mass m is directly proportional to its:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Velocity"},{"id":"B","text":"Acceleration"},{"id":"C","text":"Displacement"},{"id":"D","text":"Momentum squared"}]'::jsonb,
    'B',
    'Newton''s second law states F = ma: net force equals mass multiplied by acceleration.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000002', 'subj_phys', 'top_phys_mech',
    'An object of mass 2 kg moving horizontally at 3 m/s possesses a kinetic energy equal to:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"6 J"},{"id":"B","text":"9 J"},{"id":"C","text":"18 J"},{"id":"D","text":"3 J"}]'::jsonb,
    'B',
    'Kinetic energy KE = 0.5 * m * v^2 = 0.5 * 2 kg * (3 m/s)^2 = 9 Joules.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000003', 'subj_phys', 'top_phys_em',
    'Coulomb''s Law states that the electrostatic force between two stationary point charges is inversely proportional to:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"The distance between them"},{"id":"B","text":"The square of the distance between them"},{"id":"C","text":"The product of the charges"},{"id":"D","text":"The square root of the distance"}]'::jsonb,
    'B',
    'Coulomb''s Law is an inverse-square law: F = k * |q1 * q2| / r^2.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000004', 'subj_phys', 'top_phys_em',
    'Faraday''s Law of Electromagnetic Induction states that the induced electromotive force (EMF) in any closed circuit is proportional to:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"The total magnetic flux enclosed"},{"id":"B","text":"The time rate of change of magnetic flux"},{"id":"C","text":"The electrical resistance of the wire"},{"id":"D","text":"The static electric field strength"}]'::jsonb,
    'B',
    'Faraday''s Law states ε = -dΦ_B / dt: EMF is induced by a time-varying magnetic flux through the loop.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000005', 'subj_phys', 'top_phys_quantum',
    'In Einstein''s explanation of the photoelectric effect, electrons are emitted from a metal surface only if the incident light frequency exceeds the:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Resonant Frequency"},{"id":"B","text":"Threshold (Cutoff) Frequency"},{"id":"C","text":"De Broglie Wavelength"},{"id":"D","text":"Compton Frequency"}]'::jsonb,
    'B',
    'A photon must carry energy E = hf greater than the metal work function Φ, requiring incident frequency f >= f_0 (threshold frequency).',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000006', 'subj_phys', 'top_phys_mech',
    'When no external net torque acts upon a rotating physical system, which quantity is strictly conserved?',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Linear Momentum"},{"id":"B","text":"Angular Momentum"},{"id":"C","text":"Rotational Kinetic Energy"},{"id":"D","text":"Centripetal Force"}]'::jsonb,
    'B',
    'Conservation of Angular Momentum dictates that dL/dt = τ_net; when net external torque τ_net = 0, total angular momentum L is constant.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000007', 'subj_phys', 'top_phys_em',
    'Which set of four fundamental equations unifies electricity, magnetism, and classical optics?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Navier-Stokes Equations"},{"id":"B","text":"Maxwell''s Equations"},{"id":"C","text":"Schrödinger Equations"},{"id":"D","text":"Hamilton-Jacobi Equations"}]'::jsonb,
    'B',
    'Maxwell''s four equations formulate how electric and magnetic fields are generated by charges, currents, and changes in the fields.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000008', 'subj_phys', 'top_phys_quantum',
    'The Heisenberg Uncertainty Principle states that one cannot simultaneously measure with arbitrary precision an object''s:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Charge and Mass"},{"id":"B","text":"Position and Momentum"},{"id":"C","text":"Energy and Spin"},{"id":"D","text":"Wavelength and Frequency"}]'::jsonb,
    'B',
    'Heisenberg''s uncertainty relation Δx * Δp >= ħ/2 establishes a fundamental limit on the precision of complementary variables position and momentum.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000009', 'subj_phys', 'top_phys_mech',
    'In simple harmonic motion (SHM) of a mass-spring system, the period T of oscillation depends upon:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Mass and spring stiffness constant k"},{"id":"B","text":"Amplitude and gravitational acceleration g"},{"id":"C","text":"Initial velocity and displacement"},{"id":"D","text":"Mass and amplitude only"}]'::jsonb,
    'A',
    'For a simple harmonic mass-spring oscillator, T = 2π * sqrt(m / k), independent of oscillation amplitude.',
    'active'
  ),
  (
    '00000000-0000-0000-0004-000000000010', 'subj_phys', 'top_phys_quantum',
    'According to Einstein''s Special Theory of Relativity, the speed of light in a vacuum c is:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Dependent on the relative motion of the light source"},{"id":"B","text":"Different for observers moving at different velocities"},{"id":"C","text":"Constant and invariant for all inertial reference frames"},{"id":"D","text":"Infinite in free space"}]'::jsonb,
    'C',
    'The second postulate of special relativity asserts that the speed of light in a vacuum is constant for all inertial observers, regardless of the motion of the source.',
    'active'
  ),

  -- ═══════════════════════════════════════════════════════════════════════════
  --  5. ECONOMICS (9 Questions: brings subj_econ from 1 to 10)
  -- ═══════════════════════════════════════════════════════════════════════════
  (
    '00000000-0000-0000-0005-000000000001', 'subj_econ', 'top_econ_micro',
    'In microeconomic theory, the Law of Diminishing Marginal Utility states that as a consumer increases consumption of a commodity:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Total utility immediately becomes negative"},{"id":"B","text":"The marginal utility derived from each additional unit declines"},{"id":"C","text":"The price of the commodity must increase"},{"id":"D","text":"Marginal utility remains constant"}]'::jsonb,
    'B',
    'As consumption of a good increases, the additional satisfaction (marginal utility) gained from consuming each subsequent unit decreases.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000002', 'subj_econ', 'top_econ_micro',
    'In a perfectly competitive market in long-run equilibrium, profit-maximising firms produce at an output level where price P equals:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Marginal Cost and Minimum Average Total Cost"},{"id":"B","text":"Average Variable Cost only"},{"id":"C","text":"Total Fixed Cost"},{"id":"D","text":"Maximum Total Revenue"}]'::jsonb,
    'A',
    'In long-run competitive equilibrium, P = MR = MC = minimum ATC, ensuring allocative and productive efficiency with zero economic profits.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000003', 'subj_econ', 'top_econ_macro',
    'Gross Domestic Product (GDP) measured using current market prices without adjusting for the effects of inflation is known as:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Real GDP"},{"id":"B","text":"Nominal GDP"},{"id":"C","text":"Potential GDP"},{"id":"D","text":"Net National Product"}]'::jsonb,
    'B',
    'Nominal GDP values output using current-period prices, whereas Real GDP is deflated using constant base-year prices to remove inflationary distortion.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000004', 'subj_econ', 'top_econ_macro',
    'When a nation''s central bank conducts an expansionary monetary policy by purchasing government securities on the open market, what is the intended direct effect?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Decrease commercial bank reserves and raise interest rates"},{"id":"B","text":"Increase commercial bank reserves and lower interest rates"},{"id":"C","text":"Increase corporate tax rates"},{"id":"D","text":"Decrease total money supply"}]'::jsonb,
    'B',
    'Open market purchases inject liquidity into the banking system, expanding bank reserves, shifting the money supply curve rightward, and lowering short-term interest rates.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000005', 'subj_econ', 'top_econ_macro',
    'The Phillips Curve illustrates a short-run historical macroeconomic empirical relationship between:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Interest rates and investment demand"},{"id":"B","text":"Inflation rate and unemployment rate"},{"id":"C","text":"Government tax revenue and tax rates"},{"id":"D","text":"Money supply and foreign exchange rates"}]'::jsonb,
    'B',
    'The classical short-run Phillips curve demonstrates an inverse trade-off between inflation and the unemployment rate.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000006', 'subj_econ', 'top_econ_micro',
    'An externality occurs in economic transactions whenever:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Market equilibrium price is set by government fiat"},{"id":"B","text":"Costs or benefits accrue to a third party not directly involved in the transaction"},{"id":"C","text":"Consumers spend more than their disposable income"},{"id":"D","text":"Firms generate negative accounting profits"}]'::jsonb,
    'B',
    'An externality is a market spillover effect where the production or consumption of a good affects uncompensated third parties (e.g. industrial pollution).',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000007', 'subj_econ', 'top_econ_metrics',
    'In financial economics, the concept that a dollar received today is worth more than a dollar received in the future is formalised as:',
    'multiple_choice', 'beginner',
    '[{"id":"A","text":"Purchasing Power Parity"},{"id":"B","text":"The Time Value of Money"},{"id":"C","text":"The Fisher Hypothesis"},{"id":"D","text":"Liquidity Preference"}]'::jsonb,
    'B',
    'The Time Value of Money principle reflects that money available today has greater earning potential (via interest/returns) than identical nominal sums received later.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000008', 'subj_econ', 'top_econ_macro',
    'What term describes an economic scenario characterised by concurrent stagnant economic growth, high unemployment, and persistently elevated inflation?',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Hyperinflation"},{"id":"B","text":"Stagflation"},{"id":"C","text":"Deflationary Spiral"},{"id":"D","text":"Liquidity Trap"}]'::jsonb,
    'B',
    'Stagflation is a portmanteau of stagnation and inflation, describing sluggish economic output paired with rising consumer price inflation.',
    'active'
  ),
  (
    '00000000-0000-0000-0005-000000000009', 'subj_econ', 'top_econ_metrics',
    'In game theory, an outcome where each player chooses their optimal strategy given the strategies chosen by all other players, with no unilateral incentive to deviate, is a:',
    'multiple_choice', 'intermediate',
    '[{"id":"A","text":"Pareto Optimum"},{"id":"B","text":"Nash Equilibrium"},{"id":"C","text":"Dominant Collapse"},{"id":"D","text":"Zero-Sum Bound"}]'::jsonb,
    'B',
    'A Nash Equilibrium is a stable state in non-cooperative games where no player can improve their payoff by unilaterally changing their chosen strategy.',
    'active'
  )

ON CONFLICT (id) DO NOTHING;
