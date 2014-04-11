chromeMyAdmin.controller("MainFooterController", ["$scope", "modeService", "mySQLClientService", "rowsPagingService", "rowsSelectionService", "targetObjectService", "Events", "Modes", function($scope, modeService, mySQLClientService, rowsPagingService, rowsSelectionService, targetObjectService, Events, Modes) {
    "use strict";

    var showMainStatusMessage = function(message) {
        $scope.safeApply(function() {
            $scope.mainStatusMessage = message;
        });
    };

    var _hasPrevisouPage = function() {
        return rowsPagingService.hasPrevious();
    };

    var _hasNextPage = function() {
        return rowsPagingService.hasNext();
    };

    $scope.initialize = function() {
        $scope.$on(Events.SHOW_MAIN_STATUS_MESSAGE, function(event, message) {
            showMainStatusMessage(message);
        });
    };

    $scope.isRowsButtonsVisible = function() {
        return mySQLClientService.isConnected() && modeService.getMode() === Modes.ROWS;
    };

    $scope.isStructureButtonsVisible = function() {
        return mySQLClientService.isConnected() && modeService.getMode() === Modes.STRUCTURE;
    };

    $scope.hasPreviousPage = function() {
        return _hasPrevisouPage();
    };

    $scope.hasNextPage = function() {
        return _hasNextPage();
    };

    $scope.goPreviousPage = function() {
        if (_hasPrevisouPage()) {
            rowsPagingService.previous();
        }
    };

    $scope.goNextPage = function() {
        if (_hasNextPage()) {
            rowsPagingService.next();
        }
    };

    $scope.getPagingInfo = function() {
        return (rowsPagingService.getCurrentPageIndex() + 1) + "/" + rowsPagingService.getTotalPageCount();
    };

    $scope.refreshRows = function() {
        rowsPagingService.refresh();
    };

    $scope.refreshStructure = function() {
        targetObjectService.reSelectTable();
    };

    $scope.isRowSelection = function() {
        if (rowsSelectionService.getSelectedRows() &&
           modeService.getMode() === Modes.ROWS) {
            return true;
        } else {
            return false;
        }
    };

    $scope.confirmDeleteSelectedRow = function() {
        rowsSelectionService.confirmDeleteSelectedRow();
    };

    $scope.isTableSelection = function() {
        return targetObjectService.getTable();
    };

    $scope.insertRow = function() {
        targetObjectService.requestInsertRow();
    };

}]);