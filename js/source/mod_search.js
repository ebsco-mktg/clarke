/*****
 * 	mod_search.js
 * 
 * purpose: wrapper for google custom search
 * 
	v0.7
	 * added alt image source to config object
	 * 		cx
	 * 		site
	 * 		labels
	 * 			cancel
	 * 			no_results
	 * 			results_label
	 * 			search_input_placeholder
	 * 		altimg

	v0.6
	 * added config object to SEARCH.init
	 * 		cx
	 * 		site
	 * 		labels
	 * 			cancel
	 * 			no_results
	 * 			results_label
	 * 			search_input_placeholder

	v0.5
	 * first live version (on flipster.ebsco.com)
	 * added ga call in doSearch
	 * refinements converted from buttons to checkboxes
	 * uses specific flipster image replacement call
	 * search config is 'buried' in doSearch
	 * in-page css (the on page search icon, on page search input field) moved to flipster files
	 * still very console.log chatty
	 * search implementations without refinements not tested

	v0.1
	 * initial functionality used in dev flipster
	 * used inline js and css for initial demo
 *  
 *****/

var SEARCH = (function () {
	window.console && console.info( 'SEARCH module v0.7' );

	var pub = {},
		doc = document,
		egg = 0,
		// we will cache the refinements so that we can keep the ordering on the display consistant
		facetsCache = [],
		cseCfg = {},
		validSetup = false;
	
	function clearSearchResults( callback ) {
		window.console && console.log( 'clearSearchResults' );
		var searchResultList = doc.getElementById( 'searchResultList' );
		
		$(searchResultList).hide( 0, function() {
			searchResultList.innerHTML = '';
			
			// if needing callbacks...
			if (callback && typeof(callback) === "function") {
			  callback();
			}
		});
	}
	
	function buildRefinements( facetsArr, searchTerms ) {
		window.console && console.log( 'buildRefinements: ', facetsArr, searchTerms );
		facetsCache = facetsCache.length > 0 ? facetsCache : facetsArr;
		var facetLength = facetsCache.length,
			i = 0,
			refinementElem = doc.createElement( 'div' ),
			refinementLabelElem = doc.createElement( 'p' ),
			searchForm = doc.getElementById( 'gaSearchForm' );
		
		refinementElem.id = 'searchRefinements';
		refinementElem.className = 'group radio-group';
		refinementLabelElem.className = 'refinements-label';
		refinementLabelElem.appendChild( doc.createTextNode( 'Search by:' ) );
		refinementElem.appendChild( refinementLabelElem );
		
		for ( ; i < facetLength; i++ ) {
			var thisAnchor = facetsCache[i][0].anchor,
				thisLabel = facetsCache[i][0].label,
				thisLabelWithOp = facetsCache[i][0].label_with_op,
				thisFieldElem = doc.createElement( 'div' ),
				thisLabelElem = doc.createElement( 'label' ),
				thisInputElem = doc.createElement( 'input' );
			
			
			if ( searchTerms.indexOf( thisLabelWithOp ) > -1 ) {
				thisInputElem.setAttribute( 'checked', 'checked' );
			}

			thisFieldElem.className = 'field radio';

			thisLabelElem.setAttribute( 'for', thisLabel );
			thisLabelElem.appendChild( doc.createTextNode( thisAnchor ) );

			thisInputElem.setAttribute( 'type', 'radio' );
			thisInputElem.setAttribute( 'name', thisLabel );
			thisInputElem.setAttribute( 'value', thisLabelWithOp );
			thisInputElem.id = thisLabel;
			thisInputElem.setAttribute( 'data-labelwithop', thisLabelWithOp );
			// thisInputElem.dataset.labelWithOp = thisLabelWithOp;
			
			thisFieldElem.appendChild( thisLabelElem );
			thisFieldElem.appendChild( thisInputElem );

			refinementElem.appendChild( thisFieldElem );
			
			// want to set up click handler for each item that passes in the label_with_op value to the existing query
			// on click sets the hidden input label_with_op to the value of the clicked element refinement
			if (thisInputElem.addEventListener) {
				thisInputElem.addEventListener( 'click', function(evt) {
				  	evt.preventDefault();
				  	window.console && console.log( 'changing to refinement: ', this.getAttribute('data-labelwithop') );
				  	doc.getElementById( 'label_with_op').value = typeof this.dataset !== 'undefined' ? this.dataset.labelwithop : this.getAttribute('data-labelwithop');
				  	doc.getElementById( 'start' ).value = '1';
				  	doSearch( searchForm );
				  	return false;
			 	}, false ); 
			  
			} else if (thisInputElem.attachEvent)  {
			  thisInputElem.attachEvent( 'onClick', function(evt) {
			  	evt.preventDefault();
			  	window.console && console.log( 'changing to refinement attachEvent: ', this.getAttribute('data-labelwithop') );
			  	doc.getElementById( 'label_with_op').value = typeof this.dataset !== 'undefined' ? this.dataset.labelwithop : this.getAttribute('data-labelwithop');
			  	doc.getElementById( 'start' ).value = '1';
			  	doSearch( searchForm );
			  	return false;
			  } );
			  
			}			
		}
		
		return refinementElem;
	}

	// itemType: 'prev', 'next', [page number]
	/* returns a paging element:
	 * 		<span class="page-box">
	 * 			<a class="[active]" data-start="[1]">[1]</a>
	 * 		</span>
	 * attaches a click handler that will call doSearch after setting the form start value to match the page value
	 */
	function createPageElem( itemType, dataStart, addClass ) {
		var itemParent = doc.createElement( 'span' ),
			itemLink = doc.createElement( 'a' ),
			searchForm = doc.getElementById( 'gaSearchForm' ),
			imgPath = 'https://www.ebsco.com/apps/global/clarke/css/img/';
			
		if ( itemType === 'prev' || itemType === 'next' ) {
			itemChild = doc.createElement( 'img' );
			itemChild.src = itemType === 'prev' ? imgPath + 'arrow-left.png' : imgPath + 'right-arrow.png';
			itemLink.className = itemType === 'prev' ? 'prev-arrow' : 'next-arrow';
			itemLink.appendChild( itemChild );
		} else {
			// itemChild = itemType;
			itemLink.appendChild( doc.createTextNode( itemType ) );
			itemLink.className = addClass;
			itemParent.className = 'page-box';
		}
		// itemLink.dataset.start = dataStart;
		itemLink.setAttribute( 'data-start',  dataStart );
		itemParent.appendChild( itemLink );

		// want to set up click handler for each item that passes in the label_with_op value to the existing query
		if (itemLink.addEventListener) {
		  itemLink.addEventListener( 'click', function(evt) {
		  	evt.preventDefault();
		  	// window.console && console.log( 'changing to refinement: ', this.dataset.labelWithOp );
		  	doc.getElementById( 'start').value = typeof this.dataset !== 'undefined' ? this.dataset.start : this.getAttribute('data-start');
		  	doSearch( searchForm );
		  	return false;
		  }, false ); 
		  
		} else if (itemLink.attachEvent)  {
		  itemLink.attachEvent( 'onClick', function(evt) {
		  	evt.preventDefault();
		  	// window.console && console.log( 'changing to refinement: ', this.dataset.labelWithOp );
		  	doc.getElementById( 'start').value = typeof this.dataset !== 'undefined' ? this.dataset.start : this.getAttribute('data-start');
		  	doSearch( searchForm );
		  	return false;
		  } );
		  
		}			
		
		return itemParent;
	}
	
	// used when needing to load the thumbnail image outside of the google search results
	// if site has alternative way to generate images (for when google does not return thumbs),
	// the site should return an image path from /getImage/{theEntryURLTitle},
	// or return 'no-image' and the image element will be removed from the search results
	function loadImg( imgElem, thisURLTitle ) {
		var thisUrl = '/getImage/' + thisURLTitle,
			thisImgUrl = '',
			altImgPath = cseCfg.altimg;

		$.get( thisUrl, function( data ) {
			if ( data !== 'no-image' ) {
				window.console.log( 'using alternative image path' );
				thisImgUrl = data ;
				imgElem.src = thisImgUrl;
			} else {
				window.console.log( 'removing image' );
				$( imgElem ).remove();
			}
		});
	}

	
	// take search results in json and return formatted results
	function displayResults( jsonObj ) {
		window.console && console.log( 'displayResults' );
		/*
			<div id="searchResultList">
				<div class="item">
					<p class="result-title"><a class="result-link" href="{result link}">{result title}</a></p>
					<p class="result-snippet">{result snippet}</p>
					<img alt="{result title} sample cover" class="result-thumbnail" src="{result img}" />
				</div>
			</div>
		*/	

		var requestObj = jsonObj.queries.request[0],
			resultCount = parseInt( requestObj.count, 10 ),
			totalResults = parseInt( requestObj.totalResults, 10 ), 
			totalResultsString = totalResults + ' ' + cseCfg.labels.results_label,
			startIndex = parseInt( requestObj.startIndex, 10 ),
			numPages = Math.ceil( totalResults / 10 ),
			curPage = Math.ceil( startIndex / 10 ),
			facets = (typeof jsonObj.context !== 'undefined') && (typeof jsonObj.context.facets !== 'undefined') ? jsonObj.context.facets : '',
			searchTerms = requestObj.searchTerms,
			prevPage = typeof jsonObj.queries.previousPage !== 'undefined' ? jsonObj.queries.previousPage[0] : '',
			nextPage = typeof jsonObj.queries.nextPage !== 'undefined' ? jsonObj.queries.nextPage[0] : '',
			i = 0,
			totalResultElem = doc.createElement( 'p' ),
			searchResultList = doc.getElementById( 'searchResultList' ),
			tempElem = doc.createElement( 'div' );
		
		totalResultElem.className = 'total-results';
		totalResultElem.appendChild( doc.createTextNode( totalResultsString ) );
		
		if ( parseInt( totalResultsString, 10 ) ) {
			
			for ( ; i < resultCount; i++ ) {
				var thisTitle = jsonObj.items[i].title,
					thisLink = jsonObj.items[i].link,
					thisSnippet = jsonObj.items[i].snippet,
					// thisImg = typeof (jsonObj.items[i].pagemap.cse_thumbnail) !== 'undefined' ? jsonObj.items[i].pagemap.cse_thumbnail[0].src : '',
					thisImg = typeof (jsonObj.items[i].pagemap) !== 'undefined' && typeof (jsonObj.items[i].pagemap.cse_thumbnail) !== 'undefined' ? jsonObj.items[i].pagemap.cse_thumbnail[0].src : '',
					itemElem = doc.createElement( 'div' ),
					titleElem = doc.createElement( 'p' ),
					linkElem = doc.createElement( 'a' ),
					imgLinkElem = doc.createElement( 'a' ),
					snippetElem = doc.createElement( 'p' ),
					imgElem = doc.createElement( 'img' );
					
				if ( thisImg !== '' ) {
					imgLinkElem.setAttribute( 'href', thisLink );
					imgLinkElem.className = 'image-link';
					imgLinkElem.appendChild( imgElem );
					imgElem.className = 'result-thumbnail';
					imgElem.setAttribute( 'alt', thisTitle );
					imgElem.src = thisImg;
					itemElem.appendChild( imgLinkElem );
				} else {
					var thisURLTitle = thisLink.split('/').pop();
					window.console.log( 'thisURLTitle: ', thisURLTitle );
					imgLinkElem.setAttribute( 'href', thisLink );
					imgLinkElem.className = 'image-link';
					imgLinkElem.appendChild( imgElem );
					imgElem.className = 'result-thumbnail fnLoadImg';
					imgElem.setAttribute( 'alt', thisTitle );
					imgElem.setAttribute( 'imgsrc', thisURLTitle );
					// imgElem.dataset.imgsrc = thisURLTitle;
					itemElem.appendChild( imgLinkElem );
					
					loadImg( imgElem, thisURLTitle );
					
				}
				itemElem.className = 'item';
				itemElem.appendChild( titleElem );
				itemElem.appendChild( snippetElem );
				titleElem.className = 'result-title';
				titleElem.appendChild( linkElem );
				linkElem.className = 'result-link';
				linkElem.setAttribute( 'href', thisLink );
				linkElem.appendChild( doc.createTextNode( thisTitle ) );
				snippetElem.className = 'result-snippet';
				snippetElem.appendChild( doc.createTextNode( thisSnippet ) );
				tempElem.appendChild( itemElem );
			}
			
		}
		
		//var theParent = doc.getElementById( 'gaSearchForm' );
		// clear any existing results
		
		// display new results
		if ( facets !== '' ) {
			refinementElem = buildRefinements( facets, searchTerms );
			searchResultList.appendChild( refinementElem );
		}
		
		searchResultList.appendChild( totalResultElem );
		searchResultList.appendChild( tempElem );
		
		
		// createPageElem( itemType, dataStart, addClass )
		
		var paginationElem = doc.createElement( 'div' );
		
		paginationElem.id = 'pagination-space';
		
		if ( prevPage !== '' ) {
			prevPageElem = createPageElem( 'prev', prevPage.startIndex );
			paginationElem.appendChild( prevPageElem );
		}
		
		
		// window.console && console.log( 'numPages: ', numPages );
		// window.console && console.log( 'current page: ', curPage );
		
		var ii = 0,
			bpBack = false,
			bpForward = false;
		
		for ( ; ii < numPages; ++ii ) {
			
			

			if ( curPage === ii+1 ) {
				addClass = 'active';
			} else {
				addClass = 'inactive';
			}
			
			if ( ii === 0 ) {
				// window.console && console.log( 'first page: ', ii );
				// first page
				var thisPageElem = createPageElem( ii+1, (ii*10)+1, addClass );
			} else if ( ii === numPages-1 ) {
				// window.console && console.log( 'last page: ', ii );
				// last page
				var thisPageElem = createPageElem( ii+1, (ii*10)+1, addClass );
			} else {
				// window.console && console.log( 'middle pages: ', ii );
				// paging conditional
				
				if ( ii < curPage-3 ) {
					if ( !bpBack ) {
						var thisPageElem = doc.createElement( 'span' );
						thisPageElem.appendChild( doc.createTextNode( '...' ) );
						bpBack = true;
					}
				} else if ( ii > curPage+3 ) {
					if ( !bpForward ) {
						var thisPageElem = doc.createElement( 'span' );
						thisPageElem.appendChild( doc.createTextNode( '...' ) );
						bpForward = true;
					}
				} else {
					var thisPageElem = createPageElem( ii+1, (ii*10)+1, addClass );
				}

			}

			paginationElem.appendChild( thisPageElem );
		}
		
		if ( nextPage !== '' ) {
			
			nextPageElem = createPageElem( 'next', nextPage.startIndex );
			paginationElem.appendChild( nextPageElem );
		}
		
		searchResultList.appendChild( paginationElem );
		$(searchResultList).show( 0 );
		
		
		
		/*
			<div id="pagination-space">
			
				<!-- previous page -->
				<span>
					<a data-start="prevPage.startIndex" class="prev-arrow" href="https://flipster.ebsco.com/browse-magazines/P24">
						<img src="/files/img/arrow-left.png">
					</a>
				</span>
				
				<!-- pages increment -->
				<span class="page-box">
					<a data-start="1+(page*10)" href="https://flipster.ebsco.com/browse-magazines" class="page-1 inactive">1</a>
				</span>
				<span class="page-box">
					<a href="https://flipster.ebsco.com/browse-magazines/P24" class="page-2 inactive">2</a>
				</span>
				<span class="page-box">
					<a href="https://flipster.ebsco.com/browse-magazines/P48" class="page-3 active ">3</a>
				</span>
				<span class="page-box">
					<a href="https://flipster.ebsco.com/browse-magazines/P72" class="page-4 inactive">4</a>
				</span>
				<span class="page-box">
					<a href="https://flipster.ebsco.com/browse-magazines/P96" class="page-5 inactive">5</a>
				</span>
				<span class="dots">...</span>
				<span class="page-box">
					<a href="https://flipster.ebsco.com/browse-magazines/P696" class="page-last inactive">30</a>
				</span>
			
				<!-- next page -->
				<span>
					<a data-start="nextPage.startIndex" class="next-arrow" href="https://flipster.ebsco.com/browse-magazines/P72">
						<img src="/files/img/right-arrow.png">
					</a>
				</span>
				
			</div>
		*/
		
		
	}
	
	function getSearchUrl( searchForm ) {
		var searchUrl = '';
		
		return searchUrl;
	}
	
	/* https://www.googleapis.com/customsearch/v1?
	 * q=home
	 * &cx=014962371176037383377%3A8vuvnwc9bho
	 * &num=5
	 * &siteSearch=flipster.ebsco.com%2Fmagazine%2F*
	 * &siteSearchFilter=i
	 * &fields=items%28link%2Cpagemap%2Csnippet%2Ctitle%29%2Cqueries
	 * &key=AIzaSyCMGfdDaSfjqv5zYoS0mTJnOT3e9MURWkU
	*/
	function doSearch( searchForm ) {
		window.console && console.log( 'doSearch' );
		var searchTermElem = searchForm.querySelector( '#searchTerms' ),
			searchTerms = searchTermElem.value,
			gaRoot = 'https://www.googleapis.com/customsearch/v1',
			label_with_op = searchForm.querySelector( '#label_with_op' ).value,
			startIndex = searchForm.querySelector( '#start' ).value,
			queryVal = searchTerms.split(' ').join('+'),
			gaUrlObj = {
				'q' : queryVal + '+' + label_with_op,
				'cx' : cseCfg.cx,
				'num' : '10',
				'start' : startIndex,
				// 'siteSearch' : searchForm.querySelector( '#siteSearch' ).value,
				'siteSearch' : typeof cseCfg.site !== 'undefined' ? cseCfg.site : '',
				'siteSearchFilter' : 'i',
				'fields' : 'items%28link%2Cpagemap%2Csnippet%2Ctitle%29%2Cqueries%2Ccontext',
				'key' : 'AIzaSyCMGfdDaSfjqv5zYoS0mTJnOT3e9MURWkU'
			},
			searchUrl = gaRoot + '?';
			
		egg = 0;
		
		$('body').css( 'cursor', 'wait' );
		
		var thisPathname = window.location.pathname;
		// window.console.log( 'search path: ', thisPathname);
		ga( 'send', 'pageview', thisPathname + '?q=' + queryVal );

		try {
			window.console.log( 'sending to second profile' );
			ga( 'newTracker.send', 'pageview', thisPathname + '?q=' + queryVal );
		} catch (err) {
			window.console.error( 'error sending to second ga profile: ', err );
		}
		
		clearSearchResults( function() {
			// loop through searchObj and append params to search url
			for ( var prop in gaUrlObj ) {
				searchUrl = searchUrl + prop + '=' + gaUrlObj[prop] + '&';
			}
			// have jQuery send as jsonp
			searchUrl = searchUrl + '&callback=?';
			var jqxhr = $.getJSON( searchUrl, function( jsonResponse ) {
					displayResults( jsonResponse );
				})
				.fail( function() {
					// fail logic
					window.console.error( 'error retrieving data' );
				})
				.complete( function() {
					$('body').css( 'cursor', 'default' );
				});
		});
		
		return false;
	}
	
	
	function diminishInput( theInput ) {
		window.console && console.log( 'diminishInput' );
		var curValue = theInput.value,
			inputLength = curValue.length,
			i = 0;
			
		intId = window.setInterval( function() {
			var curValueLength = curValue.length;
			
			if ( curValueLength > 0 ) {
				curValue = curValue.substr( 0, curValueLength-1 );
				theInput.value = curValue;
			} else {
				window.clearInterval( intId );
			}
		}, 25 );
	}
	
	
	function clearSearch( searchForm ) {
		window.console && console.log( 'clearSearch' );
		diminishInput( doc.getElementById( 'searchTerms' ) );
		// clear results
		clearSearchResults();
		searchForm.querySelector( '#label_with_op' ).value = '';
		// searchForm.reset();
	}


	function setupSearch( callback ) {
		window.console && console.log( 'setupSearch' );
		var searchForm = doc.getElementById( 'gaSearchForm' ),
			clearSearchElem = doc.getElementById( 'clearSearch' ),
			searchInputElem = doc.getElementById( 'searchTerms' ),
			cancelSearchElem = doc.getElementById( 'fnCancel' ),
			searchBtn = doc.getElementById( 'doSearch' );

		if (searchForm.addEventListener) {
		  searchForm.addEventListener( 'submit', function(evt) {
		  	evt.preventDefault();
		  	doSearch( searchForm );
		  	return false;
		  }, false ); 
		  
		  searchBtn.addEventListener( 'click', function(evt) {
		  	evt.preventDefault();
		  	doSearch( searchForm );
		  	return false;
		  }, false ); 
		  
		  // can assume the same for clearSearch
		  clearSearchElem.addEventListener( 'click', function(evt) {
		  	evt.preventDefault();
		  	clearSearch( searchForm );
			$(searchInputElem).focusToEnd();
		  	return false;
		  }, false ); 
		  
		  // sayt
		  /*searchInputElem.addEventListener( 'keyup', function(evt) {
		  	intId = window.setTimeout( function() {
		  		window.clearTimeout( intId );
		  		doSearch( searchForm );
		  		window.clearTimeout( intId );
		  	}, 1000);
		  }, false);*/
		  
		  // close window
		  cancelSearchElem.addEventListener( 'click', function(evt) {
		  	evt.preventDefault();
		  	
		  	$( '#searchWindow' ).fadeOut(500, function() {
		  		clearSearch( searchForm );
		  		$('html').css( 'overflow', 'auto' );
		  	});
		  	return false;
		  }, false);
		  
		} else if (searchForm.attachEvent)  {
		  searchForm.attachEvent( 'onSubmit', function(evt) {
		  	evt.preventDefault();
		  	doSearch( searchForm );
		  	return false;
		  } );
		  
		  searchBtn.attachEvent( 'onClick', function(evt) {
		  	evt.preventDefault();
		  	doSearch( searchForm );
		  	return false;
		  } );
		  
		  // can assume the same for clearSearch
		  clearSearchElem.attachEvent( 'onclick', function(evt) {
		  	evt.preventDefault();
		  	clearSearch( searchForm );
			$(searchInputElem).focusToEnd();
		  	return false;
		  } ); 

		  // sayt
		  /*searchInputElem.attachEvent( 'onkeyup', function(evt) {
		  	intId = window.setTimeout( function() {
		  		window.clearTimeout( intId );
		  		doSearch( searchForm );
		  		window.clearTimeout( intId );
		  	}, 1000);
		  } );*/

		  // close window
		  cancelSearchElem.attachEvent( 'onclick', function(evt) {
		  	evt.preventDefault();
		  	
		  	$( '#searchWindow' ).fadeOut(500, function() {
		  		clearSearch( searchForm );
		  		$('html').css( 'overflow', 'auto' );
		  	});
		  	return false;
		  });
		  
		}

		// if needing callbacks...
		if (callback && typeof(callback) === "function") {
		  callback();
		}
	
	}
	
	// returns the searchWindow element; if it doesn't exist will create it and attach to the end of the body elem
	function getSearchWindow( callback ) {
		window.console && console.log( 'getSearchWindow' );
		var searchExists = doc.getElementById( 'searchWindow' ) !== null ? true : false,
			searchWindow,
			searchHtml = '<div class="container" style="margin-top:64px;">'+
							'<div class="inner">'+
								'<div class="content size1of1">'+
									'<div class="inner">'+
										'<form id="gaSearchForm">'+
											'<input type="hidden" id="label_with_op" value="" />'+
											'<input type="hidden" id="start" value="1" />'+
											'<input id="searchTerms" placeholder="' + cseCfg.labels.search_input_placeholder + '" type="text" />'+
											'<div class="formActions">' +
												'<a href="#cancel-search" id="fnCancel">' + cseCfg.labels.cancel + '</a>'+
												'<a href="#submit-search-keywords" id="doSearch"></a>' +
											'</div>'+
											'<span id="clearSearch">X</span>' +
										'</form>'+
										'<div id="searchResultList">' + cseCfg.labels.no_results + '</div>' +
									'</div>'+
								'</div>'+
							'</div>'+
						'</div>';

		if ( searchExists ) {
			searchWindow = doc.getElementById( 'searchWindow' );
		} else {
			searchWindow = doc.createElement( 'div' );
			searchWindow.id = 'searchWindow';
			searchWindow.innerHTML = searchHtml;
			doc.body.insertBefore( searchWindow, null );
			setupSearch();
		}
		
		// if needing callbacks...
		if (callback && typeof(callback) === "function") {
		  callback();
		}
		
		return searchWindow;
	}

	function openSearchWindow( carryForward, callback ) {
		window.console && console.log( 'openSearchWindow', carryForward, callback );
		
		var searchWindow = getSearchWindow();
		$('html').css( 'overflow', 'hidden' );
		$( searchWindow ).fadeIn( 500 );
		$('#searchTerms').val( carryForward ).focusToEnd();
		
		// if needing callbacks...
		if (callback && typeof(callback) === "function") {
			callback();
		}
	}
	
	function loadStyles() {
		window.console && console.log( 'loadStyles' );
		
		var stylesheet = document.createElement( 'link' );
		stylesheet.setAttribute( 'rel', 'stylesheet' );
		stylesheet.setAttribute( 'href', 'https://www.ebsco.com/apps/global/clarke/css/source/mod_search.css' );
		document.getElementsByTagName('head')[0].appendChild( stylesheet );
	}
	
	function setConfig( cfgObj ) {
		/*
		 * cfgObj model:
		 * 
			var searchCfg = {
				'cx' : '014962371176037383377:kegksmylmks', 	// !!! REQUIRED
				'site' : '*%2Fe%2F' + sitesearch + '%2F*',		// optional
				'labels' : { 									// optional, but either all or none
					'cancel' : 'Cancel',
					'no_results' : 'no results',
					'results_label' : 'results',
					'search_input_placeholder' : 'Enter search terms'
				},
				'altimg' : 'some/path/to/img/directory' 		// optional (if missing will use blank string value)
			};
		 * 
		 */
		var theCfg = {},
			theLabels = {},
			hasLabels = typeof cfgObj.labels !== 'undefined';
			
		// set an error state
		theCfg.error = true;

		if ( typeof cfgObj.cx !== 'undefined' ) {
			try {
				theCfg.cx = cfgObj.cx;
				theCfg.site = typeof cfgObj.site !== 'undefined' ? cfgObj.site : '';
				
				theLabels.cancel = hasLabels ? cfgObj.labels.cancel : 'Cancel';
				theLabels.no_results = hasLabels ? cfgObj.labels.no_results : 'no results';
				theLabels.results_label = hasLabels ? cfgObj.labels.results_label : 'results';
				theLabels.search_input_placeholder = hasLabels ? cfgObj.labels.search_input_placeholder : 'Enter search terms';
				theCfg.labels = theLabels;
				theCfg.altimg = typeof cfgObj.altimg !== 'undefined' ? cfgObj.altimg : '';
				theCfg.error = false;
			} catch (e) {
				window.console.error(e);
			}
		}
		
		return theCfg;
	}
		
	pub.init = function ( cfgObj, callback ) {
		// check that the cfg object has been passed, and set it to the global var
		if ( typeof cfgObj !== 'undefined' ) {
			cseCfg = setConfig( cfgObj );
			validSetup = true;
		} else {
			window.console.error( 'Missing required cx value' );
		}
		
		// load the styles here since all the styles apply to elements loaded on user demand
		loadStyles();

		EIS.loadOnce( 'jQuery', function() {
			(function ($) {
				
				var $searchTriggers = $( '.fnSearch' ),
					$inpageSearchInput = $('#inpageSearchInput'),
					$inpageSearchForm = $('#inpageSearch'),
					inpageSearchTrigger = false;
				
				
				// wrap in conditional to check for a valid setup; if false hide all search components/elements
				
				
				// IE needs this to focus cursor at end of typed characters on home page
				$.fn.focusToEnd = function() {
					return this.each(function() {
						var v = $(this).val();
						$(this).focus().val("").val(v);
					});
				};

				if ( $searchTriggers.length !== 0 ) {
					$searchTriggers.on( 'click', function() {

						var labelWithOp = $inpageSearchInput.data( 'labelwithop' ),
							carryForward = $inpageSearchInput.val();
						openSearchWindow( carryForward, function() {
							$( '#label_with_op' ).val( labelWithOp );
						} );

						return false;
					});
				}
				
				// as soon as end-user begins using the in-page search input, open the search window
				// make sure to carry forward any entered search value to the real search input
				$inpageSearchInput.on( 'keyup', function() {
					if ( !inpageSearchTrigger ) {
						var labelWithOp = $(this).data( 'labelwithop' ),
							carryForward = $(this).val();
						inpageSearchTrigger = true;
						openSearchWindow( carryForward, function() {
							$( '#label_with_op' ).val( labelWithOp );
							inpageSearchTrigger = false;
						} );
						// reset the in-page input field to the placeholder
						$(this).val('');
					}
					return false;
				});
				
				// in rare cases the end-user could submit the in-page form
				$inpageSearchForm.on( 'submit', function() {
					var labelWithOp = $inpageSearchInput.data( 'labelwithop' ),
						carryForward = $inpageSearchInput.val();
					openSearchWindow( carryForward, function() {
						$( '#label_with_op' ).val( labelWithOp );
					} );
					$inpageSearchInput.val('');
					return false;
				});
				
			}(jQuery));
		});

		// if needing callbacks...
		if (callback && typeof(callback) === "function") {
			callback();
		}
	};
	
	return pub;
	
}());
