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
var SphericalMercatorProjection = function(){
    //set the origin of the pixels
    this._pixelOrigin = new google.maps.Point(TILE_SIZE / 2, TILE_SIZE / 2);
    //set the pixels per longitude in degress
    this._pixelsPerLonDegree = TILE_SIZE / 360;
    //set the pixels per longitude in radians
    this._pixelsPerLonRadian = TILE_SIZE / (2 * Math.PI);
    //the R property
    this.R = 6378137;
};

//makes a latLng object and point
//return a point in pixels format
SphericalMercatorProjection.prototype.fromLatLngToPoint = function(latLng){
    //reference the context of SphericalMercatorProjection
    var that = this,
        max = 1 - 1E-15,
        sin = Math.max(Math.min(Math.sin(degressToRadians(latLng.lat())), max), -max);

    //return a object point
    return new google.maps.Point(
        this.R * latLng.lng() * Math.PI/180,
        this.R * Math.log( ( (1 + sin) / (1-sin) ) / 2)
    );
};
//makes a point
//return a latLng object
SphericalMercatorProjection.prototype.fromPointToLatLng = function(point){
    var d = 180/Math.PI;
    return new google.maps.LatLng(
        (2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d,
        point.x * d / this.R);
};
