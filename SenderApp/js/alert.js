/*!****************************
 *                            *
 *  Smart Alert 1.2           *
 *                            *
 *  Code: Lukas Prvy          *
 *  Design: Pierre Borodin    *
 *                            *
 ******************************


Usage:

    $.alert.open([type], [title], content, [buttons], [callback]);

    or

    $.alert.open({settings});

Settings:

    container Container for alert placement (optional, 'body')
    type      Alert type('info', 'confirm', 'warning', 'error', 'prompt') (optional, 'info')
    title     Alert title (optional, default title for certain alert type)
    cancel    Show close icon(alert can be then closed also with ESC) (optional, true)
    icon      Set one of icons defined in theme stylesheet or hide icon by setting false (optional, 'info')
    content   Alert content (optional)
    align     Content alignment('left', 'center', 'right') (optional, 'left')
    buttons   Object with buttons {id: 'label', ...} (optional, default buttons for certain alert type or {ok: 'Ok'})
    width     Alert width (optional, 'auto')
    maxHeight Content maximum height (optional, 160)
    draggable Drag&drop(requires jQuery-UI)
    callback  Function that will be called after button press. Parameter value will be pressed
              button id or false in case of closing alert by click on close icon. (optional)
    pie       Determines whether to use PIE.htc directly or use its PHP wrapper('htc', 'php') (optional, 'htc')


Setup:

    $.alert.setup({settings});

Settings:

    defaults           Default alert settings
    defaults.container Default container for alert placement
    defaults.type      Default alert type('info', 'confirm', 'warning', 'error', 'prompt')
    defaults.cancel    Default cancelable setting
    defaults.icon      Default icon setting(icon name or false)
    defaults.content   Default alert content
    defaults.align     Default content alignment('left', 'center', 'right')
    defaults.buttons   Default object with buttons {id: 'label', ...}
    defaults.width     Default alert width
    defaults.maxHeight Default content maximum height
    defaults.draggable Default drag&drop setting
    defaults.callback  Default callback
    defaults.pie       Use PIE.htc directly or use its PHP wrapper('htc', 'php') default setting
    types              Alert types {'typename': {settings}, ...} (optional)

Changelog:

    Version 1.2

    - Maximum height setting
    - Scrollbar

    Version 1.1

    - Compatible with jQuery 1.9+
    - New alert type "prompt"
    - Button cycling

*/

/**
 * @fileoverview Smart Alert
 * @version      1.2
 * @author       Lukas Prvy
 * @requires     jQuery
 * @requires     jQuery-UI draggable module
 * @see          http://www.codeblog.cz/alert/doc
 */

/**
 * @namespace jQuery library
 * @name      jQuery
 */

(function($) {

    /** @namespace Setup */
    var setup = {

        /** Default settings */
        defaults: {
            container: 'body',
            type: 'info',
            title: '&nbsp;',
            cancel: true,
            icon: 'info',
            content: '&nbsp;',
            align: 'left',
            buttons: {ok: 'Ok'},
            active: null,
            width: 'auto',
            maxHeight: 160,
            draggable: true,
            callback: $.noop,
            pie: 'htc'
        },

        /** Alert types */
        types: {
            info: {
                title: 'Info',
                icon: 'info',
                buttons: {ok: 'Ok'}
            },
            confirm: {
                title: 'Confirm',
                icon: 'confirm',
                buttons: {
                    yes: 'Yes',
                    no: 'No'
                }
            },
            warning: {
                title: 'Warning',
                icon: 'warning',
                buttons: {ok: 'Ok'}
            },
            error: {
                title: 'Error',
                icon: 'error',
                buttons: {ok: 'Ok'}
            },
            prompt: {
                title: 'Prompt',
                icon: 'prompt',
                buttons: {
                    ok: 'Ok',
                    cancel: 'Cancel'
                }
            }
        }
    };

    /** @namespace Alert settings */
    var settings = {};

    /** Is alert open? */
    var open = false;

    /** Alert container */
    var $container = $([]);

    /** Alert box */
    var $box = $([]);

    /** Images preload */
    function preload() {

        // List of images to preload
        var images = [
            'close.png',
            'info.png',
            'confirm.png',
            'warning.png',
            'error.png'
        ];

        // Normal/retina display
        var retina = window.devicePixelRatio && devicePixelRatio == 2;
        images = $.map(images, function(image) {
            return (retina ? 'x2' : 'img') + '/' + image;
        });

        // Try to detect theme path. When not successfull exit function
        var $theme = $('link[href*="alert/themes/"]');
        if (!$theme.length)
            return;
        var path = $theme.attr('href');
        path = path.substr(0, path.lastIndexOf('/') + 1);

        // Preload
        $.each(images, function(id, image) {
            var $image = $('<img />').attr('src', path + image);
        });
    }

    /**
     * Merge settings as follows: (global defaults <= alert type settings) <= passed options
     *
     * @param   {Object} options Alert settings
     *
     * @returns {Object}         Defaults extended by passed settings
     */
    function options() {
        var options = {};
        if (arguments.length) {

            // Object with settings
            if ($.isPlainObject(arguments[0]))
                options = arguments[0];

            // Shortcut call ([type], [title], content, [buttons], [callback])
            else {
                var args = Array.prototype.slice.call(arguments);
                if ($.isFunction(args[args.length - 1]))
                    options.callback = args.pop();
                if ($.isPlainObject(args[args.length - 1]))
                    options.buttons = args.pop();
                if (args.length == 3) {
                    options.type = args[0];
                    options.title = args[1];
                    options.content = args[2];
                }
                else if (args.length == 2) {
                    if (setup.types[args[0]])
                        options.type = args[0];
                    else
                        options.title = args[0];
                    options.content = args[1];
                }
                else
                    options.content = args[0];
            }
        }

        // Alert type
        if (!setup.types[options.type])
            options.type = setup.defaults.type;

        // Merge settings
        options = $.extend({}, setup.defaults, setup.types[options.type], options);

        // Active button
        if (!options.active || !options.buttons[options.active])
            for (var id in options.buttons) {
                options.active = id;
                break;
            }

        // Drag&drop
        if (typeof $.fn.draggable == 'undefined')
            options.draggable = false;

        // Title
        options.title = $.trim(options.title) || setup.types[options.type].title;

        // Prompt
        if (options.type == 'prompt')
            options.content += [
                '<input',
                '    id="smartAlertPrompt"',
                options.content
                ? '    class="smartAlertMargin"'
                : '',
                '    type="text"',
                '/>'
            ].join('');

        return options;
    }

    /** Render alert */
    function render() {

        // Prepare buttons
        var buttons = [];
        $.each(settings.buttons, function(id, text) {
            var active = id == settings.active ? ' smartAlertActive' : '';
            buttons.push([
                '<div',
                '    class="smartAlertButton' + active + '"',
                '    data-id="' + id + '"',
                '>',
                text,
                '</div>'
            ].join(''));
        });

        // Render
        var version = parseInt($.browser.version);
        $([

            // Overlay
            '<div',
            '    id="smartAlert"',

            // Settings
            '    data-type="' + settings.type + '"',
            '    data-cancel="' + settings.cancel + '"',
            '    data-icon="' + settings.icon + '"',
            '    data-align="' + settings.align + '"',
            '    data-draggable="' + settings.draggable + '"',
            '    data-pie="' + settings.pie + '"',

            // Browser sniffing
            $.browser.chrome ? 'data-chrome="' + version + '"' : '',
            $.browser.webkit ? 'data-webkit="' + version + '"' : '',
            $.browser.mozilla ? 'data-mozilla="' + version + '"' : '',
            $.browser.opera ? 'data-opera="' + version + '"' : '',
            $.browser.msie ? 'data-ie="' + version + '"' : '',
            '>',

            // Box
            '    <div id="smartAlertBox">',

            // Header
            '        <div id="smartAlertHeader">',
            '            <div id="smartAlertTitle">',
            settings.title,
            '            </div>',
            '            <div id="smartAlertClose"></div>',
            '        </div>',

            // Body
            $.browser.msie && version == 7
            ? [
                '        <table id="smartAlertBody">',
                '            <tbody>',
                '                <tr>',
                '                    <td id="smartAlertIcon"></td>',
                '                    <td>',
                '                        <div id="smartAlertContent">',
                '                            <div id="smartAlertScroll">',
                settings.content,
                '                            </div>',
                '                        </div>',
                '                    </td>',
                '                </tr>',
                '            </tbody>',
                '        </table>'
            ].join('')
            : [
                '        <div id="smartAlertBody">',
                '            <div id="smartAlertIcon"></div>',
                '            <div id="smartAlertContent">',
                '                <div id="smartAlertScroll">',
                settings.content,
                '                </div>',
                '            </div>',
                '        </div>'
            ].join(''),

            // Buttons
            '        <div id="smartAlertButtons">',
            buttons.join(''),
            '        </div>',
            '    </div>',
            '</div>'
        ].join('')).appendTo(settings.container);

        // Select DOM objects for later use
        $container = $('#smartAlert');
        $box = $('#smartAlertBox');

        // Set box width
        $box.width(settings.width);
    }

    /** Center alert */
    function center() {
        $box.css({
            top: Math.round(
                $container.height() / 2 -
                $box.outerHeight() / 2 -
                parseInt($box.css('margin-top'))
            ),
            left: Math.round(
                $container.width() / 2 -
                $box.outerWidth() / 2 -
                parseInt($box.css('margin-left'))
            )
        });
    }

    /**
     * Cycle active button
     *
     * @param {Number} shift Direction
     */
    function cycle(shift) {
        var $buttons = $('.smartAlertButton', $container);
        if ($buttons.length <= 1)
            return true;
        var $active = $buttons.filter('.smartAlertActive');
        var last = $buttons.length - 1;
        var next = $active.index() + shift;
        $buttons
            .removeClass('smartAlertActive')
            .eq(next > last ? 0 : (next < 0 ? last : next))
            .addClass('smartAlertActive');
        return false;
    }

    /**
     * Close alert
     *
     * @param {String|Function} [button=false] Button used to close alert or callback that will
     *                                         be executed after closing in place of settings.callback
     *
     */
    function close(button, value) {
        if (!open)
            return;
        $container
            .stop(true, true)
            .fadeOut(250, function() {
                $container.remove();
                open = false;
                if ($.isFunction(button))
                    button();
                else
                    settings.callback(button || false, value || '');
            });
    }

    /**
     * PIE reset
     *
     * @see http://css3pie.com
     */
    function resetPie() {
        if (!($.browser.msie && $.browser.version <= 9))
            return;

        // Detect path
        var $styles = $('link[href*="alert/css/"]');
        var path = $styles.attr('href');
        path = path.substr(0, path.lastIndexOf('/') + 1);

        // Reset
        $('*', $container).each(function() {
            var $element = $(this);
            if ($element.css('behavior') != 'none') {
                if ($.browser.version < 9)
                    $element.css('behavior', 'none');
                $element.css('behavior', 'url(' + path + 'PIE.' + settings.pie + ')');
            }
        });
    }

    /** Initialization */
    function init() {

        // Preload images
        preload();

        // Set event handlers
        $(document)

            // Keyboard
            .on({
                keydown: function(event) {
                    if (open) {
                        switch (event.which) {

                            // Close alert with ESC
                            case 27:
                                if (settings.cancel)
                                    close();
                                break;

                            // Cycle buttons
                            case 9:
                                return cycle(1);
                                break;

                            // Press button
                            case 13:
                                $('.smartAlertActive', $container).addClass('smartAlertClick');
                                break;
                            default:
                                return true;
                        }
                        return false;
                    }
                },
                keyup: function(event) {

                    // Click button
                    if (open && event.which == 13) {
                        $('.smartAlertActive', $container)
                            .removeClass('smartAlertClick')
                            .trigger('click');
                        return false;
                    }
                }
            })

            // Close alert after click on close
            .on('click', '#smartAlertClose', function() {
                close();
            })

            // Handle button click
            .on({
                mousedown: function() {
                    $(this).addClass('smartAlertClick');
                },
                'mouseup mouseleave': function() {
                    $(this).removeClass('smartAlertClick');
                },
                click: function() {
                    var id = $(this).data('id');
                    var value = settings.type == 'prompt' ? $('#smartAlertPrompt').val() : '';
                    close(id, value);
                }
            }, '.smartAlertButton')

        // Center box on window resize
        $(window).on('resize', function() {
            if (open && $(settings.container).is('body'))
                center();
        });
    }

    /**
     * @namespace jQuery Alert 1.0
     * @memberOf  jQuery
     */
    jQuery.alert = {

        /**
         * Open alert
         *
         * @param {Object|String}  options                           Alert settings or content
         * @param {String|Object}  [options.container='body']        Container for alert placement
         * @param {String}         [options.type='info']             Alert type('info', 'confirm', 'warning', 'error', 'prompt')
         * @param {String}         [options.title=default title]     Alert title
         * @param {Boolean}        [options.cancel=true]             Show close icon(alert can be then closed also with ESC)
         * @param {String|Boolean} [options.icon='info']             Alert icon(one of icons defined in theme stylesheet or false)
         * @param {String}         [options.content]                 Alert content
         * @param {String}         [options.align='left']            Content alignment('left', 'center', 'right')
         * @param {Object}         [options.buttons=default buttons] Object with buttons {id: 'label', ...}
         * @param {Number}         [options.width='auto']            Alert width
         * @param {Number}         [options.maxHeight=160]           Content maximum height
         * @param {Boolean}        [options.draggable=true]          Drag&drop
         * @param {Function}       [options.callback]                Callback
         * @param {String}         [options.pie='php']               Use PIE.htc directly or use its PHP wrapper('htc', 'php')
         */
        open: function() {
            var args = arguments;
            function show() {

                // Get settings
                settings = options.apply(null, args);

                // Render alert
                render();

                // Set drag&drop
                if (settings.draggable)
                    $box.draggable({
                        containment: '#smartAlert',
                        handle: '#smartAlertHeader'
                    });

                // Initialize scrollbar
                $container
                    .css('visibility', 'visible')
                    .find('#smartAlertScroll')
                    .css('max-height', settings.maxHeight)
                    .mCustomScrollbar()
                    .find('.mCSB_container')
                    .attr('id', 'smartAlertScrollArea')
                    .end()
                    .find('.mCSB_draggerRail')
                    .attr('id', 'smartAlertScrollBar')
                    .end()
                    .find('.mCSB_dragger_bar')
                    .attr('id', 'smartAlertScrollDrag');
                center();

                // Show alert
                $container
                    .hide()
                    .fadeIn(250, function() {
                        if (settings.type == 'prompt')
                            $('#smartAlertPrompt').focus();
                    });
                resetPie();
                open = true;
            };
            if (open)
                close(show)
            else
                show();
        },

        /**
         * Set default settings and/or alert types
         *
         * @param   {Object}         options                         Settings
         * @param   {Object}         [options.defaults]              Default alert settings
         * @param   {String|Object}  [options.defaults.container]    Default container for alert placement
         * @param   {String}         [options.defaults.type]         Default alert type('info', 'confirm', 'warning', 'error', 'prompt')
         * @param   {String}         [options.defaults.title]        Default alert title
         * @param   {Boolean}        [options.defaults.cancel]       Default cancelable setting
         * @param   {String|Boolean} [options.defaults.content]      Alert icon(one of icons defined in theme stylesheet or false)
         * @param   {String}         [options.defaults.content]      Default alert content
         * @param   {String}         [options.defaults.align]        Default content alignment('left', 'center', 'right')
         * @param   {Object}         [options.defaults.buttons]      Default object with buttons {id: 'text', ...}
         * @param   {Number}         [options.defaults.width]        Default alert width
         * @param   {Number}         [options.defaults.maxHeight]    Default content maximum height
         * @param   {Boolean}        [options.defaults.draggable]    Default drag&drop setting
         * @param   {Function}       [options.defaults.callback]     Default callback
         * @param   {String}         [options.defaults.pie]          Use PIE.htc directly or use its PHP wrapper('htc', 'php')
         * @param   {Object}         [options.types]                 Alert types
         * @param   {Object}         [options.types.info]            Info alert
         * @param   {String}         [options.types.info.title]      Info alert title
         * @param   {Object}         [options.types.info.buttons]    Info alert buttons
         * @param   {Object}         [options.types.confirm]         Confirm alert
         * @param   {String}         [options.types.confirm.title]   Confirm alert title
         * @param   {Object}         [options.types.confirm.buttons] Confirm alert buttons
         * @param   {Object}         [options.types.warning]         Warning alert
         * @param   {String}         [options.types.warning.title]   Warning alert title
         * @param   {Object}         [options.types.warning.buttons] Warning alert buttons
         * @param   {Object}         [options.types.error]           Error alert
         * @param   {String}         [options.types.error.title]     Error alert title
         * @param   {Object}         [options.types.error.buttons]   Error alert buttons
         *
         * @returns {Object}                                         Current settings
         */
        setup: function(options) {
            if ($.isPlainObject(options))
                $.extend(true, setup, options);
            return $.extend(true, {}, setup);
        }
    };

    // jQuery.browser replacement
    if (!jQuery.browser)
        (function() {
            var matched, browser;
            jQuery.uaMatch = function(ua) {
                ua = ua.toLowerCase();
                var match =
                    /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
                    /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
                    /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
                    /(msie) ([\w.]+)/.exec( ua ) ||
                    ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
                    [];
                return {
                    browser: match[ 1 ] || "",
                    version: match[ 2 ] || "0"
                };
            };
            matched = jQuery.uaMatch(navigator.userAgent);
            browser = {};
            if (matched.browser) {
                browser[ matched.browser ] = true;
                browser.version = matched.version;
            }
            if (browser.chrome)
                browser.webkit = true;
            else if (browser.webkit)
                browser.safari = true;
            jQuery.browser = browser;
        })();

    // Initialization
    $(init);
})(jQuery);

// Mousewheel plugin
(function(a){function d(b){var c=b||window.event,d=[].slice.call(arguments,1),e=0,f=!0,g=0,h=0;return b=a.event.fix(c),b.type="mousewheel",c.wheelDelta&&(e=c.wheelDelta/120),c.detail&&(e=-c.detail/3),h=e,c.axis!==undefined&&c.axis===c.HORIZONTAL_AXIS&&(h=0,g=-1*e),c.wheelDeltaY!==undefined&&(h=c.wheelDeltaY/120),c.wheelDeltaX!==undefined&&(g=-1*c.wheelDeltaX/120),d.unshift(b,e,g,h),(a.event.dispatch||a.event.handle).apply(this,d)}var b=["DOMMouseScroll","mousewheel"];if(a.event.fixHooks)for(var c=b.length;c;)a.event.fixHooks[b[--c]]=a.event.mouseHooks;a.event.special.mousewheel={setup:function(){if(this.addEventListener)for(var a=b.length;a;)this.addEventListener(b[--a],d,!1);else this.onmousewheel=d},teardown:function(){if(this.removeEventListener)for(var a=b.length;a;)this.removeEventListener(b[--a],d,!1);else this.onmousewheel=null}},a.fn.extend({mousewheel:function(a){return a?this.bind("mousewheel",a):this.trigger("mousewheel")},unmousewheel:function(a){return this.unbind("mousewheel",a)}})})(jQuery);

// Malihu custom scrollbar
(function(c){var b={init:function(e){var f={set_width:false,set_height:false,horizontalScroll:false,scrollInertia:950,mouseWheel:true,mouseWheelPixels:"auto",autoDraggerLength:true,autoHideScrollbar:false,scrollButtons:{enable:false,scrollType:"continuous",scrollSpeed:"auto",scrollAmount:40},advanced:{updateOnBrowserResize:true,updateOnContentResize:false,autoExpandHorizontalScroll:false,autoScrollOnFocus:true,normalizeMouseWheelDelta:false},contentTouchScroll:true,callbacks:{onScrollStart:function(){},onScroll:function(){},onTotalScroll:function(){},onTotalScrollBack:function(){},onTotalScrollOffset:0,onTotalScrollBackOffset:0,whileScrolling:function(){}},theme:"light"},e=c.extend(true,f,e);return this.each(function(){var m=c(this);if(e.set_width){m.css("width",e.set_width)}if(e.set_height){m.css("height",e.set_height)}if(!c(document).data("mCustomScrollbar-index")){c(document).data("mCustomScrollbar-index","1")}else{var t=parseInt(c(document).data("mCustomScrollbar-index"));c(document).data("mCustomScrollbar-index",t+1)}m.wrapInner("<div class='mCustomScrollBox mCS-"+e.theme+"' id='mCSB_"+c(document).data("mCustomScrollbar-index")+"' style='position:relative; height:100%; overflow:hidden; max-width:100%;' />").addClass("mCustomScrollbar _mCS_"+c(document).data("mCustomScrollbar-index"));var g=m.children(".mCustomScrollBox");if(e.horizontalScroll){g.addClass("mCSB_horizontal").wrapInner("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />");var k=g.children(".mCSB_h_wrapper");k.wrapInner("<div class='mCSB_container' style='position:absolute; left:0;' />").children(".mCSB_container").css({width:k.children().outerWidth(),position:"relative"}).unwrap()}else{g.wrapInner("<div class='mCSB_container' style='position:relative; top:0;' />")}var o=g.children(".mCSB_container");if(c.support.touch){o.addClass("mCS_touch")}o.after("<div class='mCSB_scrollTools' style='position:absolute;'><div class='mCSB_draggerContainer'><div class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' style='position:relative;'></div></div><div class='mCSB_draggerRail'></div></div></div>");var l=g.children(".mCSB_scrollTools"),h=l.children(".mCSB_draggerContainer"),q=h.children(".mCSB_dragger");if(e.horizontalScroll){q.data("minDraggerWidth",q.width())}else{q.data("minDraggerHeight",q.height())}if(e.scrollButtons.enable){if(e.horizontalScroll){l.prepend("<a class='mCSB_buttonLeft' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonRight' oncontextmenu='return false;'></a>")}else{l.prepend("<a class='mCSB_buttonUp' oncontextmenu='return false;'></a>").append("<a class='mCSB_buttonDown' oncontextmenu='return false;'></a>")}}g.bind("scroll",function(){if(!m.is(".mCS_disabled")){g.scrollTop(0).scrollLeft(0)}});m.data({mCS_Init:true,mCustomScrollbarIndex:c(document).data("mCustomScrollbar-index"),horizontalScroll:e.horizontalScroll,scrollInertia:e.scrollInertia,scrollEasing:"mcsEaseOut",mouseWheel:e.mouseWheel,mouseWheelPixels:e.mouseWheelPixels,autoDraggerLength:e.autoDraggerLength,autoHideScrollbar:e.autoHideScrollbar,scrollButtons_enable:e.scrollButtons.enable,scrollButtons_scrollType:e.scrollButtons.scrollType,scrollButtons_scrollSpeed:e.scrollButtons.scrollSpeed,scrollButtons_scrollAmount:e.scrollButtons.scrollAmount,autoExpandHorizontalScroll:e.advanced.autoExpandHorizontalScroll,autoScrollOnFocus:e.advanced.autoScrollOnFocus,normalizeMouseWheelDelta:e.advanced.normalizeMouseWheelDelta,contentTouchScroll:e.contentTouchScroll,onScrollStart_Callback:e.callbacks.onScrollStart,onScroll_Callback:e.callbacks.onScroll,onTotalScroll_Callback:e.callbacks.onTotalScroll,onTotalScrollBack_Callback:e.callbacks.onTotalScrollBack,onTotalScroll_Offset:e.callbacks.onTotalScrollOffset,onTotalScrollBack_Offset:e.callbacks.onTotalScrollBackOffset,whileScrolling_Callback:e.callbacks.whileScrolling,bindEvent_scrollbar_drag:false,bindEvent_content_touch:false,bindEvent_scrollbar_click:false,bindEvent_mousewheel:false,bindEvent_buttonsContinuous_y:false,bindEvent_buttonsContinuous_x:false,bindEvent_buttonsPixels_y:false,bindEvent_buttonsPixels_x:false,bindEvent_focusin:false,bindEvent_autoHideScrollbar:false,mCSB_buttonScrollRight:false,mCSB_buttonScrollLeft:false,mCSB_buttonScrollDown:false,mCSB_buttonScrollUp:false});if(e.horizontalScroll){if(m.css("max-width")!=="none"){if(!e.advanced.updateOnContentResize){e.advanced.updateOnContentResize=true}}}else{if(m.css("max-height")!=="none"){var s=false,r=parseInt(m.css("max-height"));if(m.css("max-height").indexOf("%")>=0){s=r,r=m.parent().height()*s/100}m.css("overflow","hidden");g.css("max-height",r)}}m.mCustomScrollbar("update");if(e.advanced.updateOnBrowserResize){var i,j=c(window).width(),u=c(window).height();c(window).bind("resize."+m.data("mCustomScrollbarIndex"),function(){if(i){clearTimeout(i)}i=setTimeout(function(){if(!m.is(".mCS_disabled")&&!m.is(".mCS_destroyed")){var w=c(window).width(),v=c(window).height();if(j!==w||u!==v){if(m.css("max-height")!=="none"&&s){g.css("max-height",m.parent().height()*s/100)}m.mCustomScrollbar("update");j=w;u=v}}},150)})}if(e.advanced.updateOnContentResize){var p;if(e.horizontalScroll){var n=o.outerWidth()}else{var n=o.outerHeight()}p=setInterval(function(){if(e.horizontalScroll){if(e.advanced.autoExpandHorizontalScroll){o.css({position:"absolute",width:"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({width:o.outerWidth(),position:"relative"}).unwrap()}var v=o.outerWidth()}else{var v=o.outerHeight()}if(v!=n){m.mCustomScrollbar("update");n=v}},300)}})},update:function(){var n=c(this),k=n.children(".mCustomScrollBox"),q=k.children(".mCSB_container");q.removeClass("mCS_no_scrollbar");n.removeClass("mCS_disabled mCS_destroyed");k.scrollTop(0).scrollLeft(0);var y=k.children(".mCSB_scrollTools"),o=y.children(".mCSB_draggerContainer"),m=o.children(".mCSB_dragger");if(n.data("horizontalScroll")){var A=y.children(".mCSB_buttonLeft"),t=y.children(".mCSB_buttonRight"),f=k.width();if(n.data("autoExpandHorizontalScroll")){q.css({position:"absolute",width:"auto"}).wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />").css({width:q.outerWidth(),position:"relative"}).unwrap()}var z=q.outerWidth()}else{var w=y.children(".mCSB_buttonUp"),g=y.children(".mCSB_buttonDown"),r=k.height(),i=q.outerHeight()}if(i>r&&!n.data("horizontalScroll")){y.css("display","block");var s=o.height();if(n.data("autoDraggerLength")){var u=Math.round(r/i*s),l=m.data("minDraggerHeight");if(u<=l){m.css({height:l})}else{if(u>=s-10){var p=s-10;m.css({height:p})}else{m.css({height:u})}}m.children(".mCSB_dragger_bar").css({"line-height":m.height()+"px"})}var B=m.height(),x=(i-r)/(s-B);n.data("scrollAmount",x).mCustomScrollbar("scrolling",k,q,o,m,w,g,A,t);var D=Math.abs(q.position().top);n.mCustomScrollbar("scrollTo",D,{scrollInertia:0})}else{if(z>f&&n.data("horizontalScroll")){y.css("display","block");var h=o.width();if(n.data("autoDraggerLength")){var j=Math.round(f/z*h),C=m.data("minDraggerWidth");if(j<=C){m.css({width:C})}else{if(j>=h-10){var e=h-10;m.css({width:e})}else{m.css({width:j})}}}var v=m.width(),x=(z-f)/(h-v);n.data("scrollAmount",x).mCustomScrollbar("scrolling",k,q,o,m,w,g,A,t);var D=Math.abs(q.position().left);n.mCustomScrollbar("scrollTo",D,{scrollInertia:0})}else{k.unbind("mousewheel focusin");if(n.data("horizontalScroll")){m.add(q).css("left",0)}else{m.add(q).css("top",0)}y.css("display","none");q.addClass("mCS_no_scrollbar");n.data({bindEvent_mousewheel:false,bindEvent_focusin:false})}}},scrolling:function(h,p,m,j,w,e,A,v){var k=c(this);if(!k.data("bindEvent_scrollbar_drag")){var n,o;if(c.support.msPointer){j.bind("MSPointerDown",function(H){H.preventDefault();k.data({on_drag:true});j.addClass("mCSB_dragger_onDrag");var G=c(this),J=G.offset(),F=H.originalEvent.pageX-J.left,I=H.originalEvent.pageY-J.top;if(F<G.width()&&F>0&&I<G.height()&&I>0){n=I;o=F}});c(document).bind("MSPointerMove."+k.data("mCustomScrollbarIndex"),function(H){H.preventDefault();if(k.data("on_drag")){var G=j,J=G.offset(),F=H.originalEvent.pageX-J.left,I=H.originalEvent.pageY-J.top;D(n,o,I,F)}}).bind("MSPointerUp."+k.data("mCustomScrollbarIndex"),function(x){x.preventDefault();k.data({on_drag:false});j.removeClass("mCSB_dragger_onDrag")})}else{j.bind("mousedown touchstart",function(H){H.preventDefault();H.stopImmediatePropagation();var G=c(this),K=G.offset(),F,J;if(H.type==="touchstart"){var I=H.originalEvent.touches[0]||H.originalEvent.changedTouches[0];F=I.pageX-K.left;J=I.pageY-K.top}else{k.data({on_drag:true});j.addClass("mCSB_dragger_onDrag");F=H.pageX-K.left;J=H.pageY-K.top}if(F<G.width()&&F>0&&J<G.height()&&J>0){n=J;o=F}}).bind("touchmove",function(H){H.preventDefault();H.stopImmediatePropagation();var K=H.originalEvent.touches[0]||H.originalEvent.changedTouches[0],G=c(this),J=G.offset(),F=K.pageX-J.left,I=K.pageY-J.top;D(n,o,I,F)});c(document).bind("mousemove."+k.data("mCustomScrollbarIndex"),function(H){H.preventDefault();if(k.data("on_drag")){var G=j,J=G.offset(),F=H.pageX-J.left,I=H.pageY-J.top;D(n,o,I,F)}}).bind("mouseup."+k.data("mCustomScrollbarIndex"),function(x){x.preventDefault();k.data({on_drag:false});j.removeClass("mCSB_dragger_onDrag")})}k.data({bindEvent_scrollbar_drag:true})}function D(G,H,I,F){if(k.data("horizontalScroll")){k.mCustomScrollbar("scrollTo",(j.position().left-(H))+F,{moveDragger:true,trigger:"internal"})}else{k.mCustomScrollbar("scrollTo",(j.position().top-(G))+I,{moveDragger:true,trigger:"internal"})}}if(c.support.touch&&k.data("contentTouchScroll")){if(!k.data("bindEvent_content_touch")){var l,B,r,s,u,C,E;p.bind("touchstart",function(x){x.stopImmediatePropagation();l=x.originalEvent.touches[0]||x.originalEvent.changedTouches[0];B=c(this);r=B.offset();u=l.pageX-r.left;s=l.pageY-r.top;C=s;E=u});p.bind("touchmove",function(x){x.preventDefault();x.stopImmediatePropagation();l=x.originalEvent.touches[0]||x.originalEvent.changedTouches[0];B=c(this).parent();r=B.offset();u=l.pageX-r.left;s=l.pageY-r.top;if(k.data("horizontalScroll")){k.mCustomScrollbar("scrollTo",E-u,{trigger:"internal"})}else{k.mCustomScrollbar("scrollTo",C-s,{trigger:"internal"})}})}}if(!k.data("bindEvent_scrollbar_click")){m.bind("click",function(F){var x=(F.pageY-m.offset().top)*k.data("scrollAmount"),y=c(F.target);if(k.data("horizontalScroll")){x=(F.pageX-m.offset().left)*k.data("scrollAmount")}if(y.hasClass("mCSB_draggerContainer")||y.hasClass("mCSB_draggerRail")){k.mCustomScrollbar("scrollTo",x,{trigger:"internal",scrollEasing:"draggerRailEase"})}});k.data({bindEvent_scrollbar_click:true})}if(k.data("mouseWheel")){if(!k.data("bindEvent_mousewheel")){h.bind("mousewheel",function(H,J){var G,F=k.data("mouseWheelPixels"),x=Math.abs(p.position().top),I=j.position().top,y=m.height()-j.height();if(k.data("normalizeMouseWheelDelta")){if(J<0){J=-1}else{J=1}}if(F==="auto"){F=100+Math.round(k.data("scrollAmount")/2)}if(k.data("horizontalScroll")){I=j.position().left;y=m.width()-j.width();x=Math.abs(p.position().left)}if((J>0&&I!==0)||(J<0&&I!==y)){H.preventDefault();H.stopImmediatePropagation()}G=x-(J*F);k.mCustomScrollbar("scrollTo",G,{trigger:"internal"})});k.data({bindEvent_mousewheel:true})}}if(k.data("scrollButtons_enable")){if(k.data("scrollButtons_scrollType")==="pixels"){if(k.data("horizontalScroll")){v.add(A).unbind("mousedown touchstart MSPointerDown mouseup MSPointerUp mouseout MSPointerOut touchend",i,g);k.data({bindEvent_buttonsContinuous_x:false});if(!k.data("bindEvent_buttonsPixels_x")){v.bind("click",function(x){x.preventDefault();q(Math.abs(p.position().left)+k.data("scrollButtons_scrollAmount"))});A.bind("click",function(x){x.preventDefault();q(Math.abs(p.position().left)-k.data("scrollButtons_scrollAmount"))});k.data({bindEvent_buttonsPixels_x:true})}}else{e.add(w).unbind("mousedown touchstart MSPointerDown mouseup MSPointerUp mouseout MSPointerOut touchend",i,g);k.data({bindEvent_buttonsContinuous_y:false});if(!k.data("bindEvent_buttonsPixels_y")){e.bind("click",function(x){x.preventDefault();q(Math.abs(p.position().top)+k.data("scrollButtons_scrollAmount"))});w.bind("click",function(x){x.preventDefault();q(Math.abs(p.position().top)-k.data("scrollButtons_scrollAmount"))});k.data({bindEvent_buttonsPixels_y:true})}}function q(x){if(!j.data("preventAction")){j.data("preventAction",true);k.mCustomScrollbar("scrollTo",x,{trigger:"internal"})}}}else{if(k.data("horizontalScroll")){v.add(A).unbind("click");k.data({bindEvent_buttonsPixels_x:false});if(!k.data("bindEvent_buttonsContinuous_x")){v.bind("mousedown touchstart MSPointerDown",function(y){y.preventDefault();var x=z();k.data({mCSB_buttonScrollRight:setInterval(function(){k.mCustomScrollbar("scrollTo",Math.abs(p.position().left)+x,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var i=function(x){x.preventDefault();clearInterval(k.data("mCSB_buttonScrollRight"))};v.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",i);A.bind("mousedown touchstart MSPointerDown",function(y){y.preventDefault();var x=z();k.data({mCSB_buttonScrollLeft:setInterval(function(){k.mCustomScrollbar("scrollTo",Math.abs(p.position().left)-x,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var g=function(x){x.preventDefault();clearInterval(k.data("mCSB_buttonScrollLeft"))};A.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",g);k.data({bindEvent_buttonsContinuous_x:true})}}else{e.add(w).unbind("click");k.data({bindEvent_buttonsPixels_y:false});if(!k.data("bindEvent_buttonsContinuous_y")){e.bind("mousedown touchstart MSPointerDown",function(y){y.preventDefault();var x=z();k.data({mCSB_buttonScrollDown:setInterval(function(){k.mCustomScrollbar("scrollTo",Math.abs(p.position().top)+x,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var t=function(x){x.preventDefault();clearInterval(k.data("mCSB_buttonScrollDown"))};e.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",t);w.bind("mousedown touchstart MSPointerDown",function(y){y.preventDefault();var x=z();k.data({mCSB_buttonScrollUp:setInterval(function(){k.mCustomScrollbar("scrollTo",Math.abs(p.position().top)-x,{trigger:"internal",scrollEasing:"easeOutCirc"})},17)})});var f=function(x){x.preventDefault();clearInterval(k.data("mCSB_buttonScrollUp"))};w.bind("mouseup touchend MSPointerUp mouseout MSPointerOut",f);k.data({bindEvent_buttonsContinuous_y:true})}}function z(){var x=k.data("scrollButtons_scrollSpeed");if(k.data("scrollButtons_scrollSpeed")==="auto"){x=Math.round((k.data("scrollInertia")+100)/40)}return x}}}if(k.data("autoScrollOnFocus")){if(!k.data("bindEvent_focusin")){h.bind("focusin",function(){h.scrollTop(0).scrollLeft(0);var x=c(document.activeElement);if(x.is("input,textarea,select,button,a[tabindex],area,object")){var G=p.position().top,y=x.position().top,F=h.height()-x.outerHeight();if(k.data("horizontalScroll")){G=p.position().left;y=x.position().left;F=h.width()-x.outerWidth()}if(G+y<0||G+y>F){k.mCustomScrollbar("scrollTo",y,{trigger:"internal"})}}});k.data({bindEvent_focusin:true})}}if(k.data("autoHideScrollbar")){if(!k.data("bindEvent_autoHideScrollbar")){h.bind("mouseenter",function(x){h.addClass("mCS-mouse-over");d.showScrollbar.call(h.children(".mCSB_scrollTools"))}).bind("mouseleave touchend",function(x){h.removeClass("mCS-mouse-over");if(x.type==="mouseleave"){d.hideScrollbar.call(h.children(".mCSB_scrollTools"))}});k.data({bindEvent_autoHideScrollbar:true})}}},scrollTo:function(n,u){var r=c(this),k={moveDragger:false,trigger:"external",callbacks:true,scrollInertia:r.data("scrollInertia"),scrollEasing:r.data("scrollEasing")},u=c.extend(k,u),j,i=r.children(".mCustomScrollBox"),s=i.children(".mCSB_container"),q=i.children(".mCSB_scrollTools"),h=q.children(".mCSB_draggerContainer"),t=h.children(".mCSB_dragger"),g=draggerSpeed=u.scrollInertia,m,f,l,e;r.data({mCS_trigger:u.trigger});if(r.data("mCS_Init")){u.callbacks=false}if(n||n===0){if(typeof(n)==="number"){if(u.moveDragger){j=n;if(r.data("horizontalScroll")){n=t.position().left*r.data("scrollAmount")}else{n=t.position().top*r.data("scrollAmount")}draggerSpeed=0}else{j=n/r.data("scrollAmount")}}else{if(typeof(n)==="string"){var p;if(n==="top"){p=0}else{if(n==="bottom"&&!r.data("horizontalScroll")){p=s.outerHeight()-i.height()}else{if(n==="left"){p=0}else{if(n==="right"&&r.data("horizontalScroll")){p=s.outerWidth()-i.width()}else{if(n==="first"){p=r.find(".mCSB_container").find(":first")}else{if(n==="last"){p=r.find(".mCSB_container").find(":last")}else{p=r.find(n)}}}}}}if(p.length===1){if(r.data("horizontalScroll")){n=p.position().left}else{n=p.position().top}j=n/r.data("scrollAmount")}else{j=n=p}}}if(r.data("horizontalScroll")){if(r.data("onTotalScrollBack_Offset")){f=-r.data("onTotalScrollBack_Offset")}if(r.data("onTotalScroll_Offset")){e=i.width()-s.outerWidth()+r.data("onTotalScroll_Offset")}if(j<0){j=n=0;clearInterval(r.data("mCSB_buttonScrollLeft"));if(!f){m=true}}else{if(j>=h.width()-t.width()){j=h.width()-t.width();n=i.width()-s.outerWidth();clearInterval(r.data("mCSB_buttonScrollRight"));if(!e){l=true}}else{n=-n}}d.mTweenAxis.call(this,t[0],"left",Math.round(j),draggerSpeed,u.scrollEasing);d.mTweenAxis.call(this,s[0],"left",Math.round(n),g,u.scrollEasing,{onStart:function(){if(u.callbacks&&!r.data("mCS_tweenRunning")){o("onScrollStart")}if(r.data("autoHideScrollbar")){d.showScrollbar.call(q)}},onUpdate:function(){if(u.callbacks){o("whileScrolling")}},onComplete:function(){if(u.callbacks){o("onScroll");if(m||(f&&s.position().left>=f)){o("onTotalScrollBack")}if(l||(e&&s.position().left<=e)){o("onTotalScroll")}}t.data("preventAction",false);r.data("mCS_tweenRunning",false);if(r.data("autoHideScrollbar")){if(!i.hasClass("mCS-mouse-over")){d.hideScrollbar.call(q)}}},})}else{if(r.data("onTotalScrollBack_Offset")){f=-r.data("onTotalScrollBack_Offset")}if(r.data("onTotalScroll_Offset")){e=i.height()-s.outerHeight()+r.data("onTotalScroll_Offset")}if(j<0){j=n=0;clearInterval(r.data("mCSB_buttonScrollUp"));if(!f){m=true}}else{if(j>=h.height()-t.height()){j=h.height()-t.height();n=i.height()-s.outerHeight();clearInterval(r.data("mCSB_buttonScrollDown"));if(!e){l=true}}else{n=-n}}d.mTweenAxis.call(this,t[0],"top",Math.round(j),draggerSpeed,u.scrollEasing);d.mTweenAxis.call(this,s[0],"top",Math.round(n),g,u.scrollEasing,{onStart:function(){if(u.callbacks&&!r.data("mCS_tweenRunning")){o("onScrollStart")}if(r.data("autoHideScrollbar")){d.showScrollbar.call(q)}},onUpdate:function(){if(u.callbacks){o("whileScrolling")}},onComplete:function(){if(u.callbacks){o("onScroll");if(m||(f&&s.position().top>=f)){o("onTotalScrollBack")}if(l||(e&&s.position().top<=e)){o("onTotalScroll")}}t.data("preventAction",false);r.data("mCS_tweenRunning",false);if(r.data("autoHideScrollbar")){if(!i.hasClass("mCS-mouse-over")){d.hideScrollbar.call(q)}}},})}if(r.data("mCS_Init")){r.data({mCS_Init:false})}}function o(v){this.mcs={top:s.position().top,left:s.position().left,draggerTop:t.position().top,draggerLeft:t.position().left,topPct:Math.round((100*Math.abs(s.position().top))/Math.abs(s.outerHeight()-i.height())),leftPct:Math.round((100*Math.abs(s.position().left))/Math.abs(s.outerWidth()-i.width()))};switch(v){case"onScrollStart":r.data("mCS_tweenRunning",true).data("onScrollStart_Callback").call(r,this.mcs);break;case"whileScrolling":r.data("whileScrolling_Callback").call(r,this.mcs);break;case"onScroll":r.data("onScroll_Callback").call(r,this.mcs);break;case"onTotalScrollBack":r.data("onTotalScrollBack_Callback").call(r,this.mcs);break;case"onTotalScroll":r.data("onTotalScroll_Callback").call(r,this.mcs);break}}},stop:function(){var g=c(this),e=g.children().children(".mCSB_container"),f=g.children().children().children().children(".mCSB_dragger");d.mTweenAxisStop.call(this,e[0]);d.mTweenAxisStop.call(this,f[0])},disable:function(e){var j=c(this),f=j.children(".mCustomScrollBox"),h=f.children(".mCSB_container"),g=f.children(".mCSB_scrollTools"),i=g.children().children(".mCSB_dragger");f.unbind("mousewheel focusin mouseenter mouseleave touchend");h.unbind("touchstart touchmove");if(e){if(j.data("horizontalScroll")){i.add(h).css("left",0)}else{i.add(h).css("top",0)}}g.css("display","none");h.addClass("mCS_no_scrollbar");j.data({bindEvent_mousewheel:false,bindEvent_focusin:false,bindEvent_content_touch:false,bindEvent_autoHideScrollbar:false}).addClass("mCS_disabled")},destroy:function(){var e=c(this);e.removeClass("mCustomScrollbar _mCS_"+e.data("mCustomScrollbarIndex")).addClass("mCS_destroyed").children().children(".mCSB_container").unwrap().children().unwrap().siblings(".mCSB_scrollTools").remove();c(document).unbind("mousemove."+e.data("mCustomScrollbarIndex")+" mouseup."+e.data("mCustomScrollbarIndex")+" MSPointerMove."+e.data("mCustomScrollbarIndex")+" MSPointerUp."+e.data("mCustomScrollbarIndex"));c(window).unbind("resize."+e.data("mCustomScrollbarIndex"))}},d={showScrollbar:function(){this.stop().animate({opacity:1},"fast")},hideScrollbar:function(){this.stop().animate({opacity:0},"fast")},mTweenAxis:function(g,i,h,f,o,y){var y=y||{},v=y.onStart||function(){},p=y.onUpdate||function(){},w=y.onComplete||function(){};var n=t(),l,j=0,r=g.offsetTop,s=g.style;if(i==="left"){r=g.offsetLeft}var m=h-r;q();e();function t(){if(window.performance&&window.performance.now){return window.performance.now()}else{if(window.performance&&window.performance.webkitNow){return window.performance.webkitNow()}else{if(Date.now){return Date.now()}else{return new Date().getTime()}}}}function x(){if(!j){v.call()}j=t()-n;u();if(j>=g._time){g._time=(j>g._time)?j+l-(j-g._time):j+l-1;if(g._time<j+1){g._time=j+1}}if(g._time<f){g._id=_request(x)}else{w.call()}}function u(){if(f>0){g.currVal=k(g._time,r,m,f,o);s[i]=Math.round(g.currVal)+"px"}else{s[i]=h+"px"}p.call()}function e(){l=1000/60;g._time=j+l;_request=(!window.requestAnimationFrame)?function(z){u();return setTimeout(z,0.01)}:window.requestAnimationFrame;g._id=_request(x)}function q(){if(g._id==null){return}if(!window.requestAnimationFrame){clearTimeout(g._id)}else{window.cancelAnimationFrame(g._id)}g._id=null}function k(B,A,F,E,C){switch(C){case"linear":return F*B/E+A;break;case"easeOutQuad":B/=E;return -F*B*(B-2)+A;break;case"easeInOutQuad":B/=E/2;if(B<1){return F/2*B*B+A}B--;return -F/2*(B*(B-2)-1)+A;break;case"easeOutCubic":B/=E;B--;return F*(B*B*B+1)+A;break;case"easeOutQuart":B/=E;B--;return -F*(B*B*B*B-1)+A;break;case"easeOutQuint":B/=E;B--;return F*(B*B*B*B*B+1)+A;break;case"easeOutCirc":B/=E;B--;return F*Math.sqrt(1-B*B)+A;break;case"easeOutSine":return F*Math.sin(B/E*(Math.PI/2))+A;break;case"easeOutExpo":return F*(-Math.pow(2,-10*B/E)+1)+A;break;case"mcsEaseOut":var D=(B/=E)*B,z=D*B;return A+F*(0.499999999999997*z*D+-2.5*D*D+5.5*z+-6.5*D+4*B);break;case"draggerRailEase":B/=E/2;if(B<1){return F/2*B*B*B+A}B-=2;return F/2*(B*B*B+2)+A;break}}},mTweenAxisStop:function(e){if(e._id==null){return}if(!window.requestAnimationFrame){clearTimeout(e._id)}else{window.cancelAnimationFrame(e._id)}e._id=null},rafPolyfill:function(){var f=["ms","moz","webkit","o"],e=f.length;while(--e>-1&&!window.requestAnimationFrame){window.requestAnimationFrame=window[f[e]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[f[e]+"CancelAnimationFrame"]||window[f[e]+"CancelRequestAnimationFrame"]}}};d.rafPolyfill.call();c.support.touch=!!("ontouchstart" in window);c.support.msPointer=window.navigator.msPointerEnabled;var a=("https:"==document.location.protocol)?"https:":"http:";c.event.special.mousewheel||document.write('<script src="'+a+'//cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.0.6/jquery.mousewheel.min.js"><\/script>');c.fn.mCustomScrollbar=function(e){if(b[e]){return b[e].apply(this,Array.prototype.slice.call(arguments,1))}else{if(typeof e==="object"||!e){return b.init.apply(this,arguments)}else{c.error("Method "+e+" does not exist")}}}})(jQuery);