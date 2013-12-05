TRP = {};
TRP.oauth = "EJJLH0BUCOHLVG2NVX1Z0ZK1IKWYWWXJSQUVR2VBG4IYG00G";
TRP.fsAPI = "https://api.foursquare.com/v2";
TRP.currLoc = {lat: 40.7588889, lon: -73.9851533};
TRP.searchOpen = false;
TRP.loading = false;
TRP.venueMap = {};//hashmap
TRP.itinerary = [];
TRP.map;
TRP.markers=[];

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
}
TRP.Comment = function (prop) {
    this.text     = prop.text;
    this.uFirst   = prop.firstName;
    this.uLast    = prop.lastName;
    this.photoUrl = prop.photoUrl;
}
TRP.getSuggestions = function (param) {

    var lat = param.lat;
    var lon = param.lon;
    var callback = param.callback;
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

    function processData(data) {
        console.log(data);
        var processedData = {}; //hash map by id
        var statusCode = data.meta.code;
        var resultCount = data.response.totalResults;
        var rawResults = data.response.groups[0].items;
        var venuesByRating = [];
        var callbackObj;

        // console.log(statusCode);
        // console.log(resultCount);
        // console.log(rawResults);

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
            var venueData = {
                'name': name,
                'rating': rating,
                'url': url,
                'thumbnail' : thumb,
                'locInfo': location,
                'comments': tips,
                'id' : id
            }
            venuesByRating.push(id);
            processedData[id] = new TRP.Venue(venueData);
        }
        //designed to be used asynchronously
        //calls callback passed to getResults.
        callbackObj = {
            venueSort: venuesByRating,
            venueMap : processedData
        }
        callback(callbackObj);
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
TRP.getSearchResults = function (lat,lon,search,callback) {

    function getResults(search,lat,lon) {
        var endpoint = TRP.fsAPI + "/venues/search";
        dateString = TRP.getDateString();
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

//begin application
$(function() {
    $(".add-item").click(function () {
        TRP.toggleSearchBox();
    });
    $(".exit").click(function () {
        TRP.toggleSearchBox();
    });

    var searchObj = {
        callback: function (data) {
            var orderedIDs = data.venueSort;
            var venues = data.venueMap;
            var thisID;
            var thisVenue;
            var thisHTML;
            console.log("callback called")
            for (var i = 0; i < orderedIDs.length; i++) {
                thisID = orderedIDs[i];
                thisVenue = venues[thisID];
                TRP.venueMap[thisID] = thisVenue;
                thisHTML = thisVenue.toHTML();
                $(".search-form .reference").append(thisHTML);
            }
            console.log(data);
            //place search results on map
            placeSearchResults(data);
            
            TRP.loading = false;
        }
    };

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


$(".exit").click(function(){
    clearMarkers();
    placeItinerary();

});

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
          var initial_loc = new google.maps.LatLng(lat, lon);
          TRP.currLoc=add_marker( lat, lon, '<div id= "infoWindow">Your current location</div>');
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
      add_marker(lat, lon, 'Default NYC location');
      TRP.map.setCenter(initial_loc);

    }
} google.maps.event.addDomListener(window, 'load', render_map);

function add_marker(lat, lon, html){
      var marker = new MarkerWithLabel({
        position: new google.maps.LatLng(lat,lon),
        draggable: false,
        raiseOnDrag: false,
        map: TRP.map,
        labelContent: html,
        labelAnchor: new google.maps.Point(22, 0),
        labelClass: "labels", // the CSS class for the label
        labelStyle: {opacity: 0.75}
     });
    var maxIndex=google.maps.Marker.MAX_ZINDEX;
       marker.infoWindow= new google.maps.InfoWindow({
       content:html  
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
    var keysArray=results.venueSort;
    //console.log(" MARKERS TRIP MARKERS BEFORE");
      //console.log(TRP.markers.length);
     // console.log(TRP.markers);
    TRP.map.setZoom(16);

    clearMarkers();

    add_marker(TRP.currLoc.lat, TRP.currLoc.lon, 'Your current location');
    for (var i in keysArray){
        var key=keysArray[i];
        var locationObj=results.venueMap[key];
        var lat= locationObj.coord.lat;
        var lon= locationObj.coord.lon;
        var name= locationObj.name;
        add_marker(lat, lon, name);
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
//this will change
function placeItinerary(){
    add_marker(TRP.currLoc.lat, TRP.currLoc.lon, 'Your current location');
    for (var k in TRP.itinerary){
        var venue=TRP.itinerary[k];
        var lat =venue.coord.lat;
        var lon = venue.coord.lon;
        var name= venue.name;
        add_marker(lat, lon, name);
    }
}
