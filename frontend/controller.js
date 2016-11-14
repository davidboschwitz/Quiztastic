function httpService($http) {
    this.get = function(url) {
        return $http.get(endpoint + url);
    }
    this.post = function(url, data) {
        return $http.post(endpoint + url, data);
    }
}

var endpoint = 'http://vps.boschwitz.me:3333/';

angular.module('quizApp', [])
    // h/t http://ecommerce.shopify.com/c/ecommerce-design/t/ordinal-number-in-javascript-1st-2nd-3rd-4th-29259
    /**
     *  A filter to change ordinary numbers to ordinals (ie 1 -> 1st, 2 -> 2nd)
     */
    .filter('ordinal', function() {
        return function(input) {
            var s = ["th", "st", "nd", "rd"],
                v = input % 100;
            return input + (s[(v - 20) % 10] || s[v] || s[0]);
        }
    })
    /**
     *  A fix to allow cookies in ajax requests
     */
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.interceptors.push(['$q',
            function($q) {
                return {
                    request: function(config) {
                        config.withCredentials = true;
                        return config;
                    }
                };
            }
        ]);
    }])
    /**
     *  The http service for get and post requests
     */
    .service('httpService', httpService)
    /**
     *  allows controllers to access the Materialize.js library (helper methods for the stylesheet)
     */
    .service('Materialize', function() {
        return Materialize;
    })
    /**
     *  The input and output service for all clients
     */
    .factory('io', function(httpService) {
        var methods = {
            /**
             *  Method for ajax get request
             */
            get: function(url) {
                return httpService.get(url);
            },
            /**
             *  Method for ajax post request
             */
            post: function(url, payload) {
                return httpService.post(url, payload);
            },
            /**
             *  Method that posts to endpoint/index, which utilizes the api-methods file
             */
            api: function(method, payload) {
                if (payload == undefined)
                    payload = {};
                payload.method = method;
                return this.post('index', payload);
            },
            /**
             *  Shortcut method to call join for the participant client
             */
            join: function(pairCode, name) {
                return this.api('join', {
                    pairCode: pairCode.toUpperCase(),
                    name: name
                });
            },
            /**
             *  Shortcut method to call the update method for the participant and presenter client
             */
            update: function() {
                return this.api('update');
            }
        };

        return methods;
    })
    /**
     *  a simplified update method that can be utilized by all clients
     */
    .factory('update', function(io, $timeout) {
        return function($scope, force) {
          //$scope.updating adds css styles to clients so the user knows that their screen is updating
            $scope.updating = true;

            //a timeout is used so any ajax methods called immediately before update() will process
            $timeout(function($scope) {
                io.update().then(function(res) {
                  //only update if the data is different, or the client has requested/forced it
                    if (force || $scope.data.hash != res.data.hash)
                        $scope.data = res.data;
                    $scope.updating = false
                })
            }, 500, true, $scope, force);
        };
    })
    /**
     *  My way to debug the angular controller, when called adds an object `window.quiz` that contains useful methods to see within angular's scope
     */
    .factory('windowDebug', function(update) {
        return function($scope) {
            var tests = {

              //forces an update
                update: function() {
                    update($scope, true)
                },

//outputs the $scope obj
                outputScope: function() {
                    // console.log($scope)
                    return $scope;
                },

//cancels the auto refresh on the participant client
                stopRefresh: function() {
                    $interval.cancel($scope.updateInterval);
                }
            };
            return window.quiz = tests;
        }
    })
    /**
     *  The controller for the participant client
     */
    .controller('QuizController', function($scope, io, update, $interval, windowDebug) {

      //initialize necessary data
        $scope.data = {};
        $scope.data.showClass = 'pair';
        $scope.update = update;

//function called when the join button is clicked/enter is pressed
        $scope.join = function() {
            io.join($scope.code, $scope.name).then(function(res) {
              //set userID
                $scope.userID = res.data.userID;
            });
            //force update
            update($scope, true);

//interval to auto update every second to keep the client up to date/feel realtime
            $scope.updateInterval = $interval(function() {
                update($scope);

                if ($scope.data.showClass == 'end') {
                                //if this screen is the last one, cancel the update interval
                    $interval.cancel($scope.updateInterval);
                }
                if($scope.data.showClass == 'end' || $scope.data.showClass == 'intermission'){
                  //if this screen displays rank, process the user data to compute this user's rank overall
                  var users = $scope.data.users;
                  var rank = 1;
                  for (var i = 0; i < users.length; i++) {
                      if (i == $scope.userID) continue;
                      if (users[i].score > users[$scope.userID])
                          rank++;
                  }
                  $scope.rank = rank;
                }
            }, 1000);
        };

//method called when an answer is selected
        $scope.answer = function(choice) {
            console.log('answer', choice);

            //call the api
            io.api('answer', {
                choice: choice
            });

            //show the shadow around the selected choice
            window.location.href = '#' + choice;
        };

//runs when a pairing code is enters, checks with the server to see if a session with that pair code has started
        $scope.checkIfStarted = function() {

          //call the api
            io.api('isStarted', {
                pairCode: $scope.code
            }).then(function(res) {
              //show validation/error messages on input label
                $scope.codeIsUsed = res.data.started ? 'valid' : 'invalid';
                // console.log(res);
            })
        }

        //runs when a user enters a name, shows error validation when a user with that name has already joined
        $scope.checkHasJoined = function() {

          //call the api
            io.api('hasJoined', {
                pairCode: $scope.code,
                name: $scope.name
            }).then(function(res) {
              //show validation/error messages on input label
                $scope.nameIsUsed = res.data.joined ? 'invalid' : 'valid';
                // console.log(res);
            })
        }

//init window debug window.quiz object
        windowDebug($scope);

    })

    /**
     *  Controller for the presenter
     */
    .controller('PresenterController', function($scope, io, $interval, $timeout, update, windowDebug) {
        // window.io = $scope.io = io;
        $scope.data = {};
        $scope.data.showClass = 'pair';
        $scope.startJoin = 'join';

        $scope.Math = Math;
        $interval(function() {
            if ($scope.data.time == 0)
                $scope.next();
            if ($scope.data.time < 0 || $scope.data.time == NaN)
                return;
            $scope.data.time--;
        }, 1000);

        $scope.pair = function() {
            io.api('start', {
                quizID: $scope.quizID,
                pairCode: $scope.code.toUpperCase()
            });
            //$scope.showClass = 'main';
            update($scope);
        };

        $scope.next = function() {
            $scope.data.time = -1;
            io.api('next');
            update($scope, true);
        };

        //runs when a pairing code is enters, checks with the server to see if a session with that pair code has started
        $scope.checkIfStarted = function() {
            if ($scope.code == '') {
              //don't bother if there isn't any input entered
                $scope.codeIsUsed = '';
                $scope.startJoin = 'start';
                return;
            }
            //call api
            io.api('isStarted', {
                pairCode: $scope.code
            }).then(function(res) {
              //show error or validation on inputs
                $scope.codeIsUsed = res.data.started ? 'invalid' : 'valid';
                //change button text to match up with operation being performed
                $scope.startJoin = res.data.started ? 'join' : 'start';
                // console.log(res);
            })
        }

//checks to see if a quiz under that ID exists
        $scope.checkIfExists = function() {
          //call api
            io.api('exists', {
                quizID: $scope.quizID
            }).then(function(res) {
              //show validation on input label
                $scope.quizExists = res.data.exists ? 'valid' : 'invalid';
                console.log(res);
            })
        }

//init window debug window.quiz object
        windowDebug($scope);
    })

    /**
     *  Controller for the admin editing/saving quiz page
     */
    .controller('AdminController', function($scope, io, Materialize, $timeout, windowDebug) {
      //init data
        $scope.data = {};
        $scope.data.questions = [];


//function called when the load button is pressed, loads quiz from server
        $scope.loadQuiz = function() {
          //do nothing if no quizID is entered
            if (!$scope.quizID)
                return;

                //call api
            io.api('load', {
                quizID: $scope.quizID
            }).then(function(res) {
              //put data in data object
                $scope.data = res.data;
                //call materialize library to updateTextField apperance
                $timeout(Materialize.updateTextFields, 500)
            })
        };

//save button method, saves quiz to server
        $scope.saveQuiz = function() {
          //do nothing if no quizID is entered
            if (!$scope.quizID)
                return;
            console.log($scope.quizID, $scope.data);

            //call api
            io.api('save', {
                quizID: $scope.quizID,
                data: $scope.data
            })

        }

//creates new question
        $scope.newQuestion = function() {
          //pushes blank question to array
            $scope.data.questions.push({
                answers: [],
                time: 30
            });
            //call materialize library to updateTextField apperance
            $timeout(Materialize.updateTextFields, 500)
        };

//creates new section
        $scope.newSection = function() {
          //adds section to array
            $scope.data.questions.push({
                answers: [],
                time: -1,
                isSection: true
            });
            //call materialize library to updateTextField apperance
$timeout(Materialize.updateTextFields, 500)
        };

//array of default colors for choices
        var defaultColors = ['#337ab7', '#c9302c', '#ec971f', '#5cb85c', '#5bc0de', '#6f5499']
        //creates new answer choice for a question (input array of current question's answers)
        $scope.newAnswer = function(answers) {
          //adds a blank question to array
            answers.push({
                color: defaultColors[answers.length] || '#000000',
                points: 0
            });
        };


        windowDebug($scope);
    });

$('.full-height').css('min-height', window.innerHeight);
