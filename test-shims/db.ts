const mk=(seed:any[]=[])=>{const rows:any[]=seed;let n=0;
 const match=(r:any,w:any)=>!w||Object.entries(w).every(([k,v]:any)=>typeof v==='object'&&v!==null?true:r[k]===v);
 const sel=(r:any,s:any)=>{if(!r||!s)return r;const o:any={};for(const k of Object.keys(s))if(s[k]===true)o[k]=r[k];return o};
 return{rows,
  findUnique:async({where,select}:any)=>sel(rows.find(r=>Object.entries(where).every(([k,v])=>r[k]===v))||null,select),
  findFirst:async({where,select}:any={})=>sel(rows.find(r=>match(r,where))||null,select),
  findMany:async({where,select,include}:any={})=>rows.filter(r=>match(r,where)).map(r=>{const o=sel(r,select)??{...r};if(include?._count)o._count={triageRecords:db.triageRecord.rows.filter((t:any)=>t.eventId===r.id).length};return o}),
  create:async({data}:any)=>{const r={id:'id'+(++n),createdAt:new Date(),timestamp:new Date(),submissionDate:new Date(),...data};rows.push(r);return r},
  update:async({where,data}:any)=>{const r=rows.find(x=>Object.entries(where).every(([k,v])=>x[k]===v));Object.assign(r,data);return r},
  upsert:async({where,update,create,select}:any)=>{let r=rows.find(x=>Object.entries(where).every(([k,v])=>x[k]===v));if(r)Object.assign(r,update);else{r={id:'id'+(++n),active:true,mustChangePassword:true,passwordHash:'',notes:'',...create};rows.push(r)}return sel(r,select)??r},
  delete:async({where}:any)=>{const i=rows.findIndex(x=>Object.entries(where).every(([k,v])=>x[k]===v));if(i<0)throw new Error('nf');rows.splice(i,1)},
  count:async()=>rows.length}};
export const db:any={staffRole:mk(),eventRecord:mk(),triageRecord:mk(),auditLog:mk()};
