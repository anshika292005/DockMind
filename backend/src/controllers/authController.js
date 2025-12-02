const { configDotenv } = require("dotenv");
const prisma = require("../db/prisma.js");
const { hashPassword, verifyPassword } = require("../Utils/bcryptPassword.js");
const { generateToken } = require("../Utils/token.js");
configDotenv();
const signupUser = async (req, res) => {
  const { name, email, phoneNumber, password, confirmPassword, role } = req.body;

  if (!name || !email || !phoneNumber || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match!" });
  }

  try {
    const existingUser = await prisma.users.findFirst({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.users.create({
      data: { name, email, phoneNumber, password: hashedPassword, role: role || 'candidate' },
    });

    const tokens = generateToken(newUser.id);
    return res.status(201).json({ message: "User created successfully!", token: tokens.accessTokens });
  } catch (err) {
      console.error('Signup error:', err);
    return res.status(500).json({ message: "Server Error!" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.users.findFirst({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }

    const tokens = generateToken(user.id);
    return res.status(200).json({ message: "Login successful!", token: tokens.accessTokens, name: user.name, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: "Server Error!" });
  }
};

const getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    return res.status(200).json({ name: user.name, email: user.email, phoneNumber: user.phoneNumber });
  } catch (err) {
      console.error('Get user error:', err);
    return res.status(500).json({ message: "Server Error!" });
  }
};

module.exports = { signupUser, loginUser, getUser };
