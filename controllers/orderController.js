const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");

async function createOrder(req, res) {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No order items provided",
      });
    }

    const requiredAddressFields = [
      "address",
      "city",
      "state",
      "postalCode",
      "country",
    ];
    const missingaddressFieds = requiredAddressFields.find(
      (field) => !shippingAddress?.[field],
    );
    if (missingaddressFieds) {
      return res.status(400).json({
        success: false,
        message: `Missing required shipping address field: ${missingaddressFieds}`,
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    const productIds = orderItems.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products not found",
      });
    }

    const buildOrderItems = orderItems.map((item) => {
      const product = products.find((p) => p._id.toString() === item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found`);
      }
      if (item.qty > product.countInStock) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      return {
        name: product.name,
        qty: item.qty,
        image: product.image,
        price: product.price,
        product: product._id,
      };
    });

    const itemPrices = buildOrderItems.reduce(
      (acc, item) => acc + item.price * item.qty,
      0,
    );
    const taxPrice = Number((0.15 * itemPrices).toFixed(2));
    const shippingPrice = itemPrices > 500 ? 0 : 30;
    const totalPrice = Number(
      (itemPrices + taxPrice + shippingPrice).toFixed(2),
    );

    const order = new Order({
      user: req.user._id,
      orderItems: buildOrderItems,
      shippingAddress,
      paymentMethod,
      itemPrices,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();
    await Promise.all(
      buildOrderItems.map((item) =>
        Product.findByIdAndUpdate(item.product, {
          $inc: { countInStock: -item.qty },
        }),
      ),
    );
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }
    const order = await Order.findById(id).populate("user", "name email");
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getAllOrders(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "-createdAt",
      orderStatus,
    } = req.query;

    const filter = {};
    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(limitNum)
        .populate("user", "name email"),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function updateOrderToPaid(req, res) {
    try{
        const { id } = req.params;
        const {paymentId, paymentStatus, updateTime, payerEmail} = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if(order.isPaid){
            return res.status(400).json({
                success: false,
                message: "Order is already paid",
            });
        }

        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: paymentId,
            status: paymentStatus,
            update_time: updateTime,
            email_address: payerEmail || req.user.email,
        };
        const updatedOrder = await order.save();
        res.status(200).json({
            success: true,
            message: "Order updated to paid successfully",
            order: updatedOrder,
        });
    }catch (error) {
        console.error("Error updating order to paid:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

async function updateOrderStatus(req, res) {
  try{
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;
    if (orderStatus === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderToPaid,
  updateOrderStatus,
};