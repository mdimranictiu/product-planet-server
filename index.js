const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const stripe = require("stripe")(process.env.Stripe_secret_key);
const cors = require("cors");
const port = process.env.PORT || 4100;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB}:${process.env.PASS}@cluster0.nu3ic.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // List of  collections
    const productCollection = client.db("productPlanet").collection("products");
    const userCollection = client.db("productPlanet").collection("users");
    const reviewCollection = client.db("productPlanet").collection("reviews");
    const couponCollection = client.db("productPlanet").collection("coupon");
    const CommingSoonCollection = client.db("productPlanet").collection("ComingSoonProducts");
    const userReviewCollection = client.db("productPlanet").collection("userReview");
    const contactsCollection = client.db("productPlanet").collection("contacts");
    const advertiseCollection = client.db("productPlanet").collection("advertise");
    const subscribeCollection = client.db("productPlanet").collection("subscribe");

    // JWT token Create

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_Token_Secret, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });
    // verify Token
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send("Forbidden Access");
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.Access_Token_Secret, (err, decoded) => {
        if (err) {
          return res.status(401).send("Forbidden Access");
        }
        req.decoded = decoded;
        next();
      });
    };

    // user related
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists:
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      console.log(user);
      res.send(result);
    });
    //admin related
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      if (email !== req.params.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      console.log("isAdmin", isAdmin);
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //fetch all users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // moderator related

    //verify moderator
    const verifyModerator = async (req, res, next) => {
      const email = req.decoded?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isModerator = user?.role === "moderator";
      //console.log('isModerator',isModerator)
      if (!isModerator) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };
    // product Review by Moderator

    app.get(
      "/productReview",
      verifyToken,
      verifyModerator,
      async (req, res) => {
        const query = { status: "pending" };
        const result = await productCollection.find(query).toArray();
        res.send(result);
      }
    );

    // moderator
    app.get("/users/moderator/:email", async (req, res) => {
      const email = req.params.email;
      if (email !== req.params.email) {
        return res.status(403).send({ message: "Unauthorized Access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let moderator = false;
      if (user) {
        moderator = user?.role === "moderator";
      }
      res.send({ moderator });
    });

    //updateStatus by Moderator
    app.patch("/updateProductStatus/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: req.body,
      };

      const result = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });
    // make as an moderator
    app.patch(
      "/users/makeModerator",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { email: email } = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updatedDoc = {
          $set: req.body,
        };

        const result = await userCollection.updateOne(
          filter,
          updatedDoc,
          options
        );

        res.send(result);
      }
    );
    // make admin
    app.patch(
      "/users/makeAdmin",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { email: email } = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updatedDoc = {
          $set: req.body,
        };

        const result = await userCollection.updateOne(
          filter,
          updatedDoc,
          options
        );

        res.send(result);
      }
    );

    //make as feature
    app.patch("/makeProductAsFeature/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: req.body,
      };

      const result = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });

    // products related

    // add Product
    app.post("/addProduct", verifyToken, async (req, res) => {
      const product = req.body;
      const createdAt = new Date();
      const newProduct = { ...product, createdAt };
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // fetch products
    app.get("/find/product/:data", async (req, res) => {
      const productID = req.params.data;
      const query = { _id: new ObjectId(productID) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/myProducts", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const query = { "ownerInfo.email": email };
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });
    // all products for admin
    app.get("/allProducts", verifyToken, verifyAdmin, async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get("/myProducts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // delete a product

    app.delete("/delete/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    //update product
    app.patch("/UpdateProduct/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: req.body,
      };

      const result = await productCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });
    //update upvote
    app.patch("/product/upvote/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { upvoteCount, user } = req.body;

      const query = { _id: new ObjectId(id), upvoters: { $ne: user } };
      const update = {
        $set: { upvoteCount },
        $addToSet: { upvoters: user }, // Add user to upvoters if not already present
      };

      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    // report content
    app.patch("/product/report/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const { reportStatus, user } = req.body;

      const query = { _id: new ObjectId(id), reporters: { $ne: user } };
      const update = {
        $set: { reportStatus },
        $addToSet: { reporters: user }, // Add user to reporters if not already present
      };

      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    // find all reported product
    app.get(
      "/find/reportedContent",
      verifyToken,
      verifyModerator,
      async (req, res) => {
        const query = { reportStatus: true };
        const result = await productCollection.find(query).toArray();
        res.send(result);
      }
    );
    // review submit
    app.post("/addreview", verifyToken, async (req, res) => {
      const item = req.body;
      const result = await reviewCollection.insertOne(item);
      res.send(result);
    });
    app.post("/subscribe",  async (req, res) => {
      const email = req.body;
      const result = await subscribeCollection.insertOne(email);
      res.send(result);
    });

    //find reviews by id
    app.get("/find/review/:data", verifyToken, async (req, res) => {
      const productID = req.params.data;
      const query = { productId: productID };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });
    //get payment Status

    app.get("/users/payment-status/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      //console.log('inside payment',email)
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // get feature data

    app.get("/feature-product", async (req, res) => {
      const query = { feature: true };
      const result = await productCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // get trending product
    app.get("/trending-product", async (req, res) => {
      const result = await productCollection
        .find()
        .sort({ upvoteCount: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // search products
    app.get("/products", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1; // Default page 1
        const limit = 6; // Limit per page
        const skip = (page - 1) * limit;
        const search = req.query?.search;
        const sortOption = req.query?.sort || "latest"; // Get the sort option (default to 'latest')
    
        // Base query
        let query = { status: "Accepted" };
    
        // If search query exists, modify the query object
        if (search) {
          query.$or = [
            { productName: { $regex: search, $options: "i" } },
            { "tags.text": { $regex: search, $options: "i" } }
          ];
        }
    
        // Sorting logic
        let sort = {};
        if (sortOption === "latest") {
          sort = { createdAt: -1 }; // Sort by creation date (descending)
        } else if (sortOption === "popular") {
          sort = { upvoteCount: -1 }; // Sort by upvote count (descending)
        }
    
        // Fetch total product count
        const total = await productCollection.countDocuments(query);
    
        // Fetch paginated products with sorting
        const products = await productCollection
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort(sort) // Apply the sorting
          .toArray();
    
        // Send response
        res.status(200).json({
          products,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalProducts: total
        });
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    

    app.get("/find/validCoupon", async (req, res) => {
      try {
        const currentDate = new Date(); // Get today's date

        // Fetch all coupons
        const coupons = await couponCollection.find().toArray();

        // Filter only valid (non-expired) coupons
        const validCoupons = coupons.filter((coupon) => {
          return new Date(coupon.ExpiredDate) >= currentDate;
        });

        res.status(200).json(validCoupons);
      } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // add coupon
    app.post("/add/coupon", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await couponCollection.insertOne(data);
      res.send(result);
    });
    //fetch coupon
    app.get("/find/coupon", verifyToken, verifyAdmin, async (req, res) => {
      const result = await couponCollection.find().toArray();
      res.send(result);
    });

    app.delete(
      "/coupon/delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await couponCollection.deleteOne(query);
        res.send(result);
      }
    );

    //update coupon
    app.patch(
      "/UpdateCoupon/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedDoc = {
          $set: req.body,
        };

        const result = await couponCollection.updateOne(
          filter,
          updatedDoc,
          options
        );

        res.send(result);
      }
    );

    // find a coupon by id
    app.get("/coupon/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.findOne(query);
      res.send(result);
    });

    // Payment Related
    //payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.patch("/payment/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: { paystatus: true },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //coming soon products
    app.get("/comingsoon-products", async (req, res) => {
      const result = await CommingSoonCollection.find().toArray();
      res.send(result);
    });
    // find reviews
    app.get("/user-reviews", async (req, res) => {
      const result = await userReviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/submit/contact", async (req, res) => {
      const contact = req.body;
    
      try {
        const result = await contactsCollection.insertOne(contact);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error ", error });
      }
    });
    app.post("/submit/advertise", async (req, res) => {
      const advertise = req.body;
    
      try {
        const result = await advertiseCollection.insertOne(advertise);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: "Error ", error });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
