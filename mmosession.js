// This library can be used to manage sessions in multiplayer HTML5 games
//
// At the moment, it assumes that you are using Firebase, although that could easily get abstracted away.
//

// Goal #1: just allow specifying the session name via the URL


//From http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
_parseParams = function(paramString) {
  var dict = new Object();

  if (typeof(paramString) == 'undefined')
  	return dict;
	  
  var urlParams = {};
  (function () {
      var e,
          a = /\+/g,  // Regex for replacing addition symbol with a space
          r = /([^&=]+)=?([^&]*)/g,
          d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
          q = paramString;
  
      while (e = r.exec(q)) {
	  	//consolelog(e);
	  	dict[d(e[1])] = d(e[2]);
	  }
  })();
    
  return dict;
}


// call this, passing in a JSON object that consists of session names, current number of users, and if it is private or not
function _mmoSession(gameList) = {

	this.Name = '';
//	this.GameList = new Firebase(server + "/gamelist");

	// will return the name of the session to connect to
	this.OnInit = function()
	{
		var name = '';

		if (window.location.hash != '')
		{
			name = window.location.substring(1);
		}

		this.Name = name;

		// TODO: parse params to determine max # users and if private

		/*
		url = window.location.href;
		var paramString = // TODO: split at first ?

		var params = _parseParams(paramString);

		// TODO: read relevant fields from params and set name, capacity, isprivate. have default values.   		this.Name = '';


		if (this.Name !=== '')
		{
			//TODO: first: create the session if it doesn't already exist (and make it private, set max # users, etc.
			this.CreateSession(this.Name, capacity, isPrivate);
			this.Connect(this.Name);			
		} else
		{
			this.ConnectRandom();
		}
		// If there is a sessionid, make connection to it.  otherwise, connectrandom().
		*/
	};

	/*
	this.CreateSession = function(name, capacity, isPrivate)
	{
		if (this.SessionExists(name) === false)
		{
			// TODO: create entry in firebase
		}
	}

	this.SessionExists = function(name)
	{
		//TODO check for entry in firebase
	}

	this.Connect = function(sessionName)
	{
		// TODO
	}

	this.ConnectRandom = function()
	{
		// TODO Look through public games.  Randomly connect to one that is between min and max thresholds.
	}

	this.Disconnect = function()
	{
		// TODO ... just remove an entry. not sure if this method is needed here or not.
	}

	// For displaying in the UI
	this.GetPublicSessionList = function()
	{
		//TODO: basically do a json dump of the session names (but only entries where isprivate is false)

	}*/
};

var MmoSession = _mmoSession();
MmoSession.OnInit();

// session table:
	// sessionid, capacity, isprivate
// sessionuser table:
	// sessionid, user id/name, timestamp

// if a session ever goes down to zero users, remove it from the table
//TODO: have an optional combobox that allows choosing a session


