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
            rtn.title = current.questions[current.pos.num].title;
            rtn.showClass = 'intermission';
            if (req.session['userID'] != undefined) {
                rtn.question = current.questions[current.pos.num];
                rtn.users = current.users;
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
            rtn.hash = rtn.showClass + current.pos.num + current.pos.sub;
            return rtn;
        } else if (current.pos.sub == 'question') {

            return {
                title: current.questions[current.pos.num].title,
                question: current.questions[current.pos.num],
                showClass: 'question',
                time: current.questions[current.pos.num].time,
                hash: this.showClass + current.pos.num + current.pos.sub
            };
        } else if (current.pos.sub == 'beginning') {
            return {
                showClass: 'beginning',
                pairCode: pairCode,
                title: current.title,
                hash: this.showClass + current.pos.num + current.pos.sub
            }
        } else if (current.pos.sub == 'end') {
            return {
                showClass: 'end',
                title: 'Final Rankings',
                users: current.users,
                hash: this.showClass + current.pos.num + current.pos.sub
            }
        }
        return {
            error: {
                code: 500,
                message: 'incorrect pos.sub'
            }
        };
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
            if (data[pairCode].questions[pos.num].answers.length == 0) {
                //this is a section header, not a question
                pos.sub = 'question';
                if (pos.num + 1 >= data[pairCode].questions.length) {
                    pos.sub = 'end';
                } else {
                    pos.num++;
                }
                return;
            }
            pos.sub = 'intermission';
            var current = data[pairCode];
            var answers = current.answers[pos.num];
            for (var i = 0; i < answers.length; i++) {
                current.users[answers[i].userID].score += (current.questions[pos.num].answers[answers[i].choice].points || 0);
            }
        }
    },
    start: function(req) {
        req.session['pairCode'] = req.session['userID'] = undefined;
        var pairCode = req.session['pairCode'] = req.body.pairCode.toUpperCase();
        if (!data[pairCode]) {
            var current = {};
            current.users = [];
            var quizID = req.body.quizID;
            console.log('\t Starting session[' + pairCode + '] using quizID[' + quizID + ']')
            current = JSON.parse(fs.readFileSync(__dirname + '/quizzes/' + quizID.replace(/\./g, '') + '.json', 'utf8'));
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
        req.session['pairCode'] = req.session['userID'] = undefined;
        var name = req.body.name;
        var pairCode = req.session['pairCode'] = req.body.pairCode.toUpperCase();
        if (!data[pairCode])
            return {
                error: {
                    code: 1,
                    message: 'session with pairCode=' + pairCode + ' not yet created'
                }
            }
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
    isStarted: function(req) {
        return {
            started: !!data[req.body.pairCode.toUpperCase()]
        };
    },
    hasJoined: function(req) {
        if (!data[req.body.pairCode.toUpperCase()])
            return {
                joined: false
            }
        var users = data[req.body.pairCode.toUpperCase()].users;
        for (var i = 0; i < users.length; i++) {
            if (users[i].name == req.body.name)
                return {
                    joined: true
                }
        }
        return {
            joined: false
        }
    },
    exists: function(req) {
        if (req.body.quizID.length > 20) {
            return {
                ugh: 'no'
            }
        }
        return {
            exists: fs.existsSync(__dirname + '/quizzes/' + req.body.quizID.replace(/\./g, '') + '.json')
        }
    },
    load: function(req) {
        if (req.body.quizID.length > 20) {
            return {
                ugh: 'no'
            }
        }
        if (fs.existsSync(__dirname + '/quizzes/' + req.body.quizID.replace(/\./g, '') + '.json'))
            return JSON.parse(fs.readFileSync(__dirname + '/quizzes/' + req.body.quizID.replace(/\./g, '') + '.json', 'utf8'));
        return {
            questions: [],
            title: 'New Quiz'
        };
    },
    save: function(req) {
        if (req.body.quizID.length > 20) {
            return {
                ugh: 'no'
            }
        }
        fs.writeFileSync(__dirname + '/quizzes/' + req.body.quizID.replace(/\./g, '') + '.json', JSON.stringify(req.body.data), 'utf8');
        return {
            status: 'ok'
        }
    },
    output: function() {
        return data;
    }
};
