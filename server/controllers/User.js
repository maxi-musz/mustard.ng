const express = require("express");
require("../models/database");
const User = require("../models/User");
const UserOTPVerification = require("../models/UserOTPVerification");

const { v4: uuidv4 } = require("uuid");

//Env variables
require("dotenv").config();

//Password Handler
const bcrypt = require("bcrypt");

//email handler
const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready for message");
    console.log(success);
  }
});


//SIGNING UP
exports.Signsup = async (req, res) => {
  let { email, password } = req.body;
  email = email.trim();
  password = password.trim();

  if (email == "" || password == "") {
    res.json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.json({
      status: "FAILED",
      message: "Invalid email entered",
    });
  } else if (password.length < 8) {
    res.json({
      status: "FAILED",
      message: "Password is too short!",
    });

    //This is were the issues is and you would retype it again
  } else {
    User.find({ email })
     .then((result) => {
      if (result.length) {
        res.json({
          status: "FAILED",
          message: "User with the provided email already",
        });
      } else {
        const saltRounds = 10;
        bcrypt
          .hash(password, saltRounds)
          .then((hashedPassword) => {
            const newUser = new User({
              email,
              password: hashedPassword,
              verified: false,
            });
            newUser
              .save()
              .then((result) => {
                sendOTPVerificationEmail(result, res);
              })
              .catch((err) => {
                console.log(err);
                res.json({
                  status: "FAILED",
                  message: "An error occured while saving user account",
                });
              });
            })
          .catch((err) => {
            res.json({
              status: "FAILED",
              message: "An error occured while hashing password",
            });
          });
      }
    });
  }
};

const sendOTPVerificationEmail = async ({ _id, email }, res) => {
  try {
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    // mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify your email",
      html: `<p>Enter <b>${otp}</b> in the app to verify your email address and complete the authentication</p><p>This code expires in 1 hour</p>`,
    };

    const saltRounds = 10;

    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    const newOTPVerification = await new UserOTPVerification({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 360000,
    });

    await newOTPVerification.save();
    await transporter.sendMail(mailOptions);
    res.json({
      status: "PENDING",
      message: "Verification otp email sent",
      data: {
        userId: _id,
        email,
      },
    });
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message,
    });
  }
};


//VERIFY OTP
exports.verify = async (req, res) => {
  try{
    let { userId, otp} = req.body
    if(!userId || !otp){
      throw Error("Empty otp details are not allowed")
    } else{
      const UserOTPVerificationRecords = await UserOTPVerification.find({
        userId,
      })
      if (UserOTPVerificationRecords.length <= 0){
        throw new Error(
          "Account record doesnt exist or has been verified already. PLease sign up or log in"
        )
      }else{

        const { expiresAt } = UserOTPVerificationRecords[0]
        const hashedOTP = UserOTPVerificationRecords[0].otp


        if (expiresAt < Date.now()){
          await UserOTPVerification.deleteMany({ userId })
          throw new Error("Code has expired. PLease request again")

        } else {
          const validOTP = bcrypt.compare( otp, hashedOTP)

          if(!validOTP){
            throw new Error("Invalid code passed. Check your inbox")
          }else{
            await User.updateOne({ _id: userId}, { verified: true })
            await UserOTPVerification.deleteMany({ userId})
            res.json({
              status: "VERIFIED",
              message: "User email verified successfully"

            })
          }
        }

      }
    }

  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message

    })

  }
}


//RESEND OTP
exports.resend = async (req, res) =>{
  try{
    let { userId, email } = req.body;

    if(!userId || !email){
      throw Error(" Empty user details are not allowed")
    }else {
      await UserOTPVerification.deleteMany({ userId })
      sendOTPVerificationEmail({ _id: userId, email}, res)
    }
  }catch(error){
    res.json({
      status: "FAILED",
      message: error.message
    })

  }
}