var App = angular.module('App', ['ngRoute']);

App.config(['$routeProvider', '$httpProvider', '$locationProvider', function($routeProvider, $httpProvider, $locationProvider) {
	
	$routeProvider 
	.when('/', 			{ templateUrl: 	'templates/libretto.html',
										controller: 	'librettoController'
									})
	.when('/admin', { templateUrl: 	'templates/admin.html', 
										controller: 	'adminController' /*, 
										resolve: { 
											loggedin: checkLoggedin 
										}*/}) 
	.when('/login', { templateUrl: 	'templates/login.html', 
										controller: 	'LoginCtrl' }) 
	.otherwise(			{ redirectTo: '/' });

	$locationProvider.html5Mode(true);

	// angular authentication interceptor
	$httpProvider.responseInterceptors.push(function($q, $location) { 
		return function(promise) { 
			return promise.then( 
				// Success: just return the response 
				function(response){ 
					return response; 
				}, 
				// Error: check the error status to get only the 401 
				function(response) { 
					if (response.status === 401) {
						$location.url('/login'); 
					}
					return $q.reject(response); 
				}
			); 
		}
	});

}]);

App.factory('socket', function ($rootScope) {
	var socket = io.connect('http://localhost');
	return {
    on: function (eventName, callback) {
        socket.on(eventName, function () {
            var args = arguments;
            $rootScope.$apply(function () {
                callback.apply(socket, args);
            });
        });
    },
    emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
                if (callback) {
                    callback.apply(socket, args);
                }
            });
        });
    }
  }
});

App.controller('operaController', ['$scope', '$route', 'socket', function ($scope, $route, socket) {

	  socket.on('initialize', function (data) {
  		$scope.otitle = data.title;
    	$scope.subtitle = data.subtitle;
    	$scope.composer = data.composer;
    	$scope.author = data.author;
		});
  
  	// prevents multiple fires
    $scope.$on('$destroy', function (event) {
    	socket.removeAllListeners();
    });

}]);

App.controller('librettoController', ['$scope', '$route', 'socket', function($scope, $route, socket) {

		socket.on('first-line', function (data) {
  		$scope.viewableContent = data;
		});

		socket.on('libretto-line', function (data) {
		  $scope.viewableContent = data;
		});

		// prevents multiple fires
    $scope.$on('$destroy', function (event) {
    	// socket.removeAllListeners();
    });

}]);

App.controller('adminController', ['$scope', '$route', 'socket', function($scope, $route, socket) {

	$scope.nextSlide = function() {
		socket.emit('libretto-next');
	}

	$scope.prevSlide = function() {
		socket.emit('libretto-prev');
	}

	// prevents multiple fires
  $scope.$on('$destroy', function (event) {
  	socket.removeAllListeners();
  });

}]);

var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){ 
	// Initialize a new promise 
	var deferred = $q.defer(); 
	// Make an AJAX call to check if the user is logged in 
	$http.get('/loggedin').success(function(user){ 
		// Authenticated 
		if (user !== '0') 
			$timeout(deferred.resolve, 0); 
		// Not Authenticated 
		else { 
			$rootScope.message = 'You need to log in.'; 
			$timeout(function() {
				deferred.reject();
			}, 0); 
			$location.url('/login'); 
		} 
	}); 
};
	
