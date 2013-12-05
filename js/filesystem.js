var filesystem = null;
var fileList = document.getElementById('file-list'); //file-list is a div where we can display all the files. 


window.onload = function() {

  window.requestFileSystem = window.requestFileSystem ||
                             window.webkitRequestFileSystem;

  function initFileSystem() {
    navigator.webkitPersistentStorage.requestQuota(1024 * 1024 * 5,
      function(grantedSize) {

        window.requestFileSystem(window.PERSISTENT, grantedSize, function(fs) {

          filesystem = fs;
        }, errorHandler);

      }, errorHandler);
  }

  if (window.requestFileSystem) {
    initFileSystem();
  } else {
    alert('Browser doesn\'t support the FileSystem api');
  }
};


function saveItinerary() {
	
	//supply the filename and filecontent here
	var filename = "some file name";
    var content = "some random content";
    	
  filesystem.root.getFile(filename, {create: true}, function(fileEntry) {

    fileEntry.createWriter(function(fileWriter) {
    	
      fileWriter.onerror = function(e) {
        console.log('Write error: ' + e.toString());
        alert('Error in saving file');
      };

      var contentBlob = new Blob([content], {type: 'text/plain'});

      fileWriter.write(contentBlob);

    }, errorHandler);

  }, errorHandler);
};

function errorHandler(error) {
    var message = '';
    alert('in error handler-1');
    switch (error.code) {
      case FileError.SECURITY_ERR:
        message = 'Security Error';
        break;
      case FileError.NOT_FOUND_ERR:
        message = 'Not Found Error';
        break;
      case FileError.QUOTA_EXCEEDED_ERR:
        message = 'Quota Exceeded Error';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        message = 'Invalid Modification Error';
        break;
      case FileError.INVALID_STATE_ERR:
        message = 'Invalid State Error';
        break;
      default:
        message = 'Unknown Error';
        break;
    }

    console.log(message);
};


function listItineraries() {
    var dirReader = filesystem.root.createReader();
    var entries = [];

    var fetchEntries = function() {
      dirReader.readEntries(function(results) {
        if (!results.length) {
          displayItineraries(entries.sort().reverse());
        } else {
          entries = entries.concat(results);
          fetchEntries();
        }
      }, errorHandler);
    };

    fetchEntries();
};

function displayItineraries(entries) {
   
	fileList.innerHTML = '';

    entries.forEach(function(entry, i) {
      var li = document.createElement('li');

      var link = document.createElement('a');
      link.innerHTML = entry.name;
      link.className = 'edit-file';
      li.appendChild(link);

      var delLink = document.createElement('a');
      delLink.innerHTML = '[x]';
      delLink.className = 'delete-file';
      li.appendChild(delLink);

      fileList.appendChild(li);

      link.addEventListener('click', function(e) {
        e.preventDefault(); 
        loadFile(entry.name);
      });

      delLink.addEventListener('click', function(e) {
        e.preventDefault();
        deleteFile(entry.name);
      });
    });
};

function loadItinerary(name) {
    filesystem.root.getFile(name, {}, function(fileEntry) {

      fileEntry.file(function(file) {
        var reader = new FileReader();

        reader.onload = function(e) {
        	//Get the data from the file
            //var filename = name;
            //var filecontent = this.result;
        };

        reader.readAsText(file);
      }, errorHandler);

    }, errorHandler);
};


function deleteItinerary(name) {
    filesystem.root.getFile(name, {create: false}, function(fileEntry) {

      fileEntry.remove(function(e) {
    	  listItineraries();

      }, errorHandler);

    }, errorHandler);
};