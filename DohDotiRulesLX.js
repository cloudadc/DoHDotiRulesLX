"use strict";   
  
var f5 = require('f5-nodejs');  
var dgram = require('dgram');  
var base64url = require('base64url');  
var dnsPacket = require('dns-packet');  
var net = require('net');  
var response = null;  
var errMessage = Buffer.from('Internal Server Error').toString('base64');  
  
var ilx = new f5.ILXServer();  
ilx.listen();  

  
ilx.addMethod('RFC8484_get', function(req, res) {  
    const msg = base64url.toBuffer(req.params()[0]);
    const cip = req.params()[1];
    rfc8484_handler_get(msg, cip, res);  
});  
  
ilx.addMethod('RFC8484_post', function(req, res) {  
    const msg = Buffer.from(req.params()[0],'base64'); 
    const cip = req.params()[1];
    rfc8484_handler_post(msg, cip, res);  
});  

function add_ecs(msg,cip) {
    var packet_req = dnsPacket.decode(msg);
    var cip_type  ;
    var cip_prefix ;
    
    if(cip.indexOf(".") != -1){
       cip_type = 1;
       cip_prefix = 32;
       console.log("ipv4");
    } else{
       cip_type = 2;
       cip_prefix = 128;
       console.log("ipv6");
    }
    
    packet_req.additionals = [{
     type: 'OPT',
     name: '.',
     udpPayloadSize: 4096,
     flags: 0,
     options: [{
       code: 'CLIENT_SUBNET',
       family: cip_type, // 1 for IPv4, 2 for IPv6
       sourcePrefixLength: cip_prefix, // used to truncate IP address
       scopePrefixLength: 0,
       ip: cip
     }]
    }];
    
    //console.log(packet_req);
    var request_ecs = dnsPacket.encode(packet_req); 
    return request_ecs;
}
  
function rfc8484_handler_get(msg, cip, res) {  
    const server = dgram.createSocket('udp4'); 
    
    var request_ecs = add_ecs(msg,cip);
    
    server.on('error', (err) => {  
        res.statusCode = 500;  
        res.reply([errMessage,Buffer.byteLength(errMessage)]);  
        server.close();  
    });  
    server.on('message', (resp, rinfo) => {  
        console.log('DNS Answer From  ' + rinfo.address + ':' + rinfo.port + 'Length: ' + rinfo.size);  
        // Checking for Truncated flag  
        var packet = dnsPacket.decode(resp);  
        var isTruncated = packet.flags & dnsPacket.TRUNCATED_RESPONSE;  
        if (isTruncated == "0") {  
            console.log('Answer is NOT truncated. Flag is:' + isTruncated + '.Returning DNS response');  
            res.reply([resp.toString('base64'),rinfo.size]);  
        } 
        else {  
            console.log('Answer is Truncated...Trying TCP Transport');  
            // DNS query using TCP transport  
            const tcpServer = new net.Socket();  
            tcpServer.connect(53, '10.1.10.2', function () {  
                console.log('TCP Connection ESTABLISHED');  
                var msgString = request_ecs.toString();  
                var msgSize = msgString.length;  
                var bufferSize = msgSize + 2;  
                var buffer = new Buffer(bufferSize);  
                buffer.writeUInt16BE(msgSize, 0);  
                buffer.write(msgString, 2, msgSize);  
                tcpServer.write(buffer);  
                tcpServer.on('error', (err) => {  
                    res.statusCode = 500;  
                    res.reply([errMessage,Buffer.byteLength(errMessage)]);  
                    tcpServer.destroy();  
                });  
                tcpServer.on('data', function (data) {  
                    console.log('Received Response: %d Bytes', data.byteLength);  
                    res.reply([data.toString('base64'),data.byteLength]);  
                });  
                tcpServer.on('close', function () {  
                    console.log('TCP Connection CLOSED');  
                });  
            });  
        }  
    });  
    
    server.bind(0, () => {  
        server.send(request_ecs, 53, '10.1.10.2');  
    });  
}  

function rfc8484_handler_post(msg, cip, res) {  
    const server = dgram.createSocket('udp4');  
    
    var request_ecs = add_ecs(msg,cip);
    
    server.on('error', (err) => {  
        res.statusCode = 500;  
        res.reply([errMessage,Buffer.byteLength(errMessage)]);  
        server.close();  
    });  
    server.on('message', (resp, rinfo) => {  
        console.log('DNS Answer From  ' + rinfo.address + ':' + rinfo.port + 'Length: ' + rinfo.size);  
        // Checking for Truncated flag  
        var packet = dnsPacket.decode(resp);
         
        var isTruncated = packet.flags & dnsPacket.TRUNCATED_RESPONSE;  
        console.log('Answer is NOT Truncated. Flag is:' + isTruncated + '.Returning DNS Response');
        //console.log(packet);
        
        
        if (isTruncated == "0") {  
              
            res.reply([resp.toString('base64'),rinfo.size]);  
        } else {  
            console.log('Answer is Truncated...Trying TCP Transport');  
            // DNS query using TCP transport  
            const tcpServer = new net.Socket();  
            tcpServer.connect(53, '10.1.10.2', function () {  
                console.log('TCP Connection ESTABLISHED');  
                var msgString = request_ecs.toString();  
                var msgSize = msgString.length;  
                var bufferSize = msgSize + 2;  
                var buffer = new Buffer(bufferSize);  
                buffer.writeUInt16BE(msgSize, 0);  
                buffer.write(msgString, 2, msgSize);  
                tcpServer.write(buffer);  
                tcpServer.on('error', (err) => {  
                    res.statusCode = 500;  
                    res.reply([errMessage,Buffer.byteLength(errMessage)]);  
                    tcpServer.destroy();  
                });  
                tcpServer.on('data', function (data) {  
                    console.log('Received Response: %d Bytes', data.byteLength);  
                    res.reply([data.toString('base64'),data.byteLength]);  
                });
                tcpServer.on('close', function () {  
                    console.log('TCP Connection CLOSED');  
                });  
            });  
        }  
    });  
    
    
    
    server.bind(0, () => {  
        server.send(request_ecs, 53, '10.1.10.2');  
    });  
}  

