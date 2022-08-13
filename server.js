
const g_http       = require( "http"        );
const g_bodyParser = require( "body-parser" );
const g_express    = require( "express"     );


var g_app = g_express();
g_app.use( g_bodyParser.json() );
g_app.use( g_bodyParser.urlencoded( { extended: true } ) );


const g_server = g_http.Server( g_app );
g_server.listen( 8080, function()
{
  console.log( "[server] Server running" );
  
});


g_app.get( "/health", function( request, response )
{
    console.log( "[server] /health ..." );
    
    response.status( 200 ).end( "Success" );
    
} );


g_app.post( "/slow-endpoint", function( request, response )
{
    console.log( "[server] /slow-endpoint ..." );
    
    const myTimeout = setTimeout( function()
    {
        // Wait 10 seconds before responding
        
        response.status( 200 ).end( JSON.stringify( { "error_str" : "", "result" : "Success" }, null, 3 ) );
        
    }, 10 * 1000 );
    
} );


g_app.post( "/async-endpoint", function( request, response )
{
    console.log( "[server] /async-endpoint ..." );
    
    startJob( function( job_id )
    {
        var result = JSON.stringify( { "error_str" : "", "job_id" : job_id }, null, 3 );
        
        console.log( "[server] /async-endpoint result:\n" + result );
        
        response.status( 200 ).end( result );
        
    } );
    
} );


g_app.post( "/polling-endpoint", function( request, response )
{
    console.log( "[server] /polling-endpoint ..." );
    console.log( "[server] /polling-endpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var job_id = request.body.job_id ? request.body.job_id : "";
    
    console.log( "[server] /polling-endpoint job_id: " + job_id );
    
    if( !job_id || !( job_id in g_jobs_json ) )
    {
        var result = JSON.stringify( { "error_str" : "No valid job_id found in request", "state" : "Error" }, null, 3 );
        
        console.log( "[server] /polling-endpoint result:\n" + result );
        
        response.status( 400 ).end( result );
        
        return;
    }
    
    var result = JSON.stringify( { "error_str" : "", "state" : g_jobs_json[ job_id ] }, null, 3 );
    
    console.log( "[server] /polling-endpoint result:\n" + result );
    
    response.status( 200 ).end( result );
        
} );


var g_jobs_json = {};


function startJob( callback )
{
    console.log( "[server] startJob ..." );
    
    var job_id = new Date().getTime().toString();
    
    console.log( "[server] startJob job_id: " + job_id );
    
    callback( job_id );
    
    g_jobs_json[ job_id ] = "started";
    
    const myTimeout1 = setTimeout( function()
    {
        console.log( "[server] startJob - processing job_id: " + job_id );
        
        g_jobs_json[ job_id ] = "processing";
        
        const myTimeout2 = setTimeout( function()
        {
            console.log( "[server] startJob - done job_id: " + job_id );
            
            g_jobs_json[ job_id ] = "done";
            
        }, 10 * 1000 );
        
    }, 10 * 1000 );
}


// Every 5 minutes, clean up stale jobs

setInterval( function()
{
    console.log( "[server] cleanup ..." );
    
    for( job_id in g_jobs_json )
    {
        if( "done" == g_jobs_json[ job_id ] )
        {
            console.log( "[server] cleanup - done job_id: " + job_id );
            g_jobs_json[ job_id ] = "stale";
            continue;
        }
        
        if( "stale" == g_jobs_json[ job_id ] )
        {
            console.log( "[server] cleanup - stale job_id: " + job_id );
            g_jobs_json[ job_id ] = null;
            delete g_jobs_json[ job_id ];
        }
    }
    
    console.log( "[server] cleanup g_jobs_json:\n" + JSON.stringify( g_jobs_json, null, 3 ) );
    
}, 5 * 60 * 1000 );


