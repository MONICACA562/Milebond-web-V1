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

  if (!injected) return response;
  html = html.replace('</head>', injected + '</head>');
  return new Response(html, response);
}
