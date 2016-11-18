var fs = require('fs');
var User = require('./User');

//the main object to store basically everything in
var data = {};


var APIMethods = module.exports = {


  /**
   *  General method to be called by all clients to get current screen data to display
   */
    update: function(req) {
        var pairCode = req.session['pairCode'];
        var current = data[pairCode];

        //ensure that client has a correct session pairCode
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

            //title to display on screen
            rtn.title = current.questions[current.pos.num].title;

            //show intermission screen
            rtn.showClass = 'intermission';


            if (req.session['userID'] != undefined) {
              //this will only be true for participants, not presenters

              //output question data for client's reference
                rtn.question = current.questions[current.pos.num];

                //output user data for clients reference for rank and scoring
                rtn.users = current.users;

                //output client's choice and answer data
                var answers = current.answers[current.pos.num];
                for (var i = 0; i < answers.length; i++) {
                    if (answers[i].userID == req.session['userID']) {
                        rtn.answer = answers[i];
                        break;
                    }
                }
            } else {
              //output data needed by presenter
                rtn.answers = current.answers[current.pos.num];
                rtn.question = current.questions[current.pos.num];
                rtn.users = current.users;
            }
            //hash prevents the screen from constantly refreshing, will only change the screen when it is different.
            //this fixes a bug where the participant screen refereshes every 1 seconds
            rtn.hash = rtn.showClass + current.pos.num + current.pos.sub;
            return rtn;
        } else if (current.pos.sub == 'question') {
          //output all data needed to display a question to all clients
            return {
                title: current.questions[current.pos.num].title,
                question: current.questions[current.pos.num],
                //showClass will be section if there are no choices for answers, because this is what defines a section vs a question
                showClass: data[pairCode].questions[pos.num].answers.length == 0 ? 'section' : 'question',
                time: current.questions[current.pos.num].time,
                hash: this.showClass + current.pos.num + current.pos.sub
            };
        } else if (current.pos.sub == 'beginning') {
          //just output the barebones and quiz title.
            return {
                showClass: 'beginning',
                pairCode: pairCode,
                title: current.title,
                users: current.users,
                hash: this.showClass + current.pos.num + current.pos.sub
            }
        } else if (current.pos.sub == 'end') {
          //output users so we can show all clients ranks and score
            return {
                showClass: 'end',
                title: 'Final Rankings',
                users: current.users,
                hash: this.showClass + current.pos.num + current.pos.sub
            }
        }

        //should never happen
        return {
            error: {
                code: 500,
                message: 'incorrect pos.sub'
            }
        };
    },

    /**
     * Method for presenter to move on to the next screen
     */
    next: function(req) {
        var pairCode = req.session['pairCode'];
        pos = data[pairCode].pos;
        if (pos.sub == 'beginning') {
          //moves on to next sub enum
            pos.sub = 'question';
        } else if (pos.sub == 'intermission') {
          //moves on to next sub enum
            pos.sub = 'question';
            if (pos.num + 1 >= data[pairCode].questions.length) {
              //if there are no questions left, proceed to final screen
                pos.sub = 'end';
            } else {
              //questions left, proceed to next question
                pos.num++;
            }
        } else if (pos.sub == 'question') {
            if (data[pairCode].questions[pos.num].answers.length == 0) {
                //if true this is a section header, not a question, skip intermission and move on to next question or end
                pos.sub = 'question';
                if (pos.num + 1 >= data[pairCode].questions.length) {
                    pos.sub = 'end';
                } else {
                    pos.num++;
                }
                return;
            }
            //move on to intermission and display scores and answers for questions
            pos.sub = 'intermission';

            //add up user's scores
            var current = data[pairCode];
            var answers = current.answers[pos.num];
            for (var i = 0; i < answers.length; i++) {
                current.users[answers[i].userID].score += (current.questions[pos.num].answers[answers[i].choice].points || 0);
            }
        }
    },


    /**
     * Method for presenter to initialize pairCode and start session
     */
    start: function(req) {
      //clear session data
        req.session['pairCode'] = req.session['userID'] = undefined;
        //init cookie session data and store pairCode
        var pairCode = req.session['pairCode'] = req.body.pairCode.toUpperCase();

        //check if session isn't started, start if it isn't
        if (!data[pairCode]) {
          //init session data
            var current = {};
            current.users = [];
            var quizID = req.body.quizID;
            console.log('\t Starting session[' + pairCode + '] using quizID[' + quizID + ']')

            //load quiz data
            current = JSON.parse(fs.readFileSync(__dirname + '/quizzes/' + quizID.replace(/\./g, '') + '.json', 'utf8'));

            //prepare session for participant input
            current.answers = [];
            for (var i = 0; i < current.questions.length; i++) {
                current.answers[i] = [];
            }

            //initialize position object
            current.pos = {
                num: 0,
                sub: 'beginning'
            };

            //store in data array
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


    /**
     *  Method for participant to join quiz session
     */
    join: function(req) {
        // clear any existing session data
        req.session['pairCode'] = req.session['userID'] = undefined;

        //get the name
        var name = req.body.name;

        //set the paircode in session data
        var pairCode = req.session['pairCode'] = req.body.pairCode.toUpperCase();

        //see if session with pairCode has started
        if (!data[pairCode])
            return {
                error: {
                    code: 1,
                    message: 'session with pairCode=' + pairCode + ' not yet created'
                }
            }

        //if users array is not initialized, initialize it
        if (data[pairCode].users == undefined)
            data[pairCode].users = []

        //create new user
        var userID = req.session['userID'] = data[pairCode].users.length;
        data[pairCode].users.push(new User(name, pairCode, userID));

        //return info about new user back to client
        return {
            status: {
                code: 200,
                message: 'ok - created user' + name
            },
            name: name,
            userID: userID
        }
    },

    /**
     * Method for participant to submit answer
     */
    answer: function(req) {
        //current quiz session
        var current = data[req.session['pairCode']];

        //the user's choice
        var choice = req.body.choice;
        var userID = req.session['userID'];

        // flag is used to overwrite a previous choice by the user to prevent duplicate answers
        var flag = true;

        var answers = current.answers[current.pos.num];
        for (var i = 0; i < answers.length; i++) {
            //if user is chaning their answer, change it, don't add to submission array
            if (answers[i].userID == userID) {
                answers[i].choice = choice;
                flag = false;
            }
        }
        //add choice to submission array
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

    /**
     * Checks to see if a session using the paircode has been initialized in local memory
     */
    isStarted: function(req) {
        return {
            started: !!data[req.body.pairCode.toUpperCase()]
        };
    },

    /**
     * Checks to see if a user using the same name has already joined the session
     */
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

    /**
     * Checks to see if a quiz exists
     */
    exists: function(req) {
        if (req.body.quizID.length > 20) {
          //invalid quizID
            return {
                ugh: 'no'
            }
        }
        return {
            exists: fs.existsSync(__dirname + '/quizzes/' + req.body.quizID.replace(/\./g, '') + '.json')
        }
    },

    /**
     * Loads in quiz JSON data from the server so it can be edited
     */
    load: function(req) {
        if (req.body.quizID.length > 20) {
          //invalid quizID
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

    /**
     * Saves edited quiz data back to the server
     */
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

    /**
     * Useful for debugging, outputs all data for all sessions
     */
    output: function() {
        return data;
    }
};
