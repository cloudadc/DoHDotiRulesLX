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
    rfc8484_handler_get(msg, res);  
});  
  
ilx.addMethod('RFC8484_post', function(req, res) {  
    const msg = Buffer.from(req.params()[0],'base64');  
    rfc8484_handler_post(msg, res);  
});  
  
function rfc8484_handler_get(msg, res) {  
    const server = dgram.createSocket('udp4');  
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
      } else {  
          console.log('Answer is Truncated...Trying TCP Transport');  
    // DNS query using TCP transport  
          const tcpServer = new net.Socket();  
            tcpServer.connect(53, '192.168.2.10', function () {  
            console.log('TCP Connection ESTABLISHED');  
            var msgString = msg.toString();  
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
        server.send(msg, 53, '192.168.2.10');  
    });  
}  
function rfc8484_handler_post(msg, res) {  
    const server = dgram.createSocket('udp4');  
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
          console.log('Answer is NOT Truncated. Flag is:' + isTruncated + '.Returning DNS Response');  
        res.reply([resp.toString('base64'),rinfo.size]);  
      } else {  
          console.log('Answer is Truncated...Trying TCP Transport');  
    // DNS query using TCP transport  
          const tcpServer = new net.Socket();  
            tcpServer.connect(53, '192.168.2.10', function () {  
            console.log('TCP Connection ESTABLISHED');  
            var msgString = msg.toString();  
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
        server.send(msg, 53, '192.168.2.10');  
    });  
}  
