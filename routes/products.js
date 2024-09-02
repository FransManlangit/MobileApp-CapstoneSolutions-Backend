const express = require("express");
const { Product } = require("../models/product");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("Invalid image type");

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

// Create product
router.post("/", uploadOptions.single("images"), async (req, res) => {
  try {
    // Check if the project title already exists in the database
    const existingProduct = await Product.findOne({
      projectTitle: req.body.projectTitle,
    });

    if (existingProduct) {
      return res.status(400).json({ message: "Project Title already exists!" });
    }

    const file = req.file;
    if (!file) return res.status(400).send("No image in the request");

    // Upload product image to Cloudinary
    const cloudinaryFolderOption = {
      folder: "product",
      crop: "scale",
    };

    const result = await cloudinary.uploader.upload(file.path, cloudinaryFolderOption);

    let product = new Product({
      projectTitle: req.body.projectTitle,
      description: req.body.description,
      price: req.body.price,
      type: req.body.type,
      images: {
        public_id: result.public_id,
        url: result.secure_url,
      },
      activation: req.body.activation,
      createdAt: req.body.createdAt,
    });

    product = await product.save();

    if (!product) return res.status(500).send("The product cannot be created");

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred during product creation");
  }
});

// Update product
router.put("/:id", uploadOptions.single("images"), async (req, res) => {
  try {
    const productId = req.params.id;

    // Validate product ID
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).send("Invalid Product Id");
    }

    // Find the existing product by ID
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(400).json({ message: "Invalid Product!" });
    }

    // Handling file upload to Cloudinary if new image is provided
    const file = req.file;
    let images;

    const cloudinaryFolderOption = {
      folder: "products",
      crop: "scale",
    };

    if (file) {
      const result = await cloudinary.uploader.upload(file.path, cloudinaryFolderOption);
      images = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } else {
      images = existingProduct.images; // Use existing images if no new image is provided
    }

    // Update the product information, including activation status
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        projectTitle: req.body.projectTitle || existingProduct.projectTitle,
        description: req.body.description || existingProduct.description,
        price: req.body.price || existingProduct.price,
        type: req.body.type || existingProduct.type,
        images: images,
        activation: req.body.activation !== undefined ? req.body.activation : existingProduct.activation, // Update activation status if provided
      },
      { new: true } // Return the updated document
    );

    if (!updatedProduct) {
      return res.status(500).send("The product cannot be updated!");
    }

    res.status(200).json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during product update",
    });
  }
});

// Reactivate product
router.put("/reactivate/:id", async (req, res) => {
  try {
    // Find the product by ID and update the activation status to true
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { activation: true },
      { new: true } // Return the updated document
    );

    // If the product is not found, return a 404 response
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Send a successful response with the updated product
    res.status(200).json({
      success: true,
      message: "Reactivation Success!",
      product,
    });
  } catch (error) {
    console.error("Error reactivating product:", error);

    // Send a 500 response if an error occurs
    res.status(500).json({
      success: false,
      message: "An error occurred while reactivating the product",
    });
  }
});


// Delete product
router.delete("/:id", (req, res) => {
    Product.findByIdAndRemove(req.params.id)
      .then((product) => {
        if (product) {
          return res
            .status(200)
            .json({ success: true, message: "the product is deleted!" });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "product not found!" });
        }
      })
      .catch((err) => {
        return res.status(500).json({ success: false, error: err });
      });
  });
  
 router.get(`/`, async (req, res) => {
    console.log(req.query);
  
    let filter = {};
  
  
    try {
      // Find products with the current filter
      const productList = await Product.find(filter);
  
      console.log(productList);
  
      if (!productList || productList.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No products found" });
      }
  
      res.status(200).json(productList);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

module.exports = router;
