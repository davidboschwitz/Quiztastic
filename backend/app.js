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


var indexMethods = {
    update: function() {
        console.log(arguments);
        var date = new Date();
        return {
            blah: 'pleh',
            date: date,
            date_fin: date.setSeconds(date.getSeconds() + 60).toString(),
        }
    }
};
app.post('/index', function(req, res) {
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

app.get('/pair/:code', function(req, res) {
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
    var rtn = {};

    rtn.name = req.session['name'];

    res.json(req.session);
});

app.listen(3333, function() {
    console.log('Quiztastic backend listening on port 3333!');
});
