export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  let injected = '';

  // --- Google Analytics 4 ---
  if (!html.includes('G-K14PJKDC9H')) {
    injected += `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-K14PJKDC9H"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-K14PJKDC9H', { anonymize_ip: true });
</script>
`;
  }

  // --- Microsoft Clarity ---
  if (!html.includes('clarity.ms')) {
    injected += `<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "z753xwadja");
</script>
`;
  }

  // --- First-touch attribution (sitewide; read by quote-form.js) ---
  if (!html.includes('mb_attr_v1')) {
    injected += ATTR_SNIPPET;
  }

  if (!injected) return response;
  html = html.replace('</head>', injected + '</head>');
  return new Response(html, response);
}

/* First-touch attribution, injected on every HTML page so the landing page is
   recorded even when it is not a form page. Read back by assets/quote-form.js. */
const ATTR_SNIPPET = `<script>
(function(){try{
  var K='mb_attr_v1',MAX=2592000000; /* 30 days */
  var q=new URLSearchParams(location.search);
  var keys=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','msclkid'];
  var p={};keys.forEach(function(k){var v=q.get(k);if(v)p[k]=v});
  var hasCampaign=Object.keys(p).length>0;
  var prev=null;try{prev=JSON.parse(localStorage.getItem(K)||'null')}catch(e){}
  if(prev&&(!prev.t||Date.now()-prev.t>MAX))prev=null;
  if(!hasCampaign&&prev)return; /* keep the original touch */
  localStorage.setItem(K,JSON.stringify({
    t:Date.now(),
    entry:location.pathname+location.search,
    ref:document.referrer||'',
    p:p
  }));
}catch(e){}})();
</script>`;

