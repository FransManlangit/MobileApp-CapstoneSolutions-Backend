const express = require("express");
const app = express();
const morgan = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
const authJwt = require("./helpers/jwt");
const cloudinary = require("cloudinary");
const errorHandler = require("./helpers/error-handler");
require("dotenv/config");
require("events").EventEmitter.defaultMaxListeners = 20;

// Middleware
app.use(cors());
app.options("*", cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(errorHandler);
app.use(authJwt());
app.use("/public/uploads", express.static(__dirname + "/public/uploads"));

// Routes
const usersRoutes = require("./routes/users");
const productsRoutes = require("./routes/products")

const api = process.env.API_URL;

app.use(`${api}/users`, usersRoutes);
app.use(`${api}/products`, productsRoutes);

// Cloudinary API
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose
  .connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database Connection is ready...");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(4000, () => {
  console.log("Server is running at http://localhost:4000");
});
