// 1. SETUP EXPRESS
const express = require('express');
const cors = require("cors");

require('dotenv').config();
const MongoClient = require("mongodb").MongoClient;
const dbname = "recipie_book"; // CHANGE THIS TO YOUR ACTUAL DATABASE NAME

const mongoUri = process.env.MONGO_URI;

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
            if (!cuisineDoc) {
                return res.status(400).json({ error: 'Invalid cuisine' });
            }
    
            // Fetch the tag documents
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
    

}

main();

// START SERVER
app.listen(3000, () => {
    console.log("Server has started");
});