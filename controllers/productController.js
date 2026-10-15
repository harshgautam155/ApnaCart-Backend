const Product = require("../models/productModel");
const mongoose = require("mongoose");

async function getAllProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 12,
      sortBy = "-createdAt",
      category,
      keyword,
      brand,
      minPrice,
      maxPrice,
      inStock,
      search,
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (keyword) filter.name = { $regex: keyword, $options: "i" };
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (inStock === "true") {
      filter.countInStock = { $gt: 0 };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit)); // Assuming a maximum limit of 100
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .select("-reviews") // Exclude reviews from the product list
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching getAllProducts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id)
      .populate("reviews.user", "name")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching getProductById:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product by ID",
      error: error.message,
    });
  }
}

async function createProductReview(req, res) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }
    
    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const alreadyReviewed = product.reviews.find(
      (review) => review.user.toString() === userId.toString(),
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "Product already reviewed by this user",
      });
    }
    console.log("req.user:", req.user);
    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: userId,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    console.error("Error creating product review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product review",
      error: error.message,
    });
  }
}

// admin controllers
async function createProduct(req, res) {
  try {
    const { name, brand, category, description, price, countInStock } =
      req.body;

    if (!name || !brand || !category || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide name, image, brand, category, description, and price",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }
    if (price < 0 || (countInStock !== undefined && countInStock < 0)) {
      return res.status(400).json({
        success: false,
        message: "Price and Stock cannot be negative",
      });
    }

    const product = await Product.create({
      user: req.user._id,
      name,
      image: req.file.path, // Assuming you're using multer for file uploads
      brand,
      category,
      description,
      price,
      countInStock,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const allowedUpdates = [
      "name",
      "image",
      "brand",
      "category",
      "description",
      "price",
      "countInStock",
    ];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (
      (updates.price !== undefined && updates.price < 0) ||
      (updates.countInStock !== undefined && updates.countInStock < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Price and Stock cannot be negative",
      });
    }

    const product = await Product.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
}

async function deleteProductReview(req, res) {
  try {
    const { productId, reviewId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or review ID",
      });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviewExists = product.reviews.some(
      (review) => review._id.toString() === reviewId,
    );
    if (!reviewExists) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    product.reviews = product.reviews.filter(
      (review) => review._id.toString() !== reviewId,
    );
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.length
      ? product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length
      : 0;

    await product.save();
    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product review:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product review",
      error: error.message,
    });
  }
}

async function getAdminProducts(req, res) {
  try {
    const { page = 1, limit = 20, sortBy = "-createdAt" } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit)); // Assuming a maximum limit of 100
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find({})
        .select("-reviews") // Exclude reviews from the product list
        .populate("user", "fullName email") // Populate user details
        .sort(sortBy)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching admin products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin products",
      error: error.message,
    });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProductReview,
  // ADMIN CONTROLLERS
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductReview,
  getAdminProducts,
};
