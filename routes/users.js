const express = require("express");
const { User } = require("../models/user");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require("mongoose"); 
const cloudinary = require("cloudinary");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("invalid image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

router.post("/register", uploadOptions.single("avatar"), async (req, res) => {
  try {
    // Input validation
    const { firstname, lastname, email, password } = req.body;
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).send("All fields are required");
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).send("Email is already registered");
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).send("Password must be at least 6 characters long");
    }

    let avatar;

    if (req.file) {
      // Upload the file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "UserProfile",
        crop: "scale",
      });

      avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } else {
      // Define your default image URL or public_id here
      const defaultImageUrl =
        "https://res.cloudinary.com/dn638duad/image/upload/v1708276779/Student%20Profile/fghiuvjlxd5vbcnjxy2t.jpg";
      avatar = {
        url: defaultImageUrl,
      };
    }

    // Create new user with provided or default profile image URL
    const user = new User({
      firstname: firstname,
      lastname: lastname,
      email: email,
      password: bcrypt.hashSync(password, 10),
      avatar: avatar, // Assign the images object
    });

    await user.save();

    res.send(user);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred during user registration");
  }
});

router.get(`/`, async (req, res) => {
  const userList = await User.find().select("-password");
  console.log(userList);

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res
      .status(500)
      .json({ message: "The user with the given ID was not found." });
  }
  res.status(200).send(user);
});


router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  const secret = process.env.secret;
  if (!user) {
    return res.status(400).send("The user not found");
  }

  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },

      secret,
      { expiresIn: "1d" }
    );

    res.status(200).send({ user: user.email, token: token });
  } else {
    res.status(400).send("password is wrong!");
  }
});

router.post("/logout", (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
});

//edit user profile
router.put("/userProfile/:id", uploadOptions.single("image"), async (req, res) => {
  try {
    const file = req.file;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send("Invalid User Id");
    }

    const userFind = await User.findById(req.params.id);
    if (!userFind) return res.status(400).send("Invalid User Profile!");
    console.log(userFind, "Existing user profile data");

    let image;

    const cloudinaryFolderOption = {
      folder: "UserProfile",
      crop: "scale",
    };

    if (file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, cloudinaryFolderOption);
      image = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } else {
      image = userFind.images;
    }

    const updatedUser = {
      email: req.body.email || userFind.email,
      firstname: req.body.firstname || userFind.firstname,
      lastname: req.body.lastname || userFind.lastname,
      avatar: image,
    };

    console.log("Updated user data:", updatedUser);

    const updatedUserData = await User.findByIdAndUpdate(req.params.id, updatedUser, {
      new: true,
    });

    if (!updatedUserData) {
      return res.status(400).json({ success: false, message: "The user cannot be updated" });
    }

    res.status(200).json({ success: true, user: updatedUserData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
