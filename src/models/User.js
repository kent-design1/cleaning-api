
import bcrypt from 'bcryptjs';
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false    // never returned in queries unless explicitly asked
    },
    phone: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['customer', 'cleaner', 'admin'],
      default: 'customer'
    },
    profilePhoto: {
      type: String,
      default: null
    },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    // Password reset
    passwordResetToken: String,
    passwordResetExpire: Date,

    // Account status
    isActive: {
      type: Boolean,
      default: true
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    bannedReason: String,

    // Refresh tokens stored server-side for invalidation
    refreshTokens: [String]
  },
  {
    timestamps: true
  }
)

// Hash password before saving
// ✅ Correct — regular function keeps "this" pointing to the document
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare passwords — called as user.matchPassword(enteredPassword)
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

// Index for fast lookups
// UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })

const User = mongoose.model("User", UserSchema)

export default User