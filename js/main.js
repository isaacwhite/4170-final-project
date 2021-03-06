TRP = {};
TRP.oauth = "EJJLH0BUCOHLVG2NVX1Z0ZK1IKWYWWXJSQUVR2VBG4IYG00G";
TRP.fsAPI = "https://api.foursquare.com/v2";
TRP.currLoc = {lat: 40.7588889, lon: -73.9851533};
TRP.filename = "trippy_itineraries.txt";
TRP.searchOpen = false;
TRP.loading = false;
TRP.venueMap = {};//hashmap
TRP.itinerary = [];
TRP.map;
TRP.markersMap = {};
TRP.markerInit;
TRP.fileSystem = {};
TRP.markerAlpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
TRP.addedObject = "<div class='added-label'><h2>Added to itinerary</h2><h4>Remove from itinerary</h4></div>";
TRP.currentItinerary;
TRP.modified = false;
TRP.confirmText = "<h3>That itinerary name already exists. Are you sure you want to overwrite?</h3>";
TRP.directionsDisplay = new google.maps.DirectionsRenderer();
TRP.directionsService = new google.maps.DirectionsService();

TRP.deleteConfirm = "<div class='delete-confirm'><h4>Are you sure you want to delete this itinerary?<br>This operation cannot be undone.</h4><div class='confirm-buttons'><input type='submit' value='Yes' class='submit'><input type='button' value='No' class='cancel'></div></div>";
TRP.changeLocationForm = "<div class='location-form'><form><input type='text' name='name-field' placeholder='The name of your location' id='loc-name'><input type='text' name='address-field' placeholder='Your location&#39;s address' id='addr-save'><div class='submit-buttons'><input type='submit' value='Save' class='submit'><input type='button' value='Cancel' class='cancel'></div></form></div>";
TRP.startName = "Your Current Location";
//an object to manage actions related to viewing search results
TRP.SearchObject = function () {
    this.resultCount = 0;
    this.searchHistory = [];
};
//an object to represent a page of search results
TRP.PageObject = function () {
    this.pages = [];
    this.pageHTML = [];
}
//an object to model venues as availble through the foursquare api.
TRP.Venue = function (prop) {
    this.name     = prop.name;
    this.rating   = prop.rating;
    this.coord    = prop.locInfo.coord;
    this.address  = prop.locInfo.address;
    this.thumb    = prop.thumbnail;
    this.comments = prop.comments;
    this.url      = prop.url;
    this.id       = prop.id;
    this.category = prop.category;
    this.iconUrl  = prop.iconUrl;
}
//an object to model the itinerary
TRP.Itinerary = function (prop) {
    if (prop) {
        //realistically we'll just initialize from saved data, not from anything else.
        //so no processing necessary.
        this.name = prop.name;
        this.eventHash = prop.eventHash;
        this.orderArray = prop.orderArray;
        if(prop.mapsData) {
            this.mapsData = prop.mapsData;
        }
    } else {
        this.name;
        this.eventHash = {};
        this.orderArray = [];
    }
}
TRP.SearchObject.fn = TRP.SearchObject.prototype;
TRP.Itinerary.fn = TRP.Itinerary.prototype;
//a function to return a datestring useful for making foursquare api calls
TRP.getDateString = function () {
    var dateNow = new Date();
    var dateString = "" + 
        dateNow.getFullYear() + 
        (dateNow.getMonth() + 1) +
        dateNow.getDate();
    return dateString;
}
//an object to model comments as provided by foursquare
TRP.Comment = function (prop) {
    this.text     = prop.text;
    this.uFirst   = prop.firstName;
    this.uLast    = prop.lastName;
    this.photoUrl = prop.photoUrl;
}
//an object to model map markers
TRP.Marker = function (prop) {
    this.lat      = prop.lat;
    this.lon      = prop.lon;
    this.name     = prop.name;
    this.id       = prop.id;
    this.iconType = prop.iconType;
    this.iconUrl  = prop.iconUrl;
}
//main function for getting search results.
TRP.getSuggestions = function (param) {
    var lat = param.lat;
    var lon = param.lon;
    var search = param.search;

    //we need to provide a center point, though radius is optional.
    if(!lat || !lon) {
        console.log("no coordinates provided, using default");
        lat = TRP.currLoc.lat;
        lon = TRP.currLoc.lon;
    }
    function getResults() {
        var endpoint = TRP.fsAPI + "/venues/explore";
        var dateString = TRP.getDateString();
        var requestUrl = endpoint + "?";
        requestUrl    += "ll=" + lat + "," + lon;
        if (search) {
            requestUrl += "&query=" + search;
        }
        //we probably want to request as many as possible, then cache. 
        requestUrl    += "&limit=50"; 
        requestUrl    += "&oauth_token=" + TRP.oauth;
        requestUrl    += "&v=" + dateString;
        // console.log(requestUrl);
        TRP.indicateLoad(requestUrl);
        $.get(requestUrl,processData);
    }
    function processTips(rawResult) {
        var imgThumb = false;
        var currentTip;
        var tips = [];
        var result = {};
        if(rawResult.tips) {
            for (var i =0; i<rawResult.tips.length; i++ ) {
                var thisTip = rawResult.tips[i];
                if (thisTip.photourl && !imgThumb) {
                    imgThumb = thisTip.photourl;
                } //no else
                var data = {
                    text: thisTip.text,
                    firstName: thisTip.user.firstName,
                    lastName: thisTip.user.lastName,
                    photoUrl: thisTip.photourl
                }
                currentTip = new TRP.Comment(data);
                tips.push(currentTip);
            }
        }
        result.tips = tips;
        result.thumb = imgThumb;
        //this will be unreachable if we have any thumbnail already.
        return result;
    }
    function processLocation(location) {
        var loc = { 
            lat: location.lat,
            lon: location.lng
        };
        var address = location.address;
            address += "\n " + location.city;
            address += ", " + location.state;
            address += " " + location.postalCode;
        var returnObj = {
            coord    : loc,
            'address': address
        };
        return returnObj;
    }
    function processCategory(category){
       // console.log("HELLO");
       // console.log(category);
        if(category) {
            var name = category.name;
            var iconUrl = category.icon; 
            var id = category.id;
        }
        var returnObj = {
            name : name,
            iconUrl : iconUrl,
            id : id
        }
        return returnObj;
    }
    function processData(data) {
        // console.log(data);
        var processedData = {}; //hash map by id
        var statusCode = data.meta.code;
        var resultCount = data.response.totalResults;
        var rawResults = data.response.groups[0].items;
        console.log(rawResults);
        var venuesByRating = [];
        var callbackObj;
        for (var i=0; i<rawResults.length; i++) {
            var thisResult = rawResults[i];
            var feedback = processTips(thisResult);
            var name = thisResult.venue.name;
            var rating = thisResult.venue.rating;
            var url = thisResult.venue.url;
            var location = processLocation(thisResult.venue.location);
            var tips = feedback.tips;
            var thumb = feedback.thumb;
            var id = thisResult.venue.id;
            var category = processCategory(thisResult.venue.categories[0]);          
            var venueData = {
                'name': name,
                'rating': rating,
                'url': url,
                'thumbnail' : thumb,
                'locInfo': location,
                'comments': tips,
                'id' : id,
                'category': category,
                'iconUrl' : category.iconUrl
            }
            venuesByRating.push(id);
            processedData[id] = new TRP.Venue(venueData);
        }
        //designed to be used asynchronously
        //calls callback passed to getResults.
        callbackObj = {
            venueSort    : venuesByRating,
            venueMap     : processedData,
            'resultCount': resultCount,
            'searchTerm' : search,
            'offset' : 0
        }
        TRP.searchHandler.ingestData(callbackObj);
    }
    getResults();
}
//a function to toggle showing and hiding the search box area
TRP.toggleSearchBox = function () {
    if(!TRP.searchOpen){
        if(!TRP.animating) {
            TRP.animating = true;
            var height = TRP.searchHandler.calcHeight();
            $("article").scrollTo(0,function() {
                $(this).css({'overflow':'hidden'});
                $(".search-form").animate({'height':height},400,function () {
                    $(this).css({'padding-bottom':'4em'});
                    $(".exit").animate({'opacity':1},250, function () {
                        TRP.animating = false;
                        TRP.searchOpen = true;
                    });
                });
            });

        } //no else, just pretend it wasn't requested.
    } else {
        if(!TRP.animating) {
            TRP.animating = true;
            $(".exit").animate({'opacity':0},200,function () {
                $(".search-form").css({'padding-bottom':0}).animate({'height':'0px'},400, function () {
                    $("article").css({'overflow-y':'auto'});
                    $(".search-form .venue").each(function() {
                        $(this).remove();
                    })
                    $(".search-form .paging-container").remove();
                    $("#search-box").val("");
                    TRP.animating = false;
                    TRP.searchOpen = false;
                });
            });
        }
    }
}
//a function, unfortunately not filled out, to indicate the system loading a request
TRP.indicateLoad = function (url) {
    //this is a function that can be used for more complex ui info
    //for now just console log "loading"
    console.log("Loading... (" + url + ")");
}
//a function to regenerate itinerary html and replace it in the view
TRP.updateItineraryView = function() {
    var htmlString = TRP.currentItinerary.toHTML();
    $("article .itinerary").remove();
    $("article .end").before(htmlString);
}
//a method for marker objects to output as HTML
TRP.Marker.prototype.toHTML = function () {
    var htmlString="";
    var that= this;
    var id=that.id;
    function defaultHTML(){
        return "<div class='infoWinTitle'>"+TRP.startName+"</div>";
    }

    function infoHTML(){
        htmlString+="<div class='venue id-"+id+"'>"
        htmlString+="<div class='infoWinTitle'>"+name+"</div>";
        htmlString+="<div class='infoWinBody'>"+rating+"</div>";
        htmlString+="<div class='infoWinAddress'>"+address+"</div>";

    }
    function buttonHTML(){
        htmlString+="<div class='info-add-venue'> Add + </div>";
        htmlString+="</div>";
    }
    if (id==1111){
        return defaultHTML();
    }
    else {
        var venueObj=TRP.venueMap[id];
        var name= venueObj.name;
        var rating= venueObj.rating;
        var address= venueObj.address;

        infoHTML();
        buttonHTML();
        return htmlString;
    }
}
//a method for venue objects to output as HTML. Used in search results.
TRP.Venue.prototype.toHTML = function () {
    var returnString = "";
    var that = this;
    
    function commentHTML() {
        var commentsHTML = [];
        var commentString;
        for (var i = 0; i < that.comments.length; i++) {
            commentString =  "<div class='comment'>";
            commentString += "<blockquote";
            if(that.comments[i].uFirst === "HISTORY") {
                commentString += " class='history'";
            }
            commentString += ">" + that.comments[i].text + "</blockquote>";
            if(that.comments[i].uFirst !== "HISTORY") {
                commentString += "<p class='author'>-" + that.comments[i].uFirst;
                if (that.comments[i].uLast) {
                    commentString += " " + that.comments[i].uLast; 
                }
                commentString += "</p>";
            }
            commentString += "</div>"
            commentsHTML.push(commentString);
        }
        return commentsHTML;
    }

    function venueHTML() {
        var venueString = "<div class='venue"
        venueString += " id-" + that.id + "'id='id-"+that.id+"'>";
        if(TRP.currentItinerary.eventHash[that.id]) {
            venueString += TRP.addedObject;
        }
        var titleString = "<h3>" + that.name + "</h3>";
        var addButton = "<div class='add-venue'><span>Add venue</span></div>";
        var htmlAddress = that.address;
        // if(that.url){
        //     venueString += "<a href=\"" + that.url + "\">";
        //     venueString += titleString + "</a>";
        // } else {
            venueString += titleString;
        //}
        venueString += addButton;
        if(that.thumb) {
            venueString += "<div class='thumb' style=\"background-image: ";
            venueString += "url('" + that.thumb + "')\"></div>";
            console.log(that.thumb);
        }
        if(that.rating){
            venueString += "<div class='rating'>" + that.rating + "/10</div>";
        }
        if(that.comments.length !== 0) {
            var commentsHTML = commentHTML();
            venueString += commentsHTML[0];
        }
        htmlAddress = htmlAddress.replace("\n","<br>");
        venueString += "<div class='address'>" + htmlAddress + "</div>";
        venueString += "</div>"

        return venueString;
    }
    
    return venueHTML();
}
//a function used to return saved data from the designated file
TRP.fileSystem.getSavedData = function (callback) {
    function reportError(e) {
            var emptyObj = {};
            emptyObj.itineraries = {};
            console.log("Filesystem failed!");
            console.log(e);
            callback(emptyObj);
    }

    function init(){
        if(!TRP.filesys) {
            try {
                window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
                navigator.webkitPersistentStorage.requestQuota(1024 * 1024 * 2.5, function (grantedSize) {
                    window.requestFileSystem(window.PERSISTENT, grantedSize, function (fs) {
                      TRP.filesys = fs;
                      readData();
                    });
                });
            } catch(e) {
                reportError("initial failure");
            }
        } else {
            readData();
        }
    }

    function readData() {
        try {
            var dirReader = TRP.filesys.root.createReader();
            var entries = [];
            function fetchEntries() {
              dirReader.readEntries( function (results) {
                if (!results.length) {
                  processData(entries.sort().reverse());
                } else {
                  entries = entries.concat(results);
                  fetchEntries();
                }
              });
            };
            fetchEntries();
        } catch(e) {
            reportError("error reading");
        }
    }

    function processData(entries) {
        function findEntry(entries) {
            for(var i=0; i < entries.length; i++) {
                if(entries[i].name === TRP.filename) {
                    thisEntry = entries[i].name;
                    return thisEntry;
                }   
            } 
            //if we made it this far, it means we failed.
            return false;
        }
        thisEntry = findEntry(entries);
        if(thisEntry) {
            try {
                var name = thisEntry;
                TRP.filesys.root.getFile(name, {}, function (fileEntry) { //look up what is going on with the empty object in params
                    fileEntry.file(function (file) {
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            var fileContent = this.result;
                            if(fileContent !== "") {
                                var savedData = $.parseJSON(fileContent);
                                if(savedData.itineraries) {
                                    callback(savedData);
                                } else {
                                    reportError("file was empty!");
                                }
                            } else {
                                reportError("file was empty!");
                            }

                        };
                        reader.readAsText(file);
                    });
                });
            } catch(e) {
                reportError("error processing");
            }
        } else {
            reportError("The file does not yet exist");
        }
    }

    if(!TRP.filesys) {
        init(); //this will actually call readData on success, so no need to fall through to calling it directly.
    } else {
        readData();
    }
}
//a function used to write data to the designated file.
TRP.fileSystem.saveData = function (callback) {
    function writeData(contentString) {
        function deleteFile(callback) {
            TRP.filesys.root.getFile(TRP.filename, {create: true}, function (fileEntry) {
                fileEntry.remove(callback);
            });
        }
        function saveData() {
            console.log("file was deleted. now saving again.");
            TRP.filesys.root.getFile(TRP.filename, {create: true}, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onerror = function (e) {
                        callback(false);
                    };
                    var contentBlob = new Blob(content, {type: 'text/plain'});
                    fileWriter.write(contentBlob,callback);
                });
            });
        }
        var content = [];
        content.push(contentString);
        deleteFile(saveData); //will call saveData when finished.
    }
    if(TRP.filesys) {
        var saveObject = TRP.data;
        writeData(JSON.stringify(saveObject));
    } else {
        callback(false);
    }
}
//a function to process data after it is returned from the getSuggestions object
TRP.SearchObject.fn.ingestData = function (data) {
    var orderedIDs = data.venueSort;
    this.resultCount = data.resultCount;
    this.searchHistory.push(data.searchTerm);
    this.searchResult = orderedIDs;
    var venues = data.venueMap;
    var offset = data.offset;
    var thisID;
    var thisVenue;
    var thisHTML;
    this.searchPages = [];
    this.displayed = [];
    //the first time we pull in data
    for (var i = 0; i < orderedIDs.length; i++) {
        thisID = orderedIDs[i];
        thisVenue = venues[thisID];
        TRP.venueMap[thisID] = thisVenue;
        if ( i % 10 === 0) {
            var pageObj = new TRP.PageObject();
            this.searchPages.push(pageObj);
        }
        var currentPage = Math.floor((i + offset) / 10)
        this.searchPages[currentPage].pages.push(thisID);
        thisHTML = thisVenue.toHTML();
        this.searchPages[currentPage].pageHTML += thisHTML;
        
    }
    this.currentPage = 0;
    $(".search-form .venue").remove();
    $(".search-form .paging-container").remove();
    if (TRP.searchHandler.searchPages.length>1){
        var viewPage= this.currentPage+1;
        var pagingHTML="";
        pagingHTML+="<ul class='paging-container pure-paginator'>";
        pagingHTML+="<li><a class='page-backward pure-button prev' href='#'>&#171;</a></li>";
        pagingHTML+="<li><a class='page-number pure-button pure-button-active' href='#'> Page "+viewPage+" of "+TRP.searchHandler.searchPages.length+" </a></li>";
        pagingHTML+="<li><a class='page-forward pure-button next' href='#'>&#187;</a></li> </ul>";
         
    }
    if(pagingHTML) {
        $(".reference").append(pagingHTML);
    }
    $(".search-form .reference").append(this.searchPages[this.currentPage].pageHTML);
    this.offset = 0;
    //place search results on map
    var displayed = this.searchPages[this.currentPage].pages;
    placeSearchResults(displayed);
    TRP.loading = false;
}
//a function to calculate the available height for the search box
TRP.SearchObject.fn.calcHeight = function() {
    var searchHeight = $(document).height();
    searchHeight -= $(".header-container").outerHeight();
    searchHeight -= $(".exit").outerHeight();

    return searchHeight;
}
//a function to add an array of venue objects to the itinerary
TRP.Itinerary.fn.addEvents = function (events) {
    if(!TRP.modified) { TRP.modified = true; };
    var position = this.orderArray.length;
    for (var i = 0; i < events.length; i++) {
        var id = events[i].id;
        this.orderArray.push(id);
        this.eventHash[id] = events[i];
        this.eventHash[id].itinPos = position;
        position++;
    }
}
//adds a single venue object to the itinerary
TRP.Itinerary.fn.addEvent = function (event) {
    var arrayTransform = [event];
    this.addEvents(arrayTransform);
}
//removes a single venue from the itinerary based on event id
TRP.Itinerary.fn.removeEvent = function (event) {
    var arrayTransform = [event];
    this.removeEvents(arrayTransform);
}
//moves an event to a new position in the itinerary based on id and target position
TRP.Itinerary.fn.moveEventPos = function (venueID,positionDestination) {
    console.log(this.orderArray);
    if(!TRP.modified) { TRP.modified = true; };
    var id = venueID;
    var currentPos = this.eventHash[id].itinPos;
    var destIndex = positionDestination; //we'll see if we actually need to subtract this.
    var movingValue = this.orderArray.splice(currentPos,1);
    var orderEnd = this.orderArray.splice(destIndex,this.orderArray.length-destIndex);
    this.orderArray = this.orderArray.concat(movingValue,orderEnd);
    this.refreshPositionRef();
}
//removes events from the itinerary based on array of ids
TRP.Itinerary.fn.removeEvents = function (ids) {
    if(!TRP.modified) { TRP.modified = true; };
    for (var i = 0; i < ids.length; i++) {
        var eventID = ids[i];
        var refObject = this.eventHash[eventID];
        var arrayPos = refObject.itinPos;
        this.orderArray.splice(arrayPos,1); //remove it from the array
        delete this.eventHash[eventID]; //delete from the hash table.
    }
    this.refreshPositionRef()
}
//updates hashmap with ordering values in array for itinerary
TRP.Itinerary.fn.refreshPositionRef = function() {
    var orderArray = this.orderArray;
    for (var i = 0; i < orderArray.length; i++) {
        var id = orderArray[i];
        this.eventHash[id].itinPos = i;
    }
}
//sets directions on an itinerary object based on return results from google maps
TRP.Itinerary.fn.setDirections = function(prop) {
    function processResults(results) {
        function thisLeg(distance,duration,transitMode,steps) {
            this.distance = distance;
            this.duration = duration;
            this.transitMode = transitMode;
            this.directions = steps;
        }
        var returnVal = {};
        returnVal.directions = [];
        var legs = results.legs;
        for (var i = 0; i < legs.length; i++) {
            console.log(legs[i]);
           var distance = legs[i].distance;
           var duration = legs[i].duration;
           var steps = [];
           var transitMode = legs[i].steps[0].travel_mode.toLowerCase();
           console.log(legs[i]);
           for (var j = 0; j < legs[i].steps.length; j++) {
            steps.push(legs[i].steps[j].instructions);
           }
           var procObj = new thisLeg(distance,duration,transitMode,steps);
           returnVal.directions.push(procObj);
        }
        returnVal.waypointOrder = results.waypoint_order;//don't know what this is, but it looks useful.

        return returnVal;
    }
    var mapData = processResults(prop);
    this.mapsData = mapData; //keep it simple, processed already.
}
//the next page function for the search object
TRP.SearchObject.fn.pageForward = function () {
    
    $(".more-results").click(function () {
         TRP.searchHandler.pageForward();
    });

    if(this.currentPage < this.searchPages.length-1){
        var viewPage= this.currentPage+2;
        $(".page-number").empty();
        $(".page-number").append("Page "+viewPage+" of "+this.searchPages.length+" ");
        this.currentPage++;
        var lastPage = this.currentPage - 1;
        var pageHTML = ""
        $(".reference .venue").each( function() {
            pageHTML += $(this)[0].outerHTML;
            $(this).remove();
        });
        this.searchPages[lastPage].pageHTML = pageHTML;
        $(".search-form .reference").append(this.searchPages[this.currentPage].pageHTML);
        var displayed = this.searchPages[this.currentPage].pages;
        placeSearchResults(displayed);

    }
}
//the previous page function for the search object
TRP.SearchObject.fn.pageBackward = function () {
    if(this.currentPage !== 0){
        var viewPage= this.currentPage;
        $(".page-number").empty();
        $(".page-number").append("Page "+viewPage+" of "+this.searchPages.length+" ");
        this.currentPage--;
        var lastPage = this.currentPage + 1;
        var pageHTML = ""
        $(".reference .venue").each( function() {
            pageHTML += $(this)[0].outerHTML;
            $(this).remove();
        });
        this.searchPages[lastPage].pageHTML = pageHTML;
        $(".search-form .reference").append(this.searchPages[this.currentPage].pageHTML);
        var displayed = this.searchPages[this.currentPage].pages;
        placeSearchResults(displayed);
    }
}
//the toHTML method for the itinerary. Used in rendering the itinerary for viewing by user
TRP.Itinerary.fn.toHTML = function() {
    function venueToHTML(venue) {
        console.log(venue);
        var labelLetter = TRP.markerAlpha.substring(venue.itinPos+1,venue.itinPos+2);
        var htmlString = "<div class='venue draggable";
        htmlString += " index-" + venue.itinPos + " id-" + venue.id + "' draggable='true'>";
        htmlString += "<h2 class='label'>" + labelLetter + "</h2>";
        htmlString += "<h2 class='trash'><i class='fa fa-trash-o'></i></h2>"
        htmlString += "<h4>" + venue.name + "</h4>";
        htmlString += "</div>";

        return htmlString;
    } 
    function legToHTML(leg,index) {
        var htmlString = "<div class='leg index-" + index + "' >";
        htmlString += "<div class='duration'>" + leg.duration.text + "<br>" + leg.transitMode + "</div>";
        htmlString += "<div class='connector'></div>";
        htmlString += "<div class='distance'>" + leg.distance.text + "</div>";
        htmlString += "</div>";
        return htmlString;
    }
    var htmlString = "<div class='itinerary'>";

    for(var i = 0; i < this.orderArray.length; i++) {
        if (i === 0) {
            htmlString += "<div class='venue'><h2 class='label'>A</h2><h4>" + TRP.startName +"</h4></div>";
            htmlString += legToHTML(this.mapsData.directions[0],0);
        }

        var id = this.orderArray[i]
        var venueObj = this.eventHash[id];
        htmlString += venueToHTML(venueObj);
        if (i !== this.orderArray.length - 1) {
            htmlString += legToHTML(this.mapsData.directions[i+1],i+1);
        }

    }
    htmlString += "<div class='leg last'><div class='connector'></div></div>";
    htmlString += "<div class='venue add-item'><h4>Add an item + </h4></div>"
    htmlString += "</div>";

    return htmlString;
}
//a function to load an itinerary from the list of saved itineraries into the currentItinerary object
TRP.loadItinerary = function(name) {
    if (!TRP.modified) {
        var itineraryData = TRP.data.itineraries[name];
        console.log(itineraryData);
        var loadedItinerary = new TRP.Itinerary(itineraryData);
        console.log(loadedItinerary);
        TRP.currentItinerary = loadedItinerary;
        drawItinerary();
        // TRP.updateItineraryView();
    }
}
//updates the data for saving (in TRP.data) as preparation to save
TRP.updateData = function() {
    var name = TRP.currentItinerary.name;
    if(name) {
        TRP.data.itineraries[name] = TRP.currentItinerary;
        return true;
    } else {
        return false;
    }
}
//a function to control lightbox behaviors for Trippy
TRP.lightboxControl = function (adjustment, callback) {
    function fadeIn(object,callback) {
        $(object).css({'opacity':0,'display':'inherit'}).animate({'opacity':1},500,function() {
            $(object).addClass("visible");
            if(callback) { callback(); };
        });
    }
    function fadeOut(object,callback,timeOverride) {
        var duration = 500;
        if(timeOverride) {
            duration = timeOverride;
        }
        $(object).css({'opacity':1,'display':'inherit'}).animate({'opacity':0},duration,function() {
            $(this).css({'display':'none'}).removeClass("visible");
            if(callback) { callback(); };      
        });
    }
    switch (adjustment) {
        case "save":
            if($(".save-form").hasClass("visible")) {
                fadeOut($(".save-form"),function() {
                    if(callback) { callback(); }
                });
            } else {
                fadeIn($(".save-form"),function() {
                    if(callback) { callback(); }
                });
            }
            break;
        case "load":
            if($(".load-box").hasClass("visible")) {
                fadeOut($(".load-box"),function () {
                    $(".load-box").remove();
                    if(callback) { callback(); }
                });
            } else {
                var loadHTML = TRP.getLoadHTML();
                $(".lightbox").append(loadHTML);
                fadeIn(".load-box",function() {
                    if(callback) { callback(); }
                });
            }
            break;
        case "intro":
            if($(".help").hasClass("visible")) {
                fadeOut(".help", function() {
                    if(callback) {callback();};
                });
            } else {
                fadeIn(".help",function() {
                    if(callback) {callback();};
                });
            }
            break;
        case "welcome":
            //show the pretty start page.
            if ($(".welcome-contain").hasClass("visible")) {
                fadeOut(".welcome-contain",function() {
                    console.log("welcome contain hidden");
                    if(callback) { callback(); }
                },250);
            } else {
                fadeIn(".welcome-contain",function() {
                    console.log("welcome contain loaded.");
                    if(callback) { callback(); }
                });
            }
            break;
        case "lightbox":
            if($(".lightbox").hasClass("visible")) {
                fadeOut(".lightbox",function () {
                    if(callback) { callback(); };
                });
            } else {
                fadeIn(".lightbox",function() {
                    if(callback) { callback(); };
                });
            }
            break;
        case "image":
            if($(".welcome").hasClass("visible")) {
                fadeOut(".welcome",function() {
                    if(callback) { callback(); };
                });
            } else {
                fadeIn(".welcome",function() {
                    if(callback) { callback(); };
                })
            }

    }
}
//a function to return the load page html based on available itineraries.
TRP.getLoadHTML = function () {
    var itineraries = Object.keys(TRP.data.itineraries);
    var htmlString = "<div class='load-box'>";
    htmlString += "<h2>Load a saved itinerary</h2>"
    htmlString += "<ul class='itineraries'>"
    for (var i = 0; i < itineraries.length; i++) {
        htmlString += "<li><a href='#'>" + itineraries[i] + "</a><a href='#' class='delete'>Delete</a></li>";
    }
    htmlString += "</ul>";
    htmlString += "<h4><a class='cancel' href='#'>Cancel</a></h4>";
    htmlString += "</div>";

    return htmlString;
}
//begin application
$( function () {
    //get the saved data if there is any.
    TRP.fileSystem.getSavedData(function (data) {
        TRP.currentItinerary = new TRP.Itinerary();
        TRP.data = data;
        if(!($.isEmptyObject(data.itineraries))) {
            
            TRP.lightboxControl("welcome");
        } else {
            $(".welcome-contain p").each(function() {
                $(this).remove();
            })
            $(".welcome-contain").append("<p><a href='#'>Click here to get started</a>.</p>");
            TRP.lightboxControl("welcome");
        }
    });

    $(document).on("click",".page-forward",function (e) {
               TRP.searchHandler.pageForward();
             e.preventDefault();
           });
     $(document).on("click",".page-backward",function (e) {
               TRP.searchHandler.pageBackward();
             e.preventDefault();
           });
    $(document).on("click","page-number",function (e) {
            e.preventDefault();
    })
    //event handler for initial welcome links
    $(document).on('click','.welcome-contain a',function(e) {
        var linkClick = $(this).text();

        if(linkClick === "create a new itinerary") {
            console.log("adding!");
            TRP.lightboxControl("welcome",function() {
                TRP.lightboxControl("image");
                TRP.lightboxControl("lightbox");
            });
        } else if (linkClick === "load a saved itinerary") {
            TRP.lightboxControl("welcome",function() {
                TRP.lightboxControl("load");
            });
        } else {
            //TODO Show the help intro
            TRP.lightboxControl("welcome",function() {
                TRP.lightboxControl("intro");
            });
        } 
        // console.log(linkClick);
        e.preventDefault();
    })
    //event handler for part of changing order of itinerary objects
    $(document).on('dragover',".leg", function() {
        TRP.dragRelease = $(this)[0].classList[1];
    })
    //event handler for part of changing order of itinerary objects
    $(document).on('dragstart',".itinerary .venue.draggable", function(e) {
        $(this).animate({'height':"0px",'padding':'0rem'},250);
        TRP.dragStart = $(this)[0].classList[3];
        $(".leg .duration").each(function() {
            $(this).animate({'opacity':0},250);
        })
        $(".leg .distance").each(function() {
            $(this).animate({'opacity':0});
        })
    })
    //event handler for conclusion of drag motion during order change in itinerary
    $(document).on('dragend',".itinerary .venue.draggable", function(e) {
        var destination = TRP.dragRelease;
        var source = TRP.dragStart.substring(3);
        var startPos = TRP.currentItinerary.eventHash[source].itinPos;
        if (destination === "last") {
            TRP.currentItinerary.moveEventPos(source,TRP.currentItinerary.length -1 );
        } else {
            destination = destination.substring(6);
            if ((destination === startPos) || (destination + 1 === startPos)) {
                //don't do anything.
            } else if (destination < startPos ) {
                TRP.currentItinerary.moveEventPos(source,destination);
            } else {
                TRP.currentItinerary.moveEventPos(source,destination-1);
            }
        }
        drawItinerary();
    })

    //initialize the search handler
    TRP.searchHandler = new TRP.SearchObject();

    //a handler for the add item button to show the search box
    $(document).on('click',".add-item",function () {
        TRP.toggleSearchBox();
    });
    //a function to exit out of the load box by pressing the cancel button
    $(document).on('click',".load-box .cancel",'click', function (e) {
        e.preventDefault();
        if($(".welcome").hasClass("visible")) {
            TRP.lightboxControl("load",function() {
                TRP.lightboxControl("welcome");
            })
        } else {
            TRP.lightboxControl("load",function() {
                TRP.lightboxControl("lightbox");
            })
        }
    })
    //a function to leave the search resutls pane by clicking return to itinerary
    $(".exit").click(function () {
        TRP.toggleSearchBox();
    });
    var searchObj = {};
    //an event handler for calling searches
    $("#submit-button").click(function(e) {
        if (TRP.loading === false) {
            TRP.loading = true;
            var search = $("#search-box").val();
            if (search === "") {
                $("#search-box").val("Please enter something to search");
                TRP.loading = false;
            } else if (search === "Please enter something to search") {
                TRP.loading = false;
                //do nothing
            } else {
                try {
                    searchObj.search = search;
                    TRP.getSuggestions(searchObj);
                } catch(err) {
                    console.warn(err);
                }
            };
            
        } 
        e.preventDefault();
    });
    //an event handler for adding a venue to the itinerary from the search results page
    $(document).on('click', '.venue .add-venue', function (e) { // Make your changes here
        var curItin = TRP.currentItinerary;
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        var markerID=mapID.substring(3);
        var activeMarker= TRP.markersMap[markerID];
        console.log(activeMarker);
         var lat=activeMarker.position.d;
         var lon=activeMarker.position.e;
         setMarkerType(activeMarker, "red-pushpin",null);
        TRP.map.panTo(new google.maps.LatLng(lat, lon));
        (activeMarker.setAnimation(google.maps.Animation.BOUNCE));
        setTimeout(function(){ activeMarker.setAnimation(null); }, 1400);

        mapID = mapID.substring(3);
        curItin.addEvent(TRP.venueMap[mapID]);
        venueObj.addClass("added");
        venueObj.prepend(TRP.addedObject);
        $(".labels").removeClass("active");
        $(".labels."+mapID).addClass("active");
        e.stopPropagation();
    });

        $(document).on('click', '.venue .info-add-venue', function (e) { // Make your changes here
        var curItin = TRP.currentItinerary;
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        var markerID=mapID.substring(3);
        var activeMarker= TRP.markersMap[markerID];
        console.log(activeMarker);
         var lat=activeMarker.position.d;
         var lon=activeMarker.position.e;
         setMarkerType(activeMarker, "red-pushpin",null);
        TRP.map.panTo(new google.maps.LatLng(lat, lon));
        (activeMarker.setAnimation(google.maps.Animation.BOUNCE));
        setTimeout(function(){ activeMarker.setAnimation(null); }, 1400);

        mapID = mapID.substring(3);
        curItin.addEvent(TRP.venueMap[mapID]);
        venueObj.addClass("added");
        venueObj.prepend(TRP.addedObject);
        $(".venue.id-"+mapID).addClass("added");
        $(".venue.id-"+mapID).prepend(TRP.addedObject);
        $(".labels").removeClass("active");
        $(".labels."+mapID).addClass("active");
        e.stopPropagation();
    });

    //a function to remove the newly added item from the itnerary
    $(document).on('click', '.venue .added-label h4', function(e) { // Make your changes here
        var curItin = TRP.currentItinerary;
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        curItin.removeEvent(mapID);
        var activeMarker= TRP.markersMap[mapID];
        setMarkerType(activeMarker, "custom", TRP.venueMap[mapID].iconUrl);
        venueObj.removeClass("added");
        venueObj.find(".added-label").remove();
        $(".labels").removeClass("active");
        e.stopPropagation();
    });
    //an event handler to show the user where a venue is on the map by changing colors
    $(document).on('click', '.search-form .venue', function() { // Make your changes here
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        var activeMarker= TRP.markersMap[mapID];
        var lat=activeMarker.position.d;
        var lon=activeMarker.position.e;
        TRP.map.panTo(new google.maps.LatLng(lat, lon));
        (activeMarker.setAnimation(google.maps.Animation.BOUNCE));
        setTimeout(function(){ activeMarker.setAnimation(null); }, 1400);

        $(".labels").removeClass("active");
        $(".labels."+mapID).addClass("active");
    });
    //an event handler for processing clicks inside the load box other than the cancel button
    $(document).on('click','.load-box a', function(e) {
        var itineraryName = ($(this).text());
        if(itineraryName === "Delete") {
            var parent = $(this).closest("li");
            var parentHeight = $(parent).height();
            function callback() {
                console.log("hello!");
                $(parent).css({'overflow':'hidden','max-height':parentHeight + "px"});
                $(parent).append(TRP.deleteConfirm);
                $(parent).animate({'max-height':'1000px'});
            }
            if ( $(".delete-confirm").length !== 0 ) {
                $(".delete-confirm").each(function() {
                    $(this).css({'max-height':'1000px'}).animate({'max-height':'0px'},function() {
                    $(this).remove();
                    callback();
                    });
                });
            } else {
                callback();
            }      
        } else if(!($(this).hasClass("new-itinerary"))){
            TRP.loadItinerary(itineraryName);
            TRP.lightboxControl("load",function() {
                if($(".welcome").hasClass("visible")) {
                    TRP.lightboxControl("image");
                    TRP.lightboxControl("lightbox");
                } else {
                    TRP.lightboxControl("lightbox");
                }
            });
        } else {
            //proceed as normal, fade out the save-box
        }
        
        e.preventDefault();
    });
    //an event handler for confirmation before deletion of itineraries, used in load box
    $(document).on('click','.confirm-buttons input', function (e) {
        if ($(this).val() === "Yes") {
            $(this).closest("li").css({'overflow':'hidden'}).animate({'max-height':'0px'},function() {
                var toDelete = $(this).find("a:first").text();
                if(TRP.data.itineraries[toDelete]) {
                    delete TRP.data.itineraries[toDelete];
                    TRP.fileSystem.saveData();
                }
            });
        } else {
            $(this).closest(".delete-confirm").css({'max-height':'1000px'}).animate({'max-height':'0px'},function() {
                $(this).remove();
            });
        }
    });
    //an event handler for the in progress functionality of changing the start location
    $(document).on('click','.location-form .submit-buttons input', function(e) {
        if($(this).val() === "Save") {
            console.log("change the search value");
            var searchQuery = $("#addr-save").val();
            var locationName = $("#loc-name").val();
            if(locationName === "") {
                locationName = searchQuery;
            }
            TRP.startName = locationName;
            TRP.getMapCenter(searchQuery, function() {
                    console.log("Map center changed!");
                    $(".venue.start").animate({'max-height':'0px'},500, function(e) {
                        $(this).find(".location-form").remove();
                        $(this).append("<h4>" + locationName + "</h4>");
                        $(this).animate({'max-height':'1000px'},500);
                    });
            });
        } else {
            console.log("put it back");
            $(this).closest(".venue").animate({'max-height':'0px'},500, function(e) {
                $(this).find(".location-form").remove();
                $(this).append(TRP.locHTML);
                $(this).animate({'max-height':'1000px'},500);
            })
        }
        e.preventDefault();
    })
    $('h1.title').click(function(e) {
        console.log("clicked!");
        if ($(".welcome").hasClass("visible")) {
            //don't do anything;
        } else {
            TRP.lightboxControl("lightbox",function() {
                TRP.lightboxControl("image");
                TRP.lightboxControl("welcome");
            });
        }
        e.preventDefault();
    })
    //an event handler for processing the name of the new itinerary
    $(".save-form form .submit").click( function (e) { // Make your changes here
        function saveData(saveName,callback) {
            TRP.currentItinerary.name = saveName;
            TRP.lightboxControl("save",function() {
                TRP.lightboxControl("lightbox");
            });//hide the lightbox
            var dataResult = TRP.updateData();
            if(dataResult) {
                TRP.fileSystem.saveData(function() {
                    alert("The file was saved");
                });
            }
        }
        e.preventDefault();
        var saveName = $(".save-box #name-save").val();
        if( (saveName !== "") && (!(TRP.data.itineraries[saveName])) ) {
            saveData(saveName);
            
        } else if (TRP.data.itineraries[saveName]) {
            if(!$(".submit-buttons").hasClass("confirm")) {
                $(".submit-buttons").prepend(TRP.confirmText).addClass("confirm");
                $(".submit-buttons .submit").val("Yes");
                $(".submit-buttons .cancel").val("No");
            } else {
                saveData(saveName);
            }
        } else {
            $(".save-form h2").css({'color':'red','text-decoration':'underline'});
        }
        // e.stopPropagation();
    });
    //an event handler to process cancelling out of the save form
    $(".save-form .cancel").click( function(e) {
        e.preventDefault();
        TRP.lightboxControl("save",function() {
            TRP.lightboxControl("lightbox");
        });
    });
    //an event handler to show the save dialog box or to just save the file.
    $(".save-button").click( function (e) {
        var writeFn  = TRP.fileSystem.saveData;
        var updateFn = TRP.updateData;
        var lightbox = TRP.lightboxControl
        if(TRP.currentItinerary.name) {
            if(updateFn()) {
                TRP.fileSystem.saveData(function(){
                    console.log("Saved file.");
                })
            }
        } else if (TRP.currentItinerary) {
            lightbox("lightbox",function() {
                lightbox("save");
            })
        } else {
            console.log("save button clicked! No itinerary item set up!");
        }
        // e.stopPropogation();
        e.preventDefault();
    });
    //an event handler to show the load screen
    $(".load-button").click( function (e) {
        TRP.lightboxControl("lightbox",function () {
            TRP.lightboxControl("load");
        })
        e.preventDefault();
    });
    $(".help .get-started").click( function (e) {
        TRP.lightboxControl("intro",function() {
            TRP.lightboxControl("image");
            TRP.lightboxControl("lightbox");
        });
        e.preventDefault();
    })
    //an event handler for in progress functionality to change locations
    $(document).on('click','.location-switch', function (e) {
        $(this).closest(".venue").css({'overflow':'hidden','max-height':'1000px'}).animate({'max-height':'0px'},500,function() {
            var oldHTML = "";
            oldHTML += $(this).find("h4")[0].outerHTML;
            oldHTML += $(this).find("h5")[0].outerHTML; 
            TRP.locHTML = oldHTML;
            $(this).find("h4").remove();
            $(this).find("h5").remove();
            $(this).append(TRP.changeLocationForm);
            $(this).animate({'max-height':'1000px'},500,function(){});
        });
        e.preventDefault();
    });
    //an event handler to remove an item from the itinerary
    $(document).on('click','h2.trash',function (e) {
        var id = $(this).closest(".venue")[0].classList[3];
        id = id.substring(3);
        TRP.currentItinerary.removeEvent(id);
        drawItinerary();
    })
});
//another listener function to be called when exiting search results
$(".exit").click( function (){
    clearMarkers();
    drawItinerary();
    listItinerary();
});
/**GOOGLE MAPS STUFF**/
function listItinerary(){
    var destinationVenue=TRP.itinerary[TRP.itinerary.length-1];
    var waypoints=[];
    for (var i=0; i<TRP.itinerary.length; i++){
        var venue=TRP.itinerary[i];
        var name=venue.name;
        var id= venue.id;
        $(".itinerary").append("<div class='connector'></div><div class='venue "+id+"'><h4>"+name+"</h4></div>");
    }
}
//Google Maps functions
//sets map intially when it loads
function render_map(geolocate) {
    var mapOptions = {
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles:styledMap
      };
      TRP.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
      // Try HTML5 geolocation
    if(geolocate!==false) {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              TRP.currLoc.lat=position.coords.latitude;
              TRP.currLoc.lon= position.coords.longitude;
              lat = TRP.currLoc.lat;
              lon = TRP.currLoc.lon;
              var initial_loc = new google.maps.LatLng(lat, lon);
              var markerData = {
                    'lat': lat,
                    'lon': lon,
                    'name': 'Your current location',
                    'id' : 1111,
                    'iconType': 'blue-dot',
                    'iconUrl': null
              }
              TRP.markerInit= new TRP.Marker(markerData);
              add_marker(TRP.markerInit);
              TRP.map.setCenter(initial_loc);
            }, function() {
              geolocationErr();
            });
        } else {
            // Browser doesn't support Geolocation
            geolocationErr();
          }
    } else {
        geolocationErr();
    }
      //set to default if geolocation fails
    function geolocationErr() {
       var lon=TRP.currLoc.lon;
       var lat=TRP.currLoc.lat;
       var init_map = {
         map: TRP.map,
         position: new google.maps.LatLng(lat, lon)
       };
      initial_loc=init_map.position;
          var markerData = {
                'lat': lat,
                'lon': lon,
                'name': TRP.startName,
                'id' : 1111,
                'iconType': 'blue-dot',
                'iconUrl': null
          }
      TRP.markerInit= new TRP.Marker(markerData);
      add_marker(TRP.markerInit);
      TRP.map.setCenter(initial_loc);

    }
} google.maps.event.addDomListener(window, 'load', render_map);

function add_marker(markerData){
      var maxIndex = google.maps.Marker.MAX_ZINDEX;
      var id= markerData.id;
      var marker = new MarkerWithLabel({
            position: new google.maps.LatLng(markerData.lat,markerData.lon),
            draggable: false,
            raiseOnDrag: false,
            map: TRP.map,
            labelContent: markerData.name,
            labelAnchor: new google.maps.Point(22, 0),
            labelClass: "labels "+id, // the CSS class for the label
            labelStyle: {opacity: 0.75},
            url: "#id-"+id
        });
    //  if (TRP.currentItinerary.eventHash[id]){
        //setmarkerType(marker, "red-pushpin", null);
  //  }
    //else{
        setMarkerType(marker,markerData.iconType, markerData.iconUrl);
   //   }  
       marker.infoWindow = new google.maps.InfoWindow({
       content:markerData.toHTML()
    });
    google.maps.event.addListener(marker, 'click', function() {
        for (var markers in TRP.markersMap){
         TRP.markersMap[markers].infoWindow.close(null);
        }
        marker.infoWindow.open(TRP.map,marker);
        $(".reference .venue").removeClass("active");
        $(".id-"+id).addClass("active");
        maxIndex++;
        marker.setZIndex(maxIndex);
        window.location.href = marker.url;

    });
    google.maps.event.addListener(marker, 'mouseover', function(){
        maxIndex++;
        marker.setZIndex(maxIndex);
    });
    google.maps.event.addListener(marker, 'mouseout', function(){
            maxIndex--;
            marker.setZIndex(maxIndex);
    });
    TRP.markersMap[id]=marker;
}

//places search results on the map
function placeSearchResults(results){

    var keysArray = results;
    TRP.map.setZoom(14);
    clearMarkers();
    add_marker(TRP.markerInit);
    for (var i in keysArray){
        var key = keysArray[i];
        var locationObj = TRP.venueMap[key];
        console.log(locationObj);
        var markerData = {
            'lat': locationObj.coord.lat,
            'lon': locationObj.coord.lon,
            'name': locationObj.name,
            'id' : locationObj.id,
            'iconType': 'custom',
            'iconUrl': locationObj.iconUrl
        }
        var newMarker= new TRP.Marker(markerData);
        add_marker(newMarker);
    }
}
//removes markers from map
function clearMarkers(){
    for (var markers in TRP.markersMap){
        TRP.markersMap[markers].setMap(null);
    }
     for (var markers in TRP.markersMap){
         TRP.markersMap={};
    }       
}

//draw updated itinerary on map and in sidebar
function drawItinerary(){
 
// directions code modified from https://developers.google.com/maps/documentation/javascript/directions
  //  directionsDisplay.setMap(null);
    var itinArray = [];
    for(var i = 0; i < TRP.currentItinerary.orderArray.length; i++) {
        var thisID = TRP.currentItinerary.orderArray[i];
        var venueObj = TRP.currentItinerary.eventHash[thisID];
        itinArray.push(venueObj)
    }
    if (itinArray.length==0){
        return;
    }
    else{
    var destinationVenue = itinArray[itinArray.length-1];
    //console.log("Destination Venue");
    //console.log(destinationVenue);
    var destination = new google.maps.LatLng(destinationVenue.coord.lat, destinationVenue.coord.lon);
    var origin = new google.maps.LatLng(TRP.currLoc.lat, TRP.currLoc.lon);
    var waypoints=[];
    for (var i=0; i<itinArray.length-1; i++){
        var venue=itinArray[i];
        console.log(venue.name);
        var waypoint= new google.maps.LatLng(venue.coord.lat, venue.coord.lon);
         waypoints.push({
          location:waypoint,
          stopover:true
      });

    }
    TRP.directionsDisplay.setMap(null);
    TRP.directionsDisplay.setMap(TRP.map);

    var request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
       unitSystem: google.maps.UnitSystem.IMPERIAL
    };
    TRP.directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {

        var responseSub = response.routes[0];
        TRP.currentItinerary.setDirections(responseSub);
        TRP.directionsDisplay.setDirections(response);
        console.log("HELLO RESPONSE");
        console.log(response);
        TRP.updateItineraryView();
      }
    });
    }
}

//change marker type depending on use scenario
function setMarkerType(marker, markerType, markerUrl){

    switch (markerType){
        case "custom":
            marker.setIcon(markerUrl);
            break;
        case "blue-dot":
            marker.setIcon('https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png');
            break;
        case "yellow":
            marker.setIcon('https://maps.gstatic.com/mapfiles/ms2/micons/yellow.png');
            break;
        case "red-pushpin":
            marker.setIcon('https://maps.gstatic.com/mapfiles/ms2/micons/red-pushpin.png');
            break;
        default:
            marker.setIcon('https://maps.gstatic.com/mapfiles/ms2/micons/yellow.png');
    }    

}

TRP.getMapCenter = function (queryString,callback) {
  $.getJSON("http://maps.googleapis.com/maps/api/geocode/json?address="+queryString+"&sensor=true", function(data){
    function processData(data) {
        var lat = data.results[0].geometry.location.lat;
        var lon = data.results[0].geometry.location.lng;

        TRP.currLoc.lat = lat;
        TRP.currLoc.lon = lon;
    }

    processData(data);
    $("#map-canvas").remove();
    $(".map-region").append("<div id='map-canvas'></div>");
    console.log("are we here yet?");
    callback();
    render_map(false);
  });
}
//modified map styles from http://snazzymaps.com/style/19/subtle
var styledMap=
[
    {
        "featureType": "administrative",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 40
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "saturation": -10
            },
            {
                "lightness": 30
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            },
            {
                "saturation": -60
            },
            {
                "lightness": 10
            }
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            },
            {
                "saturation": -60
            },
            {
                "lightness": 60
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 60
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            },
            {
                "saturation": -100
            },
            {
                "lightness": 60
            }
        ]
    }
]