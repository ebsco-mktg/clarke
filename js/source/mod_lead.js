/*****
 * 	mod_lead.js
 * 
 * purpose: read url parameters and carrythrough values to lead forms
 * 

	v1.1
	 * conversion of original leadtracking.js to a EIS module
	 * uses new tracking parameters: 
	 * 		utm_medium 		: required, must match a pre-defined keyword (replaces eis-src)
	 * 		utm_source 		: required, variable string (replaces eis-code)
	 * 		utm_campaign 	: required, variable string (replaces eis-cmp)
	 * 		utm_content 	: optional, variable string to describe the tracking link (i.e. button, banner)
	 * 		eis_id 			: optional, variable string to describe a custom tracking code
	 * 		eis_strategy 	: optional, variable string to describe the campaign strategy effort
	 * 
 *  
 *****/
/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/
var docCookies = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};
/*
 * 
 * !! assume local leadtracking.js script is converted to EIS.loadOnce( '/clarke/mod_lead.js' );
 * 
 * // first check if there is a query parameter
 * 
 * 		// if so
 * 
 * 		// if so check if the required parameters are included
 * 
 * 			// if so check if there is an existing, active lead tracking cookie
 * 
 * 				// if so, check if utm_medium is search
 * 
 * 					// if so, do nothing
 * 
 * 					// if not, check if utm_medium is landingpage
 * 
 * 						// if so, do nothing
 * 
 * 						// if not, set cookie
 * 
 * 				// if not, set cookie
 * 
 * 			// if not, set cookie
 * 
 * 		// if not, do nothing
 * 
 * // if not, do nothing
 * 
 * // second check if there is a form on the page
 * 
 * 		// if so check if there is an existing, active lead tracking cookie
 * 
 * 			// if so populate the form
 * 
 * 			// if not do nothing
 * 
 * 		// if not do nothing
 * 
 * // if not do nothing
 * 
 * 
 * 
 * 
 * 
 * methods:
 * 
 * pub.detectCampaign 	: reads cookie and writes parameter values into form fields
 * pub.init 			: detects tracking parameters on url and if found creates/updates tracking cookie
 * 
 * pub.displayCookie 	: displays the current cookie (for test page)
 * pub.deleteCookie 	: deletes cookie; if passed in element will only remove that key 
 * 
 * 
 * 
 * test page:
 * 		shows current value
 * 		can create url based on form input
 * 		can update/change cookie
 * 		verbose with what happens when url is tested (display overwrites, changes, values)
 * 		shows conflicts
 * 		
 * 
 * 
 * 
*/
var LEAD = (function() {

		/* #####   MAKE IMPLEMENTATION CONFIG CHANGES HERE   ##### */
	var pub = {},
		config = {
			cookieName 		: 'eis', 						// our cookie name
			
			campaign 		: {								// campaign object holds current tracking parameters (UTM standard)
								medium  : 'utm_medium',
								source  : 'utm_source',
								name    : 'utm_campaign',
								content : 'utm_content'
							},
			
			custom 			: { 							// custom object hold tracking parameters that are outside of the UTM params
								id       : 'eis_id',
								strategy : 'eis_strategy'
							},
			og 				: { 							// og object hold old tracking parameters
								src  : 'eis-src',
								code : 'eis-code',
								cmp  : 'eis-cmp'
							},
			
			
			cmpID 			: 'eis-cmp', 					// DEPRECATED; is now utm_campaign
			campaignID 		: 'eis-cmpid', 					// DEPRECATED campaign id (need to support to make sure all current campaigns get caught)
			
			leadSrc 		: 'eis-src', 					// DEPRECATED; is now utm_medium
			channelType 	: 'eis-type', 					// DEPRECATED channel type key name
			tacticCode 		: 'eis-code', 					// DEPRECATED; is now utm_source
			
			mediumType 		: 'eis-medium', 				// DEPRECATED the key name for storing the medium type
			defaultCmpid 	: 'eiswebsite', 				// NOT USED: a default campaign id value
			
			EISDomains 		: [ 'ebsco.com', 'ebscohost.com', 'epnet.com' ], 	// list of internal websites; used to skip trying to set a lead cookie
			EISLandingPg 	: 'www.ebsco.com/promo/',  		// NOT USED
			expireLength 	: {	// length is in # of seconds, so one day === 60sec/min * 60min/hr * 24hr/day == 86400 seconds in one day
				search 			: 86400,	// one day
				landingpage 	: 1209600, 	// two weeks
				direct 			: 86400, 	// one day
				email 			: 604800, 	// one week
				social 			: 86400, 	// one day
				facebook 		: 86400, 	// one day
				twitter 		: 86400, 	// one day
				pinterest 		: 86400, 	// one day
				googleplus 		: 86400, 	// one day
				linkedin 		: 86400, 	// one day
				youtube 		: 86400, 	// one day
				vimeo 			: 86400, 	// one day
				bb 				: 1209600, 	// two weeks
				ppc 			: 86400 	// one day
			},
			cookieDomain 	: 'ebsco.com', 			// production
			// cookieDomain 	: 'ebscohost.com', 	// production
			// cookieDomain 	: 'epnet.com',		// development
			searchSites 	: [ 
				'www.google.com', 
				'www.google.co.uk', 
				'www.google.co.in', 
				'www.google.com.ph', 
				'www.google.de', 
				'www.google.fr', 
				'bing.com', 
				'yahoo.com', 
				'gigablast.com', 
				'lycos.com', 
				'duckduckgo.com',
				'ask.com', 
				'baidu.com', 
				'so.com'
			],
			socialSites 	: [
				't.co', 
				'twitter.com',
				'facebook.com',
				'pinterest.com',
				'plus.url.google.com', 
				'linkedin.com', 
				'youtube.com', 
				'vimeo.com' 
			],
			privacyPolicy 	: 'We have a privacy policy. Please see https://www.ebsco.com/company/privacy-policy'
		};

	/*
	 * FALLBACKS
	 */
	/* getElementsByClassName */
	/* http://www.dustindiaz.com/getelementsbyclass */
	function getElementsByClass(searchClass,node,tag) {
		// window.console && console.log('fallback: getElementsByClassName');
		var classElements = new Array();
		if ( node == null )
			node = document;
		if ( tag == null )
			tag = '*';
		var els = node.getElementsByTagName(tag);
		var elsLen = els.length;
		var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
		for (i = 0, j = 0; i < elsLen; i++) {
			if ( pattern.test(els[i].className) ) {
				classElements[j] = els[i];
				j++;
			}
		}
		return classElements;
	}

	function getQS() {
		window.console.log( 'getQS' );
		var qsObj = {},
		// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
			match,
			pl = /\+/g,  // Regex for replacing addition symbol with a space
			search = /([^&=]+)=?([^&]*)/g,
			decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
			query  = window.location.search.substring(1);
			
		while (match = search.exec(query))
			qsObj[decode(match[1])] = decode(match[2]);
		
		return qsObj;
	}
	
	
	/*
	 * compares the document.referrer string to the list of test domains
	 * returns false if the referrer is matched to one fo the test domains
	 * returns true if the referrer does not match any test domains
	 */
	function refIsInList( testDomains ) {
		window.console.log( 'refIsInList', testDomains );
		var i = 0,
			ref = document.referrer,
			isInList = false;
			
		for ( ; i < testDomains.length; i++ ) {
				/*
				 * ^https? 					: 	matches 'http' or 'https' at the start of the string
				 * :\/\/ 					: 	matches literal '://' (escaping the slashes)
				 * ([^\/]+\.)? 				:  	matches anything BUT '/' or '.', 0 or once (e.g., 'www' or the lack of the sub-domain)
				 * ' + testDomains[i] + ' 	: 	matches the literal value of testDomains[i]
				 * (\/|$) 					: 	matches '/' or end of the string
				 * 'i' 						: 	flag to make this case-insensitive
				 */
			var thisTestStr = new RegExp('^https?:\/\/([^\/]+\.)?' + testDomains[i] + '(\/|$)', 'i');

			if ( ref.match( thisTestStr ) ) {
				// as soon as we find a match to one of our test domains, we should return true (no need to keep checking)
				isInList = true;
				return isInList;
			} else {
				// set isInList to false and keep checking
				isInList = false;
			}
		}
		// most likely isInList is false (because we would have already returned true otherwise); 
		// return it here as we ran out of domains to check against
		return isInList;
	}
	
	pub.deleteCookie = function() {
		try {
			docCookies.removeItem( config.cookieName, '/', config.cookieDomain );
			window.console.log( 'deleting cookie' );
			return true;
		} catch( err ) {
			window.console.error( 'deleteCookie: ', err );
			return false;
		}
	};
	
	
	// detects campaign cookie and if found writes campaign values into page form
	pub.detectCampaign = function() {
		window.console.log( 'detectCampaign' );
			// triggered by className 'fnDetectCookie'
	    var theForm = typeof document.getElementsByClassName !== 'undefined' ? document.getElementsByClassName('fnDetectCookie') : getElementsByClass('fnDetectCookie'),
		    theFormLength = theForm.length,
		    dnt = navigator.doNotTrack == "1" || navigator.msDoNotTrack == "1";
		    
		// window.console && console.log( 'dnt: ', dnt );
	    
	    if ( theFormLength > 0 ) {

		    // if the cookie exists, set the campaign values to newly-created form fields
		    if ( docCookies.getItem( config.cookieName ) !== null )  {

		    	EIS.loadOnce( 'JSON', function() {
		        
			        // set-up the form fields
			        var currCookie = docCookies.getItem( config.cookieName ),
			        	cookieObj = normalizeCookie( currCookie ),
						// cookieJson = JSON.parse( currCookie ),
						// cookie values
						cookieMedium = typeof cookieObj[config.campaign.medium] !== undefined ? cookieObj[config.campaign.medium] : 'not set',
						cookieSource = typeof cookieObj[config.campaign.source] !== undefined ? cookieObj[config.campaign.source] : 'not set',
						cookieName = typeof cookieObj[config.campaign.name] !== undefined ? cookieObj[config.campaign.name] : 'not set',
						cookieContent = typeof cookieObj[config.campaign.content] !== undefined ? cookieObj[config.campaign.content] : 'not set',
						cookeEisId = typeof cookieObj[config.custom.id] !== undefined ? cookieObj[config.custom.id] : 'not set',
						cookeEisStrategy = typeof cookieObj[config.custom.strategy] !== undefined ? cookieObj[config.custom.strategy] : 'not set',

				    	isTesting = typeof document.getElementById('fakeForm') !== undefined,
				    	inputType = isTesting ? 'text' : 'hidden',
						// quick fn to set the input attributes for each
				    	setInputs = function(inpType, inpName, inpVal) {
				    		var inpObj = document.createElement( 'input' ),
				    			styleStr = 'content:attr(name);';
					        inpObj.setAttribute('type', inpType);
					        inpObj.setAttribute('name', inpName);
					        inpObj.setAttribute('value', inpVal);
					        
					        if ( isTesting ) {
					        	inpObj.className = 'fnAddLabel';
					        	inpObj.setAttribute('readonly', 'readonly');
					        }
					        
					        return inpObj;
				    	},
				    	// create the inputs
				    	
				    	inputMedium = setInputs( inputType, config.campaign.medium, cookieMedium),
				    	inputSource = setInputs( inputType, config.campaign.source, cookieSource),
				    	inputCampaign = setInputs( inputType, config.campaign.name, cookieName),
				    	inputContent = setInputs( inputType, config.campaign.content, cookieContent),
				    	inputEisId = setInputs( inputType, config.custom.id, cookeEisId),
				    	inputEisStrategy = setInputs( inputType, config.custom.strategy, cookeEisStrategy),

						i = 0;
			        
			        // add the inputs to the form if it exists
		        	for ( ; i<theFormLength; i++ ) {
		        		var targetElem = isTesting ? document.getElementById( 'hiddenVals' ) : theForm[i];

			        	targetElem.appendChild( inputMedium );
			        	targetElem.appendChild( inputSource );
			        	targetElem.appendChild( inputCampaign );
			        	targetElem.appendChild( inputContent );
			        	targetElem.appendChild( inputEisId );
			        	targetElem.appendChild( inputEisStrategy );
		        	}
		        	
		        	if ( isTesting ) {
		        		window.console.log( 'isTesting' );
		        		addNames = function() {
		        			try {
		        				var testInputElems = document.querySelectorAll( 'input.fnAddLabel' ),
		        					testInputLength = testInputElems.length,
		        					ii = 0;
		        				
		        				for ( ; ii < testInputLength; ii++ ) {
		        					thisLabel = '<label>' + testInputElems[ii].getAttribute( 'name' ) + '</label>';
		        					testInputElems[ii].insertAdjacentHTML( 'beforebegin', thisLabel );
		        					window.console.log( 'thisLabel: ', thisLabel, testInputElems[ii] );
		        				}
		        				return true;
		        			} catch( err ) {
		        				window.console.error( err );
		        				return false;
		        			}
		        		}();
		        	}
		        	
		        	// return true to let the caller know we added the inputs
		        	return true;
		        	
	        	});

	      	}
	      
		    if ( dnt ) {
		    	var dntInput = document.createElement('input');
		      	
		      	dntInput.setAttribute('type', 'hidden' );
				dntInput.setAttribute('name', 'dev_note' );
				dntInput.setAttribute('value', 'DNT' ),
				i = 0;
	
		        // add the inputs to the form if it exists
	        	for ( ; i<theFormLength; i++ ) {
		        	theForm[i].appendChild( dntInput );
		        	// window.console && console.log( 'added dnt note' );
	        	}
        	
				// form exists but we have no campaign to set; return false
				return true;
	      	}
		} else {
			// no form; return false
			return false;
	    }
	    
	    // return false since the inputs were not added - probably never reach here
	    return false;
	};
	
	/*
	 * return boolean based on if passed in query string object has the required parameters
	 */
	function checkQSforTracking( theQSObj, isOldTracking ) {
		window.console.log( 'checkQSforTracking', theQSObj, isOldTracking );
		var state = false;
		
		if ( isOldTracking ) {
			// if all are not undefined, state is true; otherwise state is false
			// state = (typeof theQSObj[config.og.cmp] !== 'undefined') && (typeof theQSObj[config.og.src] !== 'undefined') && (typeof theQSObj[config.og.code] !== 'undefined');
			state = (typeof theQSObj[config.og.cmp] !== 'undefined') && (typeof theQSObj[config.og.src] !== 'undefined');
		} else {
			// if all are not undefined, state is true; otherwise state is false
			state = (typeof theQSObj[config.campaign.medium] !== 'undefined') && (typeof theQSObj[config.campaign.source] !== 'undefined') && (typeof theQSObj[config.campaign.name] !== 'undefined');
		}
		
		return state;
	}
	
	/*
	 * return an object with the keys cmpMedium, cmpSource, cmpName, cmpContent, customId, customStrategy
	 * 
	 * takes an object with parameters for the campaign and custom keys
	 * 
	 */
	function createTrackingObj( anObj, isOldTracking ) {
		window.console.log( 'createTrackingObj', anObj, isOldTracking );
		var aTracker = {};
		
		// it is assumed that we have a valid QS
		
		// cmpMedium is either the old tracking parameter or the new one
		aTracker[config.campaign.medium] = isOldTracking ? anObj[config.og.src] : anObj[config.campaign.medium],
		
		// cmpSource is either the old tracking parameter or the new one
		aTracker[config.campaign.source] = isOldTracking ? anObj[config.og.code] : anObj[config.campaign.source],

		// cmpName is either the old tracking parameter or the new one
		aTracker[config.campaign.name] = isOldTracking ? anObj[config.og.cmp] : anObj[config.campaign.name];
		
		// add optional items
		aTracker[config.campaign.content] = typeof anObj[config.campaign.content] !== 'undefined' ? anObj[config.campaign.content] : '';
		aTracker[config.custom.id] = typeof anObj[config.custom.id] !== 'undefined' ? anObj[config.custom.id] : '';
		aTracker[config.custom.strategy] = typeof anObj[config.custom.strategy] !== 'undefined' ? anObj[config.custom.strategy] : '';

		return aTracker;
	}
	
	/*
	 * make this a cookie setter - pass in an object with the values to be set...
	 */
	function createCookie( eisTracker ) {
		window.console.log( 'createCookie', eisTracker );
		try {
				// update/set the cookie to the qs values
			var qsCookieString = '[{"' + config.campaign.medium + '":"' + eisTracker[config.campaign.medium] + '","' + config.campaign.source + '":"' + eisTracker[config.campaign.source] + '","' + config.campaign.name + '":"' + eisTracker[config.campaign.name] + '","' + config.campaign.content + '":"' + eisTracker[config.campaign.content] + '","' + config.custom.id + '":"' + eisTracker[config.custom.id] + '","' + config.custom.strategy + '":"' + eisTracker[config.custom.strategy] + '"}]',
				// now we need to lookup for how long the cookie should exist
				maxAge = config.expireLength[eisTracker[config.campaign.medium]];
				
			// set the cookie ( <3 mozilla ): (sKey, sValue, vEnd, sPath, sDomain, bSecure)
			docCookies.setItem( config.cookieName, qsCookieString, maxAge, '/', config.cookieDomain );
		} catch(err) {
			window.console.error( 'error trying to set cookie: ', err );
			return err;
		}
		return true;
	}

	// take cookie string and transform to new format, returning values as object
	function normalizeCookie( aCookie ) {
		window.console.log( 'normalizeCookie', aCookie );
		var thisTrackerObj = {},
			cookieJson = JSON.parse( aCookie ),
			cookieObj = cookieJson[0],
			isOldFormat = typeof cookieObj[config.og.cmp] !== 'undefined' ? true : false;
		
		// now we can get just the obj and create a tracking object in the new format
		if ( isOldFormat ) {
			thisTrackerObj = createTrackingObj( cookieJson[0], isOldFormat );
		} else {
			thisTrackerObj = cookieObj;
		}
		
		return thisTrackerObj;
	}	
	
	pub.init = function() {
		window.console.log( 'LEAD.init' );
		var detectCampaign;
		
			EIS.loadOnce( 'JSON', function() {
			
				var isNotEbscoDomain = !refIsInList( config.EISDomains );
	
				// check if either the referrer is a non-ebsco domain
				// if so, we'll go and check/set the cookie
				// otherwise it's just tripping through our sites so do nothing
				if ( isNotEbscoDomain ) {
					window.console.log( 'not ebsco domain referrer' );
					
					var theQSObj = getQS(),
						isOldTracking = typeof theQSObj[config.og.cmp] !== 'undefined' ? true : false,
						// check if all valid values passed in
						hasValidQS = checkQSforTracking( theQSObj, isOldTracking ),
						// check if there is an existing cookie
						hasCookie = docCookies.getItem( config.cookieName ) === null ? false : true;
						// our tracker object based on query string { cmpName, cmpSource, cmpMedium }
						qsTracker = {};
						
					if ( hasValidQS ) {
						// log privacy policy statement in console
						window.console.info( config.privacyPolicy );
						// create a conformed tracker object
						qsTracker = createTrackingObj( theQSObj, isOldTracking );
						
						if ( hasCookie ) {
							// read cookie and check if it should be overwritten by qs
								// get the cookie, transform to new format if needed
							var currCookie = docCookies.getItem( config.cookieName ),
								// our tracker object based on cookie values
								cookieObj = normalizeCookie( currCookie );
							
							window.console.log( 'currCookie: ', currCookie );
							window.console.log( 'cookieObj: ', cookieObj );
							window.console.log( 'qsTracker: ', qsTracker );
							
							// now check if the cookie should apply, or if we need to set a new cookie
							/*
							 * Rules of Dominance
							 * 
							 * if one medium type is search, use the search
							 * if both medium types are search, use the query string
							 * if cookie medium type is landing page and query string medium type is email, use landing page
							 * otherwise, use query string (the last one in)
							 * 
							 */
							
							var cookieMediumType = (cookieObj[config.campaign.medium]).toLowerCase(),
								qsMediumType = (qsTracker[config.campaign.medium]).toLowerCase();
							
							switch ( cookieMediumType ) {
								case 'search' :
									if ( qsMediumType === 'search' ) {
										createCookie( qsTracker );
									} else {
										// keep cookie as is
									}
									break;
									
								case 'landingpage' :
									if ( qsMediumType !== 'landingpage' ) {
										// keep cookie as is
									} else {
										createCookie( qsTracker );
									}
									break;
									
								default :
									createCookie( qsTracker );
									break;
							}
							
						} else {
							createCookie( qsTracker );
						}
						
					} else {
						window.console.log( 'no qs detected' );
						// no qs, check if a search referrer, or a social referrer


						// check if the referrer is in our list of search sites
						if ( refIsInList( config.searchSites ) ) {
							// window.console && console.log( 'Hello Mr. Haystack. My name is Needle.' );
							
								// create the campaign id from the search domain in the doc.referral
							var ref = document.referrer,
								refPath = ref.split('//')[1],
								refDomain = refPath.split('/')[0],
								searchObj = {};
							
							searchObj.cmpMedium = 'search';
							searchObj.cmpSource = refDomain;
							searchObj.cmpName = window.location.host + "/" + window.location.pathname;
							
							createCookie( searchObj );
								
						// check if the referrer is one of the social sites
						} else if ( refIsInList( config.socialSites ) ) {
							
							// if there is no cookie, set the cookie to the social referrer
							// otherwise keep the cookie and not use the generic (non-campaign) social referrer
							if ( docCookies.getItem( config.cookieName ) === null ) {
								// window.console && console.log( 'Hashtag delicious!' );
								
								var ref = document.referrer,
									refPath = ref.split('//')[1],
									refDomain = refPath.split('/')[0],
									socialObj = {};
									
								socialObj.cmpMedium = 'social';
								socialObj.cmpSource = refDomain;
								socialObj.cmpName = window.location.host + "/" + window.location.pathname;
								
								createCookie( socialObj );
							}
							
						} else {
							// ok, so no valid tracking url, and not coming from search or social; we'll just leave everything alone
							// window.console && console.log( 'You are perfect just the way you are.' );
						}
						
					}
					
				} else {
					// referral is internal and not a landing page; do nothing
					// window.console && console.log( 'You mean we don\'t have French benefits?' );
				}
				
			});
		
		// will return false if input fields were not added to the lead form; true if they were
		detectCampaign =  pub.detectCampaign();
		
	}();

	return pub;
}());
