// This library can be used to manage instances in multiplayer HTML5 games
//
// It can work with any database, although at the moment it has only been implemented to work with Firebase

//next:
//-- make use of params to have game behave like asteroids or spacewar
//-- have firebase connections happen here instead of in game.js and implement the TODO functions (including random)
//-- create some UI components for choosing and creating games


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
	  	dict[d(e[1])] = d(e[2]);
	  }
  })();
    
  return dict;
}


// TODO: if game reaches capacity and it was random anyway, log user into another random game

var mmoInstance = {};
var _mmoInstance = function() {
	var scope = this;

	// These functions should be implemented to work with the database used for instance information
	this.GetInstanceInfoForName = null;
	this.CreateInstance = null;
	this.AddUserToInstance = null;
	this.ShouldConnectRandom = false;


	this.Name = '';
	this.GameParams = Object();
//	this.GameList = new Firebase(server + "/gamelist");
	this.DefaultRandom = true;
	this.DefaultInstanceName = 'lobby';

	this._getSettings = function()
	{
//		var name = this.Name; // + Math.floor(Math.random() * 10);

		var hashIndex = (window.location.href).indexOf('#');
		var questionIndex = (window.location.href).indexOf('?');

		if (hashIndex != -1)
		{
			var startIndex, endIndex;

			startIndex = hashIndex + 1;
			if (questionIndex === -1)
				endIndex = window.location.href.length;
			else
				endIndex = questionIndex;

			this.Name = (window.location.href).substring(startIndex, endIndex);
		} else
		{
			// Name not set. So should likely use a random name then
		}


		if (questionIndex >= 0)
		{
			paramString = (window.location.href).substring(questionIndex + 1);
			dict = _parseParams(paramString);	
			console.log(dict);
		}

		this.GameParams = dict;
	}


	// will return the name of the instance to connect to
	this.OnInit = function()
	{
		this._getSettings(); // load Name, GameParams from URL

		if (this.Name === '')
		{
			if (this.ShouldConnectRandom === true)
			{
				instanceInfo = this.GetRandomInstanceInfo();	
			} else
			{
				this.Name = this.DefaultInstanceName;
			}
		}

		var instanceInfo = null;
		if (this.GetInstanceInfoForName != null)
			instanceInfo = this.GetInstanceInfoForName(this.Name); // use a callback to get a JSON object containing info about the game

		if (instanceInfo != null)
		{
			if (this.AddUserToInstance != null)
			{
				//TODO: check how many users there are.  if over the limit, then we can't connect to this game.  If 'random' is set to true, then just connect to another game that isn't over the limit.  will have to call an additional method.
				this.AddUserToInstance(instanceInfo.Name); //TODO: could represent user differently
			}
		} else
		{
			if ((this.CreateInstance != null) && (this.AddUserToInstance != null))
			{
				this.CreateInstance(instanceInfo);
				this.AddUserToInstance(instanceInfo.Name);  //TODO: could represent user differently
			}
		}
	};
};

_mmoInstance.call(mmoInstance);
mmoInstance.OnInit();


// firebase-specific functions; should go in separate file

mmoInstance.ServerName = 'http://gamma.firebase.com';
mmoInstance.RootFolder = 'spacewar';
mmoInstance.InstanceListName = 'games';
mmoInstance.UserListName = 'users';

mmoInstance.GetInstanceListFireBase = function()
{
	// Assumes that the firebase javascript has already been loaded
	return new Firebase(mmoInstance.ServerName + '/' + mmoInstance.RootFolder + '/' + mmoInstance.InstanceList);
}
mmoInstance.GetUserListFireBase = function()
{
	// Assumes that the firebase javascript has already been loaded
	return new Firebase(mmoInstance.ServerName + '/' + mmoInstance.RootFolder + '/' + mmoInstance.UserList);
}



/////////////////////////////////////////////////////////////////////////////////////
// Synchronous firebase methods using async.js
/////////////////////////////////////////////////////////////////////////////////////
mmoInstance.GetFirebaseTable = function(fireBaseObject)
{
	var infos = new Array();
	fireBaseObject.once('value', function(snapshot)) {
		if (snapshot.val() == null)
		{
			// doesn't exist.
			console.log("Error: Please create table in Firebase for " + fireBaseObject.toString());

		} else
		{
			infos.add(snapshot.val());
		}
	}
	return infos;
}
mmoInstance.AddFirebaseValue = function(fireBaseObject, value, mustBeUnique)
{
	fireBaseObject.push(value, function(success)) {
		//TODO
	}
}
/////////////////////////////////////////////////////////////////////////////////////


mmoInstance.GetInstanceInfoForName = function(name)
{
	var instanceInfos = scope.GetFirebaseTable(scope.GetInstanceListFireBase());

	var instanceInfoCount = instanceInfos.length;
	for (i = 0; i < instanceInfoCount; i++)
	{
		if (instanceInfos[instanceInfoCount].Name == name)
		{
			return instanceInfos[instanceInfoCount];
		}
	}
	return null;
}
mmoInstance.CreateInstance = function(instanceInfo)
{
	var created = false;
	var instanceInfo = scope.GetInstanceInfoForName(instanceInfo.Name);
	if (instanceInfo == null)
	{
		// Doesn't exist; create it
		created = scope.AddFirebaseValue(instanceInfo);
	}
}
mmoInstance.AddUserToInstance = function(userObject)
{
	// TODO use AddFirebaseValue for the users table.  register a callback for when the user disconnects.
}
mmoInstance.GetRandomInstanceInfo = function()
{
	var instanceInfos = scope.GetFirebaseTable(scope.GetInstanceListFireBase());

	// until we have a match (keeping track of what we've tried):
		// randomly choose an instanceinfo
		// check the users table for that instance
		// if under the limit, then connect to it

	// if no match was found, then create a new random room

	//TODO: keep randomly choosing among the instances and check the user count


	//TODO
	/*
	firebaseRef.on('value', function(dataSnapshot) {
  		// code to handle new value.
	});
	*/

	//TODO: get a random nonhidden instance that can be connected to (while honoring the user count). return json object with relevant info
}


// session table:
	// sessionid, capacity, isprivate
// sessionuser table:
	// sessionid, user id/name, timestamp

// if a session ever goes down to zero users, remove it from the table
//TODO: have an optional combobox that allows choosing a session
