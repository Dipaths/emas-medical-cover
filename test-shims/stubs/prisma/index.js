const fs=require('fs');
const src=fs.readFileSync(require('path').resolve(__dirname,'../../../prisma/schema.prisma'),'utf8');
const models=[];let cur=null;
for(const line of src.split('\n')){
  let m=line.match(/^model (\w+) \{/); if(m){cur={name:m[1],fields:[]};models.push(cur);continue}
  if(line.startsWith('}')){cur=null;continue}
  if(cur){const f=line.match(/^\s+(\w+)\s+(\w+)(\[\])?(\?)?/); if(f&&!line.trim().startsWith('//')&&!line.trim().startsWith('@@')){cur.fields.push({name:f[1],type:f[2],kind:['String','Int','Float','Boolean','DateTime'].includes(f[2])?'scalar':'object'})}}
}
exports.Prisma={dmmf:{datamodel:{models}}};
exports.PrismaClient=class{};
