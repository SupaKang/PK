const fs=require("fs");
const d="D:/Projects/prj/PK/data/";
const skills=JSON.parse(fs.readFileSync(d+"skills.json","utf8"));
const monsters=JSON.parse(fs.readFileSync(d+"monsters.json","utf8"));
const maps=JSON.parse(fs.readFileSync(d+"maps.json","utf8"));
const monsterIds=new Set(monsters.monsters.map(m=>m.id));
let missingM=[];
maps.maps.forEach(map=>{
  if(map.encounters)map.encounters.forEach(e=>{if(!monsterIds.has(e.monsterId))missingM.push(map.id+":"+e.monsterId)});
  if(map.trainers)map.trainers.forEach(t=>t.team.forEach(tm=>{if(!monsterIds.has(tm.monsterId))missingM.push(map.id+":T:"+tm.monsterId)}));
  if(map.gym)map.gym.team.forEach(tm=>{if(!monsterIds.has(tm.monsterId))missingM.push(map.id+":G:"+tm.monsterId)});
});
console.log("Maps:", maps.maps.length);
console.log("Missing monster refs:", missingM.length>0 ? missingM.join(", ") : "NONE");
console.log("Unique skills:", skills.skills.filter(s=>s.id.startsWith("unique_")).length);
console.log("Regular skills:", skills.skills.length - skills.skills.filter(s=>s.id.startsWith("unique_")).length);

function st(m){const s=m.baseStats;return s.hp+s.atk+s.def+s.spAtk+s.spDef+s.speed;}
const leg = monsters.monsters.filter(m=>m.id>=91);
console.log("Legendaries:", leg.length, "stat range:", Math.min(...leg.map(st)), "-", Math.max(...leg.map(st)));
console.log("Monster 1 stats:", st(monsters.monsters[0]));
console.log("Monster 3 stats:", st(monsters.monsters[2]));

// Check all items referenced in maps
const items=JSON.parse(fs.readFileSync(d+"items.json","utf8"));
const itemIds=new Set(items.items.map(i=>i.id));
let missingI=[];
maps.maps.forEach(map=>{
  if(map.shop)map.shop.forEach(s=>{if(!itemIds.has(s.itemId))missingI.push(map.id+":"+s.itemId)});
});
console.log("Missing item refs:", missingI.length>0 ? missingI.join(", ") : "NONE");
