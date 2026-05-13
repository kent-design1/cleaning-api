import multer from 'multer'

// Store files in memory — we'll stream them to Cloudinary
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)     // accept the file
    } else {
        cb(new Error('Only images (JPEG, PNG, WebP) and PDFs are allowed'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024   // 5MB max
    }
})

export default upload