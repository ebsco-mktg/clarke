/*
 * EIS global module
 * 
 * Methods:
 * 		loadScript 	: loads any one-off script
 *      loadOnce 	: passes through a window obj; if obj does not yet exist will load appropriate script
 * 
 * 
 * Changelog:
 * 
 * 2015-02-26 : created libraryJson object to hold library list 
 * 				added functionality to check against current load state (to avoid multiple loading)
 * 2014-09-29 : added 'JSON' type for browsers that do not have built-in JSON support (using json2.js from D.Crockford)
 * 2014-08-nn : added 'VALIDATE' type (custom form validation module)
 *              added 'LEAD' type for calling LEAD module (leadtracking setting cookie to 'ebsco.com' domain)
 * 2014-07-nn : initial creation with jQuery, $f, GOOGLE types
 * 
 */


var EIS = (function (pub) {
	
		// object containing library references of properties library object name, source location, and current load state
		// load states:
		//		-1 : not loaded, not requested
		//		 0 : not loaded, requested and in process
		// 		 1 : loaded
	var libraryJson = [
		    // jQuery
		    {
		        "library" 	: "jQuery",
		        "source" 	: "https://www.ebsco.com/apps/global/vendor/jquery-1.11.3.min.js",
		        "state" 	: -1
		    },
		    // Vimeo froogaloop
		    {
		        "library" 	: "$f",
		        "source" 	: "https://www.ebsco.com/apps/global/vendor/froogaloop2.min.js",
		        "state" 	: -1
		    },
		    // json polyfill for older browsers (in cases of not using jQuery)
		    {
		        "library" 	: "JSON",
		        "source" 	: "https://www.ebsco.com/apps/global/vendor/json2.ugly.js",
		        "state" 	: -1
		    },
		    // Picturefill 2.2.0 : http://scottjehl.github.io/picturefill
		    {
		        "library" 	: "picturefill",
		        "source" 	: "https://www.ebsco.com/apps/global/vendor/picturefill.js",
		        "state" 	: -1
		    },
		    // google analtyics and custom event bindings
		    {
		        "library" 	: "GOOGLE",
		        "source" 	: "https://www.ebsco.com/apps/global/clarke/js/source/mod_google.js?20151210",
		        "state" 	: -1
		    },
		    // EIS lead tracking
		    {
		        "library" 	: "LEAD",
		        "source" 	: "https://www.ebsco.com/apps/global/clarke/js/source/mod_lead.js?20160816",
		        "state" 	: -1
		    },
		    // EIS form validation
		    {
		        "library" 	: "VALIDATE",
		        "source" 	: "https://www.ebsco.com/apps/global/clarke/js/source/mod_validate.js?20151210",
		        "state" 	: -1
		    }
		],
		libraryLength = libraryJson.length;
	
	// writes out the state for each library item in the console
	pub.currentLoadState = function() {
		var i = 0;
		
		for ( ; i < libraryLength; i++ ) {
			window.console && console.info( 'Library: ', libraryJson[i].library, '; state: ', libraryJson[i].state );
		}
	};
	
	pub.loadScript = function ( srcFile, callback ) {
		var doc = document,
			script = doc.createElement('script'),
		
			/*
			 * if srcFile string has '//' check the first part to our list of ebsco domains
			 * otherwise, string is something like '/somepath' so assume ok (relative to server)
			 * 
			 * basically being paranoid on the very off chance someone finds a way to inejct and call this fn
			 */
			hasDomain = (srcFile.split('//')).length > 1,
			srcDomain = '';
		
		var ii = 0;

		if ( hasDomain ) {
			srcDomain = (srcFile.split('//')[1]).split('/')[0];
			// window.console && console.info( 'srcDomain: ', srcDomain);
		}
		
		script.type = 'text/javascript';
		script.src = srcFile;
		
	    if (callback && typeof(callback) === 'function') {
		    // HT: http://www.nczonline.net/blog/2009/06/23/loading-javascript-without-blocking
		    if ( script.readyState ) {  //IE
		        script.onreadystatechange = function() {
		            if ( script.readyState == "loaded" || script.readyState == "complete" ) {
		                script.onreadystatechange = null;
		                
		                // update state to 'loaded'
						for ( ; ii < libraryLength; ii++ ) {
							
							if ( libraryJson[ii].source === srcFile ) {
		                		libraryJson[ii].state = 1;
		                	}
		                }
		                callback();
		            }
		        };
		    } else {  //Others
		        script.onload = function() {

	                // update state to 'loaded'
					for ( ; ii < libraryLength; ii++ ) {
						
						if ( libraryJson[ii].source === srcFile ) {
	                		libraryJson[ii].state = 1;
	                	}
	                }
		            callback();
		        };
		    }
	    }

		doc.getElementsByTagName('head')[0].appendChild(script);
		
	};
	
	pub.loadOnce = function ( jsLibrary, callback ) { 
		
		var i = 0;
		
		// function looks for state of a loading library, and if found fires the callback; otherwise repeats the check
		function waitForLoad( aLibrary, aCallback, aTimeoutID ) {
			
			var iii = 0;
				
			for ( ; iii < libraryLength; iii++ ) {	
										
				if ( libraryJson[iii].library === aLibrary ) {
					
					if ( libraryJson[iii].state === 1 ) {
						if (aCallback && typeof(aCallback) === 'function') {
							aCallback.apply( this, arguments );
						}
					} else {
						aTimeoutID = setTimeout( function() {
							waitForLoad( aLibrary, aCallback, aTimeoutID );
						}, 50);
					}
					
					// break the for loop since we found a match
					//break;
				}
			}
		}
		
		for ( ; i < libraryLength; i++ ) {
			
			if ( libraryJson[i].library === jsLibrary ) {
				// ok, have a match for the library; now check its state
				
				// check if library is not in the window obj
				if ( !( window[libraryJson[i].library] ) ) {
					
					// not in the window obj, so check its state
					if ( libraryJson[i].state === -1 ) {
						// -1 means not called, so load it and update the state value
						// 0 means loading but not ready
						libraryJson[i].state = 0;
						
						// load it
						pub.loadScript( libraryJson[i].source, callback );
					} else if ( libraryJson[i].state === 0 ) {
						// so the library is loading but not ready; we need to defer the callback until we get a state of 1
						var thisLibrary = libraryJson[i].library,
							thisCallback = callback;
						
						thisTimeoutID = setTimeout( function() {
							waitForLoad( thisLibrary, thisCallback, thisTimeoutID );
						}, 50);
						
						
					} else if ( libraryJson[i].state === 1 ) {
						// this library is loaded (but not in the window obj...); call the callback
						if (callback && typeof(callback) === 'function') {
							callback.apply( this, arguments );
						}
					}
					
				} else {
					// object is in the window object, so let's update the state and then do the callback
					libraryJson[i].state = 1;
					if (callback && typeof(callback) === 'function') {
						callback.apply( this, arguments );
					}
				}
				
				// break the for loop since we found a match
				//break;
			}
			
		}
	};
	
	/* 
	 * the below code is slatted to be deleted
	 */
	pub.loadOnceOld = function ( jsLibrary, callback ) { 
		
		var i = 0;
		
		if ( libraryList.token.length !== libraryList.source.length ) {
			window.console && console.error('libraryList token and source lengths do not match');
			return false;
		}

		for ( ; i < libraryLength; i++ ) {
			if ( libraryList.token[i] === jsLibrary ) {
				if ( !( window[libraryList.token[i]] ) ) {
					pub.loadScript( libraryList.source[i], callback );
				} else {
					if (callback && typeof(callback) === 'function') {
						callback.apply( this, arguments );
					}
				}
			}
		}
	};
	
	pub.init = function( callback ) {
		window.console && console.log( 'EIS web framework version: CLARKE' );
		window.console && console.info( '\"There is no demand for women engineers, as such, as there are for women doctors; but there\'s always a demand for anyone who can do a good piece of work.\"   -- Edith Clarke' );
			// if needing callbacks...
			if (callback && typeof(callback) === 'function') {
				callback.apply( this, arguments );
			}
	}();

	return pub;
}(EIS || {}));
