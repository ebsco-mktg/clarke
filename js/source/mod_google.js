/*
 * GOOGLE - handles set-up of google analytics code and throwing events to GA
 * 
 * google fn format:
 * 		ga('send', 'event', 'category', 'action', 'label');
 * 		Note: label is optional; category and action are required
 * 		Other options: https://developers.google.com/analytics/devguides/collection/analyticsjs/events
 * 
 * enables throwing ga events for elements classed "ga" with data attr "ga" in json format:
 * 		<a class="ga" href="" data-ga='{ "category" : "categoryStr", "action" : "actionStr", "label" : "labelStr"}'>
 * 
 * enables throwing ga social events for elements classed "gaSocial" with data attr "ga" in json format:
 * 		<a class="gaSocial" href="" data-ga='{ "socialnetwork" : "social network string, i.e. facebook", "socialaction" : "social network action, i.e. share"}'>
 * 
 * UPDATE 26-oct-2016
 * 		+ added CONST for the "all sites combined" global GA profile
 * 		+ added (changed) CONST for allowed domain list for linker (ADA version used EIS.eisDomains which will now be removed)
 * 		+ changed init to only add linker plugin for the global GA profile
 * 		+ changed init function to check passed in profile ids for global GA profile
 * 
 */
var GOOGLE = (function( pub ) {

	// global GA profile id "all sites combined"
	var CONST_globalProfileId = 'UA-63632005-1',
		CONST_eisDomains = [ 'ebsco.com', 'ebscohost.com', 'dynamed.com', 'ebscoind.com' ];
	
	// private functions
	
	function setupGALink( $anElem ) {
		
		// assuming type of event is an external link thrown on click event passing in title attribute value as the label
		var thisGaCat = 'external link',
			thisGaAction = 'click',
			// if title is not set then fallback to the href
			thisGaLabel = typeof $anElem.attr('title') !== 'undefined' ? $anElem.attr('title') : $anElem.attr('href');
		
		$anElem.data( 'ga', { "category" : thisGaCat, "action" : thisGaAction, "label" : thisGaLabel} ).addClass('ga');

	}

	// public functions
	
	// event data format: data-ga='{ "category" : "categoryStr", "action" : "actionStr", "label" : "labelStr"}'
	pub.callGaEvent = function( anElem, hasSecondProfileID ) {
		var $theElem = $(anElem),
			gaCategory = $theElem.data('ga').category,
			gaAction = $theElem.data('ga').action,
			gaLabel = $theElem.data('ga').label;
		
		ga('send', 'event', gaCategory, gaAction, gaLabel);
		
		// if there is an additional GA profile, send to that second one
		if ( hasSecondProfileID ) {
			ga('newTracker.send', 'event', gaCategory, gaAction, gaLabel);
		}
	};

	// social data format: data-ga='{ "socialnetwork" : "social network string, i.e. facebook", "socialaction" : "social network action, i.e. share"}'
	pub.callGaSocial = function( anElem, hasSecondProfileID ) {
		var $theElem = $(anElem),
			socialNetwork = $theElem.data('ga').socialnetwork,
			socialAction = $theElem.data('ga').socialaction,
			// socialTarget is optional; if not passed in use the current page
			socialTarget = typeof $theElem.data('ga').socialtarget !== 'undefined' ? $theElem.data('ga').socialtarget : document.location.pathname ;
		
		// send the social event to GA
		ga('send', 'social', socialNetwork, socialAction, socialTarget);
		
		// if there is an additional GA profile, send to that second one
		if ( hasSecondProfileID ) {
			ga('newTracker.send', 'social', socialNetwork, socialAction, socialTarget);
		}
	};
	
	// will fetch the ga script if not already loaded
	// will initialize ga if an optional profileID is passed in
	// 
	pub.init = function( profileID, secondProfileID ) {

		var hasGA = typeof window.ga === 'function' ? true : false,
			hasProfileID = typeof profileID !== 'undefined' ? true : false;
			hasSecondProfileID = typeof secondProfileID !== 'undefined' ? true : false;
		
		// first check if ga exists; if not load it
		if ( !hasGA ) {
			
			// code from google to set up analytics.js and throw the first events (pageview)		
			(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
			(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
			m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
			})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
		}
		
		// possible scenarios:
		
		// 		no profile id passed in
		// 			no init needed
		// 		1 profile id passed in, IS the global profile id
		// 			no init needed
		
		// 		1 profile id passed in, NOT the global profile id
		// 			normal init profileID
		// 		2 profile ids passed in, SECOND is the global profile id
		// 			normal init profileID
		
		// 		2 profile ids passed in, NONE are the global profile id
		// 			normal init profileID and secondProfileID
		// 		2 profile ids passed in, FIRST is the global profile id
		// 			normal init secondProfileID
		
		if ( hasProfileID ) {
			// profileID exists; secondProfileID unk
			
			if ( profileID === CONST_globalProfileId ) {
				// profileID exists, global; secondProfileID unk

				if ( hasSecondProfileID ) {
					// profileID exists, global; secondProfileID exists
					if ( secondProfileID !== CONST_globalProfileId ) {
						// profileID exists, global; secondProfileID exists, unique
						// make the first profile id use the non-global id
						profileID = secondProfileID;
						// second profile id is not needed
						hasSecondProfileID = false;
					} else {
						// profileID exists, global; secondProfileID exists, global
						// passed profile ids not needed
						hasProfileID = false;
						hasSecondProfileID = false;
					}
				} else {
					// profileID exists, global; secondProfileID NOT passed
					// no need to do anything with the profile id
					hasProfileID = false;
				}
				
			} else {
				// profileID exists, unique; secondProfileID unk
				
				if ( hasSecondProfileID ) {
					// profileID exists, unique; secondProfileID exists
					if ( secondProfileID !== CONST_globalProfileId ) { 
						// profileID exists, unique; secondProfileID exists, unique
						// keep both checks as we will process both profile ids
					} else {
						// profileID exists, unique; secondProfileID exists, global
						// only first profile id is needed
						hasSecondProfileID = false;
					}
				} else {
					// profileID exists, unique; secondProfileID NOT passed
					// keep everything as is
				}
			}
			
		} else {
			// profileID NOT passed; secondProfileID NOT passed
			// keep everything as is
		}
		
		if ( hasProfileID ) {
			// process/init first unique profile
			ga( 'create', profileID, 'auto' );
			ga( 'send', 'pageview' );
			
			if ( hasSecondProfileID ) {
				// process the second unique profile
				ga( 'create', secondProfileID, 'auto', { 'name': 'newTracker' } );
				ga( 'newTracker.send', 'pageview' );
			}
		}
		
		// now process the global profile id
		ga( 'create', CONST_globalProfileId, 'auto', { 'name': 'globalTracker', 'allowLinker': true } );
		ga( 'globalTracker.send', 'pageview' );
		ga( 'require', 'linker' );
		ga( 'linker:autoLink', CONST_eisDomains );
		
		
		// now we can add our own bindings because we know ga is set up and running
		// bindings
		/*
		 * assumes ga event values are set in data attr - 
		 * 		<a class="ga" href="whatever" data-ga='{ "category" : "categoryStr", "action" : "actionStr", "label" : "labelStr"}'>
		*/
		
		// jQuery is probably already loaded, but just in case check first
		EIS.loadOnce( 'jQuery', function() {

			// dynamically setup ga
			var $gaExtLink = $('.gaExtLink');
			
			if ( $gaExtLink.length > 0 ) {
				$gaExtLink.each(function() {
					setupGALink( $(this) );
				});
			}
			
			
			// trigger ga event
			$('body').on('click','.ga', function() {
				GOOGLE.callGaEvent( $(this), hasSecondProfileID );
			});
			
			// trigger ga social
			$('body').on('click','.gaSocial', function() {
				GOOGLE.callGaSocial( $(this), hasSecondProfileID );
			});
			
			var $gaLoad = $( '.ga-load' );
			
			if ( $gaLoad.length > 0 ) {
				$gaLoad.each(function() {
					GOOGLE.callGaEvent( $(this), hasSecondProfileID );
				});
			}
			
		});
		
	};

	return pub;
	
}(GOOGLE || {}));

