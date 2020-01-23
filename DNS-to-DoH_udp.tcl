when CLIENT_DATA {
  set rpc_handle [ILX::init DNS_to_DoH_Proxy dns_over_https]
  set rpc_response [ILX::call $rpc_handle query_dns [b64encode [UDP::payload]]]
  UDP::respond [b64decode $rpc_response]
}
