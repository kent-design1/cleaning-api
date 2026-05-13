import jwt from 'jsonwebtoken'
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";

const protect = asyncHandler(async (req, res, next) => {
    let token

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        res.status(401)
        throw new Error('Not authorized, no token')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password -refreshTokens')

    if (!user) {
        res.status(401)
        throw new Error('User no longer exists')
    }

    if (user.isBanned) {
        res.status(403)
        throw new Error('Your account has been banned')
    }

    if (!user.isActive) {
        res.status(403)
        throw new Error('Your account is inactive')
    }

    req.user = user
    next()
})

export { protect }