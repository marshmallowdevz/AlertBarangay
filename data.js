const STORE_KEY = 'alertBarangay.data.v1';
const SESSION_KEY = 'alertBarangay.session.v1';
const today = new Date();
const daysAgo = (n, hour = 9) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 20, 0, 0);
  return d.toISOString();
};
const seed = () => ({
  admin: { name: 'Juan M. Dela Cruz', email: 'admin@alertbarangay.local', contact: '+63 917 555 0101', password: 'Admin123!', picture: '' },
  reports: [
    { id:'IR-2026-0842', title:'Residential fire', category:'Fire', description:'Smoke reported from a residential structure. Responders requested to check the area.', location:'Zone 3, Purok 2', lat:14.5995, lng:120.9842, severity:'High', status:'Submitted', residentId:'RS-1001', createdAt:daysAgo(0,9), assignedTo:'', remarks:'', history:[], attachment:'' },
    { id:'IR-2026-0841', title:'Road obstruction', category:'Infrastructure', description:'A fallen branch is blocking one lane after overnight rain.', location:'Rizal Street', lat:14.6010, lng:120.9874, severity:'Medium', status:'In Progress', residentId:'RS-1002', createdAt:daysAgo(0,8), assignedTo:'Response Team A', remarks:'', history:[], attachment:'' },
    { id:'IR-2026-0840', title:'Medical assistance', category:'Medical Emergency', description:'Resident requests assistance for an older adult feeling unwell.', location:'Zone 1, Purok 5', lat:14.5972, lng:120.9816, severity:'Critical', status:'Verified', residentId:'RS-1003', createdAt:daysAgo(0,7), assignedTo:'Health Team', remarks:'Dispatch health team for assessment.', history:[], attachment:'' },
    { id:'IR-2026-0839', title:'Street light outage', category:'Public Safety', description:'Street light is not working near the corner.', location:'Bonifacio Avenue', lat:14.6033, lng:120.9807, severity:'Low', status:'Resolved', residentId:'RS-1004', createdAt:daysAgo(1,22), assignedTo:'Maintenance Team', remarks:'Bulb replaced and tested.', history:[], attachment:'' },
    { id:'IR-2026-0838', title:'Standing water', category:'Flood', description:'Water is accumulating beside the drainage canal.', location:'Purok 4, Riverside', lat:14.5948, lng:120.9882, severity:'High', status:'Under Review', residentId:'RS-1001', createdAt:daysAgo(2,16), assignedTo:'', remarks:'', history:[], attachment:'' },
    { id:'IR-2026-0837', title:'Noise concern', category:'General', description:'Late evening noise disturbance reported by neighbors.', location:'Zone 2, Mabini Street', lat:14.6060, lng:120.9851, severity:'Low', status:'Closed', residentId:'RS-1005', createdAt:daysAgo(4,20), assignedTo:'Tanod Team', remarks:'Matter resolved with residents.', history:[], attachment:'' },
    { id:'IR-2026-0836', title:'Damaged drainage cover', category:'Infrastructure', description:'A broken cover presents a hazard to pedestrians.', location:'Purok 1, Main Road', lat:14.5922, lng:120.9793, severity:'Medium', status:'Verified', residentId:'RS-1002', createdAt:daysAgo(8,11), assignedTo:'Engineering Team', remarks:'', history:[], attachment:'' },
    { id:'IR-2026-0835', title:'Suspicious activity', category:'Crime or Security', description:'Unfamiliar activity reported near the community center.', location:'Barangay Hall vicinity', lat:14.6003, lng:120.9780, severity:'Medium', status:'Rejected', residentId:'RS-1003', createdAt:daysAgo(12,18), assignedTo:'', remarks:'Duplicate report; no incident confirmed.', history:[], attachment:'' }
  ],
  residents: [
    {id:'RS-1001',name:'Maria Santos',email:'maria.santos@example.test',phone:'+63 917 222 0101',address:'Purok 2, Zone 3',status:'Active',createdAt:daysAgo(250),restricted:false},
    {id:'RS-1002',name:'Pedro Reyes',email:'pedro.reyes@example.test',phone:'+63 917 222 0102',address:'Rizal Street, Zone 2',status:'Active',createdAt:daysAgo(190),restricted:false},
    {id:'RS-1003',name:'Liza Garcia',email:'liza.garcia@example.test',phone:'+63 917 222 0103',address:'Purok 5, Zone 1',status:'Active',createdAt:daysAgo(120),restricted:false},
    {id:'RS-1004',name:'Carlo Mendoza',email:'carlo.mendoza@example.test',phone:'+63 917 222 0104',address:'Bonifacio Avenue',status:'Active',createdAt:daysAgo(90),restricted:false,restrictionHistory:[]},
    {id:'RS-1005',name:'Ana Cruz',email:'ana.cruz@example.test',phone:'+63 917 222 0105',address:'Mabini Street, Zone 2',status:'Restricted',createdAt:daysAgo(60),restricted:true,restrictionHistory:[{status:'Restricted',reason:'Sample record for admin demo',admin:'Juan M. Dela Cruz',date:daysAgo(20)}]}
  ],
  alerts: [
    {id:'EA-2026-003',title:'Heavy rainfall warning',category:'Severe Weather',severity:'Critical',location:'Entire Barangay',details:'Flash flood advisory. Residents in low-lying areas should prepare to move to higher ground.',instructions:'Keep emergency supplies ready and follow official barangay instructions.',status:'Published',createdAt:daysAgo(0,8),image:''},
    {id:'EA-2026-002',title:'Scheduled power interruption',category:'General Advisory',severity:'Medium',location:'Specific Purok — Zone 2 & 3',details:'Scheduled maintenance by the local utility provider.',instructions:'Unplug sensitive equipment before the interruption.',status:'Published',createdAt:daysAgo(0,7),image:''}
  ],
  activity: [], notifications: [], archives: [],
  settings: { notifications:{reports:true,alerts:true,residents:true}, maintenance:{'Admin Website':{enabled:false,title:'Scheduled maintenance',message:'We are making improvements. Please check back soon.',start:'',end:''},'Official Page':{enabled:false,title:'',message:'',start:'',end:''},'Resident/User Page':{enabled:false,title:'',message:'',start:'',end:''}}, maintenanceHistory:[] }
});

function read() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) { const initial = seed(); [...initial.reports,...initial.residents,...initial.alerts].forEach(record=>record.sample=true); localStorage.setItem(STORE_KEY, JSON.stringify(initial)); return initial; }
    const parsed = JSON.parse(raw);
    const initial = seed();
    const residents=(parsed.residents||initial.residents).map(r=>({...r,status:r.restricted&&r.status==='Active'?'Restricted':r.status==='Inactive'?'Active':r.status||'Active',restricted:(r.restricted||r.status==='Restricted'||r.status==='Blocked'),restrictionHistory:r.restrictionHistory||[]}));
    return {...initial, ...parsed, residents, settings:{...initial.settings,...parsed.settings,notifications:{...initial.settings.notifications,...parsed.settings?.notifications},maintenance:{...initial.settings.maintenance,...parsed.settings?.maintenance}}};
  } catch (error) {
    console.error('Could not read local demo data.', error);
    return seed();
  }
}
let state = read();
const listeners = new Set();
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); listeners.forEach(fn => fn()); }
  catch (error) { console.error('Could not save local demo data.', error); throw new Error('Browser storage is full or unavailable. Remove large attachments and try again.'); }
}
function nextId(prefix, list) {
  const year = new Date().getFullYear();
  const used=new Set(list.map(row=>row.id));
  let seq=String(Date.now()).slice(-7);
  while(used.has(`${prefix}-${year}-${seq}`)) seq=String(Number(seq)+1).padStart(7,'0');
  return `${prefix}-${year}-${seq}`;
}
function addActivity(action, affected) {
  const session = getSession();
  const row = {id:`ACT-${Date.now()}`,admin:session?.name || state.admin.name,action,affected,date:new Date().toISOString()};
  state.activity.unshift(row);
  const lower=action.toLowerCase();
  const preference=lower.includes('report')?state.settings.notifications?.reports:lower.includes('resident')?state.settings.notifications?.residents:lower.includes('alert')?state.settings.notifications?.alerts:true;
  if(preference!==false) state.notifications.unshift({id:`NT-${Date.now()}`,message:`${action}: ${affected}`,date:row.date,read:false});
}
function commit(action, affected) { addActivity(action, affected); persist(); }
function requireSession() {
  const session=getSession();
  if(!session) throw new Error('Sign in is required for this action.');
  return session;
}
function requireAdministrator() {
  const session=requireSession();
  if(session.role!=='Administrator'||session.email?.toLowerCase()!==state.admin.email.toLowerCase()) throw new Error('Administrator access is required for this action.');
  return session;
}
function requireReportStaff() {
  const session=requireSession();
  if(!['Administrator','Official'].includes(session.role)) throw new Error('Only Officials or Administrators can perform report-management actions.');
  return session;
}
function requireOwnedSubmission(id,session) {
  const report=state.reports.find(r=>r.id===id);
  if(!report) throw new Error('Report not found.');
  if(!session.residentId||report.residentId!==session.residentId) throw new Error('Residents can only modify their own submissions.');
  if(report.status!=='Submitted') throw new Error('Only submitted reports can be edited or cancelled by a Resident.');
  return report;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

const store = {
  get: () => { requireAdministrator(); return state; },
  loginInfo: () => ({email:state.admin.email,password:state.admin.password}),
  listReports: () => {requireReportStaff();return clone(state.reports);},
  getReport: id => {const session=requireSession();if(session.role==='Resident'){const report=state.reports.find(r=>r.id===id);if(!report||report.residentId!==session.residentId)throw new Error('Residents can only view their own submissions.');return clone(report);}if(!['Administrator','Official'].includes(session.role))throw new Error('Report access is not permitted.');const report=state.reports.find(r=>r.id===id);if(!report)throw new Error('Report not found.');return clone(report);},
  listOwnReports: () => {const session=requireSession();if(session.role!=='Resident'||!session.residentId)throw new Error('Resident report access is not permitted.');return clone(state.reports.filter(r=>r.residentId===session.residentId));},
  subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
  reset: () => { requireAdministrator(); state = seed(); persist(); },
  login(email,password,remember=true) {
    if (email.trim().toLowerCase() !== state.admin.email.toLowerCase() || password !== state.admin.password) return false;
    const session={name:state.admin.name,email:state.admin.email,role:'Administrator',at:new Date().toISOString()};
    try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY,JSON.stringify(session)); } catch {}
    addActivity('Admin login',state.admin.email); persist(); return true;
  },
  logout() { addActivity('Admin logout',state.admin.email); persist(); localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); },
  session: getSession,
  updateProfile(values) { requireAdministrator();state.admin={...state.admin,...values}; try { const raw=localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY); if(raw){const session=JSON.parse(raw);session.name=state.admin.name;session.email=state.admin.email;(localStorage.getItem(SESSION_KEY)?localStorage:sessionStorage).setItem(SESSION_KEY,JSON.stringify(session));} } catch {} commit('Updated admin profile',state.admin.email); },
  changePassword(oldPassword,newPassword) { requireAdministrator();if(state.admin.password!==oldPassword) throw new Error('Current password is incorrect.'); state.admin.password=newPassword; commit('Changed demo account password',state.admin.email); },
  saveSettings(settings) { requireAdministrator();state.settings={...state.settings,...settings}; commit('Updated settings','Settings'); },
  saveMaintenance(name,config) { requireAdministrator();if(!state.settings.maintenance[name])throw new Error('Unknown maintenance platform.');state.settings.maintenance[name]={...config}; state.settings.maintenanceHistory.unshift({name,...config,changedAt:new Date().toISOString()}); commit(`Updated ${name} maintenance`,name); },
  saveReport(values,id=null) {
    const session=requireSession();
    if(session.role==='Resident') {
      if(id) {
        const report=requireOwnedSubmission(id,session);
        const editable={};
        for(const key of ['title','category','description','location','lat','lng','attachment']) if(values[key]!==undefined) editable[key]=values[key];
        Object.assign(report,editable,{updatedAt:new Date().toISOString()});
        report.history??=[];report.history.unshift({date:new Date().toISOString(),admin:session.name,changes:JSON.stringify(editable)});
        commit('Resident edited own submission',id);return id;
      }
      const residentId=session.residentId;
      if(!residentId||!state.residents.some(r=>r.id===residentId)) throw new Error('Resident account could not be verified.');
      values={...values,residentId,status:'Submitted',assignedTo:'',remarks:''};
    } else if(!['Administrator','Official'].includes(session.role)) throw new Error('This role cannot submit or manage reports.');
    if(session.role==='Official'&&!id) values={...values,status:'Submitted'};
    const duplicate=state.reports.find(r=>r.id!==id && r.title.toLowerCase()===values.title.toLowerCase() && r.location.toLowerCase()===values.location.toLowerCase() && r.status!=='Rejected');
    if(duplicate) throw new Error(`A similar report already exists (${duplicate.id}).`);
    if(id){const i=state.reports.findIndex(r=>r.id===id); if(i<0) throw new Error('Report not found.');if(session.role==='Official'&&values.status!==undefined&&values.status!==state.reports[i].status)throw new Error('Only Administrators can change report status.');state.reports[i]={...state.reports[i],...values,updatedAt:new Date().toISOString()};commit('Updated report',id);return id;}
    const record={...values,id:nextId('IR',[...state.reports,...state.archives]),createdAt:new Date().toISOString(),history:[]};state.reports.unshift(record);commit('Created report',record.id);return record.id;
  },
  updateReport(id,values,action='Updated report') {const session=requireReportStaff();const r=state.reports.find(x=>x.id===id);if(!r)throw new Error('Report not found.');if(session.role==='Official'&&values.status!==undefined&&values.status!==r.status)throw new Error('Only Administrators can change report status.');r.history??=[];const changes={...values};if(String(changes.attachment||'').startsWith('data:'))changes.attachment='[local image attachment updated]';r.history.unshift({date:new Date().toISOString(),admin:session.name,changes:JSON.stringify(changes)});Object.assign(r,values,{updatedAt:new Date().toISOString()});commit(action,id); },
  cancelResidentReport(id,reason='Cancelled by Resident') {const session=requireSession();if(session.role!=='Resident')throw new Error('Only the submitting Resident can cancel a submission.');const report=requireOwnedSubmission(id,session);report.status='Cancelled';report.history??=[];report.history.unshift({date:new Date().toISOString(),admin:session.name,changes:reason});commit('Resident cancelled own submission',id);},
  archiveReport(id) { requireAdministrator();const i=state.reports.findIndex(r=>r.id===id);if(i<0)throw new Error('Report not found.');const [r]=state.reports.splice(i,1);state.archives.unshift({...r,archivedAt:new Date().toISOString()});commit('Archived report',id); },
  restoreReport(id) { requireAdministrator();const i=state.archives.findIndex(r=>r.id===id);if(i<0)throw new Error('Archived report not found.');const [r]=state.archives.splice(i,1);delete r.archivedAt;state.reports.unshift(r);commit('Restored report',id); },
  deleteArchive(id) { requireAdministrator();if(!confirm('Permanently delete this archived record? This cannot be undone.'))return false;state.archives=state.archives.filter(r=>r.id!==id);commit('Permanently deleted archived report',id);return true; },
  listResidents() {requireAdministrator();return clone(state.residents);},
  saveResident(values,id=null) { requireAdministrator();if(id){const r=state.residents.find(x=>x.id===id);if(!r)throw new Error('Resident not found.');if(state.residents.some(x=>x.id!==id&&x.email.toLowerCase()===values.email.toLowerCase()))throw new Error('A resident with this email already exists.');Object.assign(r,{name:values.name,email:values.email,phone:values.phone,address:values.address});commit('Updated resident account',id);return id;}if(state.residents.some(r=>r.email.toLowerCase()===values.email.toLowerCase()))throw new Error('A resident with this email already exists.');const record={...values,status:'Active',id:`RS-${Date.now().toString().slice(-7)}`,createdAt:new Date().toISOString(),restricted:false,restrictionHistory:[]};state.residents.unshift(record);commit('Created resident account',record.id);return record.id; },
  setResidentStatus(id,status,reason) {requireAdministrator();if(!['Active','Restricted','Blocked'].includes(status))throw new Error('Invalid resident account status.');const r=state.residents.find(x=>x.id===id);if(!r)throw new Error('Resident not found.');if(status!=='Active'&&!String(reason||'').trim())throw new Error('A reason is required.');const prior=r.status||'Active';if(prior===status)throw new Error(`This account is already ${status.toLowerCase()}.`);r.status=status;r.restricted=status==='Restricted'||status==='Blocked';r.restrictionHistory??=[];const session=requireAdministrator();const entry={status,reason:String(reason||'Account reactivated by administrator.').trim(),admin:session.name,date:new Date().toISOString()};r.restrictionHistory.unshift(entry);commit(`${status==='Active'?'Reactivated':status==='Blocked'?'Blocked':'Restricted'} resident account`,`${id} — ${entry.reason}`);return entry;},
  saveAlert(values,id=null) { requireAdministrator();if(id){const a=state.alerts.find(x=>x.id===id);if(!a)throw new Error('Alert not found.');Object.assign(a,values);commit('Updated emergency alert',id);return id;}if(state.alerts.some(a=>a.status!=='Archived'&&a.title.toLowerCase()===values.title.toLowerCase()&&a.location.toLowerCase()===values.location.toLowerCase()))throw new Error('A similar alert already exists for this location.');const record={...values,id:`EA-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`,createdAt:new Date().toISOString(),status:values.status||'Draft'};state.alerts.unshift(record);commit(record.status==='Published'?'Published emergency alert':'Created emergency alert draft',record.id);return record.id; },
  updateAlert(id,values,action) {requireAdministrator();const a=state.alerts.find(x=>x.id===id);if(!a)throw new Error('Alert not found.');Object.assign(a,values);commit(action,id);},
  deleteDraft(id) {requireAdministrator();const a=state.alerts.find(x=>x.id===id);if(!a||a.status!=='Draft')throw new Error('Only drafts can be deleted.');if(!confirm('Delete this alert draft?'))return false;state.alerts=state.alerts.filter(x=>x.id!==id);commit('Deleted alert draft',id);return true;},
  markNotificationRead(id){requireAdministrator();const notification=state.notifications.find(n=>n.id===id);if(notification&&!notification.read){notification.read=true;persist();}},
  markNotificationsRead(){requireAdministrator();state.notifications.forEach(n=>n.read=true);persist();},
  setAdminName(name){requireAdministrator();state.admin.name=name;persist();}
};
function getSession(){try{const session=JSON.parse(localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||'null');if(!session)return null;if(!session.role)session.role=session.email?.toLowerCase()===state.admin.email.toLowerCase()?'Administrator':'Resident';return session;}catch{return null;}}
if (typeof window !== 'undefined') window.addEventListener?.('storage', event => {
  if (event.key !== STORE_KEY) return;
  state = read();
  listeners.forEach(fn => fn());
});
if (typeof window !== 'undefined') window.BarangayStore = { store };
