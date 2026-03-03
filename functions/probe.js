async function fetchWithTimeout(url, timeoutMs){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const res=await fetch(url,{redirect:"manual",signal:ctrl.signal});
    const text=await res.text().catch(()=> "");
    return {tcpReachable:true,status:res.status,ok:res.ok,sample:text.slice(0,200)};
  }catch(e){
    return {tcpReachable:false,error:String(e)};
  }finally{clearTimeout(t);}
}

export async function onRequest(context){
  const url=new URL(context.request.url);
  const host=(url.searchParams.get("host")||"").trim();
  if(!host)return new Response(JSON.stringify({error:"host required"}),{status:400});
  const target="http://"+host+":80/";
  const result=await fetchWithTimeout(target,3500);
  return new Response(JSON.stringify({target,result}),{
    headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"*"}
  });
}
