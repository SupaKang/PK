const fs=require("fs");
const d="D:/Projects/prj/PK/data/";
const monsters=JSON.parse(fs.readFileSync(d+"monsters.json","utf8"));
const skills=JSON.parse(fs.readFileSync(d+"skills.json","utf8"));
const uniqueSkillIds = skills.skills.filter(s=>s.id.startsWith("unique_")).map(s=>s.id);
console.log("Total unique skills available:", uniqueSkillIds.length);
console.log("Total monsters:", monsters.monsters.length);

// Show current assignments
monsters.monsters.forEach(m=>{
  console.log("M"+m.id+" ("+m.name+"): "+m.uniqueSkill.skillId);
});
