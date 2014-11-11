(function ( $ ) {

    /**
    *
    *   @desc: Pickify plugin initializer
    *   @params: Options object
    *
    */

    $.fn.Pickify = function( options ) {

        options = ( !options || typeof options !== 'object' || options === null ) ? {} : options;

        this.each( function() {
            $(this).data( 'pickify', new Pickify( this, options) );
        });

        return this;
    };

    /**
    *
    *   @desc: Access pickify plugin on attached elements
    *
    */

    $.fn.pickify = function( ){

        var selectedElementsNum = $(this).length;

        if ( selectedElementsNum === 1 && $(this).data('pickify')) {
            return $(this).data('pickify');
        } else if ( selectedElementsNum > 1 ) {
            
            var pickifiedElements = Array();

            this.each(function(){

                if ( $(this).data('pickify') ) {
                    pickifiedElements.push({ 
                        el : this,
                        pickify : $(this).data('pickify')
                    });
                } else {
                    pickifiedElements.push({ 
                        el : this,
                        pickify : undefined
                    });
                }

            });
            return pickifiedElements;
        } else {
            return this;
        }

    };

    var defaults = {};

    /**
    *
    *   @desc: Constructor for the jQuery.Pickify(); plugin
    *   @params: DOM element, options object
    *
    */

    function Pickify( el, options ) {

        var that = this;
        var defaults = {
            startTime : '',
            timeTrigger : 1,
            triggerCallback : function(){
                console.log(this.el, 'Triggered!');
                $('#test-button').attr('disabled','disabled');
                $('#button-status').removeClass('enabled').addClass('disabled').html('Disabled');
            },
            workingHours : 24,
            dateFormat : 'll',
            timeFormat : 'HH:mm:00 a',
            lang: 'el',
            hoverTextPrefix : 'Unavailable between ',
            hoverTextSuffix : ' please select another time.',
            showClock : false, 
            jumpStop : false,
            templateSrc : '#pickify-tpl',
            dates : '.pickify-dates',
            slideBar : '.slide-bar',
            slider : '.slider',
            handle : '.handle',
            clock : '.clock',
            intervalContainer : '.intervals',
            template : null,
            html : null,
            ajax : {
                Pickify : that,
                url: 'mockServer.php',
                type: 'POST', 
                data: {},
                dataType: 'json',
                cache : false,
                beforeSend  : function(){

                },
                success     : function( response ){
                    that.data = response;
                    that.render();
                    that.showAvailability( Object.keys(response)[0] );
                    that.getFirstAvailable( true );
                },
                error       : function( jqXHR, textStatus ){
                    $.error( 'Pickify.js getRemoteData() error: ' + textStatus ); 
                    console.log( jqXHR );
                },
                complete    : function(){

                }
            }
        };

        // pickify instance settings

        this.options = $.extend({}, defaults, options || {});
        this.data = (this.options.data) ? this.options.data : null;
        this.pos = null;
        this.time = null;

        this.el = el;
        this.sliderWidget = null;
        this.dates = null;
        this.handle = null;
        this.slider = null;
        this.slideBar = null;
        this.clock = null;
        this.intervals = null;
        this.intervalContainer = null;
        this.request = null;
        this.detached = false;
        this.triggerInterval = null;
        this.deadline = ( this.options.timeTrigger && typeof this.options.timeTrigger === 'number' && this.options.timeTrigger >= 0 && $.isFunction( this.options.triggerCallback ) ) ? Math.round( new Date().getTime() / 1000 ) + ( this.options.timeTrigger * 60 ) : null;        


        if ( this.options.data ) {
            delete this.options.data;
        }

        if ( this.deadline ) {
    
            this.interval = setInterval( function() {
        
                var now = Math.round( new Date().getTime() / 1000 )
                
                if ( now === that.deadline ) {
                    clearInterval( that.interval );
                    that.options.triggerCallback.call(that)
                }

            }, 1000 );

        }

        this.render = function() {

            this.sliderWidget       = $(this.options.html).insertAfter(this.el);
            this.dates              = this.sliderWidget.find( this.options.dates );
            this.slider             = this.sliderWidget.find( this.options.slider );
            this.handle             = this.slider.children( that.options.handle );
            this.slideBar           = this.sliderWidget.find( this.options.slideBar );
            this.clock              = this.sliderWidget.find( this.options.clock );
            this.intervalContainer  = this.sliderWidget.find( this.options.intervalContainer );

            if ( this.dates.length < 1 ) {
                $.error('Unable to find dates element!');
                return;
            }

            if ( this.slideBar.length < 1  ) {
                $.error('Unable to find slideBar element!');
                return;
            }

            if ( this.slider.length < 1 ) {
                $.error('Unable to find slider element!');
                return;
            }

            if ( this.handle.length < 1 ) {
                $.error('Unable to find handle element!');
                return;
            } 

            if ( this.options.showClock && this.clock.length < 1 ) {
                $.error('Unable to find clock element!');
                return;
            }               
            
            for ( var day in this.data ) {
                this.dates.append('<li><a href="#" data-day="' + day + '">' + this.moment( day, 'X' ).lang( this.options.lang ).format( this.options.dateFormat ) + '</a></li>');
            } 

            this.dates.children().first().children().addClass('active');

            this.dates.children().children().click(function() {
                that.dates.children().children().removeClass('active');
                $(this).addClass('active');
                that.showAvailability( $(this).data('day') );
                that.getFirstAvailable( true );
            });

            var mousedown = false;
            var clickOffset = 0;
            
            this.slider.on('mousedown', function(e) {
                
                that.handle.addClass('active');

                if ( e.offsetX ){
                    clickOffset = e.offsetX;    
                } else if ( e.layerX ) {
                    clickOffset = e.layerX;
                } else {
                    clickOffset = e.pageX - that.slider.offset().left;
                }

                mousedown = true;
            });

            $(document).on('mouseup', function(e) {
                that.handle.removeClass('active');
                clickOffset = 0;
                mousedown = false;
            });

            $(document).on('mousemove', function(e) {

                if ( !mousedown || that.calculating  || that.detached ) {
                    return;
                }

                that.calculating = true;

                var mins = that.options.workingHours * 60 - 1; // -1 in order to prevent 24:00 bug
                var w = that.slideBar.width() - that.slider.outerWidth();
                var ratio = mins / w;

                var start = that.slideBar.offset().left;
                var end = parseInt( start + that.slideBar.width() - that.slider.outerWidth() );
                var pos;
                            
                if ( e.pageX >=  start && e.pageX <= end) {
                    pos = e.pageX - start;
                } else if ( e.pageX < start) {
                    pos = 0;
                } else if ( e.pageX > end ) {
                    pos = that.slideBar.width() - that.slider.outerWidth();
                }

                var result = Math.round(pos * ratio);            
                var hours = Math.floor(result / 60); 
                var minutes = Math.floor(result % 60);
                var time = ('0'  + hours).slice(-2)+':'+('0' + minutes).slice(-2);
                var collision = that.handleCollision( time );
                var formatedTime;
                
                if ( collision !== false ) {

                    that.intervals.removeClass('unavailable');
                    $(collision.el).addClass('unavailable');
                    
                    if ( e.pageX >= $(collision.el).offset().left + ( $(collision.el).width() / 2 ) ){

                        if ( collision.endTime !== false ) {

                            formatedTime = that.moment('2012/12/12 ' + collision.endTime + ':00').lang( that.options.lang ).format( that.options.timeFormat );
                            
                            that.slider.css({
                                left : collision.endPixel
                            });
                            
                            that.pos = collision.endPixel;
                            that.time = formatedTime;
                            
                            $(that.el).val( formatedTime );
                            if ( that.options.showClock ) {
                                that.clock.html( formatedTime );
                            }

                        } else if ( collision.startTime !== false ) {

                            formatedTime = that.moment('2012/12/12 ' + collision.startTime + ':00').lang( that.options.lang ).format( that.options.timeFormat );
                            
                            that.slider.css({
                                left : collision.startPixel
                            });
                            
                            that.pos = collision.startPixel;                        
                            that.time = formatedTime;
                            
                            $(that.el).val( formatedTime );
                            if ( that.options.showClock ) {
                                that.clock.html( formatedTime );
                            }

                        }

                    } else if ( e.pageX < $(collision.el).offset().left + ( $(collision.el).width() / 2 ) ) {
                        
                        if ( collision.startTime !== false ) {
                            
                            formatedTime = that.moment('2012/12/12 ' + collision.startTime + ':00').lang( that.options.lang ).format( that.options.timeFormat );
                            
                            that.slider.css({
                                left : collision.startPixel
                            });
                            
                            that.pos = collision.startPixel;
                            that.time = formatedTime;
                            
                            $(that.el).val( formatedTime );
                            if ( that.options.showClock ) {
                                that.clock.html( formatedTime );
                            }

                        } else if ( collision.endTime !== false ) {
                            
                            formatedTime = that.moment('2012/12/12 ' + collision.endTime + ':00').lang( that.options.lang ).format( that.options.timeFormat );
                            
                            that.slider.css({
                                left : collision.endPixel
                            });

                            that.pos = collision.endPixel;                        
                            that.time = formatedTime;

                            $(that.el).val( formatedTime );
                            if ( that.options.showClock ) {
                                that.clock.html( formatedTime );
                            } 

                        }
                    }

                    if ( that.options.jumpStop ) {
                        mousedown = false;    
                    }

                } else if ( collision === false ) {

                    that.intervals.removeClass('unavailable');
                    
                    formatedTime = that.moment('2012/12/12 ' + time + ':00').lang( that.options.lang ).format( that.options.timeFormat );
                    
                    that.slider.css({
                        left : pos
                    });

                    that.pos = pos;
                    that.time = formatedTime;
                    
                    $(that.el).val( formatedTime );
                    if ( that.options.showClock ) {
                        that.clock.html( formatedTime );
                    }                
                }
                    
                that.calculating = false;

            });

        };

        if ( !this.options.template && this.options.templateSrc ) {
            this.loadTemplate();
            this.compileTemplate();
        }

        if ( this.options.ajax ) {
            this.getRemoteData();
        } else if ( this.data ) {
            this.render();
            that.showAvailability( Object.keys( that.data )[0] );
            that.getFirstAvailable( true );
        } else {
            $.error('No data or ajax were set!');
            return;
        }

        $(window).resize(function() {
            if ( that.data ) {
                var day = that.sliderWidget.find( that.options.dates + ' > li > a.active').data('day');
                that.showAvailability( day );
                that.updateSlider();
            }
        });

    };

    /**
    *
    *   Pickify prototypes
    *
    */

    Pickify.prototype.detach = function() {
        if ( this.detached === false ) {
            //this.sliderWidget.find('*').off();
            this.detached = true;
        }   
    };

    Pickify.prototype.attach = function() {
        if ( this.detached === true ) {
            this.detached = false;
        }   
    };

    Pickify.prototype.destroy = function() {
        this.sliderWidget.find('*').off();
        this.sliderWidget.remove();
        $(this.el).data('pickify', null);
    };

    Pickify.prototype.getRemoteData = function() {
        // make sure there is no caching
        if ( this.options.ajax.cache === false ) {
            this.options.ajax.url += ( this.options.ajax.url.indexOf('?') > -1 ? '&pickify=' : '?pickify=' ) + new Date().getTime() + '_' + Math.floor((Math.random() * 9999) + 1);  
        }

        this.request = new $.ajax( this.options.ajax );
    };

    Pickify.prototype.loadTemplate = function() {
        this.options.template = Handlebars.compile( $( this.options.templateSrc ).html() );
    };

    Pickify.prototype.compileTemplate = function( context ) {
        this.options.html = this.options.template( context || {} );
    };

    Pickify.prototype.moment = function() {
        if ( window.moment ){
            return moment.apply(this, arguments);
        } else {
            $.error('moment.js (with language support) is required!');
        }
    };

    Pickify.prototype.getHour = function( time ) {

        if ( time.split(':').length === 3) {
            time += ':00';
        }

        return parseInt(this.moment('2012/12/12 '+time).format('HH'));
    }

    Pickify.prototype.getMinutes = function( time ) {

        if ( time.split(':').length === 3) {
            time += ':00';
        }

        return parseInt(this.moment('2012/12/12 '+time).format('mm'));
    }

    Pickify.prototype.convertTime = function( arr ) {

        var startTime;

        if ( $.trim(this.options.startTime) != '' && this.options.startTime !== null ) {
            startTime = this.options.startTime.split(':');
        } else {
            startTime = Array(0,0);
        }

        var start = arr[0].split(':');
        var end = arr[1].split(':');

        var startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]) - ( parseInt(startTime[0]) * 60 + parseInt(startTime[1]) );
        var endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]) - ( parseInt(startTime[0]) * 60 + parseInt(startTime[1]) );
        var diff = endMinutes - startMinutes;
        
        var mins = this.options.workingHours * 60;
        var ratio = this.slideBar.innerWidth() / mins; 

        return {
            start : startMinutes * ratio,
            width : diff * ratio
        }

    };

    Pickify.prototype.updateSlider = function(){
        
        var ratio = (this.slideBar.width() - this.slider.width()) / (this.options.workingHours * 60);
        var hour = this.time.split(":")[0];
        var min = this.time.split(":")[1]
        var mins = parseInt(hour) * 60 + parseInt(min); 
        var pos = mins * ratio;

        this.pos = pos;
        this.slider.css({
            left: pos
        });
    }

    Pickify.prototype.showAvailability = function( day ) {
        
        var dataIntervals = this.data[day];
        
        this.slideBar.find('span').remove();
        
        for ( var i in dataIntervals ) {
            var gap = dataIntervals[i].split('-');
            var interval = this.convertTime( gap );
            $('<span></span>').css({
                left : Math.round(interval.start),
                width : Math.round(interval.width)
            }).html( dataIntervals[i] ).attr( 'title', this.options.hoverTextPrefix + dataIntervals[i] + this.options.hoverTextSuffix ).data({
                start : gap[0],
                end : gap[1] 
            }).appendTo( this.intervalContainer );
        }

        this.intervals = this.intervalContainer.children('span');
    };

    Pickify.prototype.getFirstAvailable = function( bool ){
        
        bool = (bool !== false) ? true : false;
        
        var available = false; 
        var start = ( $.trim(this.options.startTime) != '' && this.options.startTime !== null ) ? this.options.startTime : '00:00';
        var newTime = this.moment('2012/12/12 00:00:00').format("HH:mm");
        var MM = this.moment('2012/12/12 00:00:00').format("MM");

        while ( MM == this.moment('2012/12/12 '+newTime+':00').format("MM")) {
                        
            if ( this._doCollide( newTime ) ) {
                newTime = this.moment('2012/12/12 '+newTime+':00').add('m', 1).format("HH:mm");
            } else {
                
                if ( bool ) {
                    var ratio = (this.slideBar.width() - this.slider.width()) / (this.options.workingHours * 60);
                    var mins = this.getHour(newTime) * 60 + this.getMinutes(newTime);
                    var formatedTime = this.moment('2012/12/12 ' + newTime + ':00').lang( this.options.lang ).format( this.options.timeFormat );
                    var pos = ratio * mins;
                    
                    this.pos = pos;
                    this.slider.css({
                        left : pos
                    });

                    this.time = formatedTime;
                    
                    $(this.el).val( formatedTime );
                    if ( this.options.showClock ) {
                        this.clock.html( formatedTime );
                    }                    
                }
                this.slider.show();
                return newTime;
            }
        }

        this.slider.hide();

    }

    Pickify.prototype._doCollide = function( time ) {

        var that = this;
        var timeDate = new Date(that.moment('2012/12/12 '+time+':00').format("YYYY/MM/DD HH:mm:ss"));
        var result = false;

        this.intervals.each(function(){

            var start = $(this).data('start');  // @todo: add starting hour and then check
            var end = $(this).data('end');
            var startDate = new Date( that.moment('2012/12/12 '+start+':00').format("YYYY/MM/DD HH:mm:ss") );
            var endDate = new Date( that.moment('2012/12/12 '+end+':00').format("YYYY/MM/DD HH:mm:ss") );
            
            if ( timeDate.getTime() >= startDate.getTime() && timeDate.getTime() <= endDate.getTime() ) {
                result = true;
                return false;
            }

        });

        return result;

    }

    Pickify.prototype.handleCollision = function( time ) {

        var that = this;
        var ratio = (this.slideBar.width() - this.slider.width()) / (this.options.workingHours * 60); 
        var check = false;
        var timeDate = new Date( this.moment('2012/12/12 '+time+':00').format("YYYY/MM/DD HH:mm:ss") );
        
        this.intervals.each(function() {
        
            var start = $(this).data('start');
            var end = $(this).data('end');

            var startMins = that.getHour(start) * 60 + that.getMinutes(start);
            var endMins = that.getHour(end) * 60 + that.getMinutes(end);

            var startDate = new Date( that.moment('2012/12/12 '+start+':00').format("YYYY/MM/DD HH:mm:ss") );
            var endDate = new Date( that.moment('2012/12/12 '+end+':00').format("YYYY/MM/DD HH:mm:ss") );
            
            if ( timeDate >= startDate && timeDate <= endDate ) {

                var newStart = that.moment('2012/12/12 '+start+':00').subtract('m',1).format("HH:mm");
                var newEnd = that.moment('2012/12/12 '+end+':00').add('m',1).format("HH:mm");

                check = {
                    startPixel : startMins * ratio,
                    endPixel : endMins * ratio,
                    startTime : that._doCollide( newStart ) ? false : newStart,
                    endTime : that._doCollide( newEnd ) ? false : newEnd,
                    el : this
                };
                
                return false;
            }

        });
        
        return check;
 
    };

}( jQuery ));