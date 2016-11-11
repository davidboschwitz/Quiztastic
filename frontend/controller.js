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
                    pairCode: pairCode,
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
        return function($scope) {
            $scope.updating = true;
            $timeout(function($scope) {
                io.update().then(function(res) {
                    $scope.data = res.data;
                    $scope.updating = false
                })
            }, 500, true, $scope);
        };
    })
    .controller('QuizController', function($scope, io, update, $interval) {
        $scope.data = {};
        $scope.data.showClass = 'pair';
        $scope.update = update;

        var updateInterval;

        $scope.join = function() {
            io.join($scope.code, $scope.name).then(function(res) {
                $scope.userID = res.userID;
                $scope.answerFilter = {
                    userID: $scope.userID,
                    choice: '',
                    $: ''
                };
            });
            update($scope);

            updateInterval = $interval(function() {
                update($scope);
                if ($scope.data.showClass == 'end')
                    $interval.cancel(updateInterval);
            }, 1000);
        }

        window.stopRefresh = function() {
            $interval.cancel(updateInterval);
        }

        $scope.answer = function(choice) {
            console.log('answer', choice);
            io.api('answer', {
                choice: choice
            });
            window.location.href = '#' + choice;
        }

    })
    .controller('PresenterController', function($scope, io, $interval, $timeout, update) {
        window.io = $scope.io = io;
        $scope.data = {};
        $scope.data.showClass = 'pair';

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
                pairCode: $scope.code
            });
            //$scope.showClass = 'main';
            update($scope);
        }

        $scope.next = function() {
            $scope.data.time = -1;
            io.api('next');
            update($scope);
        }

        window.update = function() {
            update($scope)
        };
        window.outputScope = function() {
            console.log($scope)
        };

    })
    .controller('AdminController', function($scope, io, Materialize, $timeout) {
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
        console.log(Materialize);
    });

function updateMaterializeText() {
    Materialize.updateTextFields();
}
