const app = require('./src/app');
require('dotenv').config();
const mongoose = require('mongoose');
const { MONGO_URI } = require('./src/config/database');

// Only connect DB & start server when running node server.js, NOT for jest
if(require.main === module){
  if(MONGO_URI){
    mongoose.connect(MONGO_URI)
      .then(()=> console.log("Dev DB connected"))
      .catch(err=>console.log("DB error:",err));
  }
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, ()=>{
    console.log(`Server running http://localhost:${PORT}`);
  })
}

module.exports = app;
