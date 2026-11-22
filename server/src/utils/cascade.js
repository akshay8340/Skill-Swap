import User from '../models/User.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import Progress from '../models/Progress.js';
import StudyPost from '../models/StudyPost.js';
import Report from '../models/Report.js';

export async function recomputeRating(userId) {
  const [agg] = await Review.aggregate([
    { $match: { to: userId } },
    { $group: { _id: '$to', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await User.updateOne(
    { _id: userId },
    { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.count : 0 }
  );
}

// Removes a user and everything that only makes sense with them: sessions, chats, reviews, progress, study requests.
export async function deleteUserData(userId) {
  const sessionIds = await Session.find({ $or: [{ teacher: userId }, { learner: userId }] }).distinct('_id');
  const reviewedPeople = await Review.find({ from: userId }).distinct('to');
  const postIds = await StudyPost.find({ owner: userId }).distinct('_id');

  await Message.deleteMany({ session: { $in: sessionIds } });
  await Review.deleteMany({ $or: [{ from: userId }, { to: userId }, { session: { $in: sessionIds } }] });
  await Progress.deleteMany({ $or: [{ learner: userId }, { teacher: userId }] });
  await Session.deleteMany({ _id: { $in: sessionIds } });
  await Report.deleteMany({
    $or: [{ reporter: userId }, { targetType: 'user', targetId: userId }, { targetType: 'studypost', targetId: { $in: postIds } }],
  });
  await StudyPost.deleteMany({ owner: userId });
  await User.deleteOne({ _id: userId });

  // Reviews this person gave counted towards other people's ratings.
  for (const id of reviewedPeople) if (String(id) !== String(userId)) await recomputeRating(id);
}
