/* ATENDIVOX — jogo de treinamento com dados 100% fictícios.
   Não grava no Supabase e não interfere na fila real da clínica. */
(() => {
  const $ = id => document.getElementById(id);
  const first = ['Ana','João','Maria','Pedro','Juliana','Lucas','Camila','Rafael','Beatriz','Gabriel','Mariana','Felipe','Larissa','Bruno','Patrícia','Thiago','Aline','Matheus','Isabela','Diego','Carolina','André','Letícia','Gustavo','Fernanda','Eduardo','Jéssica','Vinícius','Renata','Marcelo','Sofia','Caio','Amanda','Daniel','Priscila','Henrique','Bianca','Leandro','Natália','Rodrigo','Cláudia','Samuel','Vitória','Igor','Mônica','Davi','Elisa','Alexandre','Lívia','Fábio'];
  const last = ['Silva','Santos','Oliveira','Souza','Pereira','Costa','Rodrigues','Almeida','Nascimento','Lima','Araújo','Fernandes','Carvalho','Gomes','Martins','Rocha','Ribeiro','Alves','Monteiro','Mendes'];
  const scenarios = [
    {kind:'Consulta agendada',detail:'Chegou no horário e apresenta documento e confirmação do agendamento.',priority:'Normal',route:'recepcao',why:'Fluxo habitual: confirmar cadastro e encaminhar para a recepção.'},
    {kind:'Retorno',detail:'Informa que veio para retorno e apresenta orientação de agendamento.',priority:'Normal',route:'recepcao',why:'Retorno deve ser conferido no cadastro pela recepção.'},
    {kind:'Exame marcado',detail:'Chegou para realizar exame e trouxe o pedido solicitado.',priority:'Normal',route:'recepcao',why:'A recepção confere pedido, preparo e agenda conforme protocolo local.'},
    {kind:'Dificuldade de cadastro',detail:'Não encontrou o cadastro e precisa atualizar telefone e endereço.',priority:'Normal',route:'recepcao',why:'Atualização cadastral é tratada pela recepção.'},
    {kind:'Relato de mal-estar',detail:'Relata tontura e mal-estar enquanto aguarda. Não deve permanecer sozinho na fila.',priority:'Prioridade clínica',route:'equipe',why:'Acione imediatamente a equipe clínica para avaliação; não tente diagnosticar.'},
    {kind:'Queda na unidade',detail:'Informa que sofreu uma queda há poucos minutos dentro da unidade.',priority:'Prioridade clínica',route:'equipe',why:'Acione imediatamente a equipe clínica e siga o protocolo interno.'},
    {kind:'Dor intensa',detail:'Relata dor intensa e pede ajuda na recepção.',priority:'Prioridade clínica',route:'equipe',why:'Encaminhe imediatamente para avaliação da equipe clínica.'},
    {kind:'Falta de ar relatada',detail:'Relata dificuldade para respirar neste momento.',priority:'Emergência — acionar protocolo',route:'equipe',why:'Acione imediatamente a equipe clínica e o protocolo de emergência da unidade.'},
    {kind:'Medicação prescrita',detail:'Já passou por consulta e informa que recebeu prescrição para a sala de medicação.',priority:'Conforme prescrição',route:'medicacao',why:'Confirme a existência da prescrição e encaminhe à enfermagem.'},
    {kind:'Dúvida sobre horário',detail:'Deseja confirmar o horário de uma consulta futura.',priority:'Normal',route:'recepcao',why:'A recepção consulta a agenda e orienta o paciente.'},
    {kind:'Acompanhante',detail:'Chegou acompanhando uma pessoa e pergunta onde deve aguardar.',priority:'Normal',route:'recepcao',why:'Oriente conforme as regras de acompanhantes da clínica.'},
    {kind:'Triagem solicitada',detail:'A recepção concluiu o cadastro e o sistema indica que aguarda triagem.',priority:'Normal',route:'triagem',why:'Encaminhe à fila de triagem conforme o fluxo da clínica.'}
  ];
  const routes = [
    {id:'recepcao',label:'Recepção'},
    {id:'triagem',label:'Triagem'},
    {id:'equipe',label:'Acionar equipe clínica imediatamente'},
    {id:'medicacao',label:'Sala de medicação (com prescrição)'}
  ];
  const patients = Array.from({length:1000},(_,i)=> {
    const s=scenarios[i%scenarios.length];
    const fullName=first[i%first.length]+' '+last[Math.floor(i/first.length)%last.length]+' '+last[(i*7+3)%last.length];
    return {id:i+1,name:fullName,age:18+((i*17+11)%73),ticket:'CA'+String(545+i).padStart(3,'0'),...s};
  });
  let index=-1,score=0,answered=0,current=null,voiceURI='',captions=true,voices=[];
  const status = msg => { if($('gameStatus')) $('gameStatus').textContent=msg; };
  const caption = msg => { const el=$('gameCaption'); if(!el)return; el.textContent=msg; el.classList.toggle('hidden',!captions); };
  function loadVoices(){
    if(!('speechSynthesis' in window))return;
    voices=window.speechSynthesis.getVoices();
    const select=$('gameVoice'); if(!select)return;
    const old=voiceURI;
    const pt=voices.filter(v=>/^pt(-|_)/i.test(v.lang));
    select.innerHTML='<option value="">Voz padrão do aparelho</option>'+pt.map(v=>'<option value="'+v.voiceURI.replace(/"/g,'&quot;')+'">'+v.name+' · '+v.lang+'</option>').join('');
    if(pt.some(v=>v.voiceURI===old))select.value=old;
    voiceURI=select.value;
  }
  function speak(message){
    if(!('speechSynthesis' in window)){status('Este navegador não oferece voz automática.');return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(message); utterance.lang='pt-BR'; utterance.rate=Number($('gameRate')?.value||1);
    const selected=voices.find(v=>v.voiceURI===voiceURI); if(selected)utterance.voice=selected;
    window.speechSynthesis.speak(utterance);
  }
  function draw(){
    if(!current)return;
    $('gameTicket').textContent=current.ticket;
    $('gameName').textContent=current.name;
    $('gameMeta').textContent=current.age+' anos · '+current.kind+' · Caso fictício '+current.id+'/1000';
    $('gameDetail').textContent=current.detail;
    $('gamePriority').textContent='Prioridade esperada: '+current.priority;
    $('gameProgress').textContent='Caso '+(answered+1)+' de 1.000 · Pontos: '+score;
    $('gameChoices').innerHTML=routes.map(r=>'<button class="btn secondary game-choice" data-route="'+r.id+'">'+r.label+'</button>').join('');
    $('gameChoices').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.route)));
    $('gameFeedback').textContent='Escolha o próximo destino deste paciente.';
    $('gameNext').classList.add('hidden');
    caption(current.ticket+'. '+current.name+'. '+current.kind+'. '+current.detail);
    if(captions) $('gameCaption').classList.remove('hidden');
  }
  function next(){
    if(index+1>=patients.length){finish();return;}
    index++;current=patients[index];draw();
    if($('gameAutoVoice').checked)speak(current.name+'. '+current.kind+'. '+current.detail);
  }
  function answer(route){
    if(!current||$('gameNext').classList.contains('hidden')===false)return;
    answered++;
    const correct=route===current.route;
    if(correct)score+=10;
    const chosen=routes.find(r=>r.id===route)?.label||route;
    const expected=routes.find(r=>r.id===current.route)?.label||current.route;
    const feedback=(correct?'Resposta correta! +10 pontos. ':'Destino incorreto. ')+current.why+' Destino esperado: '+expected+'.';
    $('gameFeedback').textContent=feedback;
    $('gameProgress').textContent='Caso '+answered+' de 1.000 · Pontos: '+score;
    $('gameChoices').querySelectorAll('button').forEach(b=>{b.disabled=true;if(b.dataset.route===current.route)b.classList.add('green');});
    caption(feedback);
    speak(feedback);
    $('gameNext').classList.remove('hidden');
  }
  function finish(){
    current=null;
    $('gameTicket').textContent='FIM';
    $('gameName').textContent='Treinamento concluído';
    $('gameMeta').textContent=answered+' casos respondidos';
    $('gameDetail').textContent='Pontuação: '+score+' de '+(answered*10)+' pontos.';
    $('gamePriority').textContent=answered?Math.round(score/(answered*10)*100)+'% de acertos':'Nenhum caso respondido.';
    $('gameChoices').innerHTML='';
    $('gameFeedback').textContent='Você pode reiniciar para praticar novamente.';
    $('gameNext').classList.add('hidden');
    $('gameStart').classList.remove('hidden');
    caption('Treinamento concluído. Pontuação '+score+' pontos.');
  }
  function start(){index=-1;score=0;answered=0;$('gameStart').classList.add('hidden');next();}
  function init(){
    if(!$('trainingGame'))return;
    loadVoices();
    if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=loadVoices;
    $('gameStart').addEventListener('click',start);
    $('gameNext').addEventListener('click',next);
    $('gameSpeak').addEventListener('click',()=>{if(current)speak(current.name+'. '+current.kind+'. '+current.detail);});
    $('gameStopVoice').addEventListener('click',()=>window.speechSynthesis?.cancel());
    $('gameVoice').addEventListener('change',e=>voiceURI=e.target.value);
    $('gameCaptions').addEventListener('change',e=>{captions=e.target.checked;$('gameCaption').classList.toggle('hidden',!captions);});
    $('gameAutoVoice').addEventListener('change',e=>{if(e.target.checked&&current)speak(current.name+'. '+current.detail);});
    $('gameRate').addEventListener('change',()=>{});
    $('gameCount').textContent=patients.length.toLocaleString('pt-BR');
  }
  document.addEventListener('DOMContentLoaded',init);
})();
