export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const ga = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-K14PJKDC9H"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-K14PJKDC9H', { anonymize_ip: true });
</script>`;

  const html = await response.text();
  if (html.includes('G-K14PJKDC9H')) return response;
  const modified = html.includes('</head>')
    ? html.replace('</head>', ga + '\n</head>')
    : html;

  return new Response(modified, response);
}

