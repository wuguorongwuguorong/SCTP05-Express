const express = require('express');

//1. Create the exoress application
const app = express();
app.use(express.json());

//2. Setup the routes
app.get('/',function (req,res){
    res.json({
        'message':'Hello World!'
    })
  })


//3. Start server
app.listen(3000,function(){

})