// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const upload = require('./middleware/upload'); 

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../frontend/public/menu-images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// backend/middleware/upload.js
// Add error handling for the upload middleware
upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error' });
    } else if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    next();
  });

module.exports = upload;