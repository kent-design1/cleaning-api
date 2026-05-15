import Joi from 'joi'

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, {
        abortEarly: false,      // collect ALL errors not just first one
        stripUnknown: true      // silently remove fields not in schema
    })

    if (error) {
        const errors = error.details.map(d => d.message)
        res.status(400)
        return next(new Error(errors.join(', ')))
    }

    next()
}

// ── Auth schemas ────────────────────────────────────────

export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required()
        .messages({ 'string.min': 'Name must be at least 2 characters' }),
    email: Joi.string().email().required()
        .messages({ 'string.email': 'Please provide a valid email' }),
    password: Joi.string().min(6).required()
        .messages({ 'string.min': 'Password must be at least 6 characters' }),
    phone: Joi.string().pattern(/^[+\d\s()-]{7,20}$/).optional()
        .messages({ 'string.pattern.base': 'Please provide a valid phone number' }),
    role: Joi.string().valid('customer', 'cleaner').optional()
})

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
})

export const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
})

export const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required()
})

// ── Job schemas ─────────────────────────────────────────

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
            lat: Joi.number().min(-90).max(90).optional(),
            lng: Joi.number().min(-180).max(180).optional()
        }).optional()
    }).required(),
    scheduledDate: Joi.date().greater('now').required()
        .messages({ 'date.greater': 'Scheduled date must be in the future' }),
    scheduledTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required()
        .messages({ 'string.pattern.base': 'Time must be in HH:MM format' }),
    estimatedHours: Joi.number().min(0.5).max(24).required(),
    budget: Joi.number().min(0).optional()
})

export const updateJobSchema = Joi.object({
    title: Joi.string().min(5).max(100).optional(),
    description: Joi.string().min(10).max(1000).optional(),
    serviceType: Joi.string().valid(
        'standard_cleaning', 'deep_cleaning', 'move_in_out',
        'office_cleaning', 'laundry', 'ironing', 'window_cleaning'
    ).optional(),
    address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        postcode: Joi.string().required(),
        country: Joi.string().optional()
    }).optional(),
    scheduledDate: Joi.date().greater('now').optional(),
    scheduledTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    estimatedHours: Joi.number().min(0.5).max(24).optional(),
    budget: Joi.number().min(0).optional()
})

// ── Application schemas ─────────────────────────────────

export const applicationSchema = Joi.object({
    coverLetter: Joi.string().min(20).max(500).required()
        .messages({
            'string.min': 'Cover letter must be at least 20 characters',
            'string.max': 'Cover letter cannot exceed 500 characters'
        }),
    proposedRate: Joi.number().min(0).max(500).optional()
})

// ── Review schemas ──────────────────────────────────────

export const reviewSchema = Joi.object({
    jobId: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({ 'number.min': 'Rating must be between 1 and 5' }),
    comment: Joi.string().max(500).optional()
})

// ── Cleaner profile schema ──────────────────────────────

export const cleanerProfileSchema = Joi.object({
    bio: Joi.string().max(500).optional(),
    services: Joi.array().items(
        Joi.string().valid(
            'standard_cleaning', 'deep_cleaning', 'move_in_out',
            'office_cleaning', 'laundry', 'ironing', 'window_cleaning'
        )
    ).optional(),
    availability: Joi.object({
        monday: Joi.boolean(),
        tuesday: Joi.boolean(),
        wednesday: Joi.boolean(),
        thursday: Joi.boolean(),
        friday: Joi.boolean(),
        saturday: Joi.boolean(),
        sunday: Joi.boolean()
    }).optional(),
    hourlyRate: Joi.number().min(0).max(500).optional(),
    isAvailable: Joi.boolean().optional()
})

export const cancelJobSchema = Joi.object({
    reason: Joi.string().max(200).optional()
})

export const rejectSchema = Joi.object({
    reason: Joi.string().min(10).max(200).required()
        .messages({ 'string.min': 'Please provide a detailed reason' })
})

export default validate