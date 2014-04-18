/*
 * Class implement a simple marker with the minimun features
 * optimal for show many dots in the map
 * source inspiration:
 * http://nickjohnson.com/b/google-maps-v3-how-to-quickly-add-many-markers
 * */
function markerOverlay(options){

    var defaults = {
        position: null,
        icon: 'https://mts.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png&scale=1',
        map: null,
        height: 5,
        width: 5
    };
    this.st = this.merge(defaults, options);
    if(!this.st.map){
        return;
    }
    this.setMap(this.st.map);
    this._div = document.createElement('DIV');
    this._imgIcon = document.createElement('img');
};
//extends
markerOverlay.prototype = new google.maps.OverlayView();
markerOverlay.prototype.draw = function(){
  var projection = this.getProjection(),
      zoom = this.getMap().getZoom(),
      position = this.getPosition(),
      location = projection.fromLatLngToDivPixel(position),
      st =  this.st;

  //set the dimentions
  this._div.style.width = st.width + 'px';
  this._div.style.height = st.height + 'px';
  //this._div.style.background = '#00ff' + parseInt(Math.random(1) * 99);

  //set the positions in the DOM enviroment
  this._div.style.top = ( location.y ) + 'px';
  this._div.style.left = ( location.x || 0 ) + 'px';
  this._div.style.position = 'absolute';
};
//utility for merge Opts
markerOverlay.prototype.merge = function(obj1, obj2) {
  return (function(object) {

    for (var property in object) {
      this[property] = object[property];
    };

    return this;
  }).apply(obj1, [obj2]);
};

//when adding this overlay in the map
markerOverlay.prototype.onAdd = function(){

    var panes = this.getPanes(),
        imgIcon = this._imgIcon;
    //if has icon
    imgIcon.style.position = 'absolute';
    imgIcon.src = this.st.icon;
    imgIcon.onload = function(){
        this.style.top = -this.height + 'px';
        this.style.left = -( this.width/2 ) + 'px';
    };
    imgIcon.onerror = function(){};
    this._div.appendChild(imgIcon);
    panes.overlayMouseTarget.appendChild(this._div);

};
//when removing this overlay in the map
markerOverlay.prototype.onRemove = function(){
  //this._div.remove();
  log('remove it!');
};

//Set the position of the marker
markerOverlay.prototype.setPosition = function(position){
    this.st.position = position;
};
//Get the position of the marker
markerOverlay.prototype.getPosition = function(){
    return this.st.position;
};
//Make icon
markerOverlay.prototype.makeIcon = function(){
    return this.st.position;
};
