const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
const app = express();
let port = process.env.PORT || 4000;

const account = require("./account/account.controller")

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cors());

app.use("/account", account);

app.listen(port, () => {
    console.log("Server is running on port " + port);
})