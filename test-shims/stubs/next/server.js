class NextResponse{constructor(b,i){this.body=b;this.status=(i&&i.status)||200;this.cookieJar=[];this.cookies={set:c=>this.cookieJar.push(c)}}
 static json(b,i){return new NextResponse(b,i)} async json(){return this.body}}
class NextRequest{constructor(o){this.method=o.method||'GET';this._h=Object.fromEntries(Object.entries(o.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
 this.headers={get:k=>this._h[k.toLowerCase()]??null};const ck=o.cookies||{};this.cookies={get:n=>ck[n]!==undefined?{value:ck[n]}:undefined};
 this.nextUrl=new URL(o.url||'http://localhost/');this._b=o.body}async json(){return this._b}}
module.exports={NextRequest,NextResponse};
