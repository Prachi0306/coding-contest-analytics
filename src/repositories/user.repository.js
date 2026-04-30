const User = require('../models/User');


class UserRepository {

  async create(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }


  async findById(id, select = '') {
    return User.findById(id).select(select);
  }


  async findByEmail(email) {
    return User.findByEmail(email);
  }


  async findByUsername(username) {
    return User.findByUsername(username);
  }


  async findByCredentials(identifier) {
    return User.findByCredentials(identifier);
  }


  async emailExists(email) {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }


  async usernameExists(username) {
    const count = await User.countDocuments({ username });
    return count > 0;
  }


  async updateLastLogin(id) {
    return User.findByIdAndUpdate(
      id,
      { lastLogin: new Date() },
      { new: true }
    );
  }


  async updatePassword(id, newPassword) {
    const user = await User.findById(id).select('+password');
    if (!user) return null;
    user.password = newPassword;
    await user.save();
    return user;
  }


  async updateHandles(id, handles) {
    const update = {};
    if (handles.codeforces !== undefined) update['handles.codeforces'] = handles.codeforces;
    if (handles.leetcode !== undefined) update['handles.leetcode'] = handles.leetcode;

    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }


  async updatePlatformHandles(id, platformHandles) {
    const update = {};
    if (platformHandles.codeforces !== undefined) {
      update['platformHandles.codeforces'] = platformHandles.codeforces;
    }
    if (platformHandles.leetcode !== undefined) {
      update['platformHandles.leetcode'] = platformHandles.leetcode;
    }
    if (platformHandles.codechef !== undefined) {
      update['platformHandles.codechef'] = platformHandles.codechef;
    }

    if (Object.keys(update).length === 0) return this.findById(id);

    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }


  async addFriend(userId, friendId) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { friends: friendId } },
      { new: true }
    );
  }


  async removeFriend(userId, friendId) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { friends: friendId } },
      { new: true }
    );
  }


  async getFriends(userId) {
    return User.findById(userId)
      .populate('friends', 'username handles createdAt')
      .select('friends');
  }
}

module.exports = new UserRepository();
