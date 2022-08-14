
const g_wa_instance_url = process.env.WA_INSTANCE_URL;
const g_wa_assistant_id = process.env.WA_ASSISTANT_ID;
const g_wa_apikey       = process.env.WA_APIKEY;


const g_http       = require( "http"        );
const g_bodyParser = require( "body-parser" );
const g_express    = require( "express"     );
const g_axios      = require( "axios"       );


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
    // Needed for Code Engine pipeline
    
    console.log( "[server] /health ..." );
    
    response.status( 200 ).end( "Success" );
    
} );


g_app.post( "/webhook-endpoint", function( request, response )
{
    console.log( "[server] /webhook-endpoint ..." );
    console.log( "[server] /webhook-endpoint body:\n" + JSON.stringify( request.body, null, 3 ) );
    
    var action     = request.body.action     ? request.body.action     : "";
    var session_id = request.body.session_id ? request.body.session_id : "";
    
    console.log( "[server] /webhook-endpoint action:     " + action     );
    console.log( "[server] /webhook-endpoint session_id: " + session_id );
    
    switch( action )
    {
        case "slow":
        
            // 1. Respond right away so the chatbot can move on
            // 2. Call slow endpoint
            // 3. After slow endpoint responds, send a message to the chatbot that will be recognized as a slow-endpoint response
            
            response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
            
            g_axios.post( "./slow-endpoint" ).then( function( data )
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
    }
    
} );


function sendMessage( session_id, msg )
{
    console.log( "[server] sendMessage ..." );
    console.log( "[server] sendMessage session_id: " + session_id );
    console.log( "[server] sendMessage msg: " + msg );
    
    return;

    // https://cloud.ibm.com/apidocs/assistant/assistant-v2#message
    //

    var url = g_wa_instance_url + "/v2/assistants/" + g_wa_assistant_id + "/sessions/" + session_id + "/message?version=2021-06-14";
    
    var data = { "input" : [ { "text" : msg } ] };
    
    var auth    = { "username" : "apikey", "password" : g_wa_apikey };
    var headers = { "Content-Type" : "application/json" };
    var parms   = { "auth" : auth, "headers" : headers };
    
    console.log( "[server] sendMessage:\n" +
                 "url: " + url + "\n" +
                 "body:\n" + JSON.stringify( body, null, 3 ) + "\n" +
                 "parms:\n" + JSON.stringify( parms, null, 3 ) );
    
    g_axios.post( url, data, parms ).then( function( data )
    {
        console.log( "[server] sendMessage: Message sent successfully" );
        
    } ).catch( function( error )
    {
        console.log( "[server] sendMessage: Error" );
        
        printAxiosError( error );
        
    } );
}


function printAxiosError( error )
{
    // https://www.npmjs.com/package/axios#handling-errors
    //
    
    console.log( "\nAxios error:" );
    
    if( error.response )
    {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log( error.response.data    );
        console.log( error.response.status  );
        console.log( error.response.headers );
    } 
    else if( error.request )
    {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log( error.request );
    } 
    else 
    {
      // Something happened in setting up the request that triggered an Error
      console.log( error.message );
    }
    
    console.log( error.config );
}




g_app.post( "/slow-endpoint", function( request, response )
{
    console.log( "[server] /slow-endpoint ..." );
    
    const myTimeout = setTimeout( function()
    {
        // Wait 10 seconds before responding
        
        console.log( "[server] /slow-endpoint responds" );
        
        response.status( 200 ).json( { "error_str" : "", "result" : "Success" } );
        
    }, 10 * 1000 );
    
} );


g_app.post( "/async-endpoint", function( request, response )
{
    console.log( "[server] /async-endpoint ..." );
    
    startJob( function( job_id )
    {
        var result = { "error_str" : "", "job_id" : job_id };
        
        console.log( "[server] /async-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
        
        response.status( 200 ).json( result );
        
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
        var result = { "error_str" : "No valid job_id found in request", "state" : "Error" };
        
        console.log( "[server] /polling-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
        
        response.status( 400 ).json( result );
        
        return;
    }
    
    var result = { "error_str" : "", "state" : g_jobs_json[ job_id ] };
    
    console.log( "[server] /polling-endpoint result:\n" + JSON.stringify( result, null, 3 ) );
    
    response.status( 200 ).json( result );
        
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


