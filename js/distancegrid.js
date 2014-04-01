var DistanceGrid = function(cellSize){
    //the size of an cell
    this._cellSize = cellSize;
    //the area of cell
    this._sqCellSize = cellSize * cellSize;
    //the grid
    this._grid = {};
    //the _objPoint
    this._objPoint = {};
};

DistanceGrid.prototype = {

    //generator of unique id for each new point added
    stamp: (function(){
            var lastId = 0,
                key = '_id';
            return function(obj){
                obj[key] = obj[key] || ++lastId;
                return obj[key];
            }
    }()),

    //adding new obj
    addObject: function(obj, point){
        var x = this._getCoord(point.x),
            y = this._getCoord(point.y),
            grid = this._grid,
            //instance the row if not exists call an exists else create new row
            //by the real coord y
            row = grid[y] = grid[y] || {},
            //instance the cell if not exists call an exists else create new cell
            //by the real coord x
            cell = row[x] = row[x] || [];
            //generate the unique id
            stamp = this.stamp(obj);

        //the point object associate with the uniqye id the new point
        this._objPoint[stamp] = point;
        //append to cell
        cell.push(obj);
    },

    updateObject: function(obj, point){
        this.removeObj(obj);
        this.addObject(obj, point);
    },

    removeObj: function(obj, point){
        var x = this._getCoord(point.x),
            y = this._getCoord(point.y),
            grid = this._grid,
            row = grid[y] = grid[y] || {},
            cell = row[x] = row[x] || [],
            i,
            len;

        delete this._objPoint[this.stamp(obj)];

        for(i = 0,len = cell.length; i < len; i++){
            if(cell[i] === obj){
                cell.splice(i, 1);
                if(len === 1) {
                    delete row[x];
                }
                return true;
            }
        }
    },

    eachObject: function(fn, ctx){
        var i, j, k, len, row, cell, removed,
            grid = this._grid;

        for(i in grid){
            row = grid[i];

            for(j in row){
                cell = row[j];

                for(k = 0,len = cell.length; k <len; k++){
                    removed = fn.call(ctx, cell[k]);
                    if(removed){
                        k--;
                        len--;
                    }
                }
            }
        }
    },

    getNearObject: function(point){
        var x = this._getCoord(point.x),
            y = this._getCoord(point.y),
            i, j, k, row, cell, len, obj, dist,
            objPoint = this._objPoint,
            closestDistSq = this._sqCellSize,
            closest = null;

        for(i = y - 1;i <= y + 1; i++){
            row = this._grid[i];
            if(row){
                for(j = x - 1; j <= x + 1;j++){
                    cell = row[j];
                    if(cell){
                        for(k = 0,len = cell.length; k < len; k++){
                            obj = cell[k];
                            dist = this._sqDist(objPoint[this.stamp(obj)], point);
                            if(dist < closestDistSq){
                                closestDistSq = dist;
                                closest = obj;
                            }
                        }
                    }
                }
            }
        }

        return closest;
    },

    //get the real Coord for the cell passing an axis
    _getCoord: function(axis){
        return Math.floor( axis / this._cellSize );
    },

    _sqDist: function(p, p2){
        var dx = p2.x - p.x,
            dy = p2.y - p.y;

        return ( dx * dx ) + ( dy * dy );
    }

};
