// This module deliberately has no database or authentication SDK imports.
export function sameOrigin(request:Request):boolean{
  try{
    const origin=request.headers.get('origin');
    if(!origin)return false;
    const normalize=(value:string)=>value.replace('://127.0.0.1','://localhost').replace('://0.0.0.0','://localhost');
    return normalize(origin)===normalize(new URL(request.url).origin);
  }catch{return false}
}
