const fs=require("fs");
const d="D:/Projects/prj/PK/data/";
const skills=JSON.parse(fs.readFileSync(d+"skills.json","utf8"));
const monsters=JSON.parse(fs.readFileSync(d+"monsters.json","utf8"));
const skillIds=new Set(skills.skills.map(s=>s.id));
const uniqueInSkills=new Set(skills.skills.filter(s=>s.id.startsWith("unique_")).map(s=>s.id));
const uniqueInMonsters=new Set();
monsters.monsters.forEach(m=>{
  if(m.uniqueSkill) uniqueInMonsters.add(m.uniqueSkill.skillId);
});
console.log("Unique skills in skills.json:", uniqueInSkills.size);
console.log("Unique skill refs in monsters:", uniqueInMonsters.size);
// Find duplicates in monster unique skill refs
const refCounts={};
monsters.monsters.forEach(m=>{
  if(m.uniqueSkill){
    if(!refCounts[m.uniqueSkill.skillId])refCounts[m.uniqueSkill.skillId]=[];
    refCounts[m.uniqueSkill.skillId].push(m.id);
  }
});
console.log("Shared unique skills (should be 1 each):");
Object.entries(refCounts).filter(([k,v])=>v.length>1).forEach(([k,v])=>console.log("  "+k+": monsters "+v.join(",")));

// Missing from skills.json
const missingFromSkills=[];
uniqueInMonsters.forEach(s=>{if(!skillIds.has(s))missingFromSkills.push(s)});
console.log("Referenced but missing from skills.json:", missingFromSkills.join(", ") || "NONE");
