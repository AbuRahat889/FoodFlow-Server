const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//Middelware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5174", "http://localhost:5173"],
    credentials: true,
  })
);

console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECRET_KEY}@cluster0.n67dhnf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//create middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("tokent in the middele warer", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodFlowCollection = client.db("FoodFlow").collection("foodInfo");
    const requestCollection = client.db("FoodFlow").collection("requestInfo");

    //creating Token with jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        })
        .send({ success: true });
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //post new food
    app.post("/food", async (req, res) => {
      const add = req.body;
      console.log(add);
      const result = await foodFlowCollection.insertOne(add);
      res.send(result);
    });

    //get data for service
    app.get("/foods", async (req, res) => {
      const coursor = foodFlowCollection.find();
      const result = await coursor.toArray();
      //   console.log(user);
      res.send(result);
    });

    //find foods by id details page
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodFlowCollection.findOne(query);
      res.send(result);
    });

    // find food lsit by email
    app.get("/foods/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      console.log("cookkeeeeeeeeessss ", req.user);
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ messagae: "forbidden access" });
      }

      const query = { "donar.donar_email": email };
      const result = await foodFlowCollection.find(query).toArray();
      res.send(result);
    });

    //delete post from data by id
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await foodFlowCollection.deleteOne(quary);
      res.send(result);
    });

    //update foodinfo by id
    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const upinfo = req.body;
      const quary = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...upinfo,
        },
      };
      const result = await foodFlowCollection.updateOne(
        quary,
        updateDoc,
        options
      );
      res.send(result);
    });

    //**********Request food information************ */

    //post request info
    app.post("/request", async (req, res) => {
      const add = req.body;
      console.log(add);
      const result = await requestCollection.insertOne(add);
      res.send(result);
    });

    //get the request data
    app.get("/request/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send({ messagae: "forbidden access" });
      // }
      const quary = { email: email };
      const result = await requestCollection.find(quary).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("foodFlow is runnint !!!!");
});

app.listen(port, () => {
  console.log(`foodFlow sreveris runing : ${port}`);
});
