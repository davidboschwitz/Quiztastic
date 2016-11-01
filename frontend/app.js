function httpService($http) {
    this.get = function(url) {
        return $http.get(url);
    }
    this.post = function(url, data) {
        return $http.post(url, data);
    }
}

angular.module('quizApp', [])
    .service('httpService', httpService)
    .factory('io', function(httpService) {

        var collection = [];

        // dataStream.onMessage(function(message) {
        //     collection.push(JSON.parse(message.data));
        // });

        var methods = {
            collection: collection,
            get: function() {

            }
        };

        return methods;
    })
    .controller('QuizController', function($scope, io) {


        $scope.data = {};
        $scope.data.questions = [];
        httpService.get("http://vps.boschwitz.me:3333/")
            .then(function(response) {
                $scope.data = response.data;
            });

    })
    .controller('PresenterController', function($scope, io, $interval) {
        $scope.data = {
            title: "Quiz Blah Blah blah",
            question: {
                title: "What color is the sky?",
                answers: [{
                    title: "blue",
                    //text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
                    color: "#337ab7"
                }, {
                    title: "red",
                    //text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
                    color: "#c9302c"
                }, {
                    title: "yellow",
                    // text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
                    color: "#ec971f"
                }, {
                    title: "green",
                    color: "#5cb85c"
                }]
            }
        };
        $scope.timeLeft = 80;
        $scope.Math = Math;
        $interval(function() {
            if ($scope.timeLeft == 0)
                return;
            $scope.timeLeft--;
        }, 1000);
    })
    .controller('AdminController', function($scope, io) {

    });