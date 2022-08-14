
var exports = module.exports = {};


exports.myGetLongDateStrUTC = function( input )
{
    var d = new Date( parseInt( input ) );
    
    var year    = d.getUTCFullYear();
    var month   = myPadZero( d.getUTCMonth() + 1 );
    var day     = myPadZero( d.getUTCDate()      );
    var hours   = myPadZero( d.getUTCHours()     );
    var minutes = myPadZero( d.getUTCMinutes()   );
    var seconds = myPadZero( d.getUTCSeconds()   );

    var date_str = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds + ' (UTC)';

    return date_str;    
}


function myPadZero( input )
{
	if( input < 10 )
	{
		return "0" + input;
	}
	
	return input;
}
