<?php
	

	define('TODAY', true);
	define('ADDITIONAL_DAYS_NUM', 2);
	define('MIN_DAY', 1);
	define('MAX_DAY', 3);

	define('MAX_INTERVALS_PER_DAY', 2);
	define('MIN_INTERVAL_DURATION', (60 * 60 * 2));
	define('MAX_INTERVAL_DURATION', (60 * 60 * 8));
	define('INTERVAL_RANDOMIZER', 500);

	function rndAvailableDays() {

		$days = array();

		if ( TODAY ) {
			$days[time()] = array();
		}

		$limit = count( $days ) + ADDITIONAL_DAYS_NUM;
		$nextDay = time() + ( rand( MIN_DAY, MAX_DAY ) * 24 * 60 * 60 );

		while ( count( $days ) !== $limit ) {
	
			if ( !array_key_exists( $nextDay, $days ) ) {
				$days[$nextDay] = array();
			} else {
				$nextDay = time() + ( rand( MIN_DAY, MAX_DAY ) * 24 * 60 * 60 );				
			}

		}

		return $days;

	}

	function makeTime( $hour, $minute ) {
		return mktime( $hour, $minute, 0, date('n'), date('j'), date('Y') );
	}

	function timestampTime( $timestamp ) {
		return date( "H:i", $timestamp );
	}

	function rndAvailableHours( &$days ) {

		foreach ( $days as $key => &$value ) {

			$intervals = 0;

			for ( $h = 0; $h < 23; $h++ ) {


				for ( $m = 0; $m < 59; $m++ ) {

					//echo "$h:$m<br>";
					$timestamp = makeTime( $h, $m );

					$day = date( 'j', $timestamp );

					if ( $intervals < MAX_INTERVALS_PER_DAY && rand(1, INTERVAL_RANDOMIZER) === 1 ) {
						
						$interval = rand( MIN_INTERVAL_DURATION, MAX_INTERVAL_DURATION );

						while ( date( 'j', $timestamp + $interval ) != $day ) {
							$interval = rand( MIN_INTERVAL_DURATION, MAX_INTERVAL_DURATION );					
						}
						
						$hour = intval( date( 'G', $timestamp + $interval ) );
						$minute = intval( date( 'i', $timestamp + $interval ) );

						$value[] = timestampTime( $timestamp ) .'-'. timestampTime( $timestamp + $interval );

						$h = $hour;
						$m = $minute;

						$intervals++;
					}
				
				}
			}	
		}

		return $days;

	}

	$days = rndAvailableDays();
	$availability = rndAvailableHours( $days );
	//echo json_encode( $availability );
	
	$test = array(
		'1402698720' => ['00:00-04:00','08:00-23:59'],
		'1402785120' => ['12:00-14:20','16:40-19:00'],
		'1402871520' => ['08:00-16:00','15:00-21:00']
	);

	echo json_encode($test);
	/*
	$test = array(
		'1402698720' => ['08:00-09:00','12:00-16:00'],
		'1402785120' => ['08:00-12:00'],
		'1402871520' => ['13:00-16:00','14:00-18:00']
	);

	//echo json_encode($test);	
	*/	
?>