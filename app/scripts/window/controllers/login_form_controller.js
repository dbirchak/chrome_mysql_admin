chromeMyAdmin.directive("loginForm", function() {
    "use strict";

    return {
        restrict: "E",
        templateUrl: "templates/login_form.html"
    };
});

chromeMyAdmin.controller("LoginFormController", ["$scope", "$timeout", "mySQLClientService", "favoriteService", "Events", function($scope, $timeout, mySQLClientService, favoriteService, Events) {
    "use strict";

    // Private methods

    var showErrorMessage = function(message) {
        $scope.safeApply(function() {
            $scope.errorMessage = message;
        });
    };

    var hideMessage = function() {
        $scope.safeApply(function() {
            $scope.successMessage = "";
            $scope.errorMessage = "";
        });
    };

    var showSuccessMessage = function(message) {
        $scope.safeApply(function() {
            $scope.successMessage = message;
        });
    };

    var onConnected = function(initialHandshakeRequest) {
        $scope.safeApply(function() {
            var connectionInfo = {
                name: $scope.name,
                hostName: $scope.hostName,
                port: $scope.portNumber,
                userName: $scope.userName,
                initialHandshakeRequest: initialHandshakeRequest
            };
            $scope.notifyConnectionChanged(connectionInfo);
        });
    };

    var assignEventHandlers = function() {
        $scope.$on(Events.FAVORITE_SELECTED, function(event, favorite) {
            $scope.safeApply(function() {
                $scope.name = favorite.name;
                $scope.hostName = favorite.hostName;
                $scope.portNumber = favorite.port;
                $scope.userName = favorite.userName;
                $scope.password = favorite.password;
            });
        });
        $scope.$on(Events.LOGIN, function(event, data) {
            doConnect();
        });
    };

    var showAboutMe = function() {
        var manifest = chrome.runtime.getManifest();
        var aboutMe = manifest.name + " version " + manifest.version;
        aboutMe += " (C) " + manifest.author + " 2014, all rights reserved.";
        $scope.aboutMe = aboutMe;
    };

    var doConnect = function() {
        hideMessage();
        mySQLClientService.login(
            $scope.hostName,
            Number($scope.portNumber),
            $scope.userName,
            $scope.password
        ).then(function(initialHandshakeRequest) {
            onConnected(initialHandshakeRequest);
        }, function(reason) {
            showErrorMessage("Connection failed: " + reason);
        });
    };

    // Public methods

    $scope.initialize = function() {
        $scope.successMessage = "";
        $scope.errorMessage = "";
        $scope.portNumber = 3306;
        assignEventHandlers();
        showAboutMe();
    };

    $scope.connect = function() {
        doConnect();
    };

    $scope.doTestConnection = function() {
        hideMessage();
        mySQLClientService.login(
            $scope.hostName,
            Number($scope.portNumber),
            $scope.userName,
            $scope.password
        ).then(function(initialHandshakeRequest) {
            showSuccessMessage("Connection was successfully.");
            mySQLClientService.logout();
        }, function(reason) {
            showErrorMessage("Connection failed: " + reason);
        });
    };

    $scope.isErrorMessageVisible = function() {
        return $scope.errorMessage.length > 0;
    };

    $scope.isSuccessMessageVisible = function() {
        return $scope.successMessage.length > 0;
    };

    $scope.isLoginFormVisible = function() {
        return !mySQLClientService.isConnected();
    };

    $scope.addFavorite = function() {
        var name = $scope.name || $scope.hostName;
        if (name) {
            favoriteService.set(name, $scope.hostName, Number($scope.portNumber), $scope.userName, $scope.password);
        }
    };

    $scope.canConnect = function() {
        return $scope.hostName && $scope.portNumber && $scope.userName;
    };

}]);
