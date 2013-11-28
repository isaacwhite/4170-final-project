W4170 = {};
W4170.oauth = "EJJLH0BUCOHLVG2NVX1Z0ZK1IKWYWWXJSQUVR2VBG4IYG00G"

W4170.getRecommendedByLocation = function(lat,lon,callback) {
	var fsAPI = "https://api.foursquare.com/v2";

	function getResults(lat,lon) {
		var endpoint = fsAPI + "/venues/explore";
		var dateNow = new Date();
		var dateString = "" + 
			dateNow.getFullYear() + 
			(dateNow.getMonth() + 1) +
			dateNow.getDate();
		var requestUrl = endpoint + "?";
		requestUrl    += "ll=" + lat + "," + lon;
		requestUrl    += "&oauth_token=" + W4170.oauth;
		requestUrl    += "&v=" + dateString;

		$.get(requestUrl,callback);
	}

	getResults(lat,lon);
}

W4170.lat = 40.7;
W4170.lon = -74;

W4170.getRecommendedByLocation(W4170.lat,W4170.lon,function(data) {
	console.log(data);
})
