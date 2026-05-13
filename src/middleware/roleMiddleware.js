// Usage: authorize('admin') or authorize('customer', 'admin')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            res.status(403)
            throw new Error(
                `Role '${req.user.role}' is not authorized for this action`
            )
        }
        next()
    }
}

export { authorize }