# DNS over HTTPS / DNS over TLS via iRulesLX on the F5 BIG-IP

The following configurations handle both inbound DNS over HTTPS and DNS over TLS requests. For proxying inbound traditional DNS to back-end DoH/DoT servers, see Eric Chen's work at [DevCentral](https://devcentral.f5.com/s/articles/unbreaking-the-internet-and-converting-protocols-30756).

## DNS over TLS

DoT is simply putting a client-SSL profile on a virtual server that handles DNS. 

This deployment is meant to be compliant with RFC7858. Please report and deviations or issues.

https://tools.ietf.org/html/rfc7858

### Sample Virtual Server

ltm virtual dns_over_tls {  
    destination 192.168.1.50:853  
    ip-protocol tcp  
    mask 255.255.255.255  
    pool dns_server  
    profiles {  
        dns_client_ssl {  
            context clientside  
        }  
        tcp { }  
    }  
    source 0.0.0.0/0  
    source-address-translation {  
        type automap  
    }  
    translate-address enabled  
    translate-port enabled  
    vs-index 2  
}  

### Sample SSL Profile

ltm profile client-ssl dns_client_ssl {  
    app-service none  
    cert fakeCAwildcard.crt  
    cert-key-chain {  
        fakeCAwildcard_fakeCA {  
            cert fakeCAwildcard.crt  
            chain fakeCA.crt  
            key fakeCAwildcard.key  
        }  
    }  
    chain fakeCA.crt  
    defaults-from clientssl  
    inherit-certkeychain false  
    key fakeCAwildcard.key  
    passphrase none  
    renegotiation disabled  
}  

## DNS over HTTPS

### Overview

This LX iRule will accept inbound DNS over HTTPS queries as defined in RFC8484. Note that GET and POST requests are handled just a bit differently.

This iRulesLX powered DoH proxy attempts to be compliant with RFC8484. Please report any deviations or issues.

https://tools.ietf.org/html/rfc8484

### LX iRule Installation

1. Provision iRulesLX. (https://devcentral.f5.com/s/articles/getting-started-with-irules-lx-configuration-workflow-20410)
2. Create an iRulesLX workspace titled "DoH_to_DNS_Proxy"
3. Add the iRule to the workspace by clicking "Add iRule", entering DoH_to_DNS_Proxy and pasting the contents of DoHDoTiRule.tcl
4. Click "Create Extension" and enter "DoH_to_DNS_Proxy" as the name and click OK.
5. Modify the index.js extension and paste the contents of DohDotiRulesLX.js
6. From the command line, install the required modules:
  - cd /var/ilx/workspaces/Common/DoH_to_DNS_Proxy/extensions/DoH_to_DNS_Proxy
  - npm install dgram base64url dns-packet net --save
7. Create the iRulesLX plugin titled "DoH_to_DNS_Proxy"
8. Apply the iRule to your virtual server(s)

### Sample Virtual Server:

ltm virtual dns_over_https {  
    destination 192.168.1.50:https  
    ip-protocol tcp  
    mask 255.255.255.255  
    profiles {  
        ssl_http2 {  
            context clientside  
        }  
        http { }  
        http2 { }  
        tcp { }  
    }  
    rules {  
        DoH_to_DNS_Proxy/DoH_to_DNS_Proxy  
    }  
    source 0.0.0.0/0  
    source-address-translation {  
        type automap  
    }  
    translate-address enabled  
    translate-port enabled  
}  

## Sample SSL Profile:

ltm profile client-ssl ssl_http2 {  
    app-service none  
    cert fakeCAwildcard.crt  
    cert-key-chain {  
        fakeCAwildcard_fakeCA {  
            cert fakeCAwildcard.crt  
            chain fakeCA.crt  
            key fakeCAwildcard.key  
        }  
    }  
    chain fakeCA.crt  
    defaults-from clientssl  
    inherit-certkeychain false  
    key fakeCAwildcard.key  
    passphrase none  
    renegotiation disabled  
}  
