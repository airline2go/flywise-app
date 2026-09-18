window.APP_CONFIG = {
  SUPABASE_URL: "https://tflpaysskecpmdpwbvog.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ZXi_Rq2zYQIj3LJoNFRctQ_eZogIGD0",
  GOOGLE_ADS_CONVERSION_ID: "AW-18336159187",
  GOOGLE_ADS_PURCHASE_LABEL: "6phDCL3BqvAcENOrrqdE",
  TURNSTILE_SITE_KEY: ""
};
(function(){
  if(typeof document==='undefined') return;
  if(!document.querySelector('script[data-fw-search-session]')){
    var s=document.createElement('script');s.src='/search-session.js';s.async=false;s.setAttribute('data-fw-search-session','1');
    (document.head||document.documentElement).appendChild(s);
  }
})();
(function(){
  'use strict';
  if(typeof window==='undefined'||typeof document==='undefined') return;
  /* [AIRPIV-AUTOCOMPLETE-V8] Selection must happen on click only.
     Pointer/mouse down previously fired a second selection path on mobile,
     so the first tap could clear the field before the click committed it. */
  window.addEventListener('pointerdown',function(ev){
    var t=ev.target&&ev.target.closest?ev.target.closest('.fw-ac-item'):null;
    if(t) ev.stopImmediatePropagation();
  },true);
  window.addEventListener('mousedown',function(ev){
    var t=ev.target&&ev.target.closest?ev.target.closest('.fw-ac-item'):null;
    if(t) ev.stopImmediatePropagation();
  },true);
  var MAX_RESULTS=8,MIN_QUERY=2,LANG_COLUMNS={de:2,en:4,ar:5,es:7,fr:8,it:9,nl:10,tr:11},cache=null;
  function fold(v){return String(v==null?'':v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/ß/g,'ss').replace(/[øØ]/g,'o').replace(/[æÆ]/g,'ae').replace(/[œŒ]/g,'oe').replace(/[łŁ]/g,'l').replace(/[đðÐ]/g,'d').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
  function uniq(a){var s=Object.create(null),o=[];for(var i=0;i<a.length;i++){var v=fold(a[i]);if(v&&!s[v]){s[v]=1;o.push(v);}}return o;}
  function data(){if(cache&&cache.source===window.AP)return cache;if(!Array.isArray(window.AP)||!window.AP.length)return null;var entries=[];for(var i=0;i<window.AP.length;i++){var row=window.AP[i];if(!Array.isArray(row))continue;var code=String(row[0]||'').toUpperCase();if(!/^[A-Z0-9]{3}$/.test(code))continue;var values=[];for(var j=0;j<row.length;j++)if(typeof row[j]==='string'&&row[j].trim())values.push(row[j]);if(typeof window.apLocalizedCityName==='function'){try{var lc=window.apLocalizedCityName(row);if(lc)values.push(lc);}catch(_){}}values=uniq(values);if(values.length)entries.push({row:row,code:code,values:values});}cache={source:window.AP,entries:entries};return cache;}
  function queryLang(q){if(/[\u0600-\u06FF]/.test(q))return'ar';if(/[ñÑ]/.test(q))return'es';if(/[çÇœŒ]/.test(q))return'fr';return String(window.LANG||document.documentElement.lang||'de').slice(0,2);}
  function city(row,q){var l=queryLang(q||'');if(LANG_COLUMNS[l]!=null&&row[LANG_COLUMNS[l]])return row[LANG_COLUMNS[l]];if(typeof window.apLocalizedCityName==='function'){try{var x=window.apLocalizedCityName(row);if(x)return x;}catch(_){}}return row[2]||row[1]||row[0];}
  function airport(row){return row[1]||row[2]||row[0];}
  function country(row){return row[3]||'';}
  function score(entry,q){var best=0,qt=fold(q),compact=qt.replace(/ /g,''),parts=qt.split(' ').filter(Boolean);if(!qt)return 0;for(var i=0;i<entry.values.length;i++){var v=entry.values[i],vc=v.replace(/ /g,''),vp=v.split(' ');if(v===qt)best=Math.max(best,1200);else if(vc===compact)best=Math.max(best,1150);else if(/^ال/.test(v)&&v.slice(2)===qt)best=Math.max(best,1180);else if(v.indexOf(qt)===0)best=Math.max(best,1000);else if(vp.some(function(t){return t.indexOf(qt)===0;}))best=Math.max(best,900);else if(parts.length&&parts.every(function(t){return vp.some(function(x){return x.indexOf(t)===0;});}))best=Math.max(best,820);else if(v.indexOf(qt)>=0)best=Math.max(best,700);}return best;}
  function resolve(q){var d=data(),fq=fold(q);if(!d||!fq)return[];var out=[];for(var i=0;i<d.entries.length;i++){var s=score(d.entries[i],fq);if(s>0)out.push({entry:d.entries[i],score:s});}out.sort(function(a,b){return b.score-a.score||a.entry.code.localeCompare(b.entry.code);});return out.slice(0,MAX_RESULTS);}
  function clearState(side){window[side+'I']='';window[side+'C']='';window[side+'A']='';var el=document.getElementById(side+'-in'),sub=document.getElementById(side+'-sub');if(el){el.removeAttribute('data-fw-iata');el.removeAttribute('data-iata');el.removeAttribute('data-fw-selected');}if(sub)sub.textContent='';}
  function hide(side){var d=document.getElementById(side+'-ac'),el=document.getElementById(side+'-in');if(d){d.innerHTML='';d.classList.remove('open');}if(el)el.setAttribute('aria-expanded','false');}
  function render(side,results,q){var d=document.getElementById(side+'-ac'),el=document.getElementById(side+'-in');if(!d||!el)return;var h='';for(var i=0;i<results.length;i++){var r=results[i].entry.row,c=results[i].entry.code;h+='<button type="button" class="aci fw-ac-item" role="option" data-fw-ac-side="'+esc(side)+'" data-fw-ac-code="'+esc(c)+'"><span class="acb">'+esc(c)+'</span><span><span class="acn">'+esc(city(r,q))+(country(r)?', '+esc(country(r)):'')+'</span><span class="acs">'+esc(airport(r))+'</span></span></button>';}d.innerHTML=h;d.classList.add('open');el.setAttribute('aria-expanded','true');}
  function commit(side,row,q){var code=String(row[0]||'').toUpperCase(),el=document.getElementById(side+'-in');if(!el||!/^[A-Z0-9]{3}$/.test(code))return false;var c=city(row,q),a=airport(row),sub=document.getElementById(side+'-sub');el.value=c;el.setAttribute('data-fw-iata',code);el.setAttribute('data-iata',code);el.setAttribute('data-fw-selected',fold(c));window[side+'I']=code;window[side+'C']=c;window[side+'A']=a;if(sub)sub.textContent=a+' · '+code;hide(side);try{el.dispatchEvent(new CustomEvent('fw-place-selected',{bubbles:true,detail:{side:side,iata:code,city:c,airport:a}}));}catch(_){}return true;}
  function canonicalize(side){var el=document.getElementById(side+'-in'),q=el?String(el.value||'').trim():'';if(!el||!q)return false;var code=String(window[side+'I']||'').toUpperCase(),selected=fold(el.getAttribute('data-fw-selected')||''),value=fold(q),attr=String(el.getAttribute('data-fw-iata')||'').toUpperCase();if(code&&attr===code&&selected===value)return true;var r=resolve(q);if(!r.length)return false;if(r[0].score>=1000)return commit(side,r[0].entry.row,q);return false;}
  function error(side){var el=document.getElementById(side+'-in');if(el)el.focus();var a=document.getElementById('search-announce');if(a)a.textContent='Please select a valid airport from the suggestions.';}
  function onInput(ev){var el=ev.target;if(!el||(el.id!=='from-in'&&el.id!=='to-in'))return;var side=el.id==='from-in'?'from':'to',q=String(el.value||'').trim();clearState(side);var d=document.getElementById(side+'-ac');if(!d)return;if(q.length<MIN_QUERY){hide(side);return;}var r=resolve(q);if(!r.length){hide(side);return;}ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();render(side,r,q);}
  function onPick(ev){var el=ev.target&&ev.target.closest?ev.target.closest('.fw-ac-item'):null;if(!el)return;var side=el.getAttribute('data-fw-ac-side'),code=el.getAttribute('data-fw-ac-code'),d=data();if(!d||!side||!code)return;for(var i=0;i<d.entries.length;i++)if(d.entries[i].code===code){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();commit(side,d.entries[i].row,canonicalText(side));return;}}
  function canonicalText(side){var el=document.getElementById(side+'-in');return el?String(el.value||'').trim():'';}
  function onSearchEvent(ev){var t=ev.target&&ev.target.closest?ev.target.closest('[data-fn="doSearch"],[type="submit"],button'):null;if(!t)return;var text=(t.textContent||'').trim().toLowerCase(),isSearch=t.getAttribute('data-fn')==='doSearch'||t.getAttribute('type')==='submit'||/^(suchen|search|بحث|ara|buscar|rechercher|cerca)$/.test(text);if(!isSearch)return;if(!canonicalize('from')){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();error('from');return;}if(!canonicalize('to')){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();error('to');return;}}
  function wrap(){
    if(typeof window.doSearch==='function'&&!window.doSearch.__fwV5){var old=window.doSearch;function guarded(){var okFrom=canonicalize('from'),okTo=canonicalize('to');if(!okFrom){error('from');return;}if(!okTo){error('to');return;}return old.apply(this,arguments);}guarded.__fwV5=true;window.doSearch=guarded;}
    if(typeof window.pickAC==='function'&&!window.pickAC.__fwV5){var oldPick=window.pickAC;function pick(side,code,name,cityName){var d=data(),c=String(code||'').toUpperCase();if(d)for(var i=0;i<d.entries.length;i++)if(d.entries[i].code===c)return commit(side,d.entries[i].row,cityName||name||'');return oldPick.apply(this,arguments);}pick.__fwV5=true;window.pickAC=pick;}
  }
  function init(){if(window.__fwMultilingualResolverV5)return;window.__fwMultilingualResolverV5=true;window.addEventListener('input',onInput,true);window.addEventListener('compositionend',onInput,true);window.addEventListener('change',onInput,true);window.addEventListener('pointerdown',onPick,true);window.addEventListener('mousedown',onPick,true);window.addEventListener('click',onPick,true);window.addEventListener('submit',onSearchEvent,true);window.addEventListener('click',onSearchEvent,true);window.addEventListener('keydown',function(ev){if(ev.key!=='Enter')return;var el=ev.target;if(!el||(el.id!=='from-in'&&el.id!=='to-in'))return;var side=el.id==='from-in'?'from':'to';if(!canonicalize(side)){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();error(side);}},true);wrap();var n=0,timer=setInterval(function(){wrap();if(++n>120)clearInterval(timer);},100);window.__fwMultilingualResolverDiagnostics=function(){var d=data();return{version:'V5',installed:true,apAvailable:!!d,apCount:d?d.entries.length:0,fromIata:window.fromI||'',toIata:window.toI||'',fromText:canonicalText('from'),toText:canonicalText('to'),fromLanguage:queryLang(canonicalText('from')),toLanguage:queryLang(canonicalText('to'))};};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();