const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");

// Create a new user
router.post("/users", usersController.createUser);
router.post("/login", usersController.login);
// Get all users
router.get("/users", usersController.getUsers);

// Get single user
router.get("/users/:id", usersController.getUserById);

// Delete user
router.delete("/users/:id", usersController.deleteUser);

module.exports = router;
