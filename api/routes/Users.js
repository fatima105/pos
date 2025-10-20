const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const multer = require("multer");
const path = require("path");


// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage });
// Create a new user
router.post("/users", usersController.createUser);
router.post("/login", usersController.login);
// Get all users
router.get("/users", usersController.getUsers);
router.post("/users/:id", usersController.UpdateUser);
// Get single user
router.get("/users/:id", usersController.getUserById);
router.get("/license/:id", usersController.getlicenseById);
router.post("/license", upload.single("licenseFile"), usersController.createUserLicense);

// Delete user
router.delete("/users/:id", usersController.deleteUser);

module.exports = router;
