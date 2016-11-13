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
    .filter('ordinal', function() {
        return function(input) {
            var s = ["th", "st", "nd", "rd"],
                v = input % 100;
            return input + (s[(v - 20) % 10] || s[v] || s[0]);
        }
    })
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
    .service('httpService', httpService)
    .service('Materialize', function() {
        return Materialize;
    })
    .factory('io', function(httpService) {

        var collection = [];

        // dataStream.onMessage(function(message) {
        //     collection.push(JSON.parse(message.data));
        // });

        var methods = {
            collection: collection,
            get: function(url) {
                return httpService.get(url);
            },
            post: function(url, payload) {
                return httpService.post(url, payload);
            },
            api: function(method, payload) {
                if (payload == undefined)
                    payload = {};
                payload.method = method;
                return this.post('index', payload);
            },
            join: function(pairCode, name) {
                return this.api('join', {
                    pairCode: pairCode.toUpperCase(),
                    name: name
                });
            },
            update: function() {
                return this.api('update');
            }
        };

        return methods;
    })
    .factory('update', function(io, $timeout) {
        return function($scope, force) {
            $scope.updating = true;
            $timeout(function($scope) {
                io.update().then(function(res) {
                    if (force || $scope.data.hash != res.data.hash)
                        $scope.data = res.data;
                    $scope.updating = false
                })
            }, 500, true, $scope, force);
        };
    })
    .factory('windowDebug', function(update) {
        return function($scope) {
            var tests = {
                update: function() {
                    update($scope, true)
                },

                outputScope: function() {
                    // console.log($scope)
                    return $scope;
                },

                stopRefresh: function() {
                    $interval.cancel($scope.updateInterval);
                }
            };
            return window.quiz = tests;
        }
    })
    .controller('QuizController', function($scope, io, update, $interval, windowDebug) {
        $scope.data = {};
        $scope.data.showClass = 'pair';
        $scope.update = update;

        var updateInterval;

        $scope.join = function() {
            io.join($scope.code, $scope.name).then(function(res) {
                $scope.userID = res.data.userID;
                $scope.answerFilter = {
                    userID: $scope.userID,
                    choice: '',
                    $: ''
                };
            });
            update($scope, true);

            $scope.updateInterval = $interval(function() {
                update($scope);
                if ($scope.data.showClass == 'end') {
                    $interval.cancel($scope.updateInterval);
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

        $scope.answer = function(choice) {
            console.log('answer', choice);
            io.api('answer', {
                choice: choice
            });
            window.location.href = '#' + choice;
        };

        $scope.checkIfStarted = function() {
            io.api('isStarted', {
                pairCode: $scope.code
            }).then(function(res) {
                $scope.codeIsUsed = res.data.started ? 'valid' : 'invalid';
                // console.log(res);
            })
        }
        $scope.checkHasJoined = function() {
            io.api('hasJoined', {
                pairCode: $scope.code,
                name: $scope.name
            }).then(function(res) {
                $scope.nameIsUsed = res.data.joined ? 'invalid' : 'valid';
                // console.log(res);
            })
        }


        windowDebug($scope);

    })
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

        window.checkIfStarted = $scope.checkIfStarted = function() {
            io.api('isStarted', {
                pairCode: $scope.code
            }).then(function(res) {
                $scope.codeIsUsed = res.data.started ? 'invalid' : 'valid';
                $scope.startJoin = res.data.started ? 'join' : 'start';
                console.log(res);
            })
        }

        $scope.checkIfExists = function() {
            io.api('exists', {
                quizID: $scope.quizID
            }).then(function(res) {
                $scope.quizExists = res.data.exists ? 'valid' : 'invalid';
                console.log(res);
            })
        }

        windowDebug($scope);
    })
    .controller('AdminController', function($scope, io, Materialize, $timeout, windowDebug) {
        $scope.data = {};
        $scope.data.questions = [];


        $scope.loadQuiz = function() {
            if (!$scope.quizID)
                return;
            io.api('load', {
                quizID: $scope.quizID
            }).then(function(res) {
                $scope.data = res.data;
                $timeout(Materialize.updateTextFields, 500)
            })
        };

        $scope.saveQuiz = function() {
            if (!$scope.quizID)
                return;
            console.log($scope.quizID, $scope.data);
            io.api('save', {
                quizID: $scope.quizID,
                data: $scope.data
            })

        }

        $scope.newQuestion = function() {
            $scope.data.questions.push({
                answers: [],
                time: 30
            });
            $timeout(Materialize.updateTextFields, 500)
        }

        var defaultColors = ['#337ab7', '#c9302c', '#ec971f', '#5cb85c', '#5bc0de', '#6f5499']
        $scope.newAnswer = function(answers) {
            answers.push({
                color: defaultColors[answers.length] || '#000000'
            });
        }

        windowDebug($scope);
    });

$('.full-height').css('min-height', window.innerHeight);
