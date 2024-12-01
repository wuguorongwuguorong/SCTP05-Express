const express = require('express');
const cors = require('cors');

let app = express();
app.use(cors());

// add routes here
app.get('/hello/:name', (req,res)=>{
    let name = req.params.name;
    res.send("Hi, " + name);
  })

app.listen(3000, ()=>{
    console.log("Server started")
})
