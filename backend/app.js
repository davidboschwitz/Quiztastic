var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.use(session({
    secret: 'foo',
    store: new MongoStore({
        url: 'mongodb://localhost/quiztastic'
    })
}));

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://david.boschwitz.me');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');

    next();
});

app.use(bodyParser.json({
    type: 'application/json'
})); // for parsing application/json
app.use(bodyParser.text({
    type: 'text/html'
}));
app.use(bodyParser.text({
    type: 'text/plain'
}));
app.use(bodyParser.text({
    type: ''
}));

app.get('/', function(req, res) {
    res.send('Hello World!');
});

app.post('/admin', function(req, res) {

});

var indexMethods = require('./api-methods');
app.post('/index', function(req, res) {
    console.log('index:' + req.body.method);
    if (!indexMethods[req.body.method])
        res.send({
            error: {
                code: 500,
                message: "Method not found"
            }
        });
    else
        res.send(indexMethods[req.body.method](req))
});

app.get('/pair/:code/:name', function(req, res) {
    console.log('pair/' + req.params.code);
    req.session['code'] = req.params.code;
    res.send({
        status: {
            code: 200,
            message: 'ok'
        },
        code: req.session['code']
    })
})

app.get('/test/:name', function(req, res) {
    var name = req.params.name;
    var rtn = {}; //init an object to return
    //rtn.quiz = JSON.parse(fs.readFileSync('sample_questions.json'));
    rtn.name = name;
    req.session['name'] = name;
    //return the object in json format.
    res.json(req.session);
});

app.get("/test2", function(req, res) {
    res.json(req.session);
});

app.get("/test3", function(req, res) {
    req.session.regenerate();
    res.json(req.session);
});

app.listen(3333, function() {
    console.log('Quiztastic backend listening on port 3333!');
});

console.log(process.cwd(), __dirname);
