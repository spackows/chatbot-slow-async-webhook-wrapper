
const g_wa_instance_url = process.env.WA_INSTANCE_URL;
const g_wa_assistant_id = process.env.WA_ASSISTANT_ID;
const g_wa_apikey       = process.env.WA_APIKEY;
const g_base_url        = process.env.BASE_URL;


const g_http       = require( "http"        );
const g_bodyParser = require( "body-parser" );
const g_express    = require( "express"     );
const g_axios      = require( "axios"       );


const g_log  = require( "./my_log.js" );


var g_app = g_express();
g_app.use( g_bodyParser.json() );
g_app.use( g_bodyParser.urlencoded( { extended: true } ) );


const g_server = g_http.Server( g_app );
g_server.listen( 8080, function()
{
  g_log.writeLog( "[server] Server running" );
  
} );


g_app.post( "/webhook-endpoint", function( request, response )
{
    g_log.writeLog( "[server] /webhook-endpoint ..." );
    g_log.writeLog( "[server] /webhook-endpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var action     = request.body.action     ? request.body.action     : "";
    var session_id = request.body.session_id ? request.body.session_id : "";
    
    g_log.writeLog( "[server] /webhook-endpoint action:     " + action     );
    g_log.writeLog( "[server] /webhook-endpoint session_id: " + session_id );
    
    switch( action )
    {
        case "slow":
        
            // 1. Respond right away so the chatbot can move on
            // 2. Call slow endpoint
            // 3. After slow endpoint responds, send a message to the chatbot that will be recognized as a slow-endpoint response
            
            response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
            
            g_axios.post( g_base_url + "/slow-endpoint" ).then( function( data )
            {
                sendMessage( session_id, "SLOWENDPOINT RESULT: Success" );
                
            } ).catch( function( error )
            {
                printAxiosError( error );
                
                sendMessage( session_id, "SLOWENDPOINT RESULT: Failure" );
                
            } );
            
            break;
        
        case "async":
        
            response.redirect( "./async-endpoint" );
            
            break;
        
        case "polling":
        
            response.redirect( "./polling-endpoint" );
            
            break;
        
        default:
        
            response.status( 400 ).json( { "error_str" : "No 'action' parameter specified in the request" } );
    }
    
} );


function sendMessage( session_id, msg )
{
    g_log.writeLog( "[server] sendMessage ..." );
    g_log.writeLog( "[server] sendMessage session_id: " + session_id );
    g_log.writeLog( "[server] sendMessage msg: " + msg );
    
    return;

    // https://cloud.ibm.com/apidocs/assistant/assistant-v2#message
    //

    var url = g_wa_instance_url + "/v2/assistants/" + g_wa_assistant_id + "/sessions/" + session_id + "/message?version=2021-06-14";
    
    var data = { "input" : [ { "text" : msg } ] };
    
    var auth    = { "username" : "apikey", "password" : g_wa_apikey };
    var headers = { "Content-Type" : "application/json" };
    var parms   = { "auth" : auth, "headers" : headers };
    
    g_log.writeLog( "[server] sendMessage:\n" +
                 "url: " + url + "\n" +
                 "body:\n" + JSON.stringify( body, null, 3 ) + "\n" +
                 "parms:\n" + JSON.stringify( parms, null, 3 ) );
    
    g_axios.post( url, data, parms ).then( function( data )
    {
        g_log.writeLog( "[server] sendMessage: Message sent successfully" );
        
    } ).catch( function( error )
    {
        g_log.writeLog( "[server] sendMessage: Error" );
        
        printAxiosError( error );
        
    } );
}


function printAxiosError( error )
{
    // https://www.npmjs.com/package/axios#handling-errors
    //
    
    g_log.writeLog( "\nAxios error:" + error.message );
    
    if( error.response )
    {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        g_log.writeLog( error.response.data    );
        g_log.writeLog( error.response.status  );
        g_log.writeLog( error.response.headers );
    }
    
}




g_app.post( "/slow-endpoint", function( request, response )
{
    g_log.writeLog( "[server] /slow-endpoint ..." );
    
    const myTimeout = setTimeout( function()
    {
        // Wait 10 seconds before responding
        
        g_log.writeLog( "[server] /slow-endpoint responds" );
        
        response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
        
    }, 10 * 1000 );
    
} );


g_app.post( "/async-endpoint", function( request, response )
{
    g_log.writeLog( "[server] /async-endpoint ..." );
    
    startJob( function( job_id )
    {
        var result = { "error_str" : "", "job_id" : job_id };
        
        g_log.writeLog( "[server] /async-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
        
        response.status( 200 ).json( result );
        
    } );
    
} );


g_app.post( "/polling-endpoint", function( request, response )
{
    g_log.writeLog( "[server] /polling-endpoint ..." );
    g_log.writeLog( "[server] /polling-endpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var job_id = request.body.job_id ? request.body.job_id : "";
    
    g_log.writeLog( "[server] /polling-endpoint job_id: " + job_id );
    
    if( !job_id || !( job_id in g_jobs_json ) )
    {
        var result = { "error_str" : "No valid job_id found in request", "state" : "Error" };
        
        g_log.writeLog( "[server] /polling-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
        
        response.status( 400 ).json( result );
        
        return;
    }
    
    var result = { "error_str" : "", "state" : g_jobs_json[ job_id ] };
    
    g_log.writeLog( "[server] /polling-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
    
    response.status( 200 ).json( result );
        
} );


var g_jobs_json = {};


function startJob( callback )
{
    g_log.writeLog( "[server] startJob ..." );
    
    var job_id = new Date().getTime().toString();
    
    g_log.writeLog( "[server] startJob job_id: " + job_id );
    
    callback( job_id );
    
    g_jobs_json[ job_id ] = "started";
    
    const myTimeout1 = setTimeout( function()
    {
        g_log.writeLog( "[server] startJob - processing job_id: " + job_id );
        
        g_jobs_json[ job_id ] = "processing";
        
        const myTimeout2 = setTimeout( function()
        {
            g_log.writeLog( "[server] startJob - done job_id: " + job_id );
            
            g_jobs_json[ job_id ] = "done";
            
        }, 10 * 1000 );
        
    }, 10 * 1000 );
}


// Every 5 minutes, clean up stale jobs

setInterval( function()
{
    g_log.writeLog( "[server] cleanup ..." );
    
    for( job_id in g_jobs_json )
    {
        if( "done" == g_jobs_json[ job_id ] )
        {
            g_log.writeLog( "[server] cleanup - done job_id: " + job_id );
            g_jobs_json[ job_id ] = "stale";
            continue;
        }
        
        if( "stale" == g_jobs_json[ job_id ] )
        {
            g_log.writeLog( "[server] cleanup - stale job_id: " + job_id );
            g_jobs_json[ job_id ] = null;
            delete g_jobs_json[ job_id ];
        }
    }
    
    g_log.writeLog( "[server] cleanup g_jobs_json:\n" + JSON.stringify( g_jobs_json, null, 3 ) );
    
}, 5 * 60 * 1000 );


g_app.get( "/logs", function( request, response )
{
    g_log.readLog( function( content )
    {
        response.status( 200 ).end( content );
        
    } );
        
} );


g_app.post( "/clearlog", function( request, response )
{
    g_log.clearLog( function( error_str )
    {
        if( error_str )
        {
            response.status( 500 ).json( { error_str : error_str } );
            return;
        }
        
        response.status( 200 ).json( { "result" : "Success" } );
        
    } );
        
} );


g_app.get( "/health", function( request, response )
{
    // For Code Engine pipeline to check
    
    g_log.writeLog( "[server] /health ..." );
    
    response.status( 200 ).end( "Success" );
    
} );


