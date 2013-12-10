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
TRP.addedObject = "<div class='added-label'><h2>Added to itinerary</h2><h4>Remove from itinerary</h4></div>";
TRP.currentItinerary;
TRP.modified = false;
TRP.confirmText = "<h3>That itinerary name already exists. Are you sure you want to overwrite?</h3>";
TRP.SearchObject = function () {
    this.resultCount = 0;
    this.searchHistory = [];
};
TRP.PageObject = function () {
    this.pages = [];
    this.pageHTML = [];
}
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
}
TRP.Itinerary = function (prop) {
    if (prop) {
        //realistically we'll just initialize from saved data, not from anything else.
        //so no processing necessary.
        this.name = prop.name;
        this.eventHash = prop.eventHash;
        this.orderArray = this.orderArray;
        if(prop.mapData) {
            this.mapData = prop.mapData;
        }
    } else {
        this.name;
        this.eventHash = {};
        this.orderArray = [];
    }
}
TRP.SearchObject.fn = TRP.SearchObject.prototype;
TRP.Itinerary.fn = TRP.Itinerary.prototype;
TRP.getDateString = function () {
    var dateNow = new Date();
    var dateString = "" + 
        dateNow.getFullYear() + 
        (dateNow.getMonth() + 1) +
        dateNow.getDate();
    return dateString;
}
TRP.Comment = function (prop) {
    this.text     = prop.text;
    this.uFirst   = prop.firstName;
    this.uLast    = prop.lastName;
    this.photoUrl = prop.photoUrl;
}
TRP.Marker = function (prop) {
    this.lat      = prop.lat;
    this.lon      = prop.lon;
    this.name     = prop.name;
    this.id       = prop.id;
    this.iconType = prop.iconType;
    this.iconUrl  = prop.iconUrl;
}
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
        var name=category.name;
        var iconUrl=category.icon;
        var id=category.id;
        var returnObj = {
            name : name,
            iconUrl : iconUrl,
            id : id
        }
        return returnObj;
    }
    function processData(data) {
        var processedData = {}; //hash map by id
        var statusCode = data.meta.code;
        var resultCount = data.response.totalResults;
        var rawResults = data.response.groups[0].items;
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
                'category': category
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
TRP.toggleSearchBox = function () {
    if(!TRP.searchOpen){
        if(!TRP.animating) {
            TRP.animating = true;
            var height = TRP.searchHandler.calcHeight();

            $(".search-form").animate({'height':height},400,function () {
                $(this).css({'padding-bottom':'4em'});
                $(".exit").animate({'opacity':1},250, function () {
                    TRP.animating = false;
                    TRP.searchOpen = true;
                });
            });
        } //no else, just pretend it wasn't requested.
    } else {
        if(!TRP.animating) {
            TRP.animating = true;
            $(".exit").animate({'opacity':0},200,function () {
                $(".search-form").css({'padding-bottom':0}).animate({'height':'0px'},400, function () {
                    $(".search-form .venue").each(function() {
                        $(this).remove();
                    })
                    $("#search-box").val("");
                    TRP.animating = false;
                    TRP.searchOpen = false;
                });
            });
        }
    }
}
TRP.indicateLoad = function (url) {
    //this is a function that can be used for more complex ui info
    //for now just console log "loading"
    console.log("Loading... (" + url + ")");
}
TRP.updateItineraryView = function() {
    var htmlString = TRP.currentItinerary.toHTML();

    $("article .itinerary").remove();
    $("article .end").before(htmlString);
}
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
    $(".search-form .reference").append(this.searchPages[this.currentPage].pageHTML);
    this.offset = 0;
    //place search results on map
    var displayed = this.searchPages[this.currentPage].pages;
    placeSearchResults(displayed);
    TRP.loading = false;
}
TRP.SearchObject.fn.calcHeight = function() {
    var searchHeight = $(document).height();
    searchHeight -= $(".header-container").outerHeight();
    searchHeight -= $(".exit").outerHeight();

    return searchHeight;
}
/**
 * @param events an array of venue objects to be added to the itinerary
 */
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
/**
 * @param event a single venue object
 */
TRP.Itinerary.fn.addEvent = function (event) {
    var arrayTransform = [event];
    this.addEvents(arrayTransform);
}
/**
 * @param event a single venue id
 */
TRP.Itinerary.fn.removeEvent = function (event) {
    var arrayTransform = [event];
    this.removeEvents(arrayTransform);
}
TRP.Itinerary.fn.moveEventPos = function (venueID,positionDestination) {
    if(!TRP.modified) { TRP.modified = true; };
    var currentPos = this.eventHash[id].itinPos;
    var destIndex = positionDestination - 1; //we'll see if we actually need to subtract this.
    var movingValue = this.orderArray.splice(currentPos,1);
    var orderEnd = this.orderArray.splice(destIndex,this.orderArray.length-destIndex);
    this.orderArray.concat(movingValue,orderEnd);
    this.refreshPositionRef();
}
/**
 * @param ids an array of venue hashes to be removed
 */
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
TRP.Itinerary.fn.refreshPositionRef = function() {
    var orderArray = this.orderArray;
    for (var i = 0; i < orderArray.length; i++) {
        var id = orderArray[i];
        this.eventHash[id].itinPos = i;
    }
}
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
TRP.SearchObject.fn.pageForward = function () {
    if(this.currentPage < this.searchPages.length-1){
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
TRP.SearchObject.fn.pageBackward = function () {
    if(this.currentPage !== 0){
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
TRP.Itinerary.fn.toHTML = function() {
    function venueToHTML(venue) {
        var htmlString = "<div class='venue'>";
        htmlString += "<h4>" + venue.name + "</h4>";
        htmlString += "</div>";

        return htmlString;
    } 
    function legToHTML(leg) {
        var htmlString = "<div class='duration'>" + leg.duration.text + "<br>" + leg.transitMode + "</div>";
        htmlString += "<div class='connector'></div>";
        htmlString += "<div class='distance'>" + leg.distance.text + "</div>";
        return htmlString;
    }
    var htmlString = "<div class='itinerary'>";

    for(var i = 0; i < this.orderArray.length; i++) {
        if (i === 0) {
            htmlString += "<div class='venue'><h4>Your Current Location</h4></div>";
            htmlString += legToHTML(this.mapsData.directions[0]);
        }

        var id = this.orderArray[i]
        var venueObj = this.eventHash[id];
        htmlString += venueToHTML(venueObj);
        if (i !== this.orderArray.length - 1) {
            htmlString += legToHTML(this.mapsData.directions[i+1]);
        }

    }


    htmlString += "</div>";

    return htmlString;
}
TRP.updateData = function() {
    var name = TRP.currentItinerary.name;
    if(name) {
        TRP.data.itineraries[name] = TRP.currentItinerary;
        return true;
    } else {
        return false;
    }
}
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
            //here we'll show the intro text and the help info before depositing users at the new itinerary start point.
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
TRP.getLoadHTML = function () {
    var itineraries = Object.keys(TRP.data.itineraries);
    var htmlString = "<div class='load-box'>";
    htmlString += "<h2>Load a saved itinerary</h2>"
    htmlString += "<ul class='itineraries'>"
    for (var i = 0; i < itineraries.length; i++) {
        htmlString += "<li><a href='#'>" + itineraries[i] + "</a></li>";
    }
    htmlString += "</ul>";
    htmlString += "</div>";

    return htmlString;
}

//begin application
$( function () {
    TRP.fileSystem.getSavedData(function (data) {
        TRP.currentItinerary = new TRP.Itinerary();
        TRP.data = data;
        if(!($.isEmptyObject(data.itineraries))) {
            
            TRP.lightboxControl("welcome");
        }
        
        //we need a check here based on whether itineraries is empty or not.
    // }
    });

    $(".welcome-contain a").click(function(e) {
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
            console.log("HELP MEEEEEE!!!");
        }
        // console.log(linkClick);
        e.preventDefault();
    })

    TRP.searchHandler = new TRP.SearchObject();
    $(".add-item").click(function () {
        TRP.toggleSearchBox();
    });
    $(".exit").click(function () {
        TRP.toggleSearchBox();
    });

    var searchObj = {};

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
    
    $(document).on('click', '.venue .add-venue', function (e) { // Make your changes here
        var curItin = TRP.currentItinerary;
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        var markerID=mapID.substring(3);
        var curMarker= TRP.markersMap[markerID];
        setMarkerType(curMarker, "red-pushpin",null);
        console.log(curMarker);
        mapID = mapID.substring(3);
        curItin.addEvent(TRP.venueMap[mapID]);
        venueObj.addClass("added");
        venueObj.prepend(TRP.addedObject);
        e.stopPropagation();
    });
    $(document).on('click', '.venue .added-label h4', function(e) { // Make your changes here
        var curItin = TRP.currentItinerary;
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        curItin.removeEvent(mapID);
        venueObj.removeClass("added");
        venueObj.find(".added-label").remove();
        e.stopPropagation();
    });
    $(document).on('click', '.venue', function() { // Make your changes here
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        var activeMarker= TRP.markersMap[mapID];
        var lat=activeMarker.position.pb;
        var lon=activeMarker.position.qb;
        console.log(lat);
        //console.log(lng);
        TRP.map.panTo(new google.maps.LatLng(lat, lon));
        (activeMarker.setAnimation(google.maps.Animation.BOUNCE));
        setTimeout(function(){ activeMarker.setAnimation(null); }, 1400);

        console.log(activeMarker);
        $(".labels").removeClass("active");
        $(".labels."+mapID).addClass("active");
    });
    $(document).on('click', '.venue', function() { // Make your changes here
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        var activeMarker= TRP.markersMap[mapID];
        var lat=activeMarker.position.pb;
        var lon=activeMarker.position.qb;
        console.log(lat);
        //console.log(lng);
        TRP.map.panTo(new google.maps.LatLng(lat, lon));
        (activeMarker.setAnimation(google.maps.Animation.BOUNCE));
        setTimeout(function(){ activeMarker.setAnimation(null); }, 1400);

        console.log(activeMarker);
        $(".labels").removeClass("active");
        $(".labels."+mapID).addClass("active");
    });
    $(document).on('click','.load-box a', function(e) {
        var itineraryName = ($(this).text());
        if(!($(this).hasClass("new-itinerary"))){
            //it's not the new button
            //load the itinerary
        } else {
            //proceed as normal, fade out the save-box
        }
        TRP.lightboxControl("load",function() {
            if($(".welcome").hasClass("visible")) {
                TRP.lightboxControl("image");
                TRP.lightboxControl("lightbox");
            } else {
                TRP.lightboxControl("lightbox");
            }
        });
        e.preventDefault();
    });
    $(".save-form form #submit").click( function (e) { // Make your changes here
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
                $(".submit-buttons #submit").val("Yes");
                $(".submit-buttons #cancel").val("No");
            } else {
                saveData(saveName);
            }
        } else {
            $(".save-form h2").css({'color':'red','text-decoration':'underline'});
        }
        // e.stopPropagation();
    });
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
    $(".load-button").click( function (e ) {
        TRP.lightboxControl("lightbox",function () {
            TRP.lightboxControl("load");
        })
        e.preventDefault();
    })
});


$(".exit").click( function (){
    clearMarkers();
    drawItinerary();
    listItinerary();
});

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
function render_map() {
    var mapOptions = {
        zoom: 11,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles:styledMap
      };
      TRP.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

      // Try HTML5 geolocation
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
          console.log(TRP.markerInit);
          add_marker(TRP.markerInit);
          TRP.map.setCenter(initial_loc);
        }, function() {
          geolocationErr();
        });
    } else {
        // Browser doesn't support Geolocation
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
                'name': 'Default NYC location',
                'id' : 1111,
                'iconType': 'blue-dot',
                'iconUrl': null
          }
      TRP.markerInit= new TRP.Marker(markerData);
      console.log(TRP.Marker.init);
      add_marker(TRP.Marker.init);
      TRP.map.setCenter(initial_loc);

    }
} google.maps.event.addDomListener(window, 'load', render_map);

//function add_marker(lat, lon, name, markerType, markerUrl){
    function add_marker(markerData){

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
      if (TRP.currentItinerary.eventHash[id]){
        setmarkerType(marker, "red-pushpin", null);
      }
      else{
        setMarkerType(marker,markerData.iconType, markerData.iconUrl);
      }  
    var maxIndex = google.maps.Marker.MAX_ZINDEX;
       marker.infoWindow = new google.maps.InfoWindow({
       content:markerData.name  
    });
    //should the infoWindow be kept open?
    google.maps.event.addListener(marker, 'click', function() {
    marker.infoWindow.open(TRP.map,marker);
    console.log(id);
    $(".reference .venue").removeClass("active");
    $(".id-"+id).addClass("active");
    maxIndex++;
    //don't know if we want this
    marker.setZIndex(maxIndex);
    window.location.href = marker.url;
    //animate not working
    //$("article").animate({ scrollTop: $('#id-4c13897db7b9c92822a6a937').offset().top }, 1000);
  });
    google.maps.event.addListener(marker, 'mouseover', function(){
        maxIndex++;
        //don't know if we want this
        marker.setZIndex(maxIndex);
      });
        google.maps.event.addListener(marker, 'mouseover', function(){
            maxIndex++;
            //don't know if we want this
            marker.setZIndex(maxIndex);
        })
        TRP.markersMap[id]=marker;
}

function placeSearchResults(results){

    var keysArray = results;

    TRP.map.setZoom(16);

    clearMarkers();
    add_marker(TRP.markerInit);
  //  add_marker(TRP.currLoc.lat, TRP.currLoc.lon, 'Your current location', "blue-dot");
    for (var i in keysArray){
        var key = keysArray[i];
        var locationObj = TRP.venueMap[key];
        var markerData = {
            'lat': locationObj.coord.lat,
            'lon': locationObj.coord.lon,
            'name': locationObj.name,
            'id' : locationObj.id,
            'iconType': 'custom',
            'iconUrl': locationObj.category.iconUrl
        }
        add_marker(markerData);
    }
}
function clearMarkers(){
    for (var markers in TRP.markersMap){
        TRP.markersMap[markers].setMap(null);
    }
     for (var markers in TRP.markersMap){
         TRP.markersMap={};
    }       
}

function drawItinerary(){
// directions code modified from https://developers.google.com/maps/documentation/javascript/directions
    

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
    var destination = new google.maps.LatLng(destinationVenue.coord.lat, destinationVenue.coord.lon);
    var origin = new google.maps.LatLng(TRP.currLoc.lat, TRP.currLoc.lon);
    var waypoints=[];
    for (var i=0; i<itinArray.length-1; i++){
        var venue=itinArray[i];
        var waypoint= new google.maps.LatLng(venue.coord.lat, venue.coord.lon);
         waypoints.push({
          location:waypoint,
          stopover:true
      });

    }
    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(TRP.map);
    var directionsService = new google.maps.DirectionsService();

    var request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.WALKING,
       unitSystem: google.maps.UnitSystem.IMPERIAL
    };
    directionsService.route(request, function(response, status) {
      if (status == google.maps.DirectionsStatus.OK) {

        var responseSub = response.routes[0];
        TRP.currentItinerary.setDirections(responseSub);
        directionsDisplay.setDirections(response);
        TRP.updateItineraryView();
      }
    });
    }
}

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
//modified map styles from http://snazzymaps.com/style/19/subtle
var styledMap=
[
    {
        "featureType": "poi",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "stylers": [
            {
                "saturation": -70
            },
            {
                "lightness": 37
            },
            {
                "gamma": 1.15
            }
        ]
    },
    {
        "elementType": "labels",
        "stylers": [
            {
                "gamma": 0.26
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road",
        "stylers": [
            {
                "lightness": 0
            },
            {
                "saturation": 0
            },
            {
                "hue": "#ffffff"
            },
            {
                "gamma": 0
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 50
            },
            {
                "saturation": 0
            },
            {
                "hue": "#ffffff"
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "lightness": -50
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
     {
         "featureType": "poi.business",
         "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi.business",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi.place_of_worship",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi.place_of_worship",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },

    {
        "featureType": "administrative.province",
        "elementType": "labels.text",
        "stylers": [
            {
                "lightness": 20
            }
        ]
    }
]
