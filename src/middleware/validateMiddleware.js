import Joi from 'joi'

// Takes a Joi schema, returns middleware that validates req.body
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })

    if (error) {
        const errors = error.details.map(d => d.message)
        res.status(400)
        return next(new Error(errors.join(', ')))
    }

    next()
}

// ── Validation schemas ──────────────────────────────────

export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().optional(),
    role: Joi.string().valid('customer', 'cleaner').optional()
})

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
})

export const jobSchema = Joi.object({
    title: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    serviceType: Joi.string().valid(
        'standard_cleaning', 'deep_cleaning', 'move_in_out',
        'office_cleaning', 'laundry', 'ironing', 'window_cleaning'
    ).required(),
    address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        postcode: Joi.string().required(),
        country: Joi.string().optional(),
        coordinates: Joi.object({
            lat: Joi.number().optional(),
            lng: Joi.number().optional()
        }).optional()
    }).required(),
    scheduledDate: Joi.date().greater('now').required(),
    scheduledTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
    estimatedHours: Joi.number().min(0.5).max(24).required(),
    budget: Joi.number().min(0).optional()
})

export const applicationSchema = Joi.object({
    coverLetter: Joi.string().min(20).max(500).required(),
    proposedRate: Joi.number().min(0).optional()
})

export default validate