import { Router } from "express"
import * as AuthController from "../controllers/auth.controller"
import { authenticate } from "../middleware/auth"
import {
  loginValidation,
  registerValidation,
  changePasswordValidation,
  validate,
} from "../middleware/validation.middleware"

const router = Router()

// Rutas públicas
router.post("/login", loginValidation, validate, AuthController.login)
router.post("/register", registerValidation, validate, AuthController.register)

// Rutas protegidas
router.post("/logout", authenticate, AuthController.logout)
router.get("/profile", authenticate, AuthController.getProfile)
router.put("/profile", authenticate, AuthController.updateProfile)
router.post("/change-password", authenticate, changePasswordValidation, validate, AuthController.changePassword)

export default router

