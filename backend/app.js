var express = require('express');
var app = express();
var fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

app.use(session({
    secret: 'foo',
    store: new MongoStore({ url: 'mongodb://localhost/quiztastic' })
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

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/test/:name', function(req, res){
    var name = req.params.name;
  var rtn = {};//init an object to return
  //rtn.quiz = JSON.parse(fs.readFileSync('sample_questions.json'));
  rtn.name = name;
req.session['name'] = name;
//return the object in json format.
  res.json(rtn);
});

app.get("/test2", function(req, res){
  var rtn = {};

  rtn.name = req.session['name'];

  res.json(rtn);
});

app.listen(3333, function () {
  console.log('Quiztastic backend listening on port 3333!');
});
