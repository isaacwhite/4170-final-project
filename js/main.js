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
TRP.markers = [];
TRP.markers.init;
TRP.FileSystem = {};

TRP.getDateString = function () {
    var dateNow = new Date();
    var dateString = "" + 
        dateNow.getFullYear() + 
        (dateNow.getMonth() + 1) +
        dateNow.getDate();
    return dateString;
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
        console.log(data);
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
            'resultCount': resultCount
        }
        TRP.searchHandler.ingestData(callbackObj);
    }
    getResults();
}
TRP.toggleSearchBox = function () {
    if(!TRP.searchOpen){
        if(!TRP.animating) {
            TRP.animating = true;
            $(".search-form").animate({'height':'100%'},400,function () {
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
                $(".search-form").animate({'height':'0%'},400, function () {
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
        venueString += " id-" + that.id + "'>";
        var titleString = "<h3>" + that.name + "</h3>";
        var addButton = "<div class='add-venue'><span>Add venue</span></div>";
        var htmlAddress = that.address;
        if(that.url){
            venueString += "<a href=\"" + that.url + "\">";
            venueString += titleString + "</a>";
        } else {
            venueString += titleString;
        }
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
TRP.FileSystem.getSavedData = function (callback) {
    function reportError(e) {
            console.log("Filesystem failed!");
            console.log(e);
            callback("FAILURE!");
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
                        console.log(reader);
                        reader.onload = function (e) {
                            var fileContent = this.result;
                            console.log(fileContent);
                            callback($.parseJSON(fileContent));
                        };
                        reader.readAsText(file);
                    });
                });
            } catch(e) {
                reportError("error processing");
            }
        }
    }

    if(!TRP.filesys) {
        init(); //this will actually call readData on success, so no need to fall through to calling it directly.
    } else {
        readData();
    }
}
TRP.FileSystem.saveData = function (saveObject,callback) {
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
                    fileWriter.write(contentBlob, callback(true));
                });
            });
        }
        var content = [];
        content.push(contentString);
        deleteFile(saveData); //will call saveData when finished.
    }
    if(TRP.filesys) {
        writeData(JSON.stringify(saveObject));
    } else {
        callback(false);
    }
}

TRP.SearchObject = function() {
    this.resultCount = 0;
    this.searchHistory = [];
};

TRP.SearchObject.prototype.ingestData = function (data) {
    console.log(data);
    var orderedIDs = data.venueSort;
    this.resultCount = data.resultCount;
    var venues = data.venueMap;
    var thisID;
    var thisVenue;
    var thisHTML;
    var displayed = [];
    //the first time we pull in data
    for (var i = 0; i < orderedIDs.length; i++) {
        thisID = orderedIDs[i];
        thisVenue = venues[thisID];
        TRP.venueMap[thisID] = thisVenue;
        if(i < 10) {
            displayed.push(thisID);
            thisHTML = thisVenue.toHTML();
            $(".search-form .reference").append(thisHTML);
        } //after this we'll force a prompt 
    }
    console.log(data);
    console.log(this);
    //place search results on map
    placeSearchResults(displayed);
    TRP.loading = false;
}
//begin application
$( function () {

    TRP.FileSystem.getSavedData(function (data) {
        console.log(data);
    });

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
    
     $(document).on('click', '.venue .add-venue', function() { // Make your changes here
        console.log("clicked on the add button!");
        var venueObj = $(this).closest(".venue");
        var mapID = venueObj[0].classList[1];
        mapID = mapID.substring(3);
        console.log(mapID);
        TRP.itinerary.push(TRP.venueMap[mapID]);
        venueObj.addClass("added");
        console.log(TRP.itinerary);
    });
})


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
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
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
                'id' : null,
                'iconType': 'blue-dot',
                'iconUrl': null
          }
          TRP.Marker.init= new TRP.Marker(markerData);
          console.log(TRP.Marker.init);
          add_marker(TRP.Marker.init);
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
                'id' : null,
                'iconType': 'blue-dot',
                'iconUrl': null
          }
      TRP.Marker.init= new TRP.Marker(markerData);
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
        labelClass: "labels", // the CSS class for the label
        labelStyle: {opacity: 0.75}
     });
    setMarkerType(marker,markerData.iconType, markerData.iconUrl);

    var maxIndex = google.maps.Marker.MAX_ZINDEX;
       marker.infoWindow = new google.maps.InfoWindow({
       content:name  
    });
    //should the infoWindow be kept open?
    google.maps.event.addListener(marker, 'click', function() {
    marker.infoWindow.open(TRP.map,marker);
    maxIndex++;
    //don't know if we want this
    marker.setZIndex(maxIndex);
  });
    google.maps.event.addListener(marker, 'mouseover', function(){
        maxIndex++;
        //don't know if we want this
        marker.setZIndex(maxIndex);
    })

    TRP.markers.push(marker);
}

function placeSearchResults(results){
    var keysArray = results;
    //console.log(" MARKERS TRIP MARKERS BEFORE");
      //console.log(TRP.markers.length);
     // console.log(TRP.markers);
    TRP.map.setZoom(16);

    clearMarkers();
    add_marker(TRP.Marker.init);
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
    for (var j =0; j<TRP.markers.length; j++){
        TRP.markers[j].setMap(null);
    
    }
     for (var markers in TRP.markers){
         TRP.markers.pop();
    }       
}

function drawItinerary(){
// directions code modified from https://developers.google.com/maps/documentation/javascript/directions
    var destinationVenue=TRP.itinerary[TRP.itinerary.length-1];
    var destination= new google.maps.LatLng(destinationVenue.coord.lat, destinationVenue.coord.lon);
    var origin= new google.maps.LatLng(TRP.currLoc.lat, TRP.currLoc.lon);
    var waypoints=[];
    for (var i=0; i<TRP.itinerary.length-1; i++){
        var venue=TRP.itinerary[i];
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
        console.log(response);
        directionsDisplay.setDirections(response);
      }
    });
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
