// necessary to parse POST data
var connect = Npm.require('connect');
// necessary for Collection use and other wrapped methods
var Fiber = Npm.require('fibers');

var bodyParser = Npm.require("body-parser");

WebApp.connectHandlers
    .use(bodyParser.urlencoded())  // these two replace
    .use(bodyParser.json())        // the old bodyParser
    .use('/push-manifest.json', function(req, res, next) {
 
        // necessary for Collection use and other wrapped methods
        Fiber(function() {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end();
            //res.end(JSON.parse(Assets.getText("/config.push.json")));
 
        }).run();
    });    
