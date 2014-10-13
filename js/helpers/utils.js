if(typeof UTILS === "undefined"){
    var UTILS = {};
}

/*
 * Native Merge between literal objects
 * */
UTILS.merge = function(){
    var argsToMerge = arguments;
    var dealArguments = function(collectionOfArguments, withArgument){
        for(var index = 0; index < collectionOfArguments.length; index++){
            withArgument.call(this, index, collectionOfArguments[index]);
        }
    }
    dealArguments(argsToMerge, function(i, argsSelf){
        for(var key in argsSelf){
            if(typeof argsSelf[key] !== "undefined"){
                argsToMerge[0][key] = argsSelf[key];
            }
        }
    });
    return argsToMerge[0];
};
