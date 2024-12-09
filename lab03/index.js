// 1. SETUP EXPRESS
const express = require('express');
const cors = require("cors");

require('dotenv').config();
const MongoClient = require("mongodb").MongoClient;
const dbname = "recipie_book"; // CHANGE THIS TO YOUR ACTUAL DATABASE NAME

const mongoUri = process.env.MONGO_URI;
const bcrypt = require('bcrypt');

let app = express();

app.use(express.json());
app.use(cors());



async function connect(uri, dbname) {
    let client = await MongoClient.connect(uri, {
        useUnifiedTopology: true
    })
    _db = client.db(dbname);
    return _db;
}
const jwt = require('jsonwebtoken');

const generateAccessToken = (id, email) => {
    return jwt.sign({
        'user_id': id,
        'email': email
    }, process.env.TOKEN_SECRET, {
        expiresIn: "1h"
    });
}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(403);
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// SETUP END
async function main() {

    let db = await connect(mongoUri, dbname);
    const { ObjectId } = require("mongodb");
    // Routes
    app.get("/recipies", async (req, res) => {
        try {
            const recipies = await db.collection("recipies").find().project({
                name: 1,
                cuisine: 1,
                tags: 1,
                prepTime: 1,
            }).toArray();

            res.json({ recipies });
        } catch (error) {
            console.error("Error fetching recipies:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.get('/recipies', async (req, res) => {
        try {
            const { tags, cuisine, ingredients, name } = req.query;
            let query = {};

            if (tags) {
                query['tags.name'] = { $in: tags.split(',') };
            }

            if (cuisine) {
                query['cuisine.name'] = { $regex: cuisine, $options: 'i' };
            }

            if (ingredients) {
                query['ingredients.name'] = { $all: ingredients.split(',').map(i => new RegExp(i, 'i')) };
            }

            if (name) {
                query.name = { $regex: name, $options: 'i' };
            }

            const recipies = await db.collection('recipies').find(query).project({
                name: 1,
                'cuisine.name': 1,
                'tags.name': 1,
                _id: 0
            }).toArray();

            res.json({ recipies });
        } catch (error) {
            console.error('Error searching recipies:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get("/recipies/:id", async (req, res) => {
        try {
            const id = req.params.id;

            // First, fetch the recipe
            const recipies = await db.collection("recipies").findOne(
                { _id: new ObjectId(id) },
                { projection: { _id: 0 } }
            );

            if (!recipies) {
                return res.status(404).json({ error: "Recipie not found" });
            }

            res.json(recipies);
        } catch (error) {
            console.error("Error fetching recipie:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.post('/recipies', async (req, res) => {
        try {
            const { name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags } = req.body;

            // Basic validation
            if (!name || !cuisine || !ingredients || !instructions || !tags) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Fetch the cuisine document

            const cuisineDoc = await db.collection('cuisines').findOne({ name: cuisine });
            console.log(cuisine);
            console.log("cusineDoc >>> ", cuisineDoc);
            if (!cuisineDoc) {
                return res.status(400).json({ error: 'Invalid cuisine' });
            }

            // Fetch the tag documents
            console.log(tags);
            const tagDocs = await db.collection('tags').find({ name: { $in: tags } }).toArray();
            if (tagDocs.length !== tags.length) {
                return res.status(400).json({ error: 'One or more invalid tags' });
            }

            // Create the new recipe object
            const newRecipie = {
                name,
                cuisine: {
                    _id: cuisineDoc._id,
                    name: cuisineDoc.name
                },
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                tags: tagDocs.map(tag => ({
                    _id: tag._id,
                    name: tag.name
                }))
            };

            // Insert the new recipe into the database
            const result = await db.collection('recipies').insertOne(newRecipie);

            // Send back the created recipe
            res.status(201).json({
                message: 'Recipie created successfully',
                recipeId: result.insertedId
            });
        } catch (error) {
            console.error('Error creating recipe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    //delete entries from data
    app.delete('/recipies/:id', async function (req, res) {
        try {
            const id = req.params.id;
            const result = await db.collection("recipies").deleteOne({ _id: new ObjectId(id) });
            res.json({
                result
            })
        } catch (e) {
            console.error('Error deleting recipie:', e);
            // res.status(500).json({ error: 'Internal server error' });
            res.sendStatus(500);
        }
    })
    //adding a new section into database
    app.post('/recipies/:id', async function (req, res) {
        try {
            const recipiesId = req.params.id;
            const { user, rating, comment } = req.body;

            const newReview = { review_id: new ObjectId(), user, rating: Number(rating), comment, date: new Date() };
            const result = await db.collection('recipies').updateOne({ _id: new ObjectId(recipiesId) }, { $push: { reviews: newReview } });

            res.json({
                result
            })
        } catch (e) {
            console.error('Error deleting recipie:', e);
            // res.status(500).json({ error: 'Internal server error' });
            res.sendStatus(500);
        }
    })
    //editing body in the database
    app.put('/recipies/:recipiesId/reviews/:reviewId', async function (req, res) {
        try {
            const recipiesId = req.params.recipiesId;
            const reviewId = req.params.reviewId;
            const { user, rating, comment } = req.body;
            // Basic validation
            if (!user || !rating || !comment) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            const updateReviews = {
                review_id: new ObjectId(reviewId),
                user,
                rating: Number(rating),
                comment,
                date: new Date()
            }
            const result = await db.collection('recipies').updateOne({
                _id: new ObjectId(recipiesId),
                "reviews.review_id": new ObjectId(reviewId)
            }, {
                $set: { "reviews.$": updateReviews }
            })
            res.json({
                result
            })

        } catch (e) {
            console.error('Error adding review:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    })
    app.delete('/recipies/:recipiesId/reviews/:reviewId', async function (req, res) {
        try {
            const recipiesId = req.params.recipiesId;
            const reviewId = req.params.reviewId;
            const result = await db.collection('recipies').updateOne({
                _id: new ObjectId(recipiesId)
            }, {
                $pull: { reviews: { review_id: new ObjectId(reviewId) } }
            });
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            if (result.modifiedCount === 0) {
                return res.status(404).json({ error: 'Review not found' });
            }
            res.json(404)({
                result
            });
        } catch (e) {

            console.error('Error deleting review:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    })
    //completed lab7, should move on to lab8
    app.post('/users', async function (req, res) {
        const result = await db.collection("users").insertOne({
            'email': req.body.email,
            'password': await bcrypt.hash(req.body.password, 12)
        })
        res.json({
            "message": "New user account",
            "result": result
        })
    })
    app.post('/login', async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await db.collection('users').findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        const accessToken = generateAccessToken(user._id, user.email);
        res.json({ accessToken: accessToken });
    });
}

main();

// START SERVER
app.listen(3000, () => {
    console.log("Server has started");
});