const express = require('express');
const cors = require('cors');

let app = express();
app.use(cors());

// add routes here
app.get('/echo', (req, res) => {
    // Get all query parameters
    const queryParams = req.query;

    // Create a response object
    const response = {
        message: "Here are the query parameters you sent:",
        firstName: queryParams.firstName,
        lastName: queryParams.lastName
    };

    // Send the response as JSON
    res.json(response);
});
app.get('/add/:num1/:num2', function(req,res){
    // anything from parameters is a STRING
    const num1 = parseInt(req.params.num1);
    const num2 = parseInt(req.params.num2);
    res.send("Sum = " +  (num1 + num2));
})

app.listen(3000, ()=>{
    console.log("Server started")
})
