pickify
=======
A date and time picker. You can define inactive time intervals per day. 

Example:
<pre>
		$('#pickify').Pickify({
			ajax : {
				url: "someServer.php"

			},
      dateFormat : 'DD/MM/YYYY',
      timeFormat : 'HH:mm'
		});
</pre>

The default properties you can configure are

* startTime : ''
* timeTrigger : 1
* workingHours : 24
* dateFormat : 'll'
* timeFormat : 'HH:mm:00 a'
* lang: 'el'
* hoverTextPrefix : 'Unavailable between '
* hoverTextSuffix : ' please select another time.'
* showClock : true,
* jumpStop : false
*  templateSrc : '#pickify-tpl'
* dates : '.pickify-dates'
* slideBar : '.slide-bar'
* slider : '.slider'
* handle : '.handle'
* clock : '.clock'
* intervalContainer : '.intervals'
* template : null
* html : null
* ajax : {
              url: 'mockServer.php',
              dataType: 'json',
              cache : false
          }
