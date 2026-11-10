/* Scoped, repeatable presentation setup. Dry run by default; --apply writes only
   reserved presentation records and groupId on eligible, unassigned enrollments. */
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const BASE = 'http://127.0.0.1:3001';
const date = process.argv.find(x => x.startsWith('--date='))?.split('=')[1] || '2026-10-27';
const apply = process.argv.includes('--apply');
const prefix = `demo_mge_${date.slice(0,7).replace('-','')}`;
const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const todayDay = days[new Date(`${date}T12:00:00Z`).getUTCDay()];
const minutes = raw => { const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(raw); if (!m) throw new Error('Horario inválido'); return (m[3] ? Number(m[1]) % 12 + (m[3].toUpperCase()==='PM' ? 12 : 0) : Number(m[1]))*60+Number(m[2]); };
const time = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_');
async function get(endpoint) { const response=await fetch(BASE+endpoint); if (!response.ok) throw new Error(`${endpoint}: ${response.status}`); return response.json(); }
(async()=>{
 const [mpa,enrollments,students] = await Promise.all([get('/mpa'),get('/enrollments'),get('/students')]);
 const active = new Set(students.filter(s=>s.active!==false).map(s=>s.dni));
 const eligible = enrollments.filter(e=>e.academicStatus==='MATRICULADO'&&active.has(e.studentDni)&&(!e.groupId||e.groupId.startsWith(prefix)));
 const previousPeriod=mpa.periods.find(p=>p.id===prefix+'_period');
 const period = {id:prefix+'_period',name:'Presentación MGE · Octubre 2026',startDate:'2026-10-01',endDate:'2026-11-30',isActive:previousPeriod?.isActive===true,status:previousPeriod?.status||'Planificación'};
 const groups=[],tasks=[],changes=[];
 const sets = new Map();
 eligible.forEach(e=>{const key=JSON.stringify([e.programId,e.shift]);sets.set(key,[...(sets.get(key)||[]),e]);});
 for(const [key,members] of sets){
  const [careerId,shiftName]=JSON.parse(key);
  const shift=mpa.shifts.find(s=>s.name===shiftName), career=mpa.careers.find(c=>c.id===careerId);
  if(!shift||!career)throw new Error('Falta carrera o turno para configurar un grupo');
  const candidates=mpa.courses.filter(c=>c.careerId===careerId&&mpa.tasks.some(t=>t.courseId===c.id)).sort((a,b)=>(a.referenceCycle||1)-(b.referenceCycle||1)||a.code.localeCompare(b.code));
  const course=candidates.find(c=>mpa.tasks.some(t=>t.courseId===c.id&&t.dayOfWeek===todayDay))||candidates[0];
  if(!course)throw new Error(`No hay curso programado para ${career.name}`);
  const possible=mpa.tasks.filter(t=>t.courseId===course.id&&!t.id.startsWith(prefix));
  const baseTask=possible.find(t=>mpa.groups.find(g=>g.id===t.groupId)?.shiftId===shift.id)||possible[0];
  const sourceGroup=mpa.groups.find(g=>g.id===baseTask.groupId),sourceShift=mpa.shifts.find(s=>s.id===sourceGroup?.shiftId);
  if(!sourceGroup||!sourceShift)throw new Error('Falta grupo/turno de origen');
  const group={id:`${prefix}_${slug(careerId)}_${slug(shiftName)}`,name:`Presentación · ${career.name} · ${shift.name}`,careerId,periodId:period.id,shiftId:shift.id,cycle:course.referenceCycle||sourceGroup.cycle,capacity:Math.max(30,members.length)};
  groups.push(group);
  const delta=minutes(shift.startTime)-minutes(sourceShift.startTime);
  for(const source of possible.filter(t=>t.groupId===baseTask.groupId)){
   const start=minutes(source.startTime)+delta,end=minutes(source.endTime)+delta;
   if(start<minutes(shift.startTime)||end>minutes(shift.endTime)||start>=end)throw new Error('El horario no cabe en el turno de presentación');
   const {_id,createdAt,updatedAt,__v,...copy}=source;
   tasks.push({...copy,id:`${group.id}_${slug(course.code)}_${slug(source.sessionType)}`,groupId:group.id,startTime:time(start),endTime:time(end)});
  }
  members.forEach(e=>changes.push({dni:e.studentDni,programId:e.programId,shift:e.shift,previousGroupId:e.groupId,groupId:group.id}));
 }
 const allGroups=new Map([...mpa.groups,...groups].map(g=>[g.id,g]));
 const periodTasks=[...mpa.tasks.filter(t=>allGroups.get(t.groupId)?.periodId===period.id&&!tasks.some(n=>n.id===t.id)),...tasks];
 for(let i=0;i<periodTasks.length;i++)for(let j=i+1;j<periodTasks.length;j++){
  const a=periodTasks[i],b=periodTasks[j];
  if(a.dayOfWeek===b.dayOfWeek&&minutes(a.startTime)<minutes(b.endTime)&&minutes(b.startTime)<minutes(a.endTime)&&['groupId','teacherDni','classroomId'].some(k=>a[k]===b[k]))throw new Error('Cruce en los horarios de presentación');
 }
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',period:period.name,groups:groups.map(g=>({id:g.id,name:g.name,students:changes.filter(c=>c.groupId===g.id).length})),tasks:tasks.length,enrollmentsToAssign:changes.filter(c=>c.previousGroupId!==c.groupId).length},null,2));
 if(!apply)return;
 if(!process.env.MONGODB_URI)throw new Error('Falta MONGODB_URI');
 const connection=await mongoose.createConnection(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false}).asPromise();
 try{
  require('reflect-metadata');
  const schemas=require('../dist/mpa/schemas/academic-planning.schemas.js');
  const Period=connection.model('AcademicPeriod',schemas.AcademicPeriodSchema),Group=connection.model('AcademicGroup',schemas.AcademicGroupSchema),Task=connection.model('AcademicProgramming',schemas.AcademicProgrammingSchema);
  for(const [Model,rows] of [[Period,[period]],[Group,groups],[Task,tasks]])for(const row of rows)await new Model(row).validate();
  const folder=path.resolve(__dirname,'../../.presentation');await fs.mkdir(folder,{recursive:true});
  const backup=path.join(folder,`before-setup-${Date.now()}.json`);
  await fs.writeFile(backup,JSON.stringify({createdAt:new Date().toISOString(),periods:mpa.periods,groups:mpa.groups,tasks:mpa.tasks,enrollments,changes},null,2),{flag:'wx'});
  for(const [Model,rows] of [[Period,[period]],[Group,groups],[Task,tasks]])for(const row of rows)await Model.updateOne({id:row.id},{$set:row},{upsert:true,runValidators:true});
  const enrollmentCollection=connection.collection('enrollments');
  for(const change of changes){
   if(change.previousGroupId===change.groupId)continue;
   const result=await enrollmentCollection.updateOne({studentDni:change.dni,programId:change.programId,shift:change.shift,academicStatus:'MATRICULADO',...(change.previousGroupId?{groupId:change.previousGroupId}:{$or:[{groupId:{$exists:false}},{groupId:null},{groupId:''}]})},{$set:{groupId:change.groupId,updatedAt:new Date()}});
   if(result.matchedCount!==1)throw new Error('Una matrícula cambió durante la configuración; revise el respaldo antes de reintentar');
  }
  const created=[];
  // ECUS 018: no past-day or extraordinary creation. The authenticated API
  // validates the active period and teacher assignment again.
  if(process.env.ATTENDANCE_SETUP_TOKEN && period.isActive && period.status==='Activo') for(const group of groups){
   const task=tasks.find(t=>t.groupId===group.id&&t.dayOfWeek===todayDay);if(!task)continue;
   const r=await fetch(BASE+'/attendance-sessions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.ATTENDANCE_SETUP_TOKEN},body:JSON.stringify({programmingId:task.id,date,extraordinary:false,reason:''})});
   const data=await r.json();if(!r.ok)throw new Error(data.message||'No se pudo abrir la sesión de hoy');
   created.push({id:data._id,group:group.name,date:data.date,students:data.roster.length,marks:Object.keys(data.statusMap||{}).length});
  }
  else console.log('Programación configurada. Abra Nueva asistencia con su cuenta institucional en el panel; solo se admite hoy y periodo activo.');
  const initialBackups=(await fs.readdir(folder)).filter(name=>name.startsWith('before-setup-')).sort(); const originalBackup=initialBackups.length?path.join(folder,initialBackups[0]):backup;
  const manifest=path.join(folder,'presentation-setup.json');await fs.writeFile(manifest,JSON.stringify({period,groups,tasks,changes,sessions:created,backup:originalBackup},null,2));
  console.log(JSON.stringify({configured:true,backup,manifest,sessions:created},null,2));
 }finally{await connection.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
