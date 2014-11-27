(function() {
    "use strict";

    // --- Model

    var Model = function() {
        this.entities = [];
        this.entityNameMap = {};
        this.connections = [];
        this.entityConnectionsMap = {};
    };

    Model.prototype.createAndAddEntity = function(entityName) {
        var exists = this.entityNameMap[entityName];
        if (!exists) {
            var entity = new Entity(entityName);
            this.entities.push(entity);
            this.entityNameMap[entityName] = entity;
            entity.setModel(this);
            return entity;
        } else {
            // FIXME: Already exists.
            return null;
        }
    };

    Model.prototype.getEntities = function() {
        return this.entities;
    };

    Model.prototype.getEntity = function(name) {
        return this.entityNameMap[name];
    };

    Model.prototype.addConnection = function(connection) {
        this.connections.push(connection);
        var source = connection.getSource();
        var target = connection.getTarget();
        this.addToEntityConnectionsMap(source.getEntity(), connection);
        this.addToEntityConnectionsMap(target.getEntity(), connection);
    };

    Model.prototype.addToEntityConnectionsMap = function(entity, connection) {
        var entityName = entity.getName();
        var cache = this.entityConnectionsMap[entityName];
        if (!cache) {
            cache = [];
        }
        cache.push(connection);
        this.entityConnectionsMap[entityName] = cache;
    };

    Model.prototype.getConnections = function() {
        return this.connections;
    };

    Model.prototype.getEntityConnections = function(entityName) {
        return this.entityConnectionsMap[entityName];
    };

    // --- Entity

    var Entity = function(entityName) {
        this.columns = [];
        this.columnNameMap = {};
        this.name = entityName;
        this.model = null;
    };

    Entity.prototype.getName = function() {
        return this.name;
    };

    Entity.prototype.setName = function(newName) {
        this.name = newName;
    };

    Entity.prototype.createAndAddColumn = function(columnName, columnType, columnNotNull, columnPrimary) {
        var exists = this.columnNameMap[columnName];
        if (!exists) {
            var column = new Column(columnName, columnType, columnNotNull, columnPrimary);
            column.setEntity(this);
            this.columns.push(column);
            this.columnNameMap[columnName] = column;
            return column;
        } else {
            // FIXME: Already exists.
            return null;
        }
    };

    Entity.prototype.getColumns = function() {
        return this.columns;
    };

    Entity.prototype.getColumn = function(name) {
        return this.columnNameMap[name];
    };

    Entity.prototype.getModel = function() {
        return this.model;
    };

    Entity.prototype.setModel = function(newModel) {
        this.model = newModel;
    };

    // --- Column

    var Column = function(columnName, columnType, columnNotNull, columnPrimary) {
        this.name = columnName;
        this.type = columnType;
        this.notNull = columnNotNull;
        this.primary = columnPrimary;
        this.entity = null;
        this.connections = [];
    };

    Column.prototype.getName = function() {
        return this.name;
    };

    Column.prototype.getType = function() {
        return this.type;
    };

    Column.prototype.isNotNull = function() {
        return this.notNull;
    };

    Column.prototype.isPrimary = function() {
        return this.primary;
    };

    Column.prototype.setEntity = function(parent) {
        this.entity = parent;
    };

    Column.prototype.getEntity = function() {
        return this.entity;
    };

    Column.prototype.connectTo = function(targetColumn, lineType) {
        if (this.entity.getName() === targetColumn.getEntity().getName()) {
            // FIXME: to same entity
            return null;
        }
        var connection = this.createAndAddConnection(targetColumn, lineType);
        // FIXME: Add connection to opposite column
        // targetColumn.createAndAddConnection(this);
        return connection;
    };

    Column.prototype.createAndAddConnection = function(targetColumn, lineType) {
        var name = targetColumn.getEntity().name + "." + targetColumn.getName();
        var connection = new Connection(targetColumn, lineType);
        connection.setSource(this);
        this.connections.push(connection);
        var model = this.getEntity().getModel();
        model.addConnection(connection);
        return connection;
    };

    Column.prototype.getConnections = function() {
        return this.connections;
    };

    // --- Connection

    var Connection = function(newTarget, newLineType) {
        this.source = null;
        this.target = newTarget;
        this.lineType = newLineType;
    };

    Connection.LineType = {
        SOLID: "solid",
        DOTTED: "dotted"
    };

    Connection.prototype.setSource = function(parent) {
        this.source = parent;
    };

    Connection.prototype.getSource = function() {
        return this.source;
    };

    Connection.prototype.getTarget = function() {
        return this.target;
    };

    Connection.prototype.getName = function() {
        return this.source.getEntity().getName() + "." +
            this.source.getName() + "." +
            this.target.getEntity().getName() + "." +
            this.target.getName();
    };

    Connection.prototype.getLineType = function() {
        return this.lineType;
    };

    // Export
    var ErDiagram = {
        Model: Model,
        Entity: Entity,
        Column: Column,
        Connection: Connection
    };

    if ("undefined" == typeof module) {
        window.ErDiagram = ErDiagram;
    } else {
        module.exports = ErDiagram;
    }

})();

chromeMyAdmin.directive("erDiagram", [function() {

    var setJCanvasDefaults = function() {
        $.jCanvas.defaults.layer = true;
        $.jCanvas.defaults.draggable = true;
        $.jCanvas.defaults.fromCenter = false;
    };

    return {
        restrict: "E",
        templateUrl: "templates/er_diagram.html",
        replace: true,
        scope: {
            model: "="
        },
        controller: ["$scope", function($scope) {
            $scope.drawModel = function(model, element) {
                var startX = 30;
                var startY = 30;
                var offsetX = startX;
                var offsetY = startY;
                var entities = model.getEntities();
                var xLength = Math.ceil(Math.sqrt(entities.length));
                var dimensions = [];
                var maxHeight = 0;
                for (var i = 0; i < entities.length; i++) {
                    var entity = entities[i];
                    var dimension = drawEntity(
                        model, entity, offsetX, offsetY, element);
                    dimensions.push(dimension);
                    maxHeight = Math.max(maxHeight, dimension.height);
                    offsetX += dimension.width + 50;
                    if ((i !== 0) && ((i + 1) % xLength === 0)) {
                        offsetX = startX;
                        offsetY += maxHeight + 50;
                        maxHeight = 0;
                    }
                }
                drawConnections(model, element);
                adjustCanvasSize(element);
            };

            var getCanvas = function(element) {
                return element.find("canvas");
            };

            var drawEntity = function(model, entity, x, y, element) {
                var canvas = getCanvas(element);

                // Event handlers
                var onDragHandler = (function(model, element) {
                    return function(layer) {
                        entityDrag(model, layer, element);
                    };
                })(model, element);
                var onDragEndHandler = (function(model, element) {
                    return function(layer) {
                        entityDragEnd(model, layer, element);
                    };
                })(model, element);

                var layerNames = [];
                // Draw entity name
                var entityName = entity.getName();
                drawText(x + 5, y + 5, entityName, entityName, entityName, onDragHandler, onDragEndHandler, canvas);
                layerNames.push(entityName);
                // Draw column list
                var columns = entity.getColumns();
                for (var i = 0; i < columns.length; i++) {
                    var column = columns[i];
                    var columnName = column.getName();
                    var columnType = column.getType();
                    var columnFullName = entityName + "." + columnName;
                    var label = "";
                    if (column.isPrimary()) {
                        label += "[PK] ";
                    }
                    label += columnName + " : " + columnType;
                    if (column.isNotNull()) {
                        label += " not null";
                    }
                    drawText(x + 5, y + 30 + (i * 20),
                             label, columnFullName, entityName, onDragHandler, onDragEndHandler, canvas);
                    layerNames.push(columnFullName);
                }
                // Draw entity border
                var maxTextWidth = 0;
                for (i = 0; i < layerNames.length; i++) {
                    var layer = canvas.getLayer(layerNames[i]);
                    maxTextWidth = Math.max(maxTextWidth, Math.ceil(layer.width));
                }
                var width = maxTextWidth + 10;
                var height = columns.length * 20 + 30;
                canvas.drawRect({
                    strokeStyle: "black",
                    strokeWidth: "1",
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    name: entityName + "-border",
                    groups: [entityName],
                    dragGroups: [entityName],
                    drag: onDragHandler,
                    dragstop: onDragEndHandler,
                    dragcancel: onDragEndHandler
                });
                // Draw entity name underline
                canvas.drawLine({
                    strokeStyle: "black",
                    strokeWidth: "1",
                    x1: x,
                    y1: y + 23,
                    x2: x + width,
                    y2: y + 23,
                    name: entityName + "-name-line",
                    groups: [entityName],
                    dragGroups: [entityName],
                    drag: onDragHandler,
                    dragstop: onDragEndHandler,
                    dragcancel: onDragEndHandler
                });
                return {x: x, y: y, width: width, height: height};
            };

            var drawText = function(x, y, text, name, group, onDragHandler, onDragEndHandler, canvas) {
                canvas.drawText({
                    fillStyle: "black",
                    strokeStyle: "black",
                    strokeWidth: "0",
                    x: x,
                    y: y,
                    fontSize: 13,
                    fontFamily: "sans-serif",
                    text: text,
                    name: name,
                    groups: [group],
                    dragGroups: [group],
                    drag: onDragHandler,
                    dragstop: onDragEndHandler,
                    dragcancel: onDragEndHandler
                });
            };

            var adjustCanvasSize = function(element) {
                var canvas = getCanvas(element);
                var layers = canvas.getLayers();
                var canvasWidth = 0;
                var canvasHeight = 0;
                for (var i = 0; i < layers.length; i++) {
                    var name = layers[i].name;
                    if (name.match(/-border$/)) {
                        canvasWidth = Math.max(canvasWidth, layers[i].x + layers[i].width);
                        canvasHeight = Math.max(canvasHeight, layers[i].y + layers[i].height);
                    }
                }
                canvas.attr("width", canvasWidth + 50);
                canvas.attr("height", canvasHeight + 50);
                canvas.drawLayers();
            };

            var drawConnections = function(model, element) {
                var connections = model.getConnections();
                for (var i = 0; i < connections.length; i++) {
                    drawConnection(connections[i], element);
                }
            };

            var drawConnection = function(connection, element) {
                var canvas = getCanvas(element);
                var source = connection.getSource();
                var sourceBorderLayer = canvas.getLayer(
                    source.getEntity().getName() + "-border");
                var target = connection.getTarget();
                var targetBorderLayer = canvas.getLayer(
                    target.getEntity().getName() + "-border");
                var shortPosition = getShortPosition(sourceBorderLayer, targetBorderLayer);
                var x1 = shortPosition[0];
                var x2 = shortPosition[1];
                var y1 = sourceBorderLayer.y + getColumnIndex(
                    source.getEntity(), source) * 20 + 37;
                var y2 = targetBorderLayer.y + getColumnIndex(
                    target.getEntity(), target) * 20 + 37;
                var params = {
                    strokeStyle: "black",
                    strokeWidth: "1",
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    name: connection.getName(),
                    groups: [source.getEntity().getName() + "-edges"],
                    draggable: false
                };
                if (connection.getLineType() === ErDiagram.Connection.LineType.DOTTED) {
                    params.strokeDash = [3];
                    params.strokeDashOffset = 0;
                }
                canvas.drawLine(params);
            };

            var getShortPosition = function(source, target) {
                var source1 = source.x;
                var source2 = source.x + source.width;
                var target1 = target.x;
                var target2 = target.x + target.width;
                var distances = [
                    Math.abs(source1 - target1),
                    Math.abs(source1 - target2),
                    Math.abs(source2 - target1),
                    Math.abs(source2 - target2)
                ];
                var min = distances[0];
                for (var i = 1; i < distances.length; i++) {
                    if (distances[i] < min) {
                        min = distances[i];
                    }
                }
                var idx = distances.indexOf(min);
                switch(idx) {
                case 0:
                    return [source1, target1];
                case 1:
                    return [source1, target2];
                case 2:
                    return [source2, target1];
                case 3:
                    return [source2, target2];
                }
                return null; // FIXME: Should throw exception?
            };

            var getColumnIndex = function(entity, column) {
                var columns = entity.getColumns();
                for (var i = 0; i < columns.length; i++) {
                    if (columns[i].getName() === column.getName()) {
                        return i;
                    }
                }
                return -1; // FIXME: Should throw exception?
            };

            var entityDrag = function(model, layer, element) {
                var canvas = getCanvas(element);
                var entityName = layer.groups[0];
                var connections = model.getEntityConnections(entityName);
                for (var i = 0; i < connections.length; i++) {
                    var connection = connections[i];
                    canvas.removeLayer(connection.getName());
                    drawConnection(connection, element);
                }
            };

            var entityDragEnd = function(model, layer, element) {
                adjustCanvasSize(element);
            };

            $scope.removeAllLayers = function(element) {
                var canvas = getCanvas(element);
                canvas.removeLayers();
            };
        }],
        compile: function(element, attrs) {
            setJCanvasDefaults();
            return function(scope, element, attrs, ctrl) {
                scope.$watch("model", (function(element) {
                    return function(newVal, oldVal) {
                        console.log("model has been changed.");
                        console.log(newVal);
                        if (newVal) {
                            scope.removeAllLayers(element);
                            scope.drawModel(newVal, element);
                        } else {
                            scope.removeAllLayers(element);
                        }
                    };
                })(element), false);
            };
        }
    };

}]);