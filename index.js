const express = require('express')
const app = express()
const bodyParser = require('body-parser');


const port = process.env.PORT || 4000;


require('dotenv').config()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// Use middleware
app.use(express.json());

const routes = require('./server/routes/UserRoutes.js')

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
