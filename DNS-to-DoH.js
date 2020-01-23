'use strict';

var https = require('https');
var f5 = require('f5-nodejs');

var ilx = new f5.ILXServer();

ilx.addMethod('query_dns', function(req, res) {
    var dns_query = Buffer.from(req.params()[0],'base64');
    var options = {
        hostname: 'dns.google',
        port: 443,
        path: '/dns-query',
        method: 'POST',
        headers: {
            'Host':'dns.google',
            'Content-Type': 'application/dns-message',
            'Content-Length': Buffer.byteLength(dns_query,'binary')
        }
    };
    var dohreq = https.request(options, (dohres) => {
        let output = '';
        dohres.setEncoding('binary');
        dohres.on('data', function (chunk) {
            output += chunk;
        });
        dohres.on('end', () => {
            res.reply(Buffer.from(output,'binary').toString('base64'));
        });
    });
    dohreq.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    dohreq.write(dns_query);
    dohreq.end();
});

ilx.listen();
