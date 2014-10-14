/*
 * Class only deal like a single Marker
 * */
var SingleOverlayMarker = function(options){

    var defaults = {
        position: null,
        icon: 'https://mts.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png&scale=1',
        map: null,
        height: 5,
        width: 5
    };

    if(this.existsMap()){
        this.setMap(this.settings.map);
    } else {
        return;
    }

    this.settings = UTILS.merge(defaults, options);
    this._div = document.createElement('DIV');
    this._imgIcon = document.createElement('img');
};

SingleOverlayMarker.prototype.existsMap = function(){
    return !!this.settings.map;
};
//extends
SingleOverlayMarker.prototype = new google.maps.OverlayView();

SingleOverlayMarker.prototype.draw = function(){
    var projection = this.getProjection(),
        zoom = this.getMap().getZoom(),
        position = this.getPosition(),
        location = projection.fromLatLngToDivPixel(position),
        settings =  this.settings;

    //set the dimentions
    this._div.style.width = settings.width + 'px';
    this._div.style.height = settings.height + 'px';
    //this._div.style.background = '#00ff' + parseInt(Math.random(1) * 99);

    //set the positions in the DOM enviroment
    this._div.style.top = ( location.y ) + 'px';
    this._div.style.left = ( location.x || 0 ) + 'px';
    this._div.style.position = 'absolute';
};

SingleOverlayMarker.prototype.onAdd = function(){
    var panes = this.getPanes(),
        imgIcon = this._imgIcon;
    //stablish icon
    imgIcon.style.position = 'absolute';
    imgIcon.src = this.settings.icon;
    imgIcon.onload = function(){
        this.style.top = -this.height + 'px';
        this.style.left = -( this.width/2 ) + 'px';
    };
    imgIcon.onerror = function(){};
    this._div.appendChild(imgIcon);
    panes.overlayMouseTarget.appendChild(this._div);
};

SingleOverlayMarker.prototype.onRemove = function(){
  this.setMap(null);
  this._div.remove();
};

//Set the position of the marker
SingleOverlayMarker.prototype.setPosition = function(position){
    this.settings.position = position;
};

//Get the position of the marker
SingleOverlayMarker.prototype.getPosition = function(){
    return this.settings.position;
};
