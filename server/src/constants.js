// Initial values only. On first start they are copied into the database (Config collection) and from then on
// the administrators edit them in the admin panel. Nothing below is read at request time except LEVELS.
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const DEFAULT_CONFIG = {
  categories: [
    'Programming', 'Academics', 'Language & Communication', 'Design & Creative', 'Music & Dance',
    'Sports & Fitness', 'Career & Placements', 'Life Skills', 'Other',
  ],
  programmes: ['B.Tech', 'M.Tech', 'MCA', 'MBA', 'B.Arch', 'B.Pharm', 'M.Sc', 'Ph.D', 'Other'],
  departments: [
    { name: 'Computer Science & Engineering', short: 'CSE' },
    { name: 'Information Technology', short: 'IT' },
    { name: 'Computer Applications (MCA)', short: 'MCA' },
    { name: 'Electronics & Communication', short: 'ECE' },
    { name: 'Electrical & Electronics', short: 'EEE' },
    { name: 'Mechanical', short: 'Mech' },
    { name: 'Civil', short: 'Civil' },
    { name: 'Production & Industrial', short: 'Production' },
    { name: 'Chemical', short: 'Chemical' },
    { name: 'Biotechnology', short: 'Biotech' },
    { name: 'Pharmaceutical Sciences', short: 'Pharm' },
    { name: 'Architecture', short: 'Arch' },
    { name: 'Management', short: 'Mgmt' },
    { name: 'Applied Sciences', short: 'Sciences' },
    { name: 'Other', short: '' },
  ],
  // Ideas offered while a teacher adds topics. Matched by "skill name contains keyword".
  topicSuggestions: [
    { keyword: 'dsa', topics: ['Arrays & Strings', 'Recursion & Backtracking', 'Sorting & Searching', 'Linked List', 'Stack & Queue', 'Trees', 'Graphs', 'Dynamic Programming', 'Greedy', 'Heaps', 'Tries', 'Bit Manipulation'] },
    { keyword: 'c++', topics: ['STL', 'Pointers & Memory', 'OOP', 'Templates', 'Competitive Programming'] },
    { keyword: 'java', topics: ['OOP', 'Collections', 'Multithreading', 'Spring Boot'] },
    { keyword: 'python', topics: ['Basics', 'OOP', 'NumPy & Pandas', 'Automation', 'Data Visualisation'] },
    { keyword: 'react', topics: ['Hooks', 'State Management', 'Routing', 'Performance'] },
    { keyword: 'node', topics: ['Express', 'REST APIs', 'JWT Auth', 'MongoDB'] },
    { keyword: 'sql', topics: ['Joins', 'Indexes', 'Window Functions', 'Query Optimisation'] },
    { keyword: 'machine learning', topics: ['Regression', 'Classification', 'Neural Networks', 'Model Evaluation'] },
    { keyword: 'english', topics: ['Fluency', 'Pronunciation', 'Vocabulary', 'Interview English', 'Group Discussion'] },
    { keyword: 'speaking', topics: ['Stage Presence', 'Debate', 'Extempore'] },
    { keyword: 'gymnastics', topics: ['Backflip', 'Front Flip', 'Handstand', 'Cartwheel', 'Flexibility'] },
    { keyword: 'swimming', topics: ['Freestyle', 'Breaststroke', 'Breathing Technique'] },
    { keyword: 'guitar', topics: ['Chords', 'Strumming', 'Fingerstyle', 'Songs'] },
    { keyword: 'dance', topics: ['Hip-hop', 'Classical Basics', 'Choreography'] },
    { keyword: 'interview', topics: ['Resume Review', 'HR Round', 'Aptitude', 'DSA Round'] },
  ],
  // Meeting links people may share in a session. Anything else is rejected (protects against phishing links).
  meetingHosts: [
    'meet.google.com', 'zoom.us', 'teams.microsoft.com', 'teams.live.com',
    'jiomeet.com', 'jiomeetpro.jio.com', 'webex.com', 'whereby.com', 'meet.jit.si',
  ],
  allowedEmailDomains: [], // empty = anyone can sign up
  announcement: { text: '', active: false },
};
