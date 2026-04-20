const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Constants ──────────────────────────────────────────

const SALT_ROUNDS = 12;

// ─── Schema Definition ─────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email must not exceed 255 characters'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Username may only contain letters, numbers, underscores, and hyphens',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password must not exceed 128 characters'],
      select: false, // Exclude from query results by default
    },

    handles: {
      codeforces: {
        type: String,
        trim: true,
        maxlength: [64, 'Codeforces handle must not exceed 64 characters'],
        match: [
          /^[a-zA-Z0-9_.-]*$/,
          'Codeforces handle may only contain letters, numbers, underscores, dots, and hyphens',
        ],
        default: '',
      },
      leetcode: {
        type: String,
        trim: true,
        maxlength: [64, 'LeetCode handle must not exceed 64 characters'],
        match: [
          /^[a-zA-Z0-9_.-]*$/,
          'LeetCode handle may only contain letters, numbers, underscores, dots, and hyphens',
        ],
        default: '',
      },
    },

    // ─── NEW: Multi-Platform Handles ─────────────────
    // Separate from legacy "handles" for backward compatibility.
    // Each field is optional — partial connections are allowed.
    platformHandles: {
      codeforces: {
        type: String,
        trim: true,
        maxlength: [64, 'Codeforces handle must not exceed 64 characters'],
        match: [
          /^[a-zA-Z0-9_.-]*$/,
          'Codeforces handle may only contain letters, numbers, underscores, dots, and hyphens',
        ],
        default: '',
      },
      leetcode: {
        type: String,
        trim: true,
        maxlength: [64, 'LeetCode handle must not exceed 64 characters'],
        match: [
          /^[a-zA-Z0-9_.-]*$/,
          'LeetCode handle may only contain letters, numbers, underscores, dots, and hyphens',
        ],
        default: '',
      },
      codechef: {
        type: String,
        trim: true,
        maxlength: [64, 'CodeChef handle must not exceed 64 characters'],
        match: [
          /^[a-zA-Z0-9_]*$/,
          'CodeChef handle may only contain letters, numbers, and underscores',
        ],
        default: '',
      },
    },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      transform(doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ────────────────────────────────────────────

// Compound text index for user search
userSchema.index({ username: 'text', email: 'text' });

// Index on handles for platform-based lookups
userSchema.index({ 'handles.codeforces': 1 }, { sparse: true });
userSchema.index({ 'handles.leetcode': 1 }, { sparse: true });

// Indexes for new platformHandles fields
userSchema.index({ 'platformHandles.codeforces': 1 }, { sparse: true });
userSchema.index({ 'platformHandles.leetcode': 1 }, { sparse: true });
userSchema.index({ 'platformHandles.codechef': 1 }, { sparse: true });

// Index on friends for efficient friend list queries
userSchema.index({ friends: 1 });

// Index for active user filtering
userSchema.index({ isActive: 1, createdAt: -1 });

// ─── Pre-save Middleware ────────────────────────────────

/**
 * Hash password before saving to the database.
 * Only runs when the password field has been modified.
 */
userSchema.pre('save', async function (next) {
  // Skip if password hasn't been modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

// ─── Instance Methods ───────────────────────────────────

/**
 * Compare a candidate password against the stored hash.
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if a user is already friends with another user.
 * @param {mongoose.Types.ObjectId|string} userId - ID of the potential friend
 * @returns {boolean} True if already friends
 */
userSchema.methods.isFriendWith = function (userId) {
  return this.friends.some(
    (friendId) => friendId.toString() === userId.toString()
  );
};

/**
 * Get public profile (safe to expose in API responses).
 * @returns {object} Sanitized user object
 */
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    handles: this.handles,             // legacy — kept for backward compat
    platformHandles: this.platformHandles, // new multi-platform field
    createdAt: this.createdAt,
  };
};

// ─── Static Methods ─────────────────────────────────────

/**
 * Find a user by email address.
 * @param {string} email
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find a user by username.
 * @param {string} username
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};

/**
 * Find a user by email or username (for flexible login).
 * Explicitly selects the password field for authentication.
 * @param {string} identifier - Email or username
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByCredentials = function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier },
    ],
  }).select('+password');
};

/**
 * Find a user by their platform handle.
 * @param {string} platform - 'codeforces' or 'leetcode'
 * @param {string} handle - Platform username
 * @returns {Promise<Document|null>}
 */
userSchema.statics.findByHandle = function (platform, handle) {
  // Search both legacy handles and new platformHandles
  return this.findOne({
    $or: [
      { [`handles.${platform}`]: handle },
      { [`platformHandles.${platform}`]: handle },
    ],
  });
};

// ─── Model ──────────────────────────────────────────────

const User = mongoose.model('User', userSchema);

module.exports = User;
