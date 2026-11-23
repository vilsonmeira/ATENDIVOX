/* ATENDIVOX — módulo de prescrição, enfermagem e chamadas de medicação.
   Acesso às telas e aos registros é controlado também por RLS no Supabase. */
let medicationOrders = [];
let medicationAdminHistory = [];
let medicationRealtime = null;

const medEsc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const medRole = (...roles) => !!staff && roles.includes(staff.role);
const medRoom = () => (rooms || []).find(r => r.room_type === 'medicacao');
const medPatient = visitId => {
  const v = (visits || []).find(x => x.id === visitId);
  return v ? {name:v.patient?.full_name || 'Paciente', ticket:v.ticket_code || ''} : {name:'Paciente',ticket:''};
};
const medStatusText = s => ({pending:'Aguardando',called:'Chamado',in_progress:'Em atendimento',completed:'Concluída',cancelled:'Encerrada'}[s] || s);
const medOutcomeText = s => ({administered:'Administrado',refused:'Recusado pelo paciente',not_administered:'Não administrado',interrupted:'Interrompido'}[s] || s);

async function refreshMedicationData() {
  if (!staff?.clinic_id) return;
  const [orders, history] = await Promise.all([
    db.from('atendivox_medication_orders').select('*').eq('clinic_id', staff.clinic_id).order('created_at', {ascending:false}).limit(150),
    db.from('atendivox_medication_administrations').select('*').eq('clinic_id', staff.clinic_id).order('administered_at', {ascending:false}).limit(30)
  ]);
  if (orders.error) { console.error('ATENDIVOX medication orders:', orders.error); return; }
  if (history.error) console.error('ATENDIVOX medication history:', history.error);
  medicationOrders = orders.data || [];
  medicationAdminHistory = history.data || [];
  renderMedication();
}

function medicationCard(order) {
  const patient = medPatient(order.visit_id);
  let actions = '';
  if (medRole('admin','nursing')) {
    if (order.status === 'pending') actions = '<button class="btn" onclick="medicationCall(\''+order.id+'\')">Chamar senha</button>';
    if (order.status === 'called') actions = '<button class="btn" onclick="medicationStart(\''+order.id+'\')">Iniciar atendimento</button>';
    if (order.status === 'in_progress') actions = '<button class="btn green" onclick="medicationFinish(\''+order.id+'\',\'administered\')">Registrar administração</button> <button class="btn warn" onclick="medicationFinish(\''+order.id+'\',\'not_administered\')">Não administrado</button> <button class="btn secondary" onclick="medicationFinish(\''+order.id+'\',\'refused\')">Recusa</button>';
  }
  return '<div class="row between" style="padding:13px 8px;border-bottom:1px solid var(--line);gap:12px"><div style="min-width:220px;flex:1"><b>'+medEsc(patient.ticket)+' · '+medEsc(patient.name)+'</b><div>'+medEsc(order.medication_name)+' · '+medEsc(order.medication_type)+' · '+medEsc(order.dose)+'</div><div class="muted">'+medEsc(order.route)+' · '+medEsc(order.frequency || 'Frequência não informada')+' · '+medStatusText(order.status)+'</div>'+(order.scheduled_at?'<div class="muted">Previsto: '+new Date(order.scheduled_at).toLocaleString('pt-BR')+'</div>':'')+(order.instructions?'<div class="muted">Orientação: '+medEsc(order.instructions)+'</div>':'')+'</div><div class="row">'+actions+'</div></div>';
}

function renderMedication() {
  const pending = medicationOrders.filter(o => o.status === 'pending');
  const active = medicationOrders.filter(o => ['called','in_progress'].includes(o.status));
  const $med = id => document.getElementById(id);
  if ($med('medQueueCount')) $med('medQueueCount').textContent = pending.length + ' pendentes';
  if ($med('medPending')) $med('medPending').innerHTML = pending.map(medicationCard).join('') || '<div class="empty">Nenhuma medicação aguardando.</div>';
  if ($med('medActive')) $med('medActive').innerHTML = active.map(medicationCard).join('') || '<div class="empty">Nenhum paciente chamado ou em atendimento.</div>';
  if ($med('medHistory')) $med('medHistory').innerHTML = medicationAdminHistory.map(a => {
    const o = medicationOrders.find(x => x.id === a.order_id);
    const p = medPatient(a.visit_id);
    return '<div style="padding:10px;border-bottom:1px solid var(--line)"><b>'+medEsc(p.ticket)+' · '+medEsc(o?.medication_name || 'Medicação')+'</b> — '+medOutcomeText(a.outcome)+'<div class="muted">'+new Date(a.administered_at).toLocaleString('pt-BR')+' · '+medEsc(a.notes || 'Sem observações')+'</div></div>';
  }).join('') || '<div class="empty">Nenhum registro de administração.</div>';

  const visitSelect = $med('medVisit');
  if (visitSelect) {
    const current = (visits || []).filter(v => v.status === 'em_consulta');
    const previous = visitSelect.value;
    visitSelect.innerHTML = current.map(v => '<option value="'+v.id+'">'+medEsc(v.ticket_code)+' · '+medEsc(v.patient?.full_name)+'</option>').join('');
    if (current.some(v => v.id === previous)) visitSelect.value = previous;
    const submit = document.querySelector('#medOrderForm button[type="submit"], #medOrderForm button');
    if (submit) submit.disabled = !medRole('admin','doctor') || current.length === 0;
  }

  const latestMedCall = (calls || []).find(c => String(c.event_type || '').startsWith('medicacao_'));
  if ($med('tvMedCall')) $med('tvMedCall').textContent = latestMedCall
    ? 'Senha ' + (latestMedCall.code || '') + ' — Dirija-se à Sala de Medicação'
    : 'Nenhuma chamada de medicação.';
  if (!medicationRealtime && staff?.clinic_id) {
    medicationRealtime = db.channel('atendivox-medication-'+staff.clinic_id)
      .on('postgres_changes',{event:'*',schema:'public',table:'atendivox_medication_orders',filter:'clinic_id=eq.'+staff.clinic_id},refreshMedicationData)
      .on('postgres_changes',{event:'*',schema:'public',table:'atendivox_medication_administrations',filter:'clinic_id=eq.'+staff.clinic_id},refreshMedicationData)
      .subscribe();
    refreshMedicationData();
  }
}

async function updateMedicationStatus(order, status) {
  const {error} = await db.from('atendivox_medication_orders').update({status,updated_at:new Date().toISOString()}).eq('id',order.id);
  if (error) { alert('Não foi possível atualizar a fila: '+error.message); return false; }
  return true;
}
window.medicationCall = async id => {
  if (!medRole('admin','nursing')) return;
  const order = medicationOrders.find(o => o.id === id);
  const room = medRoom();
  if (!order || !room) { alert('A Sala de Medicação ainda não está configurada.'); return; }
  if (!await updateMedicationStatus(order,'called')) return;
  const {error} = await db.from('atendivox_call_events').insert({visit_id:order.visit_id,room_id:room.id,event_type:'medicacao_chamada'});
  if (error) alert('A fila foi atualizada, mas a chamada não foi registrada: '+error.message);
  await loadData();
  const p = medPatient(order.visit_id);
  if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance('Senha '+p.ticket+'. Dirija-se à Sala de Medicação.'); u.lang='pt-BR'; speechSynthesis.speak(u); }
};
window.medicationStart = async id => {
  if (!medRole('admin','nursing')) return;
  const order = medicationOrders.find(o => o.id === id);
  if (!order || !await updateMedicationStatus(order,'in_progress')) return;
  const room = medRoom();
  await db.from('atendivox_call_events').insert({visit_id:order.visit_id,room_id:room?.id || null,event_type:'medicacao_inicio'});
  await loadData();
};
window.medicationFinish = async (id,outcome) => {
  if (!medRole('admin','nursing')) return;
  const order = medicationOrders.find(o => o.id === id);
  if (!order) return;
  const question = outcome === 'administered'
    ? 'Informe lote/observações (opcional). Confirme a administração somente após realizá-la.'
    : 'Informe o motivo da não administração ou da recusa:';
  const notes = prompt(question);
  if (notes === null) return;
  const {error} = await db.from('atendivox_medication_administrations').insert({
    clinic_id:staff.clinic_id,visit_id:order.visit_id,order_id:order.id,outcome,
    administered_dose:order.dose,route:order.route,notes:notes.trim() || null,administered_by:staff.id
  });
  if (error) { alert('Não foi possível registrar: '+error.message); return; }
  if (!await updateMedicationStatus(order,outcome === 'administered' ? 'completed' : 'cancelled')) return;
  const room = medRoom();
  await db.from('atendivox_call_events').insert({visit_id:order.visit_id,room_id:room?.id || null,event_type:'medicacao_conclusao'});
  await loadData();
};

document.getElementById('medOrderForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const msg = document.getElementById('medOrderMsg');
  if (!medRole('admin','doctor')) { msg.textContent='Somente médico ou administrador pode registrar prescrição.'; return; }
  const visit = (visits || []).find(v => v.id === document.getElementById('medVisit').value);
  if (!visit) { msg.textContent='Selecione um paciente em consulta.'; return; }
  const payload = {
    clinic_id:staff.clinic_id,visit_id:visit.id,patient_id:visit.patient_id,
    medication_name:document.getElementById('medName').value.trim(),
    medication_type:document.getElementById('medType').value,
    dose:document.getElementById('medDose').value.trim(),
    route:document.getElementById('medRoute').value,
    frequency:document.getElementById('medFrequency').value.trim() || null,
    scheduled_at:document.getElementById('medScheduled').value ? new Date(document.getElementById('medScheduled').value).toISOString() : null,
    instructions:document.getElementById('medInstructions').value.trim() || null,
    prescribed_by:staff.id
  };
  msg.textContent='Salvando prescrição...';
  const {error} = await db.from('atendivox_medication_orders').insert(payload);
  if (error) { msg.textContent='Erro ao salvar prescrição: '+error.message; return; }
  msg.textContent='Prescrição enviada à fila da enfermagem.';
  event.target.reset();
  await refreshMedicationData();
});
