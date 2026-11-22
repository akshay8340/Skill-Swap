// DEVELOPMENT ONLY. Adds demo students, sessions, reviews and study requests, all flagged isDemo so they can be
// removed in one go (npm run clear-demo, or the admin panel). Real accounts are never touched.
// Every demo user has the password "password123"; log in as demo@bitmesra.ac.in. Addresses are placeholders.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Session from './models/Session.js';
import Review from './models/Review.js';
import Progress from './models/Progress.js';
import StudyPost from './models/StudyPost.js';
import Message from './models/Message.js';
import { deleteUserData } from './utils/cascade.js';

const weekdays = (start, end, days = [1, 2, 3, 4, 5]) => days.map((day) => ({ day, start, end }));
const skill = (name, category, level, topics = [], price = '') => ({ name, category, level, topics, paid: !!price, price });

const CSE = 'Computer Science & Engineering';
const IT = 'Information Technology';
const MCA = 'Computer Applications (MCA)';

const people = [
  {
    name: 'Demo Student', email: 'demo@bitmesra.ac.in', programme: 'MCA', department: MCA, year: 2,
    bio: 'Full-stack (MERN) developer. Happy to teach React, keen to learn C++, improve my spoken English and finally land a backflip.',
    offered: [
      skill('React', 'Programming', 'Advanced', ['Hooks', 'State Management', 'Routing']),
      skill('Node.js', 'Programming', 'Intermediate', ['Express', 'REST APIs', 'JWT Auth']),
    ],
    wanted: ['C++', 'Spoken English', 'Gymnastics & Parkour'],
    availability: [...weekdays(18, 21), { day: 6, start: 10, end: 16 }],
  },
  {
    name: 'Riya Sharma', email: 'riya@bitmesra.ac.in', programme: 'B.Tech', department: CSE, year: 3,
    bio: 'Competitive programmer. Enjoy solving problems with a partner.',
    offered: [
      skill('C++', 'Programming', 'Advanced', ['STL', 'Pointers & Memory', 'OOP']),
      skill('DSA', 'Programming', 'Advanced', ['Dynamic Programming', 'Graphs', 'Trees', 'Greedy', 'Recursion & Backtracking']),
    ],
    wanted: ['React'],
    availability: [...weekdays(18, 22, [1, 3, 5]), { day: 6, start: 11, end: 15 }],
  },
  {
    name: 'Karan Singh', email: 'karan@bitmesra.ac.in', programme: 'M.Tech', department: CSE, year: 1,
    bio: 'Data science enthusiast.',
    offered: [
      skill('Python', 'Programming', 'Advanced', ['NumPy & Pandas', 'Automation', 'OOP']),
      skill('Machine Learning', 'Programming', 'Intermediate', ['Regression', 'Classification', 'Neural Networks'], '₹150/hr'),
    ],
    wanted: ['Node.js', 'React'],
    availability: [...weekdays(17, 21, [2, 4]), { day: 6, start: 10, end: 14 }],
  },
  {
    name: 'Sneha Verma', email: 'sneha@bitmesra.ac.in', programme: 'B.Tech', department: 'Electronics & Communication', year: 2,
    bio: 'I like clean interfaces and clear speech. Happy to help with spoken English.',
    offered: [
      skill('UI/UX Design', 'Design & Creative', 'Advanced', ['Wireframing', 'Design Systems', 'Prototyping']),
      skill('Figma', 'Design & Creative', 'Advanced', ['Auto Layout', 'Components'], '₹200/hr'),
      skill('Spoken English', 'Language & Communication', 'Advanced', ['Fluency', 'Pronunciation', 'Interview English', 'Group Discussion']),
    ],
    wanted: ['React', 'Python'],
    availability: [...weekdays(19, 22, [1, 2, 3, 4]), { day: 0, start: 10, end: 13 }],
  },
  {
    name: 'Arjun Mehta', email: 'arjun@bitmesra.ac.in', programme: 'B.Tech', department: IT, year: 4,
    bio: 'Backend and databases. Native Hindi speaker, glad to help others practise.',
    offered: [
      skill('Java', 'Programming', 'Advanced', ['OOP', 'Collections', 'Spring Boot']),
      skill('SQL', 'Programming', 'Advanced', ['Joins', 'Indexes', 'Window Functions']),
      skill('Hindi', 'Language & Communication', 'Advanced', ['Conversation', 'Reading & Writing']),
    ],
    wanted: ['Node.js', 'DSA'],
    availability: [...weekdays(18, 20, [1, 2, 3, 4, 5])],
  },
  {
    name: 'Pooja Kumari', email: 'pooja@bitmesra.ac.in', programme: 'B.Tech', department: 'Chemical', year: 3,
    bio: 'Python automation, Excel and placement preparation.',
    offered: [
      skill('Python', 'Programming', 'Intermediate', ['Basics', 'Automation']),
      skill('Excel', 'Career & Placements', 'Advanced', ['Pivot Tables', 'Dashboards', 'Formulas']),
      skill('Interview Prep', 'Career & Placements', 'Intermediate', ['Resume Review', 'HR Round', 'Aptitude'], '₹100/hr'),
    ],
    wanted: ['C++', 'SQL'],
    availability: [...weekdays(16, 19, [1, 3, 5]), { day: 6, start: 9, end: 12 }],
  },
  {
    name: 'Rahul Das', email: 'rahul@bitmesra.ac.in', programme: 'B.Tech', department: 'Production & Industrial', year: 3,
    bio: 'Gymnast and parkour practitioner. Also play guitar.',
    offered: [
      skill('Gymnastics & Parkour', 'Sports & Fitness', 'Advanced', ['Backflip', 'Handstand', 'Cartwheel', 'Flexibility']),
      skill('Guitar', 'Music & Dance', 'Intermediate', ['Chords', 'Strumming', 'Fingerstyle']),
    ],
    wanted: ['React', 'Node.js'],
    availability: [...weekdays(17, 20, [2, 4, 6]), { day: 0, start: 7, end: 10 }, { day: 6, start: 7, end: 10 }],
  },
  {
    name: 'Ananya Roy', email: 'ananya@bitmesra.ac.in', programme: 'B.Tech', department: CSE, year: 4,
    bio: 'DSA mentor. Preparing for placements and looking to build backends.',
    offered: [
      skill('DSA', 'Programming', 'Advanced', ['Graphs', 'Dynamic Programming', 'Heaps', 'Tries']),
      skill('C++', 'Programming', 'Intermediate', ['STL', 'OOP']),
      skill('Mock Interviews', 'Career & Placements', 'Advanced', ['DSA Round', 'HR Round']),
    ],
    wanted: ['Node.js'],
    availability: [...weekdays(18, 21, [2, 3, 4]), { day: 6, start: 10, end: 14 }],
  },
  {
    // Teaches nothing (yet) and just wants to learn - totally fine.
    name: 'Vikram Nair', email: 'vikram@bitmesra.ac.in', programme: 'B.Tech', department: 'Civil', year: 1,
    bio: 'From Kerala, new to Hindi. Want to settle in and get started with DSA.',
    offered: [],
    wanted: ['Hindi', 'DSA', 'Spoken English'],
    availability: [...weekdays(18, 21, [1, 2, 3, 4, 5]), { day: 6, start: 10, end: 14 }],
  },
  {
    name: 'Mehul Jain', email: 'mehul@bitmesra.ac.in', programme: 'B.Arch', department: 'Architecture', year: 3,
    bio: 'Sketching and swimming are my two ways to switch off.',
    offered: [
      skill('Sketching', 'Design & Creative', 'Advanced', ['Perspective', 'Shading', 'Urban Sketching']),
      skill('Swimming', 'Sports & Fitness', 'Intermediate', ['Freestyle', 'Breathing Technique']),
    ],
    wanted: ['Python', 'Spoken English'],
    availability: [...weekdays(17, 20, [1, 3, 5]), { day: 0, start: 6, end: 9 }],
  },
  {
    name: 'Aisha Khan', email: 'aisha@bitmesra.ac.in', programme: 'B.Pharm', department: 'Pharmaceutical Sciences', year: 2,
    bio: 'Dancer and debater.',
    offered: [
      skill('Dance', 'Music & Dance', 'Advanced', ['Hip-hop', 'Classical Basics', 'Choreography']),
      skill('Public Speaking', 'Language & Communication', 'Advanced', ['Stage Presence', 'Debate', 'Extempore']),
    ],
    wanted: ['DSA', 'Python'],
    availability: [...weekdays(18, 21, [1, 2, 4]), { day: 6, start: 15, end: 18 }],
  },
];

// Demo accounts are fake people. Never add them to a live site by accident.
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to add demo accounts in production. Re-run with --force if you really want them.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI);

// Only previous DEMO data is replaced. Real accounts are never touched.
// Remove it any time with:  npm run clear-demo   (or from the admin panel).
// (Also matches the demo emails, so demo users created before the isDemo flag existed are replaced, not duplicated.)
const oldDemoIds = await User.find({ $or: [{ isDemo: true }, { email: { $in: people.map((p) => p.email) } }] }).distinct('_id');
for (const id of oldDemoIds) await deleteUserData(id);

const hash = await bcrypt.hash('password123', 10);
const users = await User.insertMany(people.map((p) => ({ ...p, password: hash, isDemo: true })));
const by = Object.fromEntries(users.map((u) => [u.email.split('@')[0], u]));

const daysFromNow = (d, hour) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date;
};

// Study-together requests (1-to-1, sit down and learn live).
const post = (owner, subject, topics, note) => StudyPost.create({ owner: by[owner]._id, subject, topics, note });
const riyaDsa = await post('riya', 'DSA', ['Binary Search', 'Two Pointers', 'Sliding Window', 'Dynamic Programming'],
  'Solving LeetCode mediums together on weekends. Think out loud, discuss approaches.');
await post('vikram', 'DSA', ['Arrays', 'Linked Lists', 'Stacks & Queues'], 'Just starting. Looking for a patient partner to go through the basics.');
await post('ananya', 'System Design', ['Load Balancing', 'Caching', 'Databases at Scale'], 'Preparing for placements. Explain concepts to each other.');
await post('pooja', 'SQL', ['Joins', 'Indexes', 'Window Functions'], 'Practising for interviews.');
await post('aisha', 'Python', ['Basics', 'Loops & Functions'], 'Complete beginner. Would like to learn alongside someone.');
const demoOs = await post('demo', 'Operating Systems', ['Processes & Threads', 'Scheduling', 'Deadlocks', 'Paging'], 'Revising for end-semester exams.');

// Past completed sessions (with reviews) so ratings and history look real.
const history = [
  { kind: 'learn', teacher: 'demo', learner: 'riya', skill: 'React', topic: 'Hooks', when: daysFromNow(-9, 18), rating: [5, 5] },
  { kind: 'learn', teacher: 'riya', learner: 'demo', skill: 'C++', topic: 'STL', when: daysFromNow(-7, 19), rating: [5, 4] },
  { kind: 'learn', teacher: 'karan', learner: 'demo', skill: 'Python', when: daysFromNow(-5, 18), rating: [4, 5] },
  { kind: 'learn', teacher: 'demo', learner: 'karan', skill: 'Node.js', topic: 'JWT Auth', when: daysFromNow(-4, 18), rating: [5, 4] },
  { kind: 'learn', teacher: 'ananya', learner: 'arjun', skill: 'DSA', topic: 'Graphs', when: daysFromNow(-6, 18), rating: [5, 4] },
  { kind: 'learn', teacher: 'sneha', learner: 'rahul', skill: 'Figma', when: daysFromNow(-3, 20), rating: [4, 4] },
  { kind: 'costudy', teacher: 'riya', learner: 'demo', skill: 'DSA', when: daysFromNow(-2, 18), rating: [5, 5], post: riyaDsa._id },
];

for (const h of history) {
  const session = await Session.create({
    kind: h.kind, post: h.post, topic: h.topic || '',
    teacher: by[h.teacher]._id, learner: by[h.learner]._id, skill: h.skill,
    startsAt: h.when, durationHours: 1, status: 'completed',
  });
  await Review.create({ session: session._id, from: by[h.learner]._id, to: by[h.teacher]._id, rating: h.rating[0], comment: 'Clear, patient and well prepared.' });
  await Review.create({ session: session._id, from: by[h.teacher]._id, to: by[h.learner]._id, rating: h.rating[1], comment: 'Came prepared and asked good questions.' });
}

// Upcoming: one accepted session, one request for the demo user to answer, one study-together request.
const upcoming = await Session.create({
  teacher: by.riya._id, learner: by.demo._id, skill: 'DSA', topic: 'Dynamic Programming', startsAt: daysFromNow(1, 19),
  durationHours: 1, status: 'accepted',
});
await Message.insertMany([
  { session: upcoming._id, from: by.demo._id, text: 'Hi Riya, looking forward to the DP session. Should I prepare anything?' },
  { session: upcoming._id, from: by.riya._id, text: 'Hi! Just revise recursion and memoization basics. We will start with Knapsack.' },
]);
await Session.create({
  teacher: by.demo._id, learner: by.sneha._id, skill: 'React', topic: 'Hooks', startsAt: daysFromNow(2, 20),
  durationHours: 1, status: 'pending', note: 'I know basic JavaScript. Want to get comfortable with hooks.',
});
await Session.create({
  kind: 'costudy', post: demoOs._id, teacher: by.demo._id, learner: by.vikram._id, skill: 'Operating Systems',
  startsAt: daysFromNow(3, 19), durationHours: 2, status: 'pending', note: 'Same syllabus, would love to revise together.',
});

await Progress.create({
  learner: by.demo._id, teacher: by.riya._id, skill: 'C++',
  topics: [
    { title: 'STL', done: true },
    { title: 'Pointers & references', done: true },
    { title: 'Templates', done: false },
    { title: 'Smart pointers', done: false },
  ],
});
await Progress.create({
  learner: by.demo._id, teacher: by.riya._id, skill: 'DSA',
  topics: [{ title: 'Dynamic Programming', done: false }],
});
await Progress.create({
  learner: by.karan._id, teacher: by.demo._id, skill: 'Node.js',
  topics: [{ title: 'Express routing', done: true }, { title: 'JWT Auth', done: true }, { title: 'Error handling', done: false }],
});

// Recompute ratings from the reviews.
for (const u of users) {
  const reviews = await Review.find({ to: u._id });
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : 0;
  await User.updateOne({ _id: u._id }, { ratingAvg: avg, ratingCount: count });
}

console.log(`Seeded ${users.length} users. Login: demo@bitmesra.ac.in / password123`);
await mongoose.disconnect();
