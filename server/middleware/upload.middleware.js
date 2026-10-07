const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `report-${uniqueSuffix}${ext}`);
  }
});

// File Filter (Validation for PDF Only)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'application/x-pdf'];
  const allowedExts = ['.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  }
};

// Multer Upload Instance for Reports (10MB max limit)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});


// Prescription directory
const prescriptionDir = path.join(__dirname, '../uploads/prescriptions');
if (!fs.existsSync(prescriptionDir)) {
  fs.mkdirSync(prescriptionDir, { recursive: true });
}

// Storage Configuration for Prescriptions
const prescriptionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, prescriptionDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rx-${uniqueSuffix}${ext}`);
  }
});

// File Filter for Prescriptions (PDF only)
const prescriptionFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'application/x-pdf'];
  const allowedExts = ['.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF documents are accepted for prescriptions.'), false);
  }
};

// Multer Upload Instance for Prescriptions (15MB max limit)
const uploadPrescription = multer({
  storage: prescriptionStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: prescriptionFileFilter
});

module.exports = upload;
module.exports.upload = upload;
module.exports.uploadPrescription = uploadPrescription;

