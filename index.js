const express = require("express");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
//const stripe= require("stripe")(process.env.Stripe_secret_key)
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
    await client.connect();

    // List of  collections
    const productCollection = client.db("productPlanet").collection("products");
    const userCollection = client.db("productPlanet").collection("users");

    //    const menuCollection=client.db('BistroDB').collection('menu')
    //    const userCollection=client.db('BistroDB').collection('users')
    //    const cartCollection=client.db('BistroDB').collection('carts')
    //    const paymentCollection=client.db('BistroDB').collection('payment')

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
      res.send(result);
    });

    // moderator related
    
    //verify moderator 
 const verifyModerator=async(req,res,next)=>{
  const email= req.decoded.email;
  const query= {email: email}
  const user= await userCollection.findOne(query);
  const isModerator=user?.role==='moderator';
  if(!isModerator){
   return res.status(403).send({message: "Forbidden Access"});

  }
  next()
}
    // moderator 
    app.get("/users/moderator/:email", verifyToken, async (req, res) => {
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

    app.get("/myProducts", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const query = { "ownerInfo.email": email };
      const result = await productCollection.find(query).toArray();
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

    // user related information
    //    app.post('/users', async (req, res) => {
    //     const user = req.body;
    //     // insert email if user doesnt exists:
    //     // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
    //     const query = { email: user.email }
    //     const existingUser = await userCollection.findOne(query);
    //     if (existingUser) {
    //       return res.send({ message: 'user already exists', insertedId: null })
    //     }
    //     const result = await userCollection.insertOne(user);
    //     res.send(result);
    //   });

    //   // JWT related Api
    //  app.post('/jwt',(req,res)=>{
    //   const user= req.body;
    //   const token= jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
    //     expiresIn: '1hr'
    //   })
    //   res.send({token})
    //  })
    //  // veryfi token
    //  const verifyToken=(req,res,next)=>{
    //    if(!req.headers.authorization){
    //     return res.status(401).send('Forbidden Access')
    //    }
    //    const token= req.headers.authorization.split(' ')[1]
    //    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    //     if(err){
    //       return res.status(401).send('Forbidden Access')
    //     }
    //     req.decoded=decoded;
    //     next()
    //    });
    //  }
    //  // verify admin
    //  const verifyAdmin=async(req,res,next)=>{
    //      const email= req.decoded.email;
    //      const query= {email: email}
    //      const user= await userCollection.findOne(query);
    //      const isAdmin=user?.role==='admin';
    //      if(!isAdmin){
    //       return res.status(403).send({message: "Forbidden Access"});

    //      }
    //      next()
    //  }
    //  app.get('/users/admin/:email',verifyToken, async(req,res)=>{
    //    const email= req.params.email;
    //    if(email !== req.params.email){
    //     return res.status(403).send({message: 'Unauthorized Access'})

    //    }
    //    const query= {email : email}
    //    const user= await userCollection.findOne(query);
    //    let admin=false;
    //    if(user){
    //     admin= user?.role==='admin'
    //    }
    //    res.send({admin})
    //  })
    // app.get('/users',verifyToken,verifyAdmin,async(req,res)=>{
    //   const result= await userCollection.find().toArray();
    //   res.send(result)
    // })
    // app.delete('/users/:id',verifyToken,verifyAdmin, async(req,res)=>{
    //   const id=req.params.id;
    //   const query={_id: new ObjectId(id)}
    //   const result= await userCollection.deleteOne(query)
    //   res.send(result)

    //  })

    //  app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req,res)=>{
    //   const id= req.params.id;
    //   const filter ={ _id: new ObjectId(id)};
    //   const updateDoc={
    //     $set:{
    //       role:"admin"
    //     }
    //   }
    //   const result= await userCollection.updateOne(filter,updateDoc);
    //   res.send(result)
    //  })

    // // others realted api
    //    app.get('/menu',async(req,res)=>{
    //     const result= await menuCollection.find().toArray();
    //     res.send(result)
    //    })
    //    app.post('/menu',verifyToken,verifyAdmin,async (req,res)=>{
    //     const item= req.body;
    //     const result= await menuCollection.insertOne(item);
    //     res.send(result)
    //    })
    //    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
    //     const id = req.params.id;
    //     const query = { _id: new ObjectId(id) }
    //     const result = await menuCollection.deleteOne(query);
    //     res.send(result);
    //   })
    //    app.get('/carts',async(req,res)=>{
    //     const email=req.query.email;
    //     const query={email: email}
    //     const result= await cartCollection.find(query).toArray();
    //     res.send(result)
    //    })

    //    app.post('/carts',async(req,res)=>{
    //    const cartItem=req.body;
    //    const result= await cartCollection.insertOne(cartItem);
    //    res.send(result)
    //    })

    //    app.delete('/carts/:id', async(req,res)=>{
    //     const id=req.params.id;
    //     const query={_id: new ObjectId(id)}
    //     const result= await cartCollection.deleteOne(query)
    //     res.send(result)

    //    })

    //    //payment intent
    //   //  app.post('/create-payment-intent',async (req,res)=>{
    //   //    const {price}=req.body;
    //   //    const amount= parseInt(price *100)
    //   //    console.log(amount)

    //   //    const paymentIntent= await stripe.paymentIntents.create({
    //   //     amount : amount,
    //   //     currency:"usd",
    //   //     payment_method_types:['card']
    //   //    })
    //   //    res.send({
    //   //     clientSecret: paymentIntent.client_secret,
    //   //   });
    //   //  })
    //   app.post('/create-payment-intent', async (req, res) => {
    //     const { price } = req.body;

    //     // Validate price
    //     if (!price || isNaN(price) || price <= 0) {
    //       return res.status(400).send({ error: "Invalid price value. Price must be a positive number." });
    //     }

    //     // Convert to smallest currency unit (e.g., cents for USD)
    //     const amount = Math.round(price * 100);

    //     // Ensure amount meets Stripe's minimum charge requirement
    //     if (amount < 50) { // $0.50 in cents
    //       return res.status(400).send({ error: "Amount must be at least $0.50." });
    //     }

    //     // Create the PaymentIntent
    //     const paymentIntent = await stripe.paymentIntents.create({
    //       amount: amount,
    //       currency: "usd",
    //       payment_method_types: ["card"],
    //     });

    //     // Send client secret to the client
    //     res.send({
    //       clientSecret: paymentIntent.client_secret,
    //     });
    //   });

    //   app.post('/payment', async (req, res) => {
    //     const payment = req.body;

    //     // Insert the payment details into the payment collection
    //     const paymentResult = await paymentCollection.insertOne(payment);

    //     // Construct the query for deleting items from the cart
    //     const query = {
    //       _id: {
    //         $in: payment.cartIds.map((id) => new ObjectId(id)) // Correctly map to ObjectId
    //       }
    //     };

    //     // Delete the corresponding items from the cart
    //     const deleteResult = await cartCollection.deleteMany(query);

    //     // Send the response
    //     res.send({ paymentResult, deleteResult });
    //   });

    //   app.get('/payment',async(req,res)=>{
    //     const result= await paymentCollection.find().toArray();
    //     res.send(result)
    //    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
