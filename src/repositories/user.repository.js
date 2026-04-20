const User = require('../models/User');

/**
 * User Repository — Data access layer for User model.
 * All direct database operations on users live here.
 * Services should use this instead of calling Model methods directly.
 */
class UserRepository {
  /**
   * Create a new user document.
   * @param {object} userData - { email, username, password, handles }
   * @returns {Promise<Document>} Created user (password excluded)
   */
  async create(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  /**
   * Find a user by their ID.
   * @param {string} id - MongoDB ObjectId
   * @param {string} [select] - Fields to select (e.g. '+password')
   * @returns {Promise<Document|null>}
   */
  async findById(id, select = '') {
    return User.findById(id).select(select);
  }

  /**
   * Find a user by email.
   * @param {string} email
   * @returns {Promise<Document|null>}
   */
  async findByEmail(email) {
    return User.findByEmail(email);
  }

  /**
   * Find a user by username.
   * @param {string} username
   * @returns {Promise<Document|null>}
   */
  async findByUsername(username) {
    return User.findByUsername(username);
  }

  /**
   * Find a user by email or username, including the password field.
   * Used exclusively for authentication flows.
   * @param {string} identifier - Email or username
   * @returns {Promise<Document|null>}
   */
  async findByCredentials(identifier) {
    return User.findByCredentials(identifier);
  }

  /**
   * Check if a user with the given email already exists.
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Check if a user with the given username already exists.
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  async usernameExists(username) {
    const count = await User.countDocuments({ username });
    return count > 0;
  }

  /**
   * Update a user's last login timestamp.
   * @param {string} id - User ID
   * @returns {Promise<Document|null>}
   */
  async updateLastLogin(id) {
    return User.findByIdAndUpdate(
      id,
      { lastLogin: new Date() },
      { new: true }
    );
  }

  /**
   * Update a user's password.
   * Must fetch the user and use save() to trigger the pre-save hash hook.
   * @param {string} id - User ID
   * @param {string} newPassword - Plain text new password
   * @returns {Promise<Document>}
   */
  async updatePassword(id, newPassword) {
    const user = await User.findById(id).select('+password');
    if (!user) return null;
    user.password = newPassword;
    await user.save();
    return user;
  }

  /**
   * Update user handles (coding platform usernames).
   * @param {string} id - User ID
   * @param {object} handles - { codeforces, leetcode }
   * @returns {Promise<Document|null>}
   */
  async updateHandles(id, handles) {
    const update = {};
    if (handles.codeforces !== undefined) update['handles.codeforces'] = handles.codeforces;
    if (handles.leetcode !== undefined) update['handles.leetcode'] = handles.leetcode;

    return User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  }

  /**
   * Update user platformHandles (multi-platform handles).
   * Only updates fields that are explicitly provided.
   * @param {string} id - User ID
   * @param {object} platformHandles - { codeforces?, leetcode?, codechef? }
   * @returns {Promise<Document|null>}
   */
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

  /**
   * Add a friend to the user's friend list.
   * @param {string} userId - User ID
   * @param {string} friendId - Friend's User ID
   * @returns {Promise<Document|null>}
   */
  async addFriend(userId, friendId) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { friends: friendId } },
      { new: true }
    );
  }

  /**
   * Remove a friend from the user's friend list.
   * @param {string} userId - User ID
   * @param {string} friendId - Friend's User ID
   * @returns {Promise<Document|null>}
   */
  async removeFriend(userId, friendId) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { friends: friendId } },
      { new: true }
    );
  }

  /**
   * Get a user's friend list, populated with basic info.
   * @param {string} userId - User ID
   * @returns {Promise<Document|null>}
   */
  async getFriends(userId) {
    return User.findById(userId)
      .populate('friends', 'username handles createdAt')
      .select('friends');
  }
}

module.exports = new UserRepository();
