var fs = require('fs');
var User = require('./User');


var data = {
    poop: 'true'
};


var APIMethods = module.exports = {

    update: function(req) {
        var pairCode = req.session['pairCode'];
        var current = data[pairCode];
        if (!current) {
            return {
                error: {
                    code: 500,
                    message: 'session with pairCode "' + pairCode + '" not yet started'
                }
            }
        }
        if (current.pos.sub == 'intermission') {
            var rtn = {};
            rtn.title = 'And the answer is...';
            rtn.showClass = 'intermission';
            if (req.session['userID']) {
                rtn.question = current.questions[current.pos.num];
                var answers = current.answers[current.pos.num];
                for (var i = 0; i < answers.length; i++) {
                    if (answers[i].userID == req.session['userID']) {
                        rtn.answer = answers[i];
                        break;
                    }
                }
            } else {
                rtn.answers = current.answers[current.pos.num];
                rtn.question = current.questions[current.pos.num];
                rtn.users = current.users;
            }
            return rtn;
        } else if (current.pos.sub == 'question') {

            return {
                title: current.questions[current.pos.num].title,
                question: current.questions[current.pos.num],
                showClass: 'question',
                time: current.questions[current.pos.num].time
            };
        } else if (current.pos.sub == 'beginning') {
            return {
                showClass: 'beginning',
                pairCode: pairCode
            }
        } else if (current.pos.sub == 'end') {
            return {
                showClass: 'end',
                title: 'Final Rankings',
                users: current.users
            }
        }
        var date = new Date();
        return {
            blah: 'pleh',
            date: date,
            date_fin: date.setSeconds(date.getSeconds() + 60).toString(),
        }
    },
    next: function(req) {
        var pairCode = req.session['pairCode'];
        pos = data[pairCode].pos;
        if (pos.sub == 'beginning') {
            pos.sub = 'question';
        } else if (pos.sub == 'intermission') {
            pos.sub = 'question';
            if (pos.num + 1 >= data[pairCode].questions.length) {
                pos.sub = 'end';
            } else {
                pos.num++;
            }
        } else if (pos.sub == 'question') {
            pos.sub = 'intermission';
            var current = data[pairCode];
            var answers = current.answers[pos.num];
            for (var i = 0; i < answers.length; i++) {
                current.users[answers[i].userID].points = current.questions[pos.num].answers[answers[i].choice].points;
            }
        }
    },
    start: function(req) {

        var pairCode = req.session['pairCode'] = req.body.pairCode;
        if (!data[pairCode]) {
            var current = {};
            current.users = [];
            var quizID = req.body.quizID;
            console.log('\t Starting session[' + pairCode + '] using quizID[' + quizID + ']')
            current = JSON.parse(fs.readFileSync('quizzes/' + quizID.replace(/\./g,'') + '.json', 'utf8'));
            current.answers = [];
            for (var i = 0; i < current.questions.length; i++) {
                current.answers[i] = [];
            }
            current.pos = {
                num: 0,
                sub: 'beginning'
            };
            data[pairCode] = current;
            return {
                status: {
                    code: 200,
                    message: 'ok - started quiz, using question set ' + quizID
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
    join: function(req) {
        var name = req.body.name;
        var pairCode = req.session['pairCode'] = req.body.pairCode;
        if(!data[pairCode])
        return {error:{
          code: 1,
          message: 'session with pairCode='+pairCode+' not yet created'
        }}
        if (data[pairCode].users == undefined)
            data[pairCode].users = []
        var userID = req.session['userID'] = data[pairCode].users.length;
        data[pairCode].users.push(new User(name, pairCode, userID));
        return {
            status: {
                code: 200,
                message: 'ok - created user' + name
            },
            name: name,
            userID: userID
        }
    },
    answer: function(req) {
        var current = data[req.session['pairCode']];
        var choice = req.body.choice;
        var userID = req.session['userID'];
        var flag = true;
        var answers = current.answers[current.pos.num];
        for (var i = 0; i < answers.length; i++) {
            if (answers[i].userID == userID) {
                answers[i].choice = choice;
                flag = false;
            }
        }
        if (flag)
            current.answers[current.pos.num].push({
                choice: choice,
                userID: userID
            });

        return {
            status: {
                code: 200,
                message: 'ok - submitted choice' + choice
            }
        };
    },
    load: function(req) {
      if(req.body.quizID.length > 20){
          return {
            ugh: 'no'
          }
        }
        return JSON.parse(fs.readFileSync('quizzes/' + req.body.quizID.replace(/\./g,'') + '.json', 'utf8'));
    },
    save: function(req) {
      if(req.body.quizID.length > 20){
        return {
          ugh: 'no'
        }
      }
      fs.writeFileSync('quizzes/' + req.body.quizID.replace(/\./g,'') + '.json', JSON.stringify(req.body.data), 'utf8');
      return {
        status: 'ok'
      }
    },
    output: function() {
        return data;
    }
};