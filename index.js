const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const db = require("./dbConnect");
const dotenv = require("dotenv");
const productRouter = require("./routes/productRoutes");
const brandRouter = require("./routes/brandRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cors = require("cors");
const isAuth = require("./middlewares/isAuth");
const { success } = require("./utilies/responseWrapper");
dotenv.config("./.env");
// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

// routes
app.use("/products", productRouter);
app.use("/brand", brandRouter);
app.use("/category", categoryRouter);
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

// stripe integration

const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { currOrderDetails } = req.body;
    const currOrderDetailsArray = currOrderDetails?.items?.map((item) => ({
      id: item.id,
      title: item.product.title,
      price: item.product.price,
      quantity: item.quatity,
    }));
    console.log(currOrderDetailsArray);
    const lineItems = await Promise.all(
      currOrderDetailsArray.map(async (product) => {
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: product.title,
            },
            // multiply by 100 becz in inr it is in paisa
            unit_amount: product.price * 100,
          },
          quantity: product.quantity,
        };
      })
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `http://localhost:3000/order-success/${currOrderDetails?.id}`,
      cancel_url: "http://localhost:3000/cart",
    });
    return res.send(success(200, { id: session.id }));
  } catch (error) {
    console.log("error from payment side", error);
  }
});

// server and db connection
db();
app.listen(process.env.PORT, () => {
  console.log("Server started on port", process.env.PORT);
});
