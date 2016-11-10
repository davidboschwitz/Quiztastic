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
    res.header('Access-Control-Allow-Origin', 'http://localhost');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
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

var data = {blah: 'sdf'};

var indexMethods = {

    update: function() {
        console.log(arguments);
        var req = arguments[0];
        var code = req.session['code'];
        var current = data[code];
        if (current.position.sub == 'intermission') {
            var rtn = {};
            rtn.title = 'And the answer is...';
            rtn.showClass = 'intermission';
            rtn.answers = current.answers[current.position.num];
            rtn.question = current.questions[current.position.num];
            rtn.users = current.users;
            return rtn;
        } else if (current.position.sub == 'question') {

            return {
                title: current.questions[current.position.num].title,
                question: current.questions[current.position.num],
                showClass: 'question'
            };
        }
        var date = new Date();
        return {
            blah: 'pleh',
            date: date,
            date_fin: date.setSeconds(date.getSeconds() + 60).toString(),
        }
    },
    next: function() {
        position = data[code].position;
        if (position.sub == 'intermission') {
            position.sub = 'question';
            data[code].answers[position.sub + 1] = {};
        } else if (position.sub == 'question') {
            position.num++;
            position.sub = 'intermission';
        }
    },
    start: function() {
        var req = arguments[0];
        var code = req.session['code'];
        console.log(code)
        if (!data[code]) {
            data[code] = {};
            var quizID = req.body.quizID;
            data[code] = fs.readFileSync('/quizzes/' + quizID + '.json');
            data[code].position = {
                num: 0,
                sub: 'intermission'
            };
            return {
                status: {
                    code: 200,
                    message: 'ok'
                }
            };

        } else {
            return {
                error: {
                    code: 0,
                    message: 'Session already initialized'
                }
            };
        }
    },
    output: function() {
      return data;
    }
};
app.post('/index', function(req, res) {
  console.log('index:'+req.body.method);
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
  console.log('pair/'+req.params.code);
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
