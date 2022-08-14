
const g_ts = require( "./my_timestamps.js" );
const g_fs = require( "fs" );


const g_log_file_name = "log/log.txt";
var g_stream = g_fs.createWriteStream( g_log_file_name, { flags : "a+" } );


var exports = module.exports = {};
                

exports.readLog = function( callback )
{
    g_fs.readFile( g_log_file_name, "utf8", function( read_err, contents )
    {
        if( read_err )
        {
            callback( "my_log.readLog [Error]\n" + read_err.stack );
            return;
        }
        
        callback( contents );
        
    } );
    
}


exports.writeLog = function( content )
{
    try
    {
        console.log( content );
        g_stream.write( g_ts.myGetLongDateStrUTC( Date.now() ) + "\n" + content + "\n\n" );
    }
    catch( e )
    {
        console.log( "my_log.writeLog failed.\n" + e.stack );
    }
}


exports.clearLog = function( callback )
{
    g_stream.end( function( end_error_str )
    {
        if( end_error_str )
        {
            console.log( "my_log.clearLog end failed: " + end_error_str );
            callback( "my_log.clearLog end failed: " + end_error_str );
            return;
        }
        
        g_fs.unlink( g_log_file_name, function( unlink_error_str )
        {
            if( unlink_error_str )
            {
                console.log( "my_log.clearLog unlink failed: " + unlink_error_str );
                callback( "my_log.clearLog unlink failed: " + unlink_error_str );
                return;
            }
            
            g_stream = g_fs.createWriteStream( g_log_file_name, { flags: "a+" } );
            callback( "" );
            
        } );
        
    } );
}


