/*
 * Manage an collection of markers with basic methods
 * of L.Featuregroup
 * inspiration:
 * http://leafletjs.com/reference.html#featuregroup
 */
function featureOverlay (map, markers){
    this._collection = [];
    this._map = map;

    //Append the markers by param
    if(markers && markers.length){
        for(var i = 0; i < markers.length++; i++){
            this.append(markers[i]);
        }
    }
    this.setMap(map);
};
//extends
featureOverlay.prototype = new google.maps.OverlayView();
featureOverlay.prototype.draw = function(){};

//when adding the this overlay in the map
featureOverlay.prototype.onAdd = function(){
  this._div = document.createElement('DIV');
  var panes = this.getPanes();
  panes.overlayMouseTarget.appendChild(this._div);
};

//event listener when append new marker in the overlay
featureOverlay.prototype.onAppendMarker = function(map){
    this.eachMarker(map.setMap, map);
};

featureOverlay.prototype.stamp = (function(){
    var lastId = 0,
    key = '_id';
    return function(obj){
        obj[key] = obj[key] || ++lastId;
        return obj[key];
    }
}());

//Append new item into the collection
featureOverlay.prototype.appendMarker = function(marker){
    if(!this.existsMarker(marker)){
        marker.id = this.stamp(marker);
        marker.addedIn = true;
        this._collection.push(marker);
        if(this._map){
            marker.setMap(this._map);
        }
    }
};

//Append the markers to Map
featureOverlay.prototype.appendTo = function(map){
    var _map = (typeof map !== "undefined")? map: this._map;
    this.eachMarker(_map.setMap, _map);
};

//Verify if exists in the collection or already added
featureOverlay.prototype.existsMarker = function(marker){
    return marker.addedIn || false;
};

//remove an Element of the collection
featureOverlay.prototype.removeMarker = function(marker){
    this.eachMarker(function(i, e){
        if(e === marker){
            marker.setMap(null);
            delete e;
            return true;
        }
    });
};

//remove an Element of the collection
featureOverlay.prototype.eachMarker = function(fn, context){
    var ctx = (typeof context !== "undefined")? context: this;
    for(var i = 0; i < this._collection.length; i++){
        fn.apply(ctx, [i, this._collection[i]]);
    };
};
