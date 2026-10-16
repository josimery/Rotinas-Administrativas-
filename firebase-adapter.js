import { firebaseConfig, adminUid } from './firebase-config.js';
let modules, app, auth, database, baseWorkspace;
let stopWatch=null, watchCallback=null;
const defaults=()=>({version:1,services:['Solicitação de veículo','Manutenção predial','Limpeza e conservação','Documentos e expedientes','Fiscalização de contratos','Outros serviços'],accent:'#c084fc',demands:[]});
export function configured(){return !!(firebaseConfig?.apiKey&&firebaseConfig?.databaseURL&&firebaseConfig?.projectId&&adminUid)}
async function ready(){
 if(!configured())throw Error('Configuração inicial pendente: falta conectar o Firebase da Josi. Ainda não há login disponível.');
 if(!modules){modules=Promise.all([
 import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js')
 ]).then(([apps,identity,storage])=>({apps,identity,storage}));}
 const m=await modules;
 if(!app){app=m.apps.initializeApp(firebaseConfig);auth=m.identity.getAuth(app);database=m.storage.getDatabase(app);await m.identity.setPersistence(auth,m.identity.browserSessionPersistence)}
 await auth.authStateReady();return m;
}
const snapState=raw=>{const s=raw?.state;if(!s)return defaults();return {...s,demands:Object.values(s.demands||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(d=>({...d,files:d.files||[]}))}};
function toDatabaseState(state){const demands={};for(const d of state.demands)demands[d.id]=d;return {...state,demands}}
async function profile(){const m=await ready(),u=auth.currentUser;if(!u)return null;if(u.uid===adminUid)return {id:u.uid,name:u.displayName||'Josi',role:'admin'};const s=await m.storage.get(m.storage.ref(database,'members/'+u.uid));const p=s.val();if(!p?.active){await m.identity.signOut(auth);throw Error('Seu acesso ainda não foi autorizado pela administradora.')}return {id:u.uid,name:p.name,role:'member'}}
function needAdmin(){if(!auth.currentUser||auth.currentUser.uid!==adminUid)throw Error('Apenas a administradora pode realizar esta ação.')}
export async function watchChanges(callback){const m=await ready();needAdmin();if(stopWatch)stopWatch();watchCallback=callback;stopWatch=m.storage.onValue(m.storage.ref(database,'workspace'),()=>watchCallback?.(),error=>callback(error));}
export function stopWatching(){stopWatch?.();stopWatch=null;watchCallback=null}
export async function api(path,options={}){
 const m=await ready(),{storage:s,identity:i}=m;const method=options.method||'GET',data=options.body?JSON.parse(options.body):{};
 const ref=path=>s.ref(database,path);
 try{
 if(path==='/api/me')return {user:await profile(),setup:false};
 if(path==='/api/login'){await i.signInWithEmailAndPassword(auth,data.login.trim(),data.password);const p=await profile();if(!p)throw Error('Acesso não autorizado.');return {ok:true}}
 if(path==='/api/logout'){stopWatching();await i.signOut(auth);baseWorkspace=undefined;return {ok:true}}
 if(!auth.currentUser)throw Error('Entre com seu e-mail e senha.');
 if(path==='/api/catalog'){const r=await s.get(ref('workspace/state/services'));return {services:r.val()||defaults().services}}
 if(path==='/api/revision'){needAdmin();const r=await s.get(ref('workspace/revision'));return {revision:r.val()||0}}
 if(path==='/api/state'&&method==='GET'){
  needAdmin();let r=await s.get(ref('workspace'));
  if(!r.exists()){await s.runTransaction(ref('workspace'),current=>current||{revision:0,state:toDatabaseState(defaults())},{applyLocally:false});r=await s.get(ref('workspace'))}
  baseWorkspace=r.val();return {revision:baseWorkspace.revision||0,state:snapState(baseWorkspace)};
 }
 if(path==='/api/state'&&method==='POST'){
  needAdmin();const expected=JSON.stringify(baseWorkspace??null);
  const transaction=await s.runTransaction(ref('workspace'),current=>{
   if(JSON.stringify(current??null)!==expected)return;
   return {revision:(current?.revision||0)+1,state:toDatabaseState(data.state)};
  },{applyLocally:false});
  if(!transaction.committed)throw Error('Outra pessoa atualizou as demandas. Sua edição não foi salva. Copie seu texto, feche a edição e tente novamente após atualizar.');
  baseWorkspace=transaction.snapshot.val();
  // Audit is supplementary: a logging failure must not misreport a saved demand.
  const entry=s.push(ref('audit'));s.set(entry,{user_name:auth.currentUser.displayName||'Josi',event:'Atualizou o quadro administrativo',created_at:Date.now()/1000}).catch(()=>{});
  return {revision:baseWorkspace.revision};
 }
 if(path==='/api/demands'){
  const p=await profile(),newRef=s.push(ref('workspace/state/demands'));
  const d={...data.demand,id:newRef.key,status:'Recebida',createdBy:auth.currentUser.uid,createdName:p.name,createdAt:Date.now(),updatedAt:new Date().toISOString()};
  await s.set(newRef,d);return {ok:true,reference:newRef.key};
 }
 if(path==='/api/users'&&method==='GET'){needAdmin();const r=await s.get(ref('members'));return {users:Object.entries(r.val()||{}).map(([id,u])=>({id,...u}))}}
 if(path==='/api/users'){
  needAdmin();if(data.action==='disable'){if(data.id===adminUid)throw Error('Seu acesso de administradora não pode ser desativado.');await s.update(ref('members/'+data.id),{active:false});return {ok:true}}
  if(data.password.length<12)throw Error('Use uma senha com pelo menos 12 caracteres.');
  const secondary=m.apps.initializeApp(firebaseConfig,'member-'+crypto.randomUUID());const secondaryAuth=i.getAuth(secondary);let created=null;
  try{await i.setPersistence(secondaryAuth,i.inMemoryPersistence);const account=await i.createUserWithEmailAndPassword(secondaryAuth,data.login.trim(),data.password);created=account.user;await i.updateProfile(created,{displayName:data.name});await s.set(ref('members/'+created.uid),{name:data.name,login:data.login.trim(),role:'member',active:true});return {ok:true}}
  catch(error){if(created)await i.deleteUser(created).catch(()=>{});throw error}
  finally{await i.signOut(secondaryAuth).catch(()=>{});await m.apps.deleteApp(secondary)}
 }
 if(path==='/api/password'){const u=auth.currentUser;await i.reauthenticateWithCredential(u,i.EmailAuthProvider.credential(u.email,data.current));await i.updatePassword(u,data.password);stopWatching();await i.signOut(auth);return {ok:true}}
 if(path==='/api/audit'){needAdmin();const r=await s.get(s.query(ref('audit'),s.orderByChild('created_at'),s.limitToLast(100)));return {events:Object.values(r.val()||{}).sort((a,b)=>b.created_at-a.created_at)}}
 throw Error('Operação não encontrada.');
 }catch(error){const code=error?.code||'';if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))throw Error('E-mail ou senha incorretos.');if(code.includes('email-already-in-use'))throw Error('Este e-mail já tem cadastro neste projeto.');if(code.includes('permission-denied')||code==='PERMISSION_DENIED')throw Error('Acesso negado. Confira as permissões da equipe e as regras do Firebase.');if(code.includes('operation-not-allowed'))throw Error('Ative o acesso por e-mail e senha no Firebase Authentication.');if(code.includes('network-request-failed'))throw Error('Sem conexão com o Firebase. Confira sua internet.');throw error}
}

export { snapState, toDatabaseState };
