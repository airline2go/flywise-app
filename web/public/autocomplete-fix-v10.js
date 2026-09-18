/* AIRPIV AUTOCOMPLETE V10: Arabic country names, outside-close, clear-button isolation,
   full-name rendering, and search-date persistence across refresh. */
(function(){
  'use strict';
  if(window.__airpivAutocompleteV10)return;
  window.__airpivAutocompleteV10=true;

  var KNOWN_CODES={
    Deutschland:'DE','Germany':'DE',Österreich:'AT','Austria':'AT',Schweiz:'CH','Switzerland':'CH',
    UK:'GB','United Kingdom':'GB','Vereinigtes Königreich':'GB',Frankreich:'FR','France':'FR',
    Niederlande:'NL','Netherlands':'NL',Belgien:'BE','Belgium':'BE',Spanien:'ES','Spain':'ES',
    Portugal:'PT',Italien:'IT','Italy':'IT',Griechenland:'GR','Greece':'GR',Türkei:'TR','Turkey':'TR',
    Dänemark:'DK','Denmark':'DK',Norwegen:'NO','Norway':'NO',Schweden:'SE','Sweden':'SE',
    Finnland:'FI','Finland':'FI',Polen:'PL','Poland':'PL',Tschechien:'CZ','Czech Republic':'CZ',
    Ungarn:'HU','Hungary':'HU',Irland:'IE','Ireland':'IE',USA:'US',Kanada:'CA','Canada':'CA',
    VAE:'AE','UAE':'AE','Katar':'QA','Qatar':'QA',Ägypten:'EG','Egypt':'EG',Israel:'IL',
    Marokko:'MA','Morocco':'MA',Thailand:'TH',Singapur:'SG','Singapore':'SG',Malaysia:'MY',
    China:'CN',Japan:'JP',Südkorea:'KR','South Korea':'KR',Indien:'IN','India':'IN',
    Malediven:'MV','Maldives':'MV',Australien:'AU','Australia':'AU',Brasilien:'BR','Brazil':'BR',
    Mexiko:'MX','Mexico':'MX','Südafrika':'ZA','South Africa':'ZA','Saudi-Arabien':'SA','Saudi Arabia':'SA',
    Jordanien:'JO','Jordan':'JO',Libanon:'LB','Lebanon':'LB',Kuwait:'KW',Bahrain:'BH',Oman:'OM',
    Algerien:'DZ','Algeria':'DZ',Tunesien:'TN','Tunisia':'TN'
  };
  var AR_FALLBACK={
    DE:'ألمانيا',AT:'النمسا',CH:'سويسرا',GB:'المملكة المتحدة',FR:'فرنسا',NL:'هولندا',BE:'بلجيكا',ES:'إسبانيا',PT:'البرتغال',
    IT:'إيطاليا',GR:'اليونان',TR:'تركيا',DK:'الدنمارك',NO:'النرويج',SE:'السويد',FI:'فنلندا',PL:'بولندا',CZ:'التشيك',HU:'المجر',
    IE:'أيرلندا',US:'الولايات المتحدة',CA:'كندا',AE:'الإمارات العربية المتحدة',QA:'قطر',EG:'مصر',IL:'إسرائيل',MA:'المغرب',
    TH:'تايلاند',SG:'سنغافورة',MY:'ماليزيا',CN:'الصين',JP:'اليابان',KR:'كوريا الجنوبية',IN:'الهند',MV:'المالديف',AU:'أستراليا',
    BR:'البرازيل',MX:'المكسيك',ZA:'جنوب أفريقيا',SA:'السعودية',JO:'الأردن',LB:'لبنان',KW:'الكويت',BH:'البحرين',OM:'عُمان',
    DZ:'الجزائر',TN:'تونس'
  };

  function isArabic(){return String(window.LANG||document.documentElement.lang||'de').slice(0,2)==='ar';}
  function countryCode(raw){
    raw=String(raw||'').trim();
    if(!raw)return '';
    if(KNOWN_CODES[raw])return KNOWN_CODES[raw];
    var de=window.COUNTRY_DE;
    if(de)for(var k in de)if(Object.prototype.hasOwnProperty.call(de,k)&&de[k]===raw)return k;
    return '';
  }
  function arabicCountry(raw){
    if(!isArabic())return raw;
    var code=countryCode(raw);
    if(!code)return raw;
    try{
      if(typeof Intl!=='undefined'&&Intl.DisplayNames){
        var n=new Intl.DisplayNames(['ar'],{type:'region'}).of(code);
        if(n)return n;
      }
    }catch(_){ }
    return AR_FALLBACK[code]||raw;
  }
  function translateDropdownCountries(root){
    if(!isArabic()||!root)return;
    var nodes=root.querySelectorAll('.acn');
    for(var i=0;i<nodes.length;i++){
      var text=String(nodes[i].textContent||'').trim(), comma=text.lastIndexOf(',');
      if(comma<0)continue;
      var city=text.slice(0,comma).trim(), raw=text.slice(comma+1).trim(), ar=arabicCountry(raw);
      if(ar&&ar!==raw)nodes[i].textContent=city+', '+ar;
    }
  }
  function closeAll(){
    var ds=document.querySelectorAll('.acdrop.open,.ac-drop.open,.fw-ac-drop.open');
    for(var i=0;i<ds.length;i++)ds[i].classList.remove('open');
  }
  function insideAutocomplete(t){
    return !!(t&&t.closest&&t.closest('.acdrop,.ac-drop,.fw-ac-drop,#from-in,#to-in,[id^="mc-from-"],[id^="mc-to-"],[id^="rpe-"]'));
  }
  function clearLocation(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest('.kclear,[data-fn="clearField"]'):null;
    if(!b)return false;
    var side=b.getAttribute('data-fn-arg');
    if(side!=='from'&&side!=='to')return false;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    var el=document.getElementById(side+'-in'),sub=document.getElementById(side+'-sub');
    if(el){el.value='';el.removeAttribute('data-fw-iata');el.removeAttribute('data-iata');el.removeAttribute('data-fw-selected');el.focus();}
    if(sub)sub.textContent='';
    window[side+'I']='';window[side+'C']='';window[side+'A']='';
    closeAll();
    return true;
  }
  function persistSearchDates(){
    var dep=document.getElementById('dep-date'),ret=document.getElementById('ret-date');
    var d=dep&&/^\d{4}-\d{2}-\d{2}$/.test(dep.value)?dep.value:'';
    var r=ret&&/^\d{4}-\d{2}-\d{2}$/.test(ret.value)?ret.value:'';
    if(!d)return;
    try{
      var p=new URLSearchParams(window.location.search);
      p.set('depart',d);
      if(r)p.set('ret',r);else p.delete('ret');
      if(typeof window.trip==='string'&&window.trip)p.set('trip',window.trip);
      var qs=p.toString(),path=window.location.pathname+(qs?'?'+qs:'');
      window.history.replaceState(window.history.state,document.title,path);
      var route=window.location.pathname.match(/^\/search\/([A-Za-z0-9]{3})-([A-Za-z0-9]{3})$/);
      if(route)localStorage.setItem('fw_route_dates_'+route[1].toUpperCase()+'-'+route[2].toUpperCase(),JSON.stringify({dep:d,ret:r,trip:window.trip||'ow'}));
    }catch(_){ }
  }
  function wrapSearch(){
    if(typeof window.doSearch!=='function'||window.doSearch.__fwDateV10)return;
    var old=window.doSearch;
    function guarded(){
      var out=old.apply(this,arguments);
      persistSearchDates();
      return out;
    }
    guarded.__fwDateV10=true;
    window.doSearch=guarded;
  }
  function css(){
    if(document.getElementById('airpiv-autocomplete-v10-css'))return;
    var s=document.createElement('style');s.id='airpiv-autocomplete-v10-css';
    s.textContent='.aci.fw-ac-item .acn,.aci .acn{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;line-height:1.35!important}.aci.fw-ac-item .acs,.aci .acs{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;line-height:1.3!important}.kclear{position:relative!important;z-index:1400!important;pointer-events:auto!important}.kfield .kclear{touch-action:manipulation!important}.acdrop,.ac-drop,.fw-ac-drop{z-index:190!important}';
    document.head.appendChild(s);
  }
  function init(){
    css();
    document.addEventListener('pointerdown',function(e){if(clearLocation(e))return;},true);
    document.addEventListener('mousedown',function(e){if(clearLocation(e))return;},true);
    document.addEventListener('click',function(e){
      if(clearLocation(e))return;
      var t=e.target;
      if(t&&t.closest&&t.closest('.acdrop,.ac-drop,.fw-ac-drop')){translateDropdownCountries(t.closest('.acdrop,.ac-drop,.fw-ac-drop'));return;}
      if(!insideAutocomplete(t))closeAll();
    },true);
    var obs=new MutationObserver(function(){
      var ds=document.querySelectorAll('.acdrop.open,.ac-drop.open,.fw-ac-drop.open');
      for(var i=0;i<ds.length;i++)translateDropdownCountries(ds[i]);
    });
    obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    var n=0,timer=setInterval(function(){
      wrapSearch();
      var ds=document.querySelectorAll('.acdrop.open,.ac-drop.open,.fw-ac-drop.open');
      for(var i=0;i<ds.length;i++)translateDropdownCountries(ds[i]);
      if(++n>180)clearInterval(timer);
    },100);
    window.__airpivAutocompleteV10Diagnostics=function(){return{version:'V10',arabic:isArabic(),dateDeparture:(document.getElementById('dep-date')||{}).value||'',dateReturn:(document.getElementById('ret-date')||{}).value||'',url:window.location.href};};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
