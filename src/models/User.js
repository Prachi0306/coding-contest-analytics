const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const SALT_ROUNDS = 12;


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
      select: false,
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
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
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


userSchema.index({ username: 'text', email: 'text' });

userSchema.index({ 'handles.codeforces': 1 }, { sparse: true });
userSchema.index({ 'handles.leetcode': 1 }, { sparse: true });

userSchema.index({ 'platformHandles.codeforces': 1 }, { sparse: true });
userSchema.index({ 'platformHandles.leetcode': 1 }, { sparse: true });
userSchema.index({ 'platformHandles.codechef': 1 }, { sparse: true });

userSchema.index({ friends: 1 });

userSchema.index({ isActive: 1, createdAt: -1 });



userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});



userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


userSchema.methods.isFriendWith = function (userId) {
  return this.friends.some(
    (friendId) => friendId.toString() === userId.toString()
  );
};


userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    handles: this.handles,
    platformHandles: this.platformHandles,
    createdAt: this.createdAt,
  };
};



userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};


userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};


userSchema.statics.findByCredentials = function (identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier },
    ],
  }).select('+password');
};


userSchema.statics.findByHandle = function (platform, handle) {
  return this.findOne({
    $or: [
      { [`handles.${platform}`]: handle },
      { [`platformHandles.${platform}`]: handle },
    ],
  });
};


const User = mongoose.model('User', userSchema);

module.exports = User;
