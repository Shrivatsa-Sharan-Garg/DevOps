
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.log("MongoDB URI not configured.");
            return;
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully!");
    } catch (error) {
        console.error("MongoDB Error:", error.message);
    }
};

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to ProblemHub API",
        version: "1.0.0"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});
app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role } = req.body;

    res.status(501).json({
        success: false,
        message: "Registration logic pending"
    });
});
app.post("/api/auth/login", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Login logic pending"
    });
});
app.post("/api/problems", (req, res) => {
    const {
        title,
        description,
        category,
        requirements,
        payment
    } = req.body;


    res.status(501).json({
        success: false,
        message: "Problem creation logic pending"
    });
});

app.get("/api/problems", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Problem fetching logic pending"
    });
});

app.get("/api/problems/:id", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Problem details logic pending"
    });
});

app.put("/api/problems/:id", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Problem update logic pending"
    });
});

app.post("/api/problems/:id/similar", (req, res) => {

    res.status(501).json({
        success: false,
        message: "Similarity detection pending"
    });
});

app.post("/api/problems/:id/group", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Problem grouping logic pending"
    });
});

app.post("/api/problems/:id/upvote", (req, res) => {

    res.status(501).json({
        success: false,
        message: "Upvote logic pending"
    });
});

app.delete("/api/problems/:id/upvote", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Remove upvote logic pending"
    });
});
app.post("/api/solutions", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Solution publishing pending"
    });
});

app.get("/api/solutions", (req, res) => {

    res.status(501).json({
        success: false,
        message: "Solution fetching pending"
    });
});

app.get("/api/solutions/:id", (req, res) => {

    res.status(501).json({
        success: false,
        message: "Solution details pending"
    });
});

app.post("/api/problems/:id/comments", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Comment logic pending"
    });
});
app.post("/api/solutions/:id/features", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Feature request logic pending"
    });
});

app.post("/api/problems/:id/offers", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Payment offer logic pending"
    });
});

app.get("/api/problems/:id/offers", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Payment range logic pending"
    });
});

app.post("/api/ai/generate-srs", (req, res) => {
    res.status(501).json({
        success: false,
        message: "AI SRS integration pending"
    });
});

app.post("/api/ai/translate", (req, res) => {

    res.status(501).json({
        success: false,
        message: "Translation integration pending"
    });
});
app.get("/api/ai/recommendations/:problemId", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Recommendation logic pending"
    });
});

app.get("/api/notifications", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Notification logic pending"
    });
});

app.patch("/api/notifications/:id/read", (req, res) => {


    res.status(501).json({
        success: false,
        message: "Notification update pending"
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});


const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`ProblemHub running on port ${PORT}`);
    });
};

startServer();
