var TILE_SIZE = 256,
    bound = function(value, optMin, optMax){
        value = (optMin != null)?Math.max(value, optMin):value;
        value = (optMax != null)?Math.max(value, optMax):value;
        return value;
    },
    degressToRadians =  function(deg){
        return deg * (Math.PI / 180);
    },
    radiansTodegress =  function(rad){
        return rad / (Math.PI / 180);
    };

/*@constructor*/
var MercatorProjection = function(){
    //set the origin of the pixels
    this._pixelOrigin = new google.maps.Point(TILE_SIZE / 2, TILE_SIZE / 2);
    //set the pixels per longitude in degress
    this._pixelsPerLonDegree = TILE_SIZE / 360;
    //set the pixels per longitude in radians
    this._pixelsPerLonRadian = TILE_SIZE / (2 * Math.PI);
};

//makes a latLng object and point
//return a point in pixels format
MercatorProjection.prototype.fromLatLngToPoint = function(latLng, optPoint){
    //reference the context of MercatorProjection
    var that = this,
        point = optPoint || new google.maps.Point(0, 0), //create the default point
        origin = this._pixelOrigin; //call the origin

    //override the axis x of the point
    point.x = origin.x + latLng.lng() * that._pixelsPerLonDegree;

    // Truncating to 0.9999 effectively limits latitude to 89.189. This is
    // about a third of a tile past the edge of the world tile.
    var siny = bound(Math.sin(degressToRadians(latLng.lat())), -0.9999, 0.9999);

    //override the axis y of the point
    point.y = origin.y + 0.5 * Math.log( (1 + siny) / (1 - siny) ) * -that._pixelsPerLonRadian;

    return point;
};
//makes a point
//return a latLng object
MercatorProjection.prototype.fromPointToLatLng = function(point){
    var that = this,
        origin = that._pixelOrigin,
        lng = (point.x - origin.x) / that._pixelsPerLonDegree,
        latRadians = (point.y - origin.y) / -me._pixelsPerLonRadian,
        lat = radiansTodegress(2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);

    return new google.maps.LatLng(lat, lng);
};
