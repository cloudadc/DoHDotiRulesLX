when HTTP_REQUEST {  
    set ilx_handle [ILX::init "DoH_to_DNS_Proxy" "DoH_to_DNS_Proxy"]  
    set dns_timeout 1500  
    log local0.info "DNSoHTTPS: [IP::client_addr] [HTTP::method] [HTTP::uri] Accept: [HTTP::header "accept"] Content-type: [HTTP::header "content-type"]"  
    if { ([HTTP::method] equals "GET") and (([HTTP::header "accept"] equals "application/dns-message") or ([HTTP::header "content-type"] equals "application/dns-message")) } {  
        if {[catch { ILX::call $ilx_handle -timeout "$dns_timeout" "RFC8484_get" [URI::query [HTTP::uri] dns] } result]} {  
            log local0.error "ILX Failure: $result"  
            HTTP::respond 408 content "Request timed out" noserver   
        } else {  
            set contentlength [lindex $result 1]  
            set result [b64decode [lindex $result 0]]  
            log local0.info "DNS answer for [IP::client_addr] (len $contentlength)"  
            HTTP::respond 200 content $result noserver content-type application/dns-message vary Accept-Encoding content-length $contentlength  
        }  
    }  
    elseif { (([HTTP::method] equals "POST") and (([HTTP::header "accept"] equals "application/dns-message") or ([HTTP::header "content-type"] equals "application/dns-message"))) } {  
        if {[HTTP::header exists "Content-Length"] && [HTTP::header "Content-Length"] <= 65535} {  
            set content_length [HTTP::header value "Content-Length"]  
        }   
        else {  
            set content_length 65535  
        }  
        if { $content_length > 0} {  
            HTTP::collect $content_length  
        }   
        else {  
            log local0. "ERROR! Content Length = $content_length"  
        }      
    }  
    else {   
        log local0.info "Bad request from client - HTTP/415"  
        HTTP::respond 415 content "Unsupported Media Type"  
    }  
}  
  
  
when HTTP_REQUEST_DATA {  
        log local0.info "POST body"  
    if {[catch { ILX::call $ilx_handle -timeout $dns_timeout "RFC8484_post" [b64encode [HTTP::payload]] } result]} {  
        log local0.error "ILX Failure: $result"  
        HTTP::respond 408 content "Request timed out" noserver   
    }   
    else {  
        set contentlength [lindex $result 1]  
        set result [b64decode [lindex $result 0]]  
        log local0.info "DNS answer for [IP::client_addr] (len $contentlength)"  
        HTTP::respond 200 content $result noserver content-type application/dns-message vary Accept-Encoding content-length $contentlength  
    }  
} 
