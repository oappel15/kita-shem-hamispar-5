/* Kita · שם המספר (כיתה ה׳) – deck controller. Framework adapted from the Kita deck:
   navigation (keys, clicks, swipe), phase timer, teacher notes (code 1010). Lesson tasks: sorting, error hunt, quiz, flip cards, TTS. */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var PFX="kitaShm5num";
var slides=$$(".slide"),cur=-1,N=slides.length;
var bc=null;try{bc=new BroadcastChannel("kita-shem-hamispar-5");}catch(e){}

/* ---------- navigation ---------- */
function idx(key){if(key==null)return -1;var n=parseInt(key,10);if(String(n)===String(key))return Math.max(0,Math.min(N-1,n-1));for(var i=0;i<N;i++)if(slides[i].id===key)return i;return -1;}
function go(i){
  i=Math.max(0,Math.min(N-1,i));if(i===cur)return;
  slides.forEach(function(s,k){var on=k===i;s.classList.toggle("active",on);s.setAttribute("aria-hidden",on?"false":"true");if(on){s.removeAttribute("inert");}else{s.setAttribute("inert","");}});
  cur=i;var s=slides[i];
  $("#counter").textContent=(i+1)+" / "+N;$("#bar").style.width=((i+1)/N*100)+"%";
  $("#prev").disabled=i===0;$("#next").disabled=i===N-1;
  $("#phase").textContent=s.getAttribute("data-phase")||"";
  $("#announce").textContent="שקופית "+(i+1)+" מתוך "+N+": "+(s.getAttribute("aria-label")||"");
  try{history.replaceState(null,"","#"+s.id);}catch(e){}
  s.scrollTop=0;
  timerSlide();renderNotes();
  try{localStorage.setItem(PFX+"Slide",s.id);}catch(e){}
  if(bc)bc.postMessage({slide:s.id,n:i+1});
  if(window.speechSynthesis)try{speechSynthesis.cancel();}catch(e){}
}
function next(){go(cur+1);}function prev(){go(cur-1);}
$("#next").addEventListener("click",next);$("#prev").addEventListener("click",prev);
document.addEventListener("keydown",function(e){
  if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey)return;
  if($("#gate").open)return;
  var t=e.target,tag=(t.tagName||"").toLowerCase();
  if(tag==="input"||tag==="textarea"||tag==="select"||t.isContentEditable)return;
  var onCtrl=tag==="button"||tag==="a"||tag==="summary"||t.getAttribute("role")==="button";
  switch(e.key){
    case "ArrowRight":case "ArrowDown":case "PageDown":next();e.preventDefault();break;
    case "ArrowLeft":case "ArrowUp":case "PageUp":prev();e.preventDefault();break;
    case " ":case "Enter":if(onCtrl)return;next();e.preventDefault();break;
    case "Home":go(0);e.preventDefault();break;
    case "End":go(N-1);e.preventDefault();break;
    case "f":case "F":case "כ":toggleFS();break;
    case "n":case "N":case "מ":openNotes();break;
  }
});
var NONAV="button,a,input,label,select,textarea,summary,details,table,.opt,.card,.bin,.sent,.quiz,.flip,[data-nonav]";
$("#deck").addEventListener("click",function(e){
  var pt=e.pointerType;if(pt&&pt!=="mouse")return;
  if(e.target.closest(NONAV))return;
  var sel=window.getSelection&&getSelection();if(sel&&!sel.isCollapsed)return;
  next();
});
var tx=null,ty=0,tt=0;
$("#deck").addEventListener("touchstart",function(e){if(e.target.closest(".card,.sort-bank,.bins,input")){tx=null;return;}tx=e.touches[0].clientX;ty=e.touches[0].clientY;tt=Date.now();},{passive:true});
$("#deck").addEventListener("touchend",function(e){if(tx==null)return;var dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=null;
  /* RTL: finger moving left→right (dx>0) = next */
  if(Math.abs(dx)>50&&Math.abs(dx)>1.5*Math.abs(dy)&&Date.now()-tt<900){if(dx>0)next();else prev();}},{passive:true});
document.addEventListener("click",function(e){var a=e.target.closest("[data-goto]");if(!a)return;var i=idx(a.getAttribute("data-goto"));if(i>=0){e.preventDefault();go(i);}});
addEventListener("hashchange",function(){var i=idx(location.hash.slice(1));if(i>=0)go(i);});
function toggleFS(){try{if(!document.fullscreenElement){document.documentElement.requestFullscreen();}else{document.exitFullscreen();}}catch(e){}}
$("#fs-btn").addEventListener("click",toggleFS);
if(!document.documentElement.requestFullscreen)$("#fs-btn").hidden=true;

/* ---------- timer ---------- */
var tLeft=0,tRun=null,tBtn=$("#timer-btn"),tOut=$("#timer-out");
function fmt(sec){sec=Math.max(0,Math.round(sec));return Math.floor(sec/60)+":"+("0"+sec%60).slice(-2);}
function timerSlide(){if(tRun)return;var m=parseFloat(slides[cur].getAttribute("data-min")||"0");tLeft=m*60;tOut.textContent=fmt(tLeft);tBtn.classList.remove("done");tBtn.disabled=!m;tBtn.setAttribute("aria-label",m?("הפעלת שעון של "+m+" דקות לשלב"):"אין שעון בשקופית הזו");}
tBtn.addEventListener("click",function(){
  if(tRun){clearInterval(tRun);tRun=null;tBtn.classList.remove("running");return;}
  if(tLeft<=0)timerSlide();var end=Date.now()+tLeft*1000;tBtn.classList.add("running");tBtn.classList.remove("done");
  tRun=setInterval(function(){tLeft=(end-Date.now())/1000;tOut.textContent=fmt(tLeft);if(tLeft<=0){clearInterval(tRun);tRun=null;tBtn.classList.remove("running");tBtn.classList.add("done");}},250);
});
$("#timer-reset").addEventListener("click",function(){if(tRun){clearInterval(tRun);tRun=null;}tBtn.classList.remove("running","done");timerSlide();});

/* ---------- reveal buttons + flip cards ---------- */
$$("[data-reveal]").forEach(function(b){b.addEventListener("click",function(){var box=document.getElementById(b.getAttribute("data-reveal")),open=box.hidden;box.hidden=!open;b.setAttribute("aria-expanded",open?"true":"false");});});
$$(".flip").forEach(function(b){b.addEventListener("click",function(){var open=b.getAttribute("aria-expanded")!=="true";b.setAttribute("aria-expanded",open?"true":"false");$(".a",b).hidden=!open;});});

/* ---------- read-aloud of the number table (Web Speech, he-IL) ---------- */
(function(){var btn=$("#say-table"),msg=$("#say-msg");if(!btn)return;
  if(!("speechSynthesis" in window)){btn.hidden=true;return;}
  btn.addEventListener("click",function(){
    if(speechSynthesis.speaking){speechSynthesis.cancel();btn.textContent="🔊 הקראת הטבלה";return;}
    var rows=$$("#gender tbody tr").map(function(tr){var td=tr.querySelectorAll("td");return td[1].textContent+". "+td[2].textContent+".";});
    var u=new SpeechSynthesisUtterance(rows.join(" "));u.lang="he-IL";u.rate=.85;
    var v=speechSynthesis.getVoices().filter(function(x){return /^he|^iw/i.test(x.lang);})[0];if(v)u.voice=v;else msg.textContent="אם לא שומעים – אין בדפדפן הזה קול בעברית.";
    u.onend=function(){btn.textContent="🔊 הקראת הטבלה";};btn.textContent="⏹ עצירה";speechSynthesis.speak(u);
  });})();

/* ---------- task 1: sorting ---------- */
var WORDS=[["ספרים","m","ספר אחד"],["מחברות","f","מחברת אחת"],["חלונות","m","חלון אחד"],["ביצים","f","ביצה אחת"],["לילות","m","לילה אחד"],["מילים","f","מילה אחת"],
           ["שולחנות","m","שולחן אחד"],["אבנים","f","אבן אחת"],["ימים","m","יום אחד"],["שעות","f","שעה אחת"],["עפרונות","m","עיפרון אחד"],["דלתות","f","דלת אחת"]];
var bank=$("#sort-bank"),selCard=null;
function mkCards(){bank.innerHTML="";var order=WORDS.map(function(w,i){return i;});
  for(var i=order.length-1;i>0;i--){var j=(i*7+3)%(i+1);var t=order[i];order[i]=order[j];order[j]=t;}
  order.forEach(function(k){var w=WORDS[k],c=document.createElement("button");c.type="button";c.className="card";c.textContent=w[0];c.setAttribute("data-g",w[1]);c.setAttribute("data-one",w[2]);c.setAttribute("aria-pressed","false");c.draggable=true;bank.appendChild(c);});
  $$(".bin .drop").forEach(function(d){d.innerHTML="";});$("#sort-score").textContent="";selCard=null;}
function select(c){if(selCard)selCard.setAttribute("aria-pressed","false");selCard=(selCard===c)?null:c;if(selCard)selCard.setAttribute("aria-pressed","true");}
function place(c,bin){c.classList.remove("right","wrong");c.removeAttribute("title");$(".drop",bin).appendChild(c);c.setAttribute("aria-pressed","false");if(selCard===c)selCard=null;$("#sort-score").textContent="";}
$("#sort").addEventListener("click",function(e){
  var c=e.target.closest(".card"),bin=e.target.closest(".bin");
  /* a word is selected and the tap lands on a bin (even on a word already inside it) → drop it there */
  if(bin&&selCard&&c!==selCard){place(selCard,bin);return;}
  if(c){select(c);return;}
});
$$(".bin").forEach(function(bin){
  bin.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&selCard){e.preventDefault();place(selCard,bin);}});
  bin.addEventListener("dragover",function(e){e.preventDefault();bin.classList.add("over");});
  bin.addEventListener("dragleave",function(){bin.classList.remove("over");});
  bin.addEventListener("drop",function(e){e.preventDefault();bin.classList.remove("over");var c=$(".card.dragging");if(c)place(c,bin);});
});
bank.addEventListener("dragover",function(e){e.preventDefault();});
bank.addEventListener("drop",function(e){e.preventDefault();var c=$(".card.dragging");if(c){c.classList.remove("right","wrong");bank.appendChild(c);}});
document.addEventListener("dragstart",function(e){var c=e.target.closest&&e.target.closest(".card");if(!c)return;c.classList.add("dragging");try{e.dataTransfer.setData("text/plain",c.textContent);}catch(x){}});
document.addEventListener("dragend",function(e){var c=e.target.closest&&e.target.closest(".card");if(c)c.classList.remove("dragging");$$(".bin").forEach(function(b){b.classList.remove("over");});});
$("#sort-check").addEventListener("click",function(){
  var right=0,placed=0;
  $$(".bin").forEach(function(bin){var g=bin.getAttribute("data-bin");$$(".card",bin).forEach(function(c){placed++;var ok=c.getAttribute("data-g")===g;c.classList.toggle("right",ok);c.classList.toggle("wrong",!ok);c.title=c.getAttribute("data-one");if(ok)right++;
    c.setAttribute("aria-label",c.textContent+(ok?" – נכון":" – לא נכון, "+c.getAttribute("data-one")));});});
  var left=$$(".card",bank).length;
  $("#sort-score").textContent=right+" מתוך "+WORDS.length+" נכון"+(left?(" · נשארו "+left+" מילים למיין"):"")+(placed-right?" · מילה אדומה? אמרו אותה ביחיד ונסו שוב.":(left?"":" · כל הכבוד! 🎉"));
});
$("#sort-reset").addEventListener("click",mkCards);
mkCards();

/* ---------- task 2: error hunt ---------- */
var HUNT=[
 {l:"",t:["בתיק","שלי","יש","שלוש","ספרים","וקלמר","אחד."],e:3,fix:"שלושה ספרים",why:"ספר – זכר (ספר אחד), ולכן מספר עם ה׳."},
 {l:"",t:["קניתי","שתיים","מחברות","חדשות."],e:1,fix:"שתי מחברות",why:"לפני שם אומרים שתי (ושני), לא שתיים."},
 {l:"",t:["השכנים","שלנו","גרים","בבית","מספר","ארבעה."],e:5,fix:"בית מספר ארבע",why:"מספר סתמי (מספר של בית, קו, עמוד) – תמיד בנקבה."},
 {l:"",t:["בטיול","ראינו","חמישה","אבנים","מיוחדות."],e:2,fix:"חמש אבנים",why:"אבן – נקבה (אבן אחת), גם אם הרבים נגמר ב־ים."},
 {l:"",t:["שלושה","הילדים","הגיעו","ראשונים","לקו","הסיום."],e:0,fix:"שלושת הילדים",why:"לפני שם מיודע (עם ה׳ הידיעה) – שלושת."},
 {l:"",t:["המרפאה","נמצאת","בקומה","השלישי."],e:3,fix:"בקומה השלישית",why:"הסודר מתאים לשם: קומה – נקבה ← השלישית."},
 {l:"⭐ אתגר",t:["הטיול","השנתי","יתקיים","בעשרים","ושלוש","בינואר."],e:4,fix:"בעשרים ושלושה בינואר",why:"בתאריך מתכוונים ל״יום״ (זכר), ולכן ושלושה."},
 {l:"⭐ אתגר",t:["בקבוצה","שלנו","יש","שלוש עשרה","שחקנים","ושתים עשרה","שחקניות."],e:3,fix:"שלושה עשר שחקנים",why:"שחקן – זכר: שלושה עשר שחקנים (ובנקבה: שתים עשרה שחקניות)."}
];
var huntBox=$("#hunt-box"),found=0;
function renderHunt(){found=0;huntBox.innerHTML=HUNT.map(function(s,i){
  return '<div class="sent" data-i="'+i+'">'+(s.l?'<span class="lvl">'+s.l+'</span>':'')+'<p><span class="n">'+(i+1)+'</span> '+s.t.map(function(w,k){return '<button type="button" class="wd" data-k="'+k+'">'+w+'</button>';}).join(" ")+'</p><span class="miss-note" aria-live="polite"></span></div>';}).join("");
  $("#hunt-score").textContent="נמצאו 0 מתוך "+HUNT.length;}
huntBox.addEventListener("click",function(e){var w=e.target.closest(".wd");if(!w)return;var box=w.closest(".sent"),s=HUNT[+box.getAttribute("data-i")];if(box.classList.contains("done"))return;
  var note=$(".miss-note",box);
  if(+w.getAttribute("data-k")===s.e){w.classList.add("hit");box.classList.add("done");note.outerHTML='<span class="fix">✅ <b>'+s.fix+'</b> – '+s.why+'</span>';found++;$("#hunt-score").textContent="נמצאו "+found+" מתוך "+HUNT.length+(found===HUNT.length?" 🎉":"");}
  else{w.classList.remove("miss");void w.offsetWidth;w.classList.add("miss");note.textContent="המילה הזו בסדר. חפשו את שם המספר!";}
});
renderHunt();

/* ---------- task 3: quiz ---------- */
var Q=[
 {l:"זוכרים",q:"איזה צירוף נכון?",o:["שלוש ספרים","שלושה ספרים","שלושת ספרים","שלושה ספר"],a:1,e:"ספר – זכר (ספר אחד), ולכן שלושה ספרים."},
 {l:"זוכרים",q:"השלימו: ״קניתי ___ מחברות.״",o:["שניים","שתיים","שתי","שני"],a:2,e:"לפני שם בנקבה – שתי: שתי מחברות."},
 {l:"מבינים",q:"למה אומרים ״חמש ביצים״ ולא ״חמישה ביצים״?",o:["כי ביצים נגמר ב־ים","כי ביצה היא שם בנקבה (ביצה אחת)","כי 5 הוא מספר אי־זוגי","כי ככה כתוב במתכון"],a:1,e:"בודקים ביחיד: ביצה אחת ← נקבה ← חמש. הסיומת ־ים לא קובעת."},
 {l:"מיישמים",q:"באיזה משפט המספר הסודר נכון?",o:["ירדנו בתחנה השלישי","ירדנו בתחנה השלישית","ירדנו בשלוש התחנה","ירדנו בתחנה שלושה"],a:1,e:"תחנה – נקבה, והסודר מתאים לה: התחנה השלישית."},
 {l:"מיישמים",q:"איך אומרים נכון: ״חיכינו לאוטובוס קו 5״?",o:["קו חמישה","קו חמש","קו החמישה","קו חמישית"],a:1,e:"מספר של קו הוא מספר סתמי – תמיד בנקבה: קו חמש."},
 {l:"מנתחים",q:"מה ההבדל בין ״שלושה ספרים״ ל״שלושת הספרים״?",o:["אין שום הבדל","״שלושת הספרים״ – ספרים מסוימים שכבר מכירים","״שלושת״ היא צורת נקבה","״שלושת הספרים״ – יותר משלושה"],a:1,e:"עם ה׳ הידיעה מדברים על ספרים מסוימים, ואז המספר בא בצורת שלושת."},
 {l:"מנתחים",q:"תמר כתבה: ״בכיתה שלנו יש ארבע חלונות.״ מה נכון?",o:["אין טעות, חלונות נגמר ב־ות","צריך ארבעה חלונות, כי חלון – זכר (חלון אחד)","צריך ארבעת חלונות","צריך חלונות ארבע"],a:1,e:"בודקים ביחיד: חלון אחד ← זכר ← ארבעה חלונות."},
 {l:"מעריכים",q:"שני חברים מתווכחים: ״אני בן אחד עשרה״ או ״אני בן אחת עשרה״? מי צודק ולמה?",o:["״בן אחד עשר״, כי הילד זכר","״בן אחת עשרה״, כי סופרים שנים, ושנה היא מילה בנקבה","שתי הצורות נכונות","״בן אחד עשרה״, כמו שאומרים ברחוב"],a:1,e:"בגיל סופרים שנים (בן אחת עשרה שנים), ושנה – נקבה. לכן גם ילד וגם ילדה: בן/בת אחת עשרה."}
];
var qi=0,qBox=$("#quiz-box"),ans={};
function renderQ(){var q=Q[qi];
  qBox.innerHTML='<span class="lvl">רמת חשיבה: '+q.l+'</span><p class="q">'+(qi+1)+". "+q.q+'</p><div class="opts">'+q.o.map(function(o,k){return '<button type="button" class="opt" data-k="'+k+'"><span class="n">'+(k+1)+'</span>'+o+'</button>';}).join("")+'</div><p class="explain" hidden></p>';
  $("#quiz-count").textContent="שאלה "+(qi+1)+" מתוך "+Q.length;$("#quiz-prev").disabled=qi===0;$("#quiz-next").disabled=qi===Q.length-1;
  if(ans[qi]!=null)mark(ans[qi]);}
function mark(k){var q=Q[qi];
  $$(".opt",qBox).forEach(function(o){var kk=+o.getAttribute("data-k");o.classList.remove("right","wrong");if(kk===q.a)o.classList.add("right");});
  if(k!==q.a)$$(".opt",qBox)[k].classList.add("wrong");var ex=$(".explain",qBox);ex.hidden=false;ex.innerHTML=(k===q.a?"✅ נכון! ":"❌ לא בדיוק. התשובה הנכונה: "+(q.a+1)+". ")+q.e;
  var good=0,done=0;Object.keys(ans).forEach(function(i){done++;if(ans[i]===Q[i].a)good++;});$("#quiz-score").textContent="נכון: "+good+" / "+done;}
qBox.addEventListener("click",function(e){var b=e.target.closest(".opt");if(!b)return;var k=+b.getAttribute("data-k");if(ans[qi]==null)ans[qi]=k;mark(k);});
$("#quiz-prev").addEventListener("click",function(){if(qi>0){qi--;renderQ();}});
$("#quiz-next").addEventListener("click",function(){if(qi<Q.length-1){qi++;renderQ();}});
renderQ();

/* ---------- teacher notes (house gate: code 1010, content stored encoded) ---------- */
var NOTES=null;
function teacherOK(){try{return sessionStorage.getItem(PFX+"TeacherOK")==="1";}catch(e){return false;}}
function loadNotes(){if(!NOTES){NOTES=JSON.parse(decodeURIComponent(escape(atob($("#teacher-data").textContent.trim()))));}return NOTES;}
function renderNotes(){var box=$("#notes");if(box.hidden||!NOTES)return;var s=slides[cur];$("#notes-slide").textContent="שקופית "+(cur+1)+": "+(s.getAttribute("aria-label")||"");$("#notes-body").innerHTML=NOTES[s.id]||"<p>אין הערות לשקופית הזו.</p>";}
function showNotes(){loadNotes();$("#notes").hidden=false;renderNotes();}
function openNotes(){if(!$("#notes").hidden){$("#notes").hidden=true;return;}if(teacherOK()){showNotes();return;}var d=$("#gate");$("#gate-err").hidden=true;$("#gate-pw").value="";if(d.showModal){d.showModal();}else{d.setAttribute("open","");}$("#gate-pw").focus();}
$("#notes-btn").addEventListener("click",openNotes);
$("#gate-form").addEventListener("submit",function(e){e.preventDefault();if($("#gate-pw").value.trim()==="1010"){try{sessionStorage.setItem(PFX+"TeacherOK","1");}catch(x){}$("#gate").close();showNotes();$("#notes-close").focus();}else{$("#gate-err").hidden=false;$("#gate-pw").value="";$("#gate-pw").focus();}});
$("#gate-cancel").addEventListener("click",function(){$("#gate").close();});
$("#notes-close").addEventListener("click",function(){$("#notes").hidden=true;$("#notes-btn").focus();});
$("#notes-popout").addEventListener("click",function(){window.open("teacher.html#presenter","kitaShm5NumNotes","width=620,height=760");});

/* ---------- start ---------- */
window.KitaDeck={go:go,current:function(){return cur;}};
var start=idx(location.hash.slice(1));go(start>=0?start:0);
})();
