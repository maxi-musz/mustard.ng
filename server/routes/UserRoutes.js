const express = require("express")

const router = express.Router()

const User = require("../controllers/User")


router.post("/user/signup", User.Signsup)
router.post("/user/verifyOTP", User.verify)
router.post("/user/resend", User.resend)


module.exports = router