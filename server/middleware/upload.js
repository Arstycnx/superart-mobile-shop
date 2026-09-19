const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ถ้ามี Cloudinary env vars ครบ ให้อัปโหลดขึ้น Cloudinary แทน disk
// จำเป็นสำหรับ host ที่ไม่มี persistent disk (เช่น Render free/starter)
// ไม่งั้นไฟล์ที่ลูกค้าอัปโหลดจะหายทุกครั้งที่ redeploy/restart
const useCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

let storage;

if (useCloudinary) {
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'superart/repairs',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
    });
} else {
    const uploadDir = path.join(__dirname, '../uploads/repairs');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, `repair-${uniqueSuffix}${ext}`);
        }
    });
}

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

// คืน URL ที่ควรเก็บลง DB — Cloudinary ให้ URL เต็มมาแล้ว (req.file.path)
// ส่วน disk storage ต้องประกอบ path เอง (req.file.filename)
const getFileUrl = (file) => {
    if (!file) return null;
    return useCloudinary ? file.path : `/uploads/repairs/${file.filename}`;
};

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
