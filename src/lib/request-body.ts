export class RequestBodyError extends Error{
 constructor(message:string,public status:number){super(message)}
}
// Enforce the actual streamed size, rather than trusting Content-Length.
export async function readJsonBody(request:Request,maxBytes=32768):Promise<unknown>{
 if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new RequestBodyError('Send a JSON request.',415);
 if(Number(request.headers.get('content-length'))>maxBytes)throw new RequestBodyError('Request is too large.',413);
 const reader=request.body?.getReader();if(!reader)throw new RequestBodyError('Empty request body.',400);
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new RequestBodyError('Request is too large.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new RequestBodyError('Invalid JSON request.',400)}
}
