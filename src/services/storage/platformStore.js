/**
 * ARCHITECTURAL NOTICE: DEPRECATED / QUARANTINED MOCK STORE
 * 
 * This file is an unlinked prototype store from early UI wireframing.
 * It is NOT imported or used by any active application component.
 * All authoritative academic data, CGPA calculations, student profiles, study plans,
 * and streak tracking are managed strictly via PostgreSQL through src/services/api/client.js.
 * 
 * Retained temporarily only for reference during Milestone 2 schema migrations.
 * DO NOT IMPORT IN PRODUCTION UI.
 */
const STORAGE_KEY = 'academic_platform_state_v1';

const INITIAL_STATE = {
  currentRole: 'student', // 'student' | 'tutor' | 'admin'
  userProfile: {
    id: 'usr_001',
    name: 'Alexander Vance',
    email: 'alexander.vance@tech-academy.edu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    institution: 'Apex Institute of Technology',
    department: 'Computer Science & Software Engineering',
    level: 'Year 3 (Junior)',
    matricNumber: 'AIT/2023/CS/084',
    academicInterests: ['Algorithms', 'Distributed Systems', 'Applied ML', 'Compilers'],
    studyPreferences: ['Night Owl (20:00 - 02:00)', 'Visual Flowcharts', 'Interactive Quizzes'],
    bio: 'CS Junior pursuing first-class honors. Building high-performance software and hosting peer study sessions.',
    isPublic: true
  },
  subscription: {
    plan: 'free', // 'free' | 'pro' | 'campus'
    aiQuestionsUsed: 14,
    aiQuestionsLimit: 25,
    renewalDate: '2026-10-30',
    billingCycle: 'monthly'
  },
  cgpaConfig: {
    selectedScale: '5.0', // '5.0' | '4.0' | '7.0'
    scales: {
      '5.0': {
        grades: [
          { letter: 'A', points: 5, minScore: 70 },
          { letter: 'B', points: 4, minScore: 60 },
          { letter: 'C', points: 3, minScore: 50 },
          { letter: 'D', points: 2, minScore: 45 },
          { letter: 'E', points: 1, minScore: 40 },
          { letter: 'F', points: 0, minScore: 0 }
        ],
        classifications: [
          { name: 'First Class Honours', minCgpa: 4.50 },
          { name: 'Second Class Upper (2:1)', minCgpa: 3.50 },
          { name: 'Second Class Lower (2:2)', minCgpa: 2.40 },
          { name: 'Third Class', minCgpa: 1.50 },
          { name: 'Pass', minCgpa: 1.00 }
        ]
      },
      '4.0': {
        grades: [
          { letter: 'A', points: 4.0, minScore: 90 },
          { letter: 'B', points: 3.0, minScore: 80 },
          { letter: 'C', points: 2.0, minScore: 70 },
          { letter: 'D', points: 1.0, minScore: 60 },
          { letter: 'F', points: 0.0, minScore: 0 }
        ],
        classifications: [
          { name: 'Summa Cum Laude (Distinction)', minCgpa: 3.80 },
          { name: 'Magna Cum Laude (High Honors)', minCgpa: 3.50 },
          { name: 'Cum Laude (Honors)', minCgpa: 3.20 },
          { name: 'Satisfactory', minCgpa: 2.00 }
        ]
      },
      '7.0': {
        grades: [
          { letter: 'A', points: 7, minScore: 75 },
          { letter: 'B', points: 6, minScore: 70 },
          { letter: 'C', points: 5, minScore: 60 },
          { letter: 'D', points: 4, minScore: 50 },
          { letter: 'E', points: 3, minScore: 45 },
          { letter: 'F', points: 0, minScore: 0 }
        ],
        classifications: [
          { name: 'First Class', minCgpa: 6.00 },
          { name: 'Second Class Upper', minCgpa: 4.60 },
          { name: 'Second Class Lower', minCgpa: 3.20 },
          { name: 'Third Class', minCgpa: 2.00 }
        ]
      }
    }
  },
  academicHistory: [
    {
      id: 'sem_1',
      academicYear: 'Year 1',
      semester: 'First Semester',
      courses: [
        { code: 'CSC101', title: 'Intro to Computer Programming', units: 3, grade: 'A' },
        { code: 'MTH101', title: 'Elementary Mathematics I', units: 4, grade: 'A' },
        { code: 'PHY101', title: 'General Physics I', units: 3, grade: 'B' },
        { code: 'GST101', title: 'Communication Skills in English', units: 2, grade: 'A' },
        { code: 'CSC103', title: 'Computer Hardware Foundations', units: 3, grade: 'A' }
      ]
    },
    {
      id: 'sem_2',
      academicYear: 'Year 1',
      semester: 'Second Semester',
      courses: [
        { code: 'CSC102', title: 'Object-Oriented Programming (Java)', units: 3, grade: 'A' },
        { code: 'MTH102', title: 'Elementary Calculus II', units: 4, grade: 'B' },
        { code: 'PHY102', title: 'General Physics II', units: 3, grade: 'B' },
        { code: 'STA111', title: 'Introduction to Statistics', units: 3, grade: 'A' },
        { code: 'GST102', title: 'Philosophy and Logic', units: 2, grade: 'A' }
      ]
    },
    {
      id: 'sem_3',
      academicYear: 'Year 2',
      semester: 'First Semester',
      courses: [
        { code: 'CSC201', title: 'Data Structures & Algorithms', units: 3, grade: 'A' },
        { code: 'CSC205', title: 'Operating Systems Concepts', units: 3, grade: 'B' },
        { code: 'MTH201', title: 'Linear Algebra I', units: 3, grade: 'A' },
        { code: 'CSC207', title: 'Computer Organization & Arch.', units: 3, grade: 'A' },
        { code: 'EET201', title: 'Basic Electronics & Circuits', units: 2, grade: 'B' }
      ]
    },
    {
      id: 'sem_4',
      academicYear: 'Year 2',
      semester: 'Second Semester',
      courses: [
        { code: 'CSC202', title: 'Database Management Systems', units: 3, grade: 'A' },
        { code: 'CSC204', title: 'Software Engineering Principles', units: 3, grade: 'A' },
        { code: 'CSC208', title: 'Web Application Technologies', units: 3, grade: 'A' },
        { code: 'MTH202', title: 'Numerical Analysis', units: 3, grade: 'B' },
        { code: 'ENT202', title: 'Technology Entrepreneurship', units: 2, grade: 'A' }
      ]
    },
    {
      id: 'sem_5',
      academicYear: 'Year 3',
      semester: 'First Semester (Current)',
      courses: [
        { code: 'CSC301', title: 'Design & Analysis of Algorithms', units: 3, grade: 'A' },
        { code: 'CSC303', title: 'Theory of Computation', units: 3, grade: 'B' },
        { code: 'CSC305', title: 'Artificial Intelligence & Search', units: 3, grade: 'A' },
        { code: 'CSC307', title: 'Computer Networks & Protocols', units: 3, grade: 'A' },
        { code: 'CSC309', title: 'Compiler Construction', units: 3, grade: 'B' }
      ]
    }
  ],
  studyPlans: [
    {
      id: 'plan_1',
      subject: 'CSC301: Advanced Algorithms',
      goal: 'Master Dynamic Programming & Graph Theory for Mid-term Exam',
      deadline: '2026-10-25',
      frequency: 'Daily (2 hours)',
      difficulty: 'Hard',
      estimatedHours: 24,
      loggedHours: 16.5,
      streakDays: 8,
      topics: [
        { id: 't1', title: 'Asymptotic Analysis & Master Theorem', completed: true },
        { id: 't2', title: 'Divide & Conquer Recurrences', completed: true },
        { id: 't3', title: 'Greedy Algorithms (Huffman, Prim, Kruskal)', completed: true },
        { id: 't4', title: 'Dynamic Programming: 0/1 Knapsack & Bellman-Ford', completed: false },
        { id: 't5', title: 'Flow Networks & Ford-Fulkerson Cut Theorem', completed: false },
        { id: 't6', title: 'NP-Completeness and Reduction proofs', completed: false }
      ]
    },
    {
      id: 'plan_2',
      subject: 'CSC307: Computer Networks',
      goal: 'Prepare for CCNA-aligned Layer 3/4 Protocol Simulation Test',
      deadline: '2026-11-04',
      frequency: '3x per week',
      difficulty: 'Medium',
      estimatedHours: 18,
      loggedHours: 12.0,
      streakDays: 4,
      topics: [
        { id: 't21', title: 'OSI vs TCP/IP Protocol Stack', completed: true },
        { id: 't22', title: 'IPv4 Subnetting & CIDR Calculation', completed: true },
        { id: 't23', title: 'BGP and OSPF Routing Protocols', completed: false },
        { id: 't24', title: 'TCP Flow Control & Congestion Window', completed: false }
      ]
    },
    {
      id: 'plan_3',
      subject: 'CSC309: Compiler Construction',
      goal: 'Implement LALR(1) Syntax Tree & Semantic Analyzer',
      deadline: '2026-11-15',
      frequency: 'Weekends',
      difficulty: 'Hard',
      estimatedHours: 30,
      loggedHours: 9.0,
      streakDays: 2,
      topics: [
        { id: 't31', title: 'Lexical Analysis & DFA Generation', completed: true },
        { id: 't32', title: 'Context-Free Grammars & Ambiguity Removal', completed: true },
        { id: 't33', title: 'Shift-Reduce Parsing Table Generation', completed: false },
        { id: 't34', title: 'Intermediate Code Representation (Three-Address)', completed: false }
      ]
    }
  ],
  testBank: [
    {
      id: 'test_csc301',
      courseCode: 'CSC301',
      title: 'Algorithms Mid-Term Diagnostic Exam',
      durationMinutes: 25,
      questionsCount: 10,
      difficulty: 'Hard',
      category: 'Computer Science',
      questions: [
        {
          id: 'q1',
          type: 'multiple-choice',
          question: 'What is the tight worst-case time complexity of finding the shortest path in a weighted DAG using topological ordering?',
          options: ['O(V + E)', 'O(E log V)', 'O(V²)', 'O(V * E)'],
          correctAnswer: 0,
          explanation: 'By first topologically sorting the DAG in O(V + E) time, one pass through each vertex relaxing outgoing edges takes O(V + E) total time.'
        },
        {
          id: 'q2',
          type: 'multiple-choice',
          question: 'Which algorithmic paradigm does Floyd-Warshall all-pairs shortest path algorithm employ?',
          options: ['Greedy Method', 'Dynamic Programming', 'Divide and Conquer', 'Branch and Bound'],
          correctAnswer: 1,
          explanation: 'Floyd-Warshall uses Dynamic Programming with a 3D state table computing dist[k][i][j].'
        },
        {
          id: 'q3',
          type: 'true-false',
          question: 'Every problem in NP can be solved in polynomial time by a deterministic Turing machine.',
          options: ['True', 'False'],
          correctAnswer: 1,
          explanation: 'False. Whether P = NP is the foremost unsolved problem in theoretical computer science; NP denotes nondeterministic polynomial time.'
        },
        {
          id: 'q4',
          type: 'multiple-choice',
          question: 'What is the recurrence relation T(n) = 2T(n/2) + O(n) evaluated to under the Master Theorem?',
          options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
          correctAnswer: 1,
          explanation: 'Case 2 of the Master Theorem: log_b(a) = log_2(2) = 1, f(n) = n^1, hence T(n) = O(n log n) (Merge Sort).'
        },
        {
          id: 'q5',
          type: 'multiple-choice',
          question: 'In a Fibonacci Heap, what is the amortized time complexity of the Decrease-Key operation?',
          options: ['O(log n)', 'O(1)', 'O(n)', 'O(log² n)'],
          correctAnswer: 1,
          explanation: 'Fibonacci Heaps achieve O(1) amortized Decrease-Key via cascading cuts, which is why Dijkstra runs in O(E + V log V).'
        },
        {
          id: 'q6',
          type: 'true-false',
          question: 'Kruskal’s algorithm guarantees finding the Minimum Spanning Tree even on graphs with negative edge weights.',
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'True! Unlike shortest path algorithms (like Dijkstra), MST algorithms depend only on relative edge weight ordering, not non-negativity.'
        },
        {
          id: 'q7',
          type: 'multiple-choice',
          question: 'Which of the following problems is known to be NP-Complete?',
          options: ['2-SAT', '3-SAT', 'Minimum Spanning Tree', 'Eulerian Tour'],
          correctAnswer: 1,
          explanation: '3-SAT was proven NP-Complete by Stephen Cook (Cook-Levin Theorem), whereas 2-SAT is solvable in O(V + E) linear time.'
        },
        {
          id: 'q8',
          type: 'multiple-choice',
          question: 'What data structure is utilized in Prim’s algorithm to extract the minimum weight cut edge efficiently?',
          options: ['Priority Queue (Min-Heap)', 'FIFO Queue', 'Disjoint Set Union (DSU)', 'Hash Table'],
          correctAnswer: 0,
          explanation: 'Prim uses a priority queue, whereas Kruskal uses Disjoint Set Union (Union-Find).'
        },
        {
          id: 'q9',
          type: 'true-false',
          question: 'Bellman-Ford algorithm can detect negative cycles reachable from the source vertex.',
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'True. Running a V-th relaxation cycle will update any distance affected by a negative-weight cycle.'
        },
        {
          id: 'q10',
          type: 'multiple-choice',
          question: 'What is the auxiliary space complexity of Merge Sort on an array of n elements?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
          correctAnswer: 2,
          explanation: 'Standard array merge sort requires an auxiliary array of size O(n) to merge subarrays.'
        }
      ]
    },
    {
      id: 'test_mth301',
      courseCode: 'MTH301',
      title: 'Linear Algebra & Vector Spaces Diagnostic',
      durationMinutes: 20,
      questionsCount: 5,
      difficulty: 'Medium',
      category: 'Mathematics',
      questions: [
        {
          id: 'qm1',
          type: 'multiple-choice',
          question: 'If det(A) = 0 for an n x n square matrix A, which of the following is true?',
          options: ['A is invertible', 'The columns of A are linearly dependent', 'Rank(A) = n', '0 is not an eigenvalue of A'],
          correctAnswer: 1,
          explanation: 'Zero determinant implies nullity > 0, which means columns are linearly dependent.'
        },
        {
          id: 'qm2',
          type: 'true-false',
          question: 'Similar matrices share the exact same set of eigenvalues.',
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'True. If B = P⁻¹AP, then det(B - λI) = det(P⁻¹(A - λI)P) = det(A - λI), preserving characteristic polynomials and eigenvalues.'
        },
        {
          id: 'qm3',
          type: 'multiple-choice',
          question: 'What does the Rank-Nullity Theorem state for a linear map T: V → W?',
          options: ['dim(V) = rank(T) + nullity(T)', 'dim(W) = rank(T) + nullity(T)', 'rank(T) = dim(V) * nullity(T)', 'nullity(T) = dim(V) + dim(W)'],
          correctAnswer: 0,
          explanation: 'The dimension of the domain V equals the dimension of the image (rank) plus dimension of the kernel (nullity).'
        },
        {
          id: 'qm4',
          type: 'true-false',
          question: 'Every symmetric real matrix can be orthogonally diagonalized.',
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'True (The Spectral Theorem for symmetric real matrices).'
        },
        {
          id: 'qm5',
          type: 'multiple-choice',
          question: 'What is the trace of a matrix equal to?',
          options: ['The product of its eigenvalues', 'The sum of its eigenvalues', 'The determinant squared', 'The spectral norm'],
          correctAnswer: 1,
          explanation: 'The trace of a square matrix is the sum of diagonal entries, which identically equals the sum of its eigenvalues.'
        }
      ]
    }
  ],
  pastAttempts: [
    {
      id: 'att_01',
      testId: 'test_csc301',
      testTitle: 'Algorithms Mid-Term Diagnostic Exam',
      date: '2026-09-24',
      score: 80,
      correctCount: 8,
      totalCount: 10,
      timeUsedMinutes: 18,
      strongAreas: ['Asymptotic Analysis', 'Shortest Paths (DAG & Bellman-Ford)', 'Kruskal & Prim MST'],
      weakAreas: ['Fibonacci Heap Decrease-Key amortized complexity', '3-SAT NP-Completeness Reductions']
    }
  ],
  tutors: [
    {
      id: 'tut_demo_01',
      name: 'Demonstration Tutor Profile',
      avatar: null,
      title: 'Computer Science & Algorithms Specialist',
      institution: 'Verified Faculty Candidate',
      rating: null, // Real data only: No reviews yet
      reviewsCount: 0,
      hourlyRate: 35,
      verified: false,
      subjects: ['Design & Analysis of Algorithms', 'Advanced Graph Theory', 'Dynamic Programming'],
      bio: 'Template profile demonstrating subject specialization and slot availability.',
      languages: ['English'],
      availability: ['Mon: 16:00 - 20:00', 'Wed: 14:00 - 19:00'],
      completedSessions: 0,
      responseRate: null
    }
  ],
  bookings: [
    {
      id: 'bk_001',
      tutorId: 'tut_01',
      tutorName: 'Dr. Elena Rostova',
      subject: 'CSC301: Dynamic Programming & Knapsack Deep Dive',
      date: 'Tomorrow, 16:30',
      durationMinutes: 60,
      type: '1-on-1 Video Session',
      status: 'confirmed', // 'confirmed' | 'pending' | 'completed' | 'cancelled'
      roomCode: 'ZEGO-ROOM-301-ELENA',
      price: 45
    },
    {
      id: 'bk_002',
      tutorId: 'tut_02',
      tutorName: 'Marcus Chen, M.Sc.',
      subject: 'CSC307: Packet Trace & OSPF Simulation Prep',
      date: 'Friday, 19:00',
      durationMinutes: 60,
      type: '1-on-1 Video Session',
      status: 'confirmed',
      roomCode: 'ZEGO-ROOM-307-MARCUS',
      price: 40
    }
  ],
  studyGroups: [
    {
      id: 'grp_001',
      name: 'CSC301: Algorithms Honor Circle',
      description: 'Peer group dedicated to breaking down LeetCode Hard and University exam proofs together.',
      subject: 'Design & Analysis of Algorithms',
      level: '300 Level',
      membersCount: 42,
      isPublic: true,
      activeCall: true,
      activeCallRoom: 'ZEGO-STUDY-301-PEER',
      activeMembersInCall: 4,
      announcements: [
        'Midterm review session scheduled for this Thursday at 20:00 UTC. Bring your questions on Bellman-Ford!',
        'Check the shared resource tab for Dr. Elena’s handwritten DP notes.'
      ],
      discussions: [
        {
          id: 'dsc_1',
          author: 'Maya Lin',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80',
          time: '12 mins ago',
          content: 'Does anyone have an intuitive visualization for why Dijkstra fails with negative edge weights even without cycles?'
        },
        {
          id: 'dsc_2',
          author: 'Alexander Vance (You)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
          time: '8 mins ago',
          content: 'Because Dijkstra greedily finalizes the shortest distance once a node is popped from the priority queue. A negative edge explored later might yield a shorter path, but Dijkstra never revisits finalized nodes!'
        },
        {
          id: 'dsc_3',
          author: 'Maya Lin',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80',
          time: '3 mins ago',
          content: 'That makes absolute sense! The greedy cut property breaks down when future costs can decrease.'
        }
      ],
      resources: [
        { title: 'Dynamic Programming Master Cheatsheet (PDF)', size: '2.4 MB', author: 'Elena R.' },
        { title: 'Topological Sort & DAG Shortest Path Python Notebook', size: '480 KB', author: 'Alex V.' },
        { title: 'Past Exam Question Pack (2022 - 2025)', size: '14.1 MB', author: 'Group Lead' }
      ]
    },
    {
      id: 'grp_002',
      name: 'Computer Systems & Distributed Clouds',
      description: 'Hands-on study group exploring high concurrency, raft consensus, and network sockets.',
      subject: 'Computer Networks & Distributed Systems',
      level: '300 - 400 Level',
      membersCount: 36,
      isPublic: true,
      activeCall: false,
      discussions: [
        {
          id: 'dsc_20',
          author: 'Jordan Reed',
          avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=128&q=80',
          time: '2 hours ago',
          content: 'Just ran Wireshark on our lab TCP 3-way handshake. The SYN-ACK flag behavior is crystal clear now.'
        }
      ],
      resources: [
        { title: 'Wireshark Lab Captures & Analysis', size: '8.2 MB', author: 'Marcus C.' }
      ]
    },
    {
      id: 'grp_003',
      name: 'Calculus & Pure Math Society',
      description: 'Collaborative problem solving for real analysis, vector fields, and surface integrals.',
      subject: 'Mathematics',
      level: 'All Levels',
      membersCount: 89,
      isPublic: true,
      activeCall: false,
      discussions: [],
      resources: []
    }
  ],
  directMessages: [
    {
      id: 'dm_tut_01',
      peerId: 'tut_01',
      peerName: 'Dr. Elena Rostova',
      peerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=128&q=80',
      peerRole: 'Tutor',
      online: true,
      messages: [
        {
          id: 'm1',
          senderId: 'tut_01',
          text: 'Hello Alexander! I reviewed your diagnostic test score on CSC301. Your asymptotic analysis is pristine, but we will focus on Bellman-Ford cycle proofs and Fibonacci Heaps during our session tomorrow.',
          timestamp: '10:45 AM'
        },
        {
          id: 'm2',
          senderId: 'usr_001',
          text: 'Thank you Dr. Elena! I have already prepared 3 tricky problems from our professor’s problem set for us to walk through.',
          timestamp: '10:52 AM'
        },
        {
          id: 'm3',
          senderId: 'tut_01',
          text: 'Excellent initiative. See you in the virtual room at 16:30!',
          timestamp: '11:02 AM'
        }
      ]
    }
  ],
  aiChatHistory: [
    {
      id: 'ai_msg_01',
      sender: 'ai',
      mode: 'Explain Mode',
      text: 'Welcome back, Alexander! I noticed you are preparing for **CSC301: Design & Analysis of Algorithms** and your recent diagnostic test showed a slight struggle with *Fibonacci Heap Decrease-Key* operations. What concept would you like to master today?',
      timestamp: 'Today at 09:15 AM'
    }
  ],
  notifications: [
    {
      id: 'notif_1',
      category: 'Marketplace',
      title: 'Upcoming Session with Dr. Elena',
      message: 'Your 1-on-1 Algorithms tutoring session begins tomorrow at 16:30 in Room ZEGO-ROOM-301-ELENA.',
      time: '25m ago',
      read: false
    },
    {
      id: 'notif_2',
      category: 'Academic',
      title: 'Study Streak Milestone!',
      message: 'You have logged 8 consecutive days on CSC301. Keep going to earn the High Honors Study Badge.',
      time: '3h ago',
      read: false
    },
    {
      id: 'notif_3',
      category: 'Community',
      title: 'Live Study Hall Active',
      message: '4 peers are currently in the CSC301 voice study room reviewing graph traversals.',
      time: '5h ago',
      read: true
    },
    {
      id: 'notif_4',
      category: 'Subscription',
      title: 'Free AI Questions Remaining: 11',
      message: 'Upgrade to Academic Pro for unlimited AI-generated practice tests and voice tutoring.',
      time: '1d ago',
      read: true
    }
  ],
  adminStats: {
    totalStudents: 1,
    totalTutors: 0,
    activeGroups: 0,
    sessionsCompletedThisMonth: 0,
    mrr: 0,
    pendingTutorApprovals: [],
    moderationQueue: []
  }
};

class PlatformStore {
  constructor() {
    this.state = this.loadState();
    this.listeners = new Set();
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
      }
      return { ...INITIAL_STATE, ...JSON.parse(serialized) };
    } catch (e) {
      console.warn('Failed to parse stored academic platform state, resetting to initial', e);
      return INITIAL_STATE;
    }
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to persist academic state to local storage', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  getState() {
    return this.state;
  }

  // Role management
  setRole(role) {
    this.state.currentRole = role;
    this.saveState();
  }

  // Profile update
  updateProfile(updates) {
    this.state.userProfile = { ...this.state.userProfile, ...updates };
    this.saveState();
  }

  // CGPA Operations
  setGradingScale(scaleKey) {
    if (this.state.cgpaConfig.scales[scaleKey]) {
      this.state.cgpaConfig.selectedScale = scaleKey;
      this.saveState();
    }
  }

  addSemester(semesterData) {
    const newSemester = {
      id: 'sem_' + Date.now(),
      academicYear: semesterData.academicYear || 'Year 3',
      semester: semesterData.semester || 'Second Semester',
      courses: semesterData.courses || []
    };
    this.state.academicHistory.push(newSemester);
    this.saveState();
  }

  deleteSemester(semesterId) {
    this.state.academicHistory = this.state.academicHistory.filter(s => s.id !== semesterId);
    this.saveState();
  }

  duplicateSemester(semesterId) {
    const source = this.state.academicHistory.find(s => s.id === semesterId);
    if (!source) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'sem_' + Date.now(),
      semester: `${source.semester} (Copy)`
    };
    this.state.academicHistory.push(duplicated);
    this.saveState();
  }

  addCourse(semesterId, course) {
    const sem = this.state.academicHistory.find(s => s.id === semesterId);
    if (sem) {
      sem.courses.push({
        code: course.code.toUpperCase().trim(),
        title: course.title.trim(),
        units: Number(course.units) || 3,
        grade: course.grade || 'A'
      });
      this.saveState();
    }
  }

  updateCourse(semesterId, courseIndex, updatedCourse) {
    const sem = this.state.academicHistory.find(s => s.id === semesterId);
    if (sem && sem.courses[courseIndex]) {
      sem.courses[courseIndex] = {
        ...sem.courses[courseIndex],
        ...updatedCourse,
        code: updatedCourse.code ? updatedCourse.code.toUpperCase().trim() : sem.courses[courseIndex].code,
        units: Number(updatedCourse.units) || sem.courses[courseIndex].units
      };
      this.saveState();
    }
  }

  deleteCourse(semesterId, courseIndex) {
    const sem = this.state.academicHistory.find(s => s.id === semesterId);
    if (sem) {
      sem.courses.splice(courseIndex, 1);
      this.saveState();
    }
  }

  // Study Plan Operations
  addStudyPlan(plan) {
    const newPlan = {
      id: 'plan_' + Date.now(),
      subject: plan.subject,
      goal: plan.goal,
      deadline: plan.deadline,
      frequency: plan.frequency || 'Daily',
      difficulty: plan.difficulty || 'Medium',
      estimatedHours: Number(plan.estimatedHours) || 20,
      loggedHours: 0,
      streakDays: 1,
      topics: (plan.topics || []).map((t, idx) => ({
        id: `t_${Date.now()}_${idx}`,
        title: typeof t === 'string' ? t : t.title,
        completed: false
      }))
    };
    this.state.studyPlans.unshift(newPlan);
    this.saveState();
  }

  toggleTopic(planId, topicId) {
    const plan = this.state.studyPlans.find(p => p.id === planId);
    if (plan) {
      const topic = plan.topics.find(t => t.id === topicId);
      if (topic) {
        topic.completed = !topic.completed;
        this.saveState();
      }
    }
  }

  logStudyHours(planId, hours) {
    const plan = this.state.studyPlans.find(p => p.id === planId);
    if (plan) {
      plan.loggedHours = Number((plan.loggedHours + Number(hours)).toFixed(1));
      this.saveState();
    }
  }

  deleteStudyPlan(planId) {
    this.state.studyPlans = this.state.studyPlans.filter(p => p.id !== planId);
    this.saveState();
  }

  // Test Prep Operations
  saveTestAttempt(attempt) {
    const newAttempt = {
      id: 'att_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...attempt
    };
    this.state.pastAttempts.unshift(newAttempt);
    this.saveState();
  }

  // Booking Operations
  createBooking(booking) {
    const newBooking = {
      id: 'bk_' + Date.now(),
      roomCode: `ZEGO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      status: 'confirmed',
      ...booking
    };
    this.state.bookings.unshift(newBooking);
    
    // Add confirmation notification
    this.state.notifications.unshift({
      id: 'notif_' + Date.now(),
      category: 'Marketplace',
      title: 'Session Booked Confirmed!',
      message: `Your session with ${booking.tutorName} on ${booking.subject} is set for ${booking.date}.`,
      time: 'Just now',
      read: false
    });

    this.saveState();
    return newBooking;
  }

  cancelBooking(bookingId) {
    const bk = this.state.bookings.find(b => b.id === bookingId);
    if (bk) {
      bk.status = 'cancelled';
      this.saveState();
    }
  }

  // Study Groups
  joinGroup(groupId) {
    const grp = this.state.studyGroups.find(g => g.id === groupId);
    if (grp) {
      grp.membersCount += 1;
      this.saveState();
    }
  }

  addGroupDiscussion(groupId, content) {
    const grp = this.state.studyGroups.find(g => g.id === groupId);
    if (grp) {
      grp.discussions.push({
        id: 'dsc_' + Date.now(),
        author: `${this.state.userProfile.name} (You)`,
        avatar: this.state.userProfile.avatar,
        time: 'Just now',
        content
      });
      this.saveState();
    }
  }

  createStudyGroup(groupData) {
    const newGroup = {
      id: 'grp_' + Date.now(),
      name: groupData.name,
      description: groupData.description,
      subject: groupData.subject,
      level: groupData.level || 'All Levels',
      membersCount: 1,
      isPublic: groupData.isPublic !== false,
      activeCall: false,
      discussions: [
        {
          id: 'dsc_init',
          author: `${this.state.userProfile.name} (Founder)`,
          avatar: this.state.userProfile.avatar,
          time: 'Just now',
          content: `Welcome to ${groupData.name}! Feel free to share resources and start discussions.`
        }
      ],
      resources: []
    };
    this.state.studyGroups.unshift(newGroup);
    this.saveState();
  }

  // Direct Chat
  sendMessage(peerId, text) {
    let dm = this.state.directMessages.find(d => d.peerId === peerId);
    if (!dm) {
      const tutor = this.state.tutors.find(t => t.id === peerId);
      dm = {
        id: 'dm_' + peerId,
        peerId,
        peerName: tutor ? tutor.name : 'Study Peer',
        peerAvatar: tutor ? tutor.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80',
        peerRole: tutor ? 'Tutor' : 'Student',
        online: true,
        messages: []
      };
      this.state.directMessages.push(dm);
    }
    dm.messages.push({
      id: 'm_' + Date.now(),
      senderId: this.state.userProfile.id,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveState();
  }

  // AI Tutor message
  addAiMessage(sender, text, mode = 'Explain Mode') {
    this.state.aiChatHistory.push({
      id: 'ai_' + Date.now(),
      sender,
      text,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (sender === 'user') {
      this.state.subscription.aiQuestionsUsed += 1;
    }
    this.saveState();
  }

  // Subscription upgrade
  upgradeSubscription(planName) {
    this.state.subscription.plan = planName;
    this.state.subscription.aiQuestionsLimit = planName === 'pro' ? 500 : 2000;
    this.state.notifications.unshift({
      id: 'notif_sub_' + Date.now(),
      category: 'Subscription',
      title: 'Academic Pro Activated!',
      message: 'You have unlocked unlimited AI tutoring, simulated exams, and HD video calls.',
      time: 'Just now',
      read: false
    });
    this.saveState();
  }

  // Mark notification read
  markNotificationsAsRead() {
    this.state.notifications.forEach(n => { n.read = true; });
    this.saveState();
  }

  // Reset to initial state
  resetData() {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
  }
}

export const platformStore = new PlatformStore();
