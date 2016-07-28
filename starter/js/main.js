/*
    ========================================
    ++        STARTER JS PATTERNS        ++
    ========================================
    
    Table of Contents
    
        ::Site Main Navigation
    
 */




/*
    ========================================
        ::Site Main Navigation
    ========================================
        
    USAGE
    ========================================
    Pattern for each site's main header and main navigation sections

    The below markup is assumed to be used; changing class names, ids, or aria properties will impact css and js functionality
    
    EIS Framework required
    

    MARKUP:
    ========================================
    <header id="siteHeader" class="special-container">
        <div class="inner">
        
            <div class="site-id" itemscope itemtype="http://schema.org/Organization">
                <a class="site-id_logo" href="{site_root}" itemprop="url">
                    <img src="{site_logo}" alt="{site_name}" itemprop="logo" />
                </a>
            </div>
            
            <div class="toolbar group">
                
                <nav class="toolbar_nav" aria-label="Primary Navigation" role="navigation">
                    <a class="toolbar_menu-btn" href="" aria-haspopup="true" aria-expanded="false">show menu</a>
                    <ul>
                        
                        <!-- ### level 1 items ### -->
                        <li  class="has-submenu">
                            <a href="{level-1_link}" aria-haspopup="true" aria-expanded="false">{level-1_name}</a>
                            <ul>
                                <li><a href="{level-2_link}">{level-2_name}</a></li>
                                <li><a href="{level-2_link}">{level-2_name}</a></li>
                                <li><a href="{level-2_link}">{level-2_name}</a></li>
                            </ul>
                        </li>
                        <li><a href="{level-1_link}">{level-1_name}</a></li>
                        
                        <!-- ### utility items ### -->
                        <li class="utility-link"><a href="{utility-link}">{utility_name}</a></li>
                        <li class="utility-link"><a href="{utility-link}">{utility_name}</a></li>
                        
                        <!-- ### cta item ### -->
                        <li class="toolbar_cta"><a href="{cta_link}">{cta_name}</a></li>
                    </ul>
                </nav>
                
                <div class="toolbar_utility">
                    <ul class="toolbar_links">
                        <!-- ### utility items ### -->
                        <li class="utility-link"><a href="{utility_link}">{utility_name}</a></li>
                        <li class="utility-link"><a href="{utility_link}">{utility_name}</a></li>
                    </ul>
                </div>
                    
                <a class="toolbar_search" href="{search_link}">{search_name}</a>
                
            </div>
        </div>
    </header>
    <div id="navOverlay"></div>


    NOTES:
    ========================================
    
*/
EIS.loadOnce( 'jQuery', function() {

	var $topNav = 			$('.toolbar_nav > ul'), 
		$itemsWithDrop = 	$( '.has-submenu' ),
		$dropItems = 		$itemsWithDrop.find( 'li' ),
		$mobileBtn = 		$( '.toolbar_menu-btn' ),
		$navOverlay = 		$('#navOverlay'),
		strAnimClass = 		'isOpen';
	
	
	// ========== desktop event bindings ==========//
	
		// on hover of nav item with drop down, change the aria-expanded attr (css handles dropdown)
		$itemsWithDrop.on( {
			mouseenter : 	function() { $(this).find('a[aria-haspopup]').attr( 'aria-expanded', 'true'); },
			mouseleave : 	function() { $(this).find('a[aria-haspopup]').attr( 'aria-expanded', 'false'); }
		});
		
		// when user tabs into nav item with drop down, trigger hover events
		$itemsWithDrop.on( {
			focusin : 	function() { $(this).trigger( 'mouseenter' ); },
			focusout : 	function() { $(this).trigger( 'mouseleave' ); }
		});
		
		// when user tabs through drop down menu items, add a class to the parent (css will keep dropdown open)
		$dropItems.on( {
			focusin : 	function() { $(this).closest( '.has-submenu' ).trigger( 'mouseenter' ).addClass( strAnimClass ); },
			focusout : 	function() { $(this).closest( '.has-submenu' ).trigger( 'mouseleave' ).removeClass( strAnimClass ); }
		});
	
	
	// ========== mobile event bindings ==========//
	
		// when user clicks or tabs the mobile icon, add a class (css handles dropdown)
		$mobileBtn.on( {
			click : 		function() { return false; },
			mousedown : 	function(evt) { 
								evt.preventDefault(); 
								if ( $topNav.hasClass( strAnimClass ) ) {
									$topNav.removeClass( strAnimClass ); 
									$mobileBtn.attr( 'aria-expanded', 'false');
									$navOverlay.fadeOut('150'); 
								} else { 
									$navOverlay.fadeIn( '150' ); 
									$topNav.addClass( strAnimClass ); 
									$mobileBtn.attr( 'aria-expanded', 'true');
								}
							},
			focusin : 		function() { 
								$topNav.addClass( strAnimClass ); 
								$mobileBtn.attr( 'aria-expanded', 'true');
								$navOverlay.fadeIn('150'); 
						  	}
		});
		
		// when user clicks off from the nav, hide nav
		$navOverlay.on( 'click', function() {
			if ( $topNav.hasClass( strAnimClass ) ) {
				$mobileBtn.trigger( 'mousedown' );
			}
		});
	
});
/* ===== END ::Site Main Navigation ===== */



