/**
 * Created by Derek Rada on 9/9/2014.
 */



var express = require("express");
var config = require("./config.json");
var app = express();
var route = require("./lib/route.js");

app.all("/route/:zone/:record", route.routeHandler);

app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.listen(config.port || 5000);


